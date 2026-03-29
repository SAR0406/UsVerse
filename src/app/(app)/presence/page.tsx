"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Heart, Stars } from "lucide-react";
import type { PresenceEvent } from "@/types/database";
import { formatDistanceToNow } from "date-fns";

type EventType = PresenceEvent["event_type"];

const presenceActions: {
  type: EventType;
  emoji: string;
  label: string;
  color: string;
  partnerMessage: string;
}[] = [
  {
    type: "thinking_of_you",
    emoji: "💭",
    label: "Thinking of you",
    color: "from-purple-600 to-violet-500",
    partnerMessage: "is thinking of you 💭",
  },
  {
    type: "heartbeat",
    emoji: "💓",
    label: "Send heartbeat",
    color: "from-pink-600 to-rose-500",
    partnerMessage: "sent you a heartbeat 💓",
  },
  {
    type: "missing_you",
    emoji: "🥺",
    label: "Missing you",
    color: "from-indigo-600 to-blue-500",
    partnerMessage: "is missing you so much 🥺",
  },
  {
    type: "studying",
    emoji: "📚",
    label: "I'm studying",
    color: "from-emerald-600 to-teal-500",
    partnerMessage: "is studying 📚",
  },
  {
    type: "sleeping",
    emoji: "😴",
    label: "Going to sleep",
    color: "from-slate-600 to-zinc-500",
    partnerMessage: "is going to sleep 😴",
  },
  {
    type: "silent_mode",
    emoji: "💔",
    label: "I feel empty…",
    color: "from-rose-700 to-pink-700",
    partnerMessage: "feels empty and misses you but can't express it 💔",
  },
];

export default function PresencePage() {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [recentEvents, setRecentEvents] = useState<PresenceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<EventType | null>(null);
  const [lastSent, setLastSent] = useState<EventType | null>(null);
  const [vibrating, setVibrating] = useState(false);

  const triggerVibration = useCallback(() => {
    setVibrating(true);
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    setTimeout(() => setVibrating(false), 1500);
  }, []);

  const loadEvents = useCallback(async (cid: string) => {
    const { data } = await supabase
      .from("presence_events")
      .select("*")
      .eq("couple_id", cid)
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setRecentEvents(data as PresenceEvent[]);
  }, [supabase]);

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("couple_id")
        .eq("id", user.id)
        .single();

      if (profile?.couple_id) {
        setCoupleId(profile.couple_id);
        await loadEvents(profile.couple_id);
      }
      setLoading(false);
    }
    init();
  }, [supabase, loadEvents]);

  useEffect(() => {
    if (!coupleId) return;
    const channel = supabase
      .channel(`presence-${coupleId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "presence_events",
          filter: `couple_id=eq.${coupleId}`,
        },
        (payload) => {
          const event = payload.new as PresenceEvent;
          // Vibrate on incoming heartbeat (if from partner)
          if (event.user_id !== userId && event.event_type === "heartbeat") {
            triggerVibration();
          }
          setRecentEvents((prev) => [event, ...prev].slice(0, 20));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [coupleId, userId, supabase, triggerVibration]);

  async function sendPresence(type: EventType) {
    if (!coupleId || !userId) return;
    setSending(type);
    const action = presenceActions.find((a) => a.type === type);
    await supabase.from("presence_events").insert({
      couple_id: coupleId,
      user_id: userId,
      event_type: type,
      message: action?.partnerMessage ?? null,
    });
    setLastSent(type);
    setTimeout(() => setLastSent(null), 3000);
    setSending(null);
  }

  const getEventLabel = (event: PresenceEvent) => {
    const action = presenceActions.find((a) => a.type === event.event_type);
    return action ? action.partnerMessage : event.event_type;
  };

  const isMyEvent = (event: PresenceEvent) => event.user_id === userId;

  if (loading)
    return (
      <div className="flex items-center justify-center h-full p-20">
        <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">
          Presence & Touch 💓
        </h1>
        <p className="text-purple-300/50 text-sm">
          No words needed. Let your feeling do the talking.
        </p>
      </div>

      {/* Heartbeat visual */}
      <div
        className={`flex justify-center mb-10 transition-all ${vibrating ? "scale-125" : ""}`}
      >
        <div
          className={`w-28 h-28 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center shadow-2xl ${
            lastSent === "heartbeat" ? "animate-pulse-glow animate-heartbeat" : "animate-pulse-glow"
          }`}
        >
          <Heart
            className={`w-14 h-14 text-white ${
              vibrating ? "animate-heartbeat" : ""
            }`}
            fill={vibrating ? "white" : "none"}
          />
        </div>
      </div>

      {/* Presence buttons */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {presenceActions.map((action) => (
          <button
            key={action.type}
            onClick={() => sendPresence(action.type)}
            disabled={!!sending}
            className={`glass-card p-4 flex flex-col items-center gap-2 hover:border-purple-500/40 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 ${
              lastSent === action.type
                ? "border-purple-500/60 bg-purple-500/10"
                : ""
            }`}
          >
            <span className="text-3xl">
              {sending === action.type ? (
                <span className="inline-block w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
              ) : (
                action.emoji
              )}
            </span>
            <span className="text-xs font-medium text-purple-200/70">
              {action.label}
            </span>
          </button>
        ))}
      </div>

      {/* Confirmation message */}
      {lastSent && (
        <div className="mb-6 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center text-purple-300 text-sm">
          ✨ Sent! She feels it now.
        </div>
      )}

      {/* Recent presence events */}
      <div>
        <h2 className="text-sm font-medium text-purple-400/60 mb-3 uppercase tracking-wider">
          Recent Moments
        </h2>
        {recentEvents.length === 0 ? (
          <div className="text-center py-8 text-purple-400/30 text-sm">
            No moments yet. Send your first feeling ✨
          </div>
        ) : (
          <div className="space-y-2">
            {recentEvents.map((event) => {
              const action = presenceActions.find(
                (a) => a.type === event.event_type
              );
              return (
                <div
                  key={event.id}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm ${
                    isMyEvent(event)
                      ? "bg-purple-600/10 border border-purple-500/20"
                      : "glass-card"
                  }`}
                >
                  <span className="text-xl">{action?.emoji ?? "💫"}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-purple-200/80">
                      {isMyEvent(event) ? "You" : "They"}{" "}
                      {getEventLabel(event)}
                    </span>
                  </div>
                  <span className="text-purple-400/30 text-xs shrink-0">
                    {formatDistanceToNow(new Date(event.created_at), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Virtual Touch info */}
      <div className="mt-8 glass-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Stars className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-medium text-purple-300">Virtual Touch</h3>
        </div>
        <p className="text-xs text-purple-300/50 leading-relaxed">
          When you tap &quot;Send heartbeat&quot;, her phone will feel it.
          Physical affection, digital distance — bridged. 💓
        </p>
      </div>
    </div>
  );
}
