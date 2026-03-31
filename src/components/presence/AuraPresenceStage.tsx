"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Heart, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import {
  vibratePress,
  vibrateSoftError,
  vibrateSuccess,
  vibrateTap,
} from "@/lib/haptics";
import type { PresenceEvent } from "@/types/database";

type EventType = PresenceEvent["event_type"];

type StatusVisual = {
  label: string;
  subtitle: string;
  glow: string;
  aura: string;
  icon: string;
};

interface AuraPresenceStageProps {
  partnerName: string | null;
}

const STATUS_VISUALS: Record<EventType, StatusVisual> = {
  studying: {
    label: "Studying",
    subtitle: "Focused and present",
    glow: "var(--color-sky-blush)",
    aura: "var(--gradient-moonlight)",
    icon: "📚",
  },
  thinking_of_you: {
    label: "Thinking of you",
    subtitle: "Soft little wave",
    glow: "var(--color-blossom)",
    aura: "var(--gradient-heartbeat)",
    icon: "💭",
  },
  missing_you: {
    label: "Missing you",
    subtitle: "Long-distance ache",
    glow: "var(--color-lilac-dream)",
    aura: "var(--gradient-moonlight)",
    icon: "💔",
  },
  sleeping: {
    label: "Sleepy",
    subtitle: "Wrapped in dreams",
    glow: "var(--color-lilac-dream)",
    aura: "linear-gradient(140deg, color-mix(in oklab, var(--dark-stardust) 78%, transparent), color-mix(in oklab, var(--dark-nebula) 78%, transparent))",
    icon: "🌙",
  },
  heartbeat: {
    label: "Heartbeat",
    subtitle: "Right here, right now",
    glow: "var(--color-blossom)",
    aura: "var(--gradient-heartbeat)",
    icon: "💓",
  },
  silent_mode: {
    label: "Silent mode",
    subtitle: "Here, quietly",
    glow: "var(--color-lilac-dream)",
    aura: "linear-gradient(140deg, color-mix(in oklab, var(--dark-nebula) 75%, transparent), color-mix(in oklab, var(--color-blossom) 26%, transparent))",
    icon: "🤍",
  },
};

const QUICK_PULSES: Array<{ type: EventType; label: string; message: string; emoji: string }> = [
  {
    type: "thinking_of_you",
    label: "Thinking",
    message: "is thinking of you right now 💭",
    emoji: "💭",
  },
  {
    type: "heartbeat",
    label: "Heartbeat",
    message: "sent a heartbeat you can almost feel 💓",
    emoji: "💓",
  },
  {
    type: "missing_you",
    label: "Missing you",
    message: "is missing you across every mile 💔",
    emoji: "💔",
  },
];

const MOOD_OPTIONS: Array<{ type: EventType; label: string; message: string; emoji: string }> = [
  {
    type: "studying",
    label: "Studying",
    message: "is focused right now but close to you 📚",
    emoji: "📚",
  },
  {
    type: "sleeping",
    label: "Sleepy",
    message: "is drifting to sleep with you in mind 🌙",
    emoji: "🌙",
  },
  {
    type: "silent_mode",
    label: "Silent mode",
    message: "just wanted you to know they are here 🤍",
    emoji: "🤍",
  },
];

export default function AuraPresenceStage({ partnerName }: AuraPresenceStageProps) {
  const supabase = useMemo(() => createClient(), []);
  const reduceMotion = useReducedMotion();
  const [userId, setUserId] = useState<string | null>(null);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [events, setEvents] = useState<PresenceEvent[]>([]);
  const [sending, setSending] = useState<EventType | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMoodTray, setShowMoodTray] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    const response = await fetch("/api/presence?limit=20");
    const payload = (await response.json()) as { data?: { events?: PresenceEvent[] } };
    if (payload.data?.events) {
      setEvents(payload.data.events);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) {
        if (!cancelled) setLoading(false);
        return;
      }

      setUserId(user.id);

      const response = await fetch("/api/couple");
      const payload = (await response.json()) as {
        data?: { couple?: { id: string } | null };
      };

      const nextCoupleId = payload.data?.couple?.id ?? null;
      if (cancelled) return;
      setCoupleId(nextCoupleId);

      if (nextCoupleId) {
        await loadEvents();
      }

      if (!cancelled) setLoading(false);
    }

    void init();

    return () => {
      cancelled = true;
    };
  }, [loadEvents, supabase]);

  useEffect(() => {
    if (!coupleId) return;

    const channel = supabase
      .channel(`dashboard-presence-${coupleId}`)
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
          setEvents((prev) => [event, ...prev].slice(0, 20));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [coupleId, supabase]);

  const selfLatest = useMemo(
    () => events.find((event) => event.user_id === userId) ?? null,
    [events, userId]
  );

  const partnerLatest = useMemo(
    () => events.find((event) => event.user_id !== userId) ?? null,
    [events, userId]
  );

  const partnerRecent = useMemo(() => {
    if (!partnerLatest) return false;
    const msSincePulse = Date.now() - new Date(partnerLatest.created_at).getTime();
    return msSincePulse < 12 * 60 * 1000;
  }, [partnerLatest]);

  const myVisual = selfLatest ? STATUS_VISUALS[selfLatest.event_type] : STATUS_VISUALS.thinking_of_you;
  const partnerVisual = partnerLatest ? STATUS_VISUALS[partnerLatest.event_type] : STATUS_VISUALS.silent_mode;

  async function sendPresence(type: EventType, message: string) {
    if (!coupleId || sending) return;

    setFeedback(null);
    setSending(type);
    vibrateTap();

    try {
      const response = await fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_type: type,
          message,
          idempotency_key: crypto.randomUUID(),
        }),
      });

      if (!response.ok) throw new Error("Unable to send presence");
      vibrateSuccess();
      setFeedback("Sent. They can feel this now.");
      setShowMoodTray(false);
    } catch {
      vibrateSoftError();
      setFeedback("Could not send this pulse. Try again in a moment.");
    } finally {
      setSending(null);
    }
  }

  if (loading || !coupleId) {
    return (
      <section className="glass-card border border-[color:var(--border)]/70 p-4 sm:p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-whisper)] mb-2">
          Aura Presence
        </p>
        <p className="text-sm text-[color:var(--text-soft)]">
          Connect with your partner in Chat to awaken your shared aura stream.
        </p>
      </section>
    );
  }

  return (
    <section className="glass-card border border-[color:var(--border)]/70 p-4 sm:p-5 overflow-hidden relative">
      <div className="absolute inset-x-0 top-0 h-20 bg-[var(--gradient-presence)] opacity-90 pointer-events-none" />
      <p className="relative z-10 text-xs uppercase tracking-[0.2em] text-[color:var(--text-whisper)] mb-2">
        Aura Presence
      </p>
      <p className="relative z-10 text-sm text-[color:var(--text-soft)] mb-4">
        Your emotional weather, live for two.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 relative z-10">
        <AuraOrb
          title="You"
          statusLabel={myVisual.label}
          subtitle={myVisual.subtitle}
          emoji={myVisual.icon}
          timestamp={
            selfLatest
              ? `Last pulse ${formatDistanceToNow(new Date(selfLatest.created_at), { addSuffix: true })}`
              : "Send your first pulse"
          }
          glow={myVisual.glow}
          aura={myVisual.aura}
          active={!reduceMotion}
        />

        <AuraOrb
          title={partnerName ?? "Partner"}
          statusLabel={partnerVisual.label}
          subtitle={partnerVisual.subtitle}
          emoji={partnerVisual.icon}
          timestamp={
            partnerLatest
              ? `Last pulse ${formatDistanceToNow(new Date(partnerLatest.created_at), { addSuffix: true })}`
              : "No pulse yet"
          }
          glow={partnerVisual.glow}
          aura={partnerVisual.aura}
          active={!reduceMotion && partnerRecent}
          online={partnerRecent}
        />
      </div>

      <div className="relative z-10 mt-4 flex flex-wrap items-center gap-2">
        {QUICK_PULSES.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() => void sendPresence(action.type, action.message)}
            disabled={sending !== null}
            className="touch-pressable rounded-full border border-[color:var(--border)] px-3 py-1.5 text-xs text-[color:var(--foreground)] bg-[color:var(--surface-2)]/80 disabled:opacity-50"
          >
            {sending === action.type ? "Sending..." : `${action.emoji} ${action.label}`}
          </button>
        ))}

        <button
          type="button"
          onClick={() => {
            vibratePress();
            setShowMoodTray((prev) => !prev);
          }}
          className="touch-pressable rounded-full border border-[color:var(--border)] px-3 py-1.5 text-xs text-[color:var(--foreground)]"
        >
          <Sparkles className="w-3 h-3 inline-block mr-1" />
          Set mood
        </button>
      </div>

      <AnimatePresence>
        {showMoodTray && (
          <motion.div
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="relative z-10 mt-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)]/90 p-3"
          >
            <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--text-whisper)] mb-2">
              Mood quick send
            </p>
            <div className="flex flex-wrap gap-2">
              {MOOD_OPTIONS.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => void sendPresence(option.type, option.message)}
                  disabled={sending !== null}
                  className="touch-pressable rounded-full border border-[color:var(--border)] px-3 py-1.5 text-xs text-[color:var(--foreground)] bg-[color:var(--surface-2)]/80 disabled:opacity-50"
                >
                  {option.emoji} {option.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {feedback && (
        <p className="relative z-10 mt-3 text-xs text-[color:var(--text-soft)]">
          {feedback}
        </p>
      )}
    </section>
  );
}

interface AuraOrbProps {
  title: string;
  statusLabel: string;
  subtitle: string;
  emoji: string;
  timestamp: string;
  glow: string;
  aura: string;
  active: boolean;
  online?: boolean;
}

function AuraOrb({
  title,
  statusLabel,
  subtitle,
  emoji,
  timestamp,
  glow,
  aura,
  active,
  online = false,
}: AuraOrbProps) {
  return (
    <article className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-2)]/55 p-3">
      <div className="flex items-center gap-2.5">
        <div
          className={`aura-orb ${active ? "aura-orb-active" : ""} ${online ? "aura-orb-online" : ""}`}
          style={{
            ["--aura-glow" as string]: glow,
            ["--aura-fill" as string]: aura,
          }}
          aria-hidden
        >
          <span className="text-lg">{emoji}</span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[color:var(--foreground)] truncate">{title}</p>
          <p className="text-xs text-[color:var(--text-soft)]">{statusLabel}</p>
        </div>
      </div>
      <p className="mt-2 text-xs text-[color:var(--text-soft)]">{subtitle}</p>
      <p className="mt-1 text-[11px] text-[color:var(--text-whisper)]">{timestamp}</p>
      {online && (
        <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-emerald-400/25 bg-emerald-500/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-emerald-200">
          <Heart className="w-2.5 h-2.5" />
          Here now
        </div>
      )}
    </article>
  );
}
