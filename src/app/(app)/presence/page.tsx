"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import {
  vibrateHeartbeat,
  vibrateHug,
  vibratePress,
  vibrateSoftError,
  vibrateSuccess,
  vibrateTap,
} from "@/lib/haptics";
import { Heart, Stars, Sparkles } from "lucide-react";
import type { PresenceEvent } from "@/types/database";
import { formatDistanceToNow } from "date-fns";

type EventType = PresenceEvent["event_type"];
const HUG_HOLD_MS = 3000;

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
    color: "var(--color-lilac-dream)",
    partnerMessage: "is thinking of you 💭",
  },
  {
    type: "heartbeat",
    emoji: "💓",
    label: "Send heartbeat",
    color: "var(--color-blossom)",
    partnerMessage: "sent you a heartbeat 💓",
  },
  {
    type: "missing_you",
    emoji: "🥺",
    label: "Missing you",
    color: "var(--color-sky-blush)",
    partnerMessage: "is missing you so much 🥺",
  },
  {
    type: "studying",
    emoji: "📚",
    label: "I'm studying",
    color: "var(--color-mint-kiss)",
    partnerMessage: "is studying 📚",
  },
  {
    type: "sleeping",
    emoji: "😴",
    label: "Going to sleep",
    color: "var(--color-lilac-dream)",
    partnerMessage: "is going to sleep 😴",
  },
  {
    type: "silent_mode",
    emoji: "💔",
    label: "I feel empty…",
    color: "var(--color-blossom)",
    partnerMessage: "feels empty and misses you but can't express it 💔",
  },
];

export default function PresencePage() {
  const reduceMotion = useReducedMotion();
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [recentEvents, setRecentEvents] = useState<PresenceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<EventType | null>(null);
  const [lastSent, setLastSent] = useState<EventType | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
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
  const [pulseHoldProgress, setPulseHoldProgress] = useState(0);
  const [pulseHint, setPulseHint] = useState(
    "Tap for a soft pulse. Hold for 3s to send a warm hug."
  );

  const holdFrameRef = useRef<number | null>(null);
  const holdStartRef = useRef<number | null>(null);
  const holdTriggeredRef = useRef(false);

  const triggerVibration = useCallback(() => {
    setVibrating(true);
    vibrateHeartbeat();
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

  // Auto-dismiss the incoming silent message modal after 30 s so it never
  // blocks the screen indefinitely if the user doesn't interact with it.
  useEffect(() => {
    if (!incomingSilentMessage) return;
    const timer = setTimeout(() => setIncomingSilentMessage(null), 30_000);
    return () => clearTimeout(timer);
  }, [incomingSilentMessage]);

  const sendPresence = useCallback(async (type: EventType, message?: string) => {
    if (!coupleId || !userId) return;
    setSending(type);
    setSendError(null);
    vibrateTap();

    try {
      const res = await fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_type: type,
          message,
          idempotency_key: crypto.randomUUID(),
        }),
      });
      if (!res.ok) throw new Error("Failed to send");
      setLastSent(type);
      vibrateSuccess();
      setTimeout(() => setLastSent(null), 3000);
    } catch {
      setSendError("Couldn\u2019t send right now \u2014 try again in a moment.");
      vibrateSoftError();
      setTimeout(() => setSendError(null), 4000);
    } finally {
      setSending(null);
    }
  }, [coupleId, userId]);

  const clearPulseHold = useCallback(() => {
    holdStartRef.current = null;
    if (holdFrameRef.current !== null) {
      cancelAnimationFrame(holdFrameRef.current);
      holdFrameRef.current = null;
    }
  }, []);

  const beginPulseHold = useCallback(() => {
    if (sending) return;
    holdTriggeredRef.current = false;
    holdStartRef.current = performance.now();
    setPulseHoldProgress(0);
    setPulseHint("Hold steady... sending a hug if you stay pressed.");
    vibratePress();

    const tick = (now: number) => {
      if (holdStartRef.current === null) return;
      const elapsed = now - holdStartRef.current;
      const progress = Math.min(elapsed / HUG_HOLD_MS, 1);
      setPulseHoldProgress(progress);

      if (progress >= 1 && !holdTriggeredRef.current) {
        holdTriggeredRef.current = true;
        clearPulseHold();
        setPulseHint("Hug sent. She can feel this one.");
        vibrateHug();
        void sendPresence("heartbeat", "is hugging you right now 🤗");
        return;
      }

      holdFrameRef.current = requestAnimationFrame(tick);
    };

    holdFrameRef.current = requestAnimationFrame(tick);
  }, [clearPulseHold, sendPresence, sending]);

  const endPulseHold = useCallback(() => {
    if (holdStartRef.current === null) return;
    clearPulseHold();

    if (holdTriggeredRef.current) {
      setPulseHoldProgress(0);
      holdTriggeredRef.current = false;
      return;
    }

    setPulseHoldProgress(0);
    setPulseHint("Soft pulse sent.");
    void sendPresence("thinking_of_you", "is thinking of you right now 💭");
  }, [clearPulseHold, sendPresence]);

  useEffect(() => {
    return () => {
      clearPulseHold();
    };
  }, [clearPulseHold]);

  async function sendSilentEmotion(
    emotion: (typeof silentEmotions)[number]
  ) {
    setSelectedSilentEmotion(emotion);
    setSilentSending(true);
    setSilentError(null);
    vibratePress();
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
      vibrateSuccess();
      setTimeout(() => setSelectedSilentEmotion(null), 1800);
    } catch {
      vibrateSoftError();
      setSilentError("Could not send right now. Try again in a moment.");
      setSelectedSilentEmotion(null);
    } finally {
      setSilentSending(false);
    }
  }

  async function sendHeartResponse() {
    setSendingHeartBack(true);
    setSilentError(null);
    vibrateTap();
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
      vibrateSuccess();
      setTimeout(() => {
        setIncomingSilentMessage(null);
        setSendingHeartBack(false);
      }, 400);
    } catch {
      vibrateSoftError();
      setSendingHeartBack(false);
      setSilentError("Heart did not send. Tap again.");
    }
  }

  const getEventLabel = (event: PresenceEvent) => {
    const action = presenceActions.find((a) => a.type === event.event_type);
    return action ? action.partnerMessage : event.event_type;
  };

  const isMyEvent = (event: PresenceEvent) => event.user_id === userId;
  const primaryActions = useMemo(
    () => presenceActions.filter((action) => action.type !== "silent_mode" && action.type !== "heartbeat"),
    []
  );

  if (loading)
    return (
      <div className="flex items-center justify-center h-full p-20">
        <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );

  if (!coupleId)
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4 text-center">
        <div className="text-5xl mb-4">💓</div>
        <h2 className="text-xl font-semibold text-white mb-2">Presence & Touch</h2>
        <p className="text-sm text-purple-300/50 max-w-xs">
          Connect with your partner first — head to{" "}
          <a href="/chat" className="text-purple-400 underline underline-offset-2 hover:text-purple-300">
            Chat
          </a>{" "}
          and share your invite code.
        </p>
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

      <section className="glass-card p-5 mb-8">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-[color:var(--text-whisper)]">
            Pulse Button
          </h2>
          <span className="text-xs text-[color:var(--text-soft)]">Tap or hold</span>
        </div>

        <div className="flex justify-center">
          <button
            type="button"
            onPointerDown={beginPulseHold}
            onPointerUp={endPulseHold}
            onPointerCancel={clearPulseHold}
            onPointerLeave={clearPulseHold}
            onContextMenu={(event) => event.preventDefault()}
            className={`touch-pressable relative w-32 h-32 rounded-full bg-[var(--gradient-heartbeat)] flex items-center justify-center shadow-2xl border border-white/20 ${
              lastSent === "heartbeat" ? "animate-pulse-glow animate-heartbeat" : "animate-pulse-glow"
            } ${vibrating ? "scale-110" : ""}`}
            aria-label="Send a pulse. Hold for 3 seconds to send a hug."
          >
            <Heart
              className={`w-14 h-14 text-white ${vibrating ? "animate-heartbeat" : ""}`}
              fill={vibrating ? "white" : "none"}
            />
            <span className="sr-only">Pulse</span>
          </button>
        </div>

        <div className="mt-4 h-2 rounded-full bg-[color:var(--surface-2)] border border-[color:var(--border)] overflow-hidden">
          <motion.div
            className="h-full bg-[var(--gradient-golden)]"
            animate={{ width: `${Math.round(pulseHoldProgress * 100)}%` }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.08, ease: "linear" }}
          />
        </div>

        <p className="text-xs text-[color:var(--text-soft)] mt-2 text-center">{pulseHint}</p>
      </section>

      {/* Presence buttons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {primaryActions.map((action) => (
          <button
            key={action.type}
            onClick={() => void sendPresence(action.type)}
            disabled={!!sending}
            className={`touch-pressable glass-card p-4 flex flex-col items-center gap-2 hover:border-purple-500/40 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 ${
              lastSent === action.type
                ? "border-purple-500/60 bg-purple-500/10"
                : ""
            }`}
            style={{ boxShadow: `0 0 0 1px color-mix(in oklab, ${action.color} 25%, transparent)` }}
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

      {/* Send error */}
      {sendError && (
        <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-center text-red-300 text-sm">
          {sendError}
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
          This page acknowledges every tap, press, and hold with physical feedback.
          Touch here should feel like texture, not a button click.
        </p>
      </div>
      <div className="mt-4 glass-card p-4 border-l-2 border-rose-500/40">
        <p className="text-xs text-purple-400/60">
          💬 <strong>Stuck in silence?</strong> Tap the floating spark to open silent mode and send emotion without words.
        </p>
      </div>

      <div className="fixed bottom-24 md:bottom-8 right-6 z-30">
        <AnimatePresence>
          {silentMenuOpen && (
            <>
              {silentEmotions.map((emotion, index) => {
                const { x, y } = getRadialOffset(index, silentEmotions.length, 118);
                return (
                  <motion.button
                    key={emotion.label}
                    type="button"
                    onClick={() => void sendSilentEmotion(emotion)}
                    aria-label={`Send silent emotion: ${emotion.label}`}
                    initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.6, x: 0, y: 0 }}
                    animate={{ opacity: 1, scale: 1, x, y }}
                    exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.6, x: 0, y: 0 }}
                    transition={{ type: "spring", stiffness: 420, damping: 22, delay: index * 0.02 }}
                    className="absolute right-0 bottom-0 px-3 py-2 rounded-full text-xs border border-white/20 text-white shadow-lg backdrop-blur-sm"
                    style={{ background: emotion.color }}
                  >
                    {emotion.emoji} {emotion.label}
                  </motion.button>
                );
              })}
            </>
          )}
        </AnimatePresence>

        <button
          onClick={() => setSilentMenuOpen((prev) => !prev)}
          className="touch-pressable w-[3.25rem] h-[3.25rem] rounded-full border border-[color:var(--border)] bg-[color:var(--card)]/85 text-lg text-rose-300 shadow-lg hover:scale-110 active:scale-95 transition-transform"
          aria-expanded={silentMenuOpen}
          aria-label="Toggle silent mode menu"
          aria-controls="silent-mode-menu"
          title="When words fail 💔"
        >
          <Sparkles className="w-5 h-5 mx-auto" />
        </button>
      </div>

      {silentError && (
        <div className="fixed bottom-[7.5rem] right-6 z-30 rounded-xl border border-rose-400/40 bg-rose-500/15 px-3 py-2 text-xs text-rose-200">
          {silentError}
        </div>
      )}

      {silentSending && selectedSilentEmotion && (
        <motion.div
          className="fixed inset-0 z-40 pointer-events-none flex items-end justify-center pb-24"
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
        >
          <div className="text-5xl animate-float">{selectedSilentEmotion.emoji}</div>
        </motion.div>
      )}

      {incomingSilentMessage && (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center bg-[color:var(--background)]/80 backdrop-blur-sm p-6"
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="glass-card max-w-sm w-full p-6 text-center border border-[color:var(--border)]"
          >
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
              className="touch-pressable px-4 py-2 rounded-full bg-[color:var(--color-blossom)] text-white text-sm hover:opacity-90 disabled:opacity-50"
            >
              {sendingHeartBack ? "Sending..." : "Send one heart 💕"}
            </button>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

function getRadialOffset(index: number, total: number, radius: number) {
  const startDeg = -150;
  const endDeg = -30;
  const ratio = total <= 1 ? 0 : index / (total - 1);
  const angle = (startDeg + (endDeg - startDeg) * ratio) * (Math.PI / 180);

  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  };
}

const silentEmotions = [
  {
    label: "Missing you",
    emoji: "💔",
    color: "color-mix(in oklab, var(--color-lilac-dream) 65%, var(--dark-stardust))",
  },
  {
    label: "Thinking of you",
    emoji: "💭",
    color: "color-mix(in oklab, var(--color-sky-blush) 78%, var(--dark-nebula))",
  },
  {
    label: "Proud of you",
    emoji: "⭐",
    color: "color-mix(in oklab, var(--color-butter) 72%, var(--color-peach))",
  },
  {
    label: "I love you",
    emoji: "❤️",
    color: "color-mix(in oklab, var(--color-blossom) 82%, var(--dark-nebula))",
  },
  {
    label: "I'm here",
    emoji: "🤍",
    color: "color-mix(in oklab, white 22%, var(--dark-nebula))",
  },
  {
    label: "Hard day",
    emoji: "🌧️",
    color: "color-mix(in oklab, var(--color-sky-blush) 38%, var(--dark-stardust))",
  },
  {
    label: "Wish you were here",
    emoji: "🌙",
    color: "color-mix(in oklab, var(--dark-stardust) 82%, var(--color-lilac-dream))",
  },
] as const;
