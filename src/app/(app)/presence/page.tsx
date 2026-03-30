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
  const [silentMenuOpen, setSilentMenuOpen] = useState(false);
  const [silentSending, setSilentSending] = useState(false);
  const [selectedSilentEmotion, setSelectedSilentEmotion] = useState<
    (typeof silentEmotions)[number] | null
  >(null);
  const [incomingSilentMessage, setIncomingSilentMessage] = useState<string | null>(
    null
  );
  const [sendingHeartBack, setSendingHeartBack] = useState(false);
  const [silentError, setSilentError] = useState<string | null>(null);

  const triggerVibration = useCallback(() => {
    setVibrating(true);
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    setTimeout(() => setVibrating(false), 1500);
  }, []);

  const loadEvents = useCallback(async () => {
    const res = await fetch("/api/presence?limit=20");
    const json = (await res.json()) as { data?: { events: PresenceEvent[] } };
    if (json.data?.events) setRecentEvents(json.data.events);
  }, []);

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const res = await fetch("/api/couple");
      const json = (await res.json()) as { data?: { couple: { id: string } | null } };
      const coupleData = json.data;

      if (coupleData?.couple?.id) {
        setCoupleId(coupleData.couple.id);
        await loadEvents();
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
          if (event.user_id !== userId && event.event_type === "heartbeat") {
            triggerVibration();
          }
          if (event.user_id !== userId && event.event_type === "silent_mode") {
            setIncomingSilentMessage(event.message ?? "Your partner is here with you 🤍");
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
    await fetch("/api/presence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type: type,
        idempotency_key: crypto.randomUUID(),
      }),
    });
    setLastSent(type);
    setTimeout(() => setLastSent(null), 3000);
    setSending(null);
  }

  async function sendSilentEmotion(
    emotion: (typeof silentEmotions)[number]
  ) {
    setSelectedSilentEmotion(emotion);
    setSilentSending(true);
    setSilentError(null);
    try {
      const response = await fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_type: "silent_mode",
          message: `${emotion.label} ${emotion.emoji}`,
          idempotency_key: crypto.randomUUID(),
        }),
      });
      if (!response.ok) throw new Error("Failed to send silent emotion");
      setSilentMenuOpen(false);
      setTimeout(() => setSelectedSilentEmotion(null), 1800);
    } catch {
      setSilentError("Could not send right now. Try again in a moment.");
      setSelectedSilentEmotion(null);
    } finally {
      setSilentSending(false);
    }
  }

  async function sendHeartResponse() {
    setSendingHeartBack(true);
    setSilentError(null);
    try {
      const response = await fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_type: "thinking_of_you",
          idempotency_key: crypto.randomUUID(),
        }),
      });
      if (!response.ok) throw new Error("Failed to send heart response");
      setTimeout(() => {
        setIncomingSilentMessage(null);
        setSendingHeartBack(false);
      }, 400);
    } catch {
      setSendingHeartBack(false);
      setSilentError("Heart did not send. Tap again.");
    }
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
      <div className="mt-4 glass-card p-4 border-l-2 border-rose-500/40">
        <p className="text-xs text-purple-400/60">
          💬 <strong>Stuck in silence?</strong> Tap the 💔 button to send a feeling when words are hard.
        </p>
      </div>

      <div className="fixed bottom-24 md:bottom-8 right-6 z-30">
        <button
          onClick={() => setSilentMenuOpen((prev) => !prev)}
          className="w-[3.25rem] h-[3.25rem] rounded-full border border-[color:var(--border)] bg-[color:var(--card)]/85 text-2xl text-rose-400 shadow-lg hover:scale-110 active:scale-95 transition-transform"
          aria-expanded={silentMenuOpen}
          aria-label="Toggle silent mode menu"
          aria-controls="silent-mode-menu"
          title="When words fail 💔"
        >
          💔
        </button>
      </div>

      {silentMenuOpen && (
        <div
          id="silent-mode-menu"
          className="fixed bottom-40 right-6 z-30 flex flex-col items-end gap-2"
        >
          {silentEmotions.map((emotion) => (
            <button
              key={emotion.label}
              onClick={() => sendSilentEmotion(emotion)}
              className="px-3 py-2 rounded-full text-xs border border-white/15 text-white transition-transform hover:scale-105"
              style={{ background: emotion.color }}
              aria-label={`Send silent emotion: ${emotion.label}`}
            >
              {emotion.emoji} {emotion.label}
            </button>
          ))}
        </div>
      )}

      {silentError && (
        <div className="fixed bottom-[7.5rem] right-6 z-30 rounded-xl border border-rose-400/40 bg-rose-500/15 px-3 py-2 text-xs text-rose-200">
          {silentError}
        </div>
      )}

      {silentSending && selectedSilentEmotion && (
        <div className="fixed inset-0 z-40 pointer-events-none flex items-end justify-center pb-24">
          <div className="text-5xl animate-float">{selectedSilentEmotion.emoji}</div>
        </div>
      )}

      {incomingSilentMessage && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[color:var(--background)]/80 backdrop-blur-sm p-6">
          <div className="glass-card max-w-sm w-full p-6 text-center">
            <div className="text-5xl mb-3">🥺</div>
            <p
              className="text-3xl leading-tight mb-5"
              style={{ fontFamily: "var(--font-accent), cursive" }}
            >
              {incomingSilentMessage}
            </p>
            <button
              onClick={sendHeartResponse}
              disabled={sendingHeartBack}
              className="px-4 py-2 rounded-full bg-[color:var(--color-blossom)] text-white text-sm hover:opacity-90 disabled:opacity-50"
            >
              {sendingHeartBack ? "Sending…" : "Send one heart 💕"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const silentEmotions = [
  { label: "Missing you", emoji: "💔", color: "rgba(155, 109, 255, 0.85)" },
  { label: "Thinking of you", emoji: "💭", color: "rgba(184, 227, 255, 0.82)" },
  { label: "Proud of you", emoji: "⭐", color: "rgba(255, 171, 118, 0.9)" },
  { label: "I love you", emoji: "❤️", color: "rgba(255, 107, 157, 0.9)" },
  { label: "I'm here", emoji: "🤍", color: "rgba(255, 255, 255, 0.25)" },
  { label: "Hard day", emoji: "🌧️", color: "rgba(123, 146, 170, 0.88)" },
  { label: "Wish you were here", emoji: "🌙", color: "rgba(45, 22, 84, 0.9)" },
] as const;
