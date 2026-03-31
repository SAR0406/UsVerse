"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Heart, Zap } from "lucide-react";
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
    color: "from-violet-500 to-purple-600",
    partnerMessage: "is thinking of you 💭",
  },
  {
    type: "heartbeat",
    emoji: "💓",
    label: "Send heartbeat",
    color: "from-rose-500 to-pink-600",
    partnerMessage: "sent you a heartbeat 💓",
  },
  {
    type: "missing_you",
    emoji: "🥺",
    label: "Missing you",
    color: "from-blue-500 to-indigo-600",
    partnerMessage: "is missing you so much 🥺",
  },
  {
    type: "studying",
    emoji: "📚",
    label: "I'm studying",
    color: "from-emerald-500 to-teal-600",
    partnerMessage: "is studying 📚",
  },
  {
    type: "sleeping",
    emoji: "😴",
    label: "Going to sleep",
    color: "from-slate-500 to-zinc-600",
    partnerMessage: "is going to sleep 😴",
  },
  {
    type: "silent_mode",
    emoji: "💔",
    label: "I feel empty…",
    color: "from-rose-700 to-red-700",
    partnerMessage: "feels empty and misses you but can't express it 💔",
  },
];

const silentEmotions = [
  { label: "Missing you",        emoji: "💔", color: "rgba(155, 109, 255, 0.88)" },
  { label: "Thinking of you",    emoji: "💭", color: "rgba(96, 165, 250, 0.88)"  },
  { label: "Proud of you",       emoji: "⭐", color: "rgba(251, 146, 60, 0.90)"  },
  { label: "I love you",         emoji: "❤️", color: "rgba(244, 63, 94, 0.90)"  },
  { label: "I'm here",           emoji: "🤍", color: "rgba(100, 116, 139, 0.85)" },
  { label: "Hard day",           emoji: "🌧️", color: "rgba(71, 85, 105, 0.90)"  },
  { label: "Wish you were here", emoji: "🌙", color: "rgba(45, 22, 84, 0.92)"   },
] as const;

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
  const [incomingSilentMessage, setIncomingSilentMessage] = useState<string | null>(null);
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const res = await fetch("/api/couple");
      const json = (await res.json()) as { data?: { couple: { id: string } | null } };
      if (json.data?.couple?.id) {
        setCoupleId(json.data.couple.id);
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
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
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

  async function sendSilentEmotion(emotion: (typeof silentEmotions)[number]) {
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
    if (event.event_type === "silent_mode" && event.message) return event.message;
    const action = presenceActions.find((a) => a.type === event.event_type);
    return action ? action.partnerMessage : event.event_type;
  };

  const isMyEvent = (event: PresenceEvent) => event.user_id === userId;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="w-10 h-10 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  const lastSentAction = presenceActions.find((a) => a.type === lastSent);

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-36 md:pb-10">
      {/* ── Page header ── */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[color:var(--foreground)] mb-1 flex items-center gap-2">
          Presence{" "}
          <span className="inline-block animate-heartbeat">💓</span>
        </h1>
        <p className="text-[color:var(--text-whisper)] text-sm">
          No words needed. Let your feeling do the talking.
        </p>
      </div>

      {/* ── Multi-ring heartbeat hero ── */}
      <div className="flex justify-center mb-10">
        <div className={`relative flex items-center justify-center ${vibrating ? "animate-heartbeat" : ""}`}>
          {/* Pulsing rings */}
          <div className="absolute w-28 h-28 rounded-full border border-pink-400/30 animate-ring-1" />
          <div className="absolute w-28 h-28 rounded-full border border-pink-400/25 animate-ring-2" />
          <div className="absolute w-28 h-28 rounded-full border border-pink-400/20 animate-ring-3" />
          {/* Center orb */}
          <div
            className={`relative z-10 w-28 h-28 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
              lastSent === "heartbeat"
                ? "bg-gradient-to-br from-rose-500 to-pink-600 animate-heartbeat"
                : "bg-gradient-to-br from-purple-600 to-pink-500 animate-pulse-glow"
            }`}
          >
            <Heart
              className="w-14 h-14 text-white"
              fill={vibrating || lastSent === "heartbeat" ? "white" : "none"}
            />
          </div>
        </div>
      </div>

      {/* ── Presence action cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        {presenceActions.map((action) => {
          const isThisLastSent = lastSent === action.type;
          const isSending = sending === action.type;
          return (
            <button
              key={action.type}
              onClick={() => void sendPresence(action.type)}
              disabled={!!sending}
              className={`relative overflow-hidden rounded-2xl border transition-all duration-200 hover:-translate-y-1 hover:shadow-xl active:scale-95 disabled:opacity-50 ${
                isThisLastSent
                  ? "border-purple-400/50 shadow-lg shadow-purple-500/15"
                  : "border-[color:var(--border)] hover:border-purple-500/40"
              }`}
              style={{
                background: "color-mix(in oklab, var(--card) 88%, transparent)",
              }}
            >
              {/* Gradient accent strip */}
              <div className={`h-1 w-full bg-gradient-to-r ${action.color}`} />
              <div className="p-4 flex flex-col items-center gap-2">
                <span className="text-3xl leading-none">
                  {isSending ? (
                    <span className="block w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                  ) : isThisLastSent ? (
                    "✅"
                  ) : (
                    action.emoji
                  )}
                </span>
                <span className="text-xs font-medium text-[color:var(--text-soft)] text-center leading-tight">
                  {action.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Sent confirmation toast ── */}
      {lastSent && lastSentAction && (
        <div className="mb-5 px-4 py-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-center text-sm animate-slide-up-fade">
          <span className="text-[color:var(--foreground)]">
            ✨ Sent! {lastSentAction.label} {lastSentAction.emoji}
          </span>
        </div>
      )}

      {/* ── Recent events timeline ── */}
      <div className="mb-6">
        <h2 className="text-xs font-semibold text-[color:var(--text-whisper)] uppercase tracking-widest mb-3">
          Recent Moments
        </h2>
        {recentEvents.length === 0 ? (
          <div className="text-center py-10">
            <div className="text-4xl mb-3">💫</div>
            <p className="text-[color:var(--text-whisper)] text-sm">
              No moments yet. Send your first feeling ✨
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentEvents.map((event) => {
              const action = presenceActions.find((a) => a.type === event.event_type);
              const isMine = isMyEvent(event);
              return (
                <div
                  key={event.id}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm ${
                    isMine
                      ? "bg-purple-600/10 border border-purple-500/15"
                      : "glass-card"
                  }`}
                >
                  <span className="text-xl flex-shrink-0">{action?.emoji ?? "💫"}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-[color:var(--text-soft)]">
                      <span className="font-semibold text-[color:var(--foreground)]">
                        {isMine ? "You" : "They"}
                      </span>{" "}
                      {getEventLabel(event)}
                    </span>
                  </div>
                  <span className="text-[color:var(--text-whisper)] text-xs flex-shrink-0">
                    {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Info cards ── */}
      <div className="space-y-3">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-medium text-[color:var(--foreground)]">Virtual Touch</span>
          </div>
          <p className="text-xs text-[color:var(--text-whisper)] leading-relaxed">
            When you tap &quot;Send heartbeat&quot;, their phone will feel it.
            Physical affection, digital distance — bridged. 💓
          </p>
        </div>
        <div className="glass-card p-4 border-l-2 border-rose-500/40">
          <p className="text-xs text-[color:var(--text-whisper)]">
            💬{" "}
            <span className="font-semibold text-[color:var(--text-soft)]">
              Stuck in silence?
            </span>{" "}
            Tap the 💔 button below to send a feeling when words are hard.
          </p>
        </div>
      </div>

      {/* ── FAB: silent mode trigger ── */}
      <div className="fixed bottom-24 md:bottom-8 right-5 z-30">
        {/* Emotion picker menu */}
        {silentMenuOpen && (
          <div className="absolute bottom-16 right-0 flex flex-col items-end gap-2 animate-slide-up-fade">
            {silentEmotions.map((emotion) => (
              <button
                key={emotion.label}
                onClick={() => void sendSilentEmotion(emotion)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full text-xs text-white font-medium border border-white/10 shadow-lg hover:scale-105 active:scale-95 transition-transform whitespace-nowrap"
                style={{ background: emotion.color }}
                aria-label={`Send silent emotion: ${emotion.label}`}
              >
                <span>{emotion.emoji}</span>
                <span>{emotion.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* FAB button */}
        <button
          onClick={() => setSilentMenuOpen((prev) => !prev)}
          className={`relative w-14 h-14 rounded-full border flex items-center justify-center text-2xl shadow-xl transition-all duration-200 hover:scale-110 active:scale-95 ${
            silentMenuOpen
              ? "bg-rose-500/30 border-rose-500/50 rotate-[20deg]"
              : "bg-[color:var(--card)]/90 backdrop-blur-sm border-[color:var(--border)]"
          }`}
          aria-expanded={silentMenuOpen}
          aria-label="Toggle silent mode menu"
          aria-controls="silent-mode-menu"
          title="When words fail 💔"
        >
          💔
          {/* Beacon pulse dot */}
          {!silentMenuOpen && (
            <>
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-rose-500 rounded-full animate-beacon" />
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-rose-500 rounded-full" />
            </>
          )}
        </button>
      </div>

      {silentError && (
        <div className="fixed bottom-[8.5rem] right-5 z-30 rounded-2xl border border-rose-400/40 bg-rose-500/15 px-3 py-2 text-xs text-rose-200 max-w-[200px]">
          {silentError}
        </div>
      )}

      {/* ── Floating emoji while sending ── */}
      {silentSending && selectedSilentEmotion && (
        <div className="fixed inset-0 z-40 pointer-events-none flex items-end justify-center pb-28">
          <div className="text-6xl animate-float">{selectedSilentEmotion.emoji}</div>
        </div>
      )}

      {/* ── Incoming silent message modal ── */}
      {incomingSilentMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color:var(--background)]/85 backdrop-blur-md p-6">
          <div className="glass-card max-w-sm w-full p-8 text-center animate-slide-up-fade">
            <div className="text-6xl mb-4 animate-float">🥺</div>
            <p className="text-[color:var(--text-whisper)] text-xs uppercase tracking-widest mb-3">
              A silent message from your partner
            </p>
            <p
              className="text-2xl leading-tight text-[color:var(--foreground)] mb-7"
              style={{ fontFamily: "var(--font-accent), cursive" }}
            >
              {incomingSilentMessage}
            </p>
            <button
              onClick={sendHeartResponse}
              disabled={sendingHeartBack}
              className="px-8 py-3 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all animate-pulse-glow shadow-lg shadow-pink-500/25"
            >
              {sendingHeartBack ? "Sending…" : "Send one heart 💕"}
            </button>
            <button
              onClick={() => setIncomingSilentMessage(null)}
              className="block mx-auto mt-3 text-xs text-[color:var(--text-whisper)] hover:text-[color:var(--text-soft)] transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
