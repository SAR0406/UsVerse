"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Clapperboard, Sparkles, Play, Pause, ScanHeart, Popcorn } from "lucide-react";

type CinemaPhase = "idle" | "ritual" | "watching" | "afterglow";
type SparkType = "hearts" | "laughing-stars" | "teardrops" | "gold-stars" | "shock" | "pulse";

type SparkEvent = {
  id: string;
  type: SparkType;
  side: "left" | "right";
};

const SPARK_CONTROLS: Array<{ type: SparkType; label: string; gesture: string; emoji: string }> = [
  { type: "hearts", gesture: "Single tap", emoji: "💕", label: "Hearts" },
  { type: "laughing-stars", gesture: "Double tap", emoji: "😂", label: "Laughing Stars" },
  { type: "teardrops", gesture: "Long press", emoji: "😭", label: "Teardrops" },
  { type: "gold-stars", gesture: "Swipe up", emoji: "🌟", label: "Gold Stars" },
  { type: "shock", gesture: "Shake", emoji: "😱", label: "Shock Sparkles" },
  { type: "pulse", gesture: "Two-finger hold", emoji: "🤍", label: "White Pulse" },
];

export default function CinemaPage() {
  const sparkCounterRef = useRef(0);
  const syncTickRef = useRef(0);
  const [cinemaOn, setCinemaOn] = useState(false);
  const [phase, setPhase] = useState<CinemaPhase>("idle");
  const [countdown, setCountdown] = useState(3);
  const [paused, setPaused] = useState(false);
  const [laughing, setLaughing] = useState(false);
  const [inSync, setInSync] = useState(true);
  const [sparks, setSparks] = useState<SparkEvent[]>([]);
  const [reactionWave, setReactionWave] = useState<number[]>([]);
  const [mySentence, setMySentence] = useState("");
  const [herSentence, setHerSentence] = useState("");
  const [sentencesLocked, setSentencesLocked] = useState(false);

  useEffect(() => {
    if (phase !== "ritual") return;
    const interval = window.setInterval(() => {
      setCountdown((value) => {
        if (value <= 1) {
          window.clearInterval(interval);
          setPhase("watching");
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (phase !== "watching") return;
    const interval = window.setInterval(() => {
      syncTickRef.current += 1;
      setInSync(syncTickRef.current % 4 !== 0);
      if (syncTickRef.current % 3 === 0) {
        setLaughing(true);
        window.setTimeout(() => setLaughing(false), 450);
      }
    }, 2000);
    return () => window.clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (!sparks.length) return;
    const timeout = window.setTimeout(() => setSparks((items) => items.slice(1)), 900);
    return () => window.clearTimeout(timeout);
  }, [sparks]);

  const ambienceClass = cinemaOn ? "bg-[#080C18]" : "";
  const canEndMovie = phase === "watching";
  const showRitual = phase === "ritual";
  const showAfterglow = phase === "afterglow";

  const reactionBars = useMemo(() => {
    const source = reactionWave.length ? reactionWave : [2, 4, 3, 5, 2, 6, 4, 3];
    return source.slice(-36);
  }, [reactionWave]);

  function activateCinema() {
    setCinemaOn(true);
    setPhase("idle");
    setPaused(false);
    setInSync(true);
  }

  function launchRitual() {
    setCountdown(3);
    setPhase("ritual");
    setReactionWave([]);
    setMySentence("");
    setHerSentence("");
    setSentencesLocked(false);
  }

  function triggerSpark(type: SparkType) {
    if (phase !== "watching") return;
    sparkCounterRef.current += 1;
    const count = sparkCounterRef.current;
    const event: SparkEvent = {
      id: `spark-${count}`,
      type,
      side: count % 2 === 0 ? "left" : "right",
    };
    setSparks((events) => [...events.slice(-10), event]);
    const intensity = 2 + (count % 8);
    setReactionWave((values) => [...values.slice(-59), intensity]);
  }

  return (
    <div className={`p-6 max-w-5xl mx-auto space-y-6 transition-colors duration-700 ${ambienceClass}`}>
      <header className="glass-card p-6 relative overflow-hidden">
        {cinemaOn ? <div className="cinema-vignette" /> : null}
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-purple-300/70 text-xs tracking-wide uppercase mb-3">
            <Clapperboard className="w-4 h-4" />
            Watch Together
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Cinema</h1>
          <p className="text-sm text-purple-200/80">
            Beyond synchronized playback — this room is designed to feel shared.
          </p>
          <div className="mt-4 flex gap-3 flex-wrap">
            {!cinemaOn ? (
              <button
                type="button"
                onClick={activateCinema}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium bg-purple-600/80 hover:bg-purple-600 transition-colors"
              >
                <Play className="w-4 h-4" />
                Activate Cinema Mode
              </button>
            ) : (
              <button
                type="button"
                onClick={launchRitual}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium bg-indigo-600/80 hover:bg-indigo-600 transition-colors"
              >
                <Popcorn className="w-4 h-4" />
                Start Pre-Movie Ritual
              </button>
            )}
            {cinemaOn ? (
              <button
                type="button"
                onClick={() => {
                  setCinemaOn(false);
                  setPhase("idle");
                }}
                className="rounded-xl px-4 py-2 text-sm font-medium bg-white/10 hover:bg-white/15 transition-colors"
              >
                Exit
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <section className="glass-card p-5 relative overflow-hidden">
        {cinemaOn ? <div className="cinema-vignette" /> : null}
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">Theatre Stage</h2>
            <div className="flex items-center gap-2 text-xs text-purple-200/70">
              <ScanHeart className="w-3.5 h-3.5" />
              Sync heartbeat
              <span className={`cinema-sync-dot ${inSync ? "cinema-sync-dot-good" : "cinema-sync-dot-drift"}`} />
              <span className={`cinema-sync-dot ${inSync ? "cinema-sync-dot-good" : "cinema-sync-dot-drift"}`} />
            </div>
          </div>

          <div className="rounded-2xl border border-purple-500/20 bg-black/30 p-4">
            <div className="relative rounded-xl bg-gradient-to-b from-black/60 to-slate-950/95 h-64 overflow-hidden">
              <div className="absolute inset-x-6 top-5 text-xs text-center text-purple-100/70">
                Virtual couch — you (left) + her (right)
              </div>
              <div className="absolute left-1/2 -translate-x-1/2 bottom-14 w-48 h-16 rounded-[2rem] bg-purple-300/10 border border-purple-300/20" />
              <div
                className={`cinema-figure absolute bottom-24 left-[38%] ${paused ? "cinema-figure-curious" : ""} ${laughing ? "cinema-figure-laugh" : ""}`}
              />
              <div
                className={`cinema-figure absolute bottom-24 left-[56%] ${phase === "watching" ? "cinema-figure-lean" : ""}`}
              />

              {showRitual ? (
                <div className="absolute inset-0 bg-black/55 flex flex-col items-center justify-center gap-4">
                  <div className="flex items-end gap-2">
                    {[0, 1, 2, 3, 4].map((idx) => (
                      <span
                        key={idx}
                        className="cinema-popcorn-kernel"
                        style={{ animationDelay: `${idx * 120}ms` }}
                      />
                    ))}
                  </div>
                  <p className="text-purple-200/80 text-sm">Lights dimming…</p>
                  <p className="font-serif text-7xl leading-none text-white">{countdown > 0 ? countdown : "▶"}</p>
                </div>
              ) : null}

              {sparks.map((spark, index) => (
                <div
                  key={spark.id}
                  className={`cinema-spark ${spark.side === "left" ? "left-[18%]" : "right-[18%]"}`}
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  {SPARK_CONTROLS.find((item) => item.type === spark.type)?.emoji ?? "✨"}
                </div>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setPaused((value) => !value)}
                disabled={phase !== "watching"}
                className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs bg-white/10 hover:bg-white/15 disabled:opacity-50"
              >
                {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                {paused ? "Resume" : "Pause"}
              </button>
              <button
                type="button"
                onClick={() => setPhase("afterglow")}
                disabled={!canEndMovie}
                className="rounded-lg px-3 py-1.5 text-xs bg-white/10 hover:bg-white/15 disabled:opacity-50"
              >
                End movie
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="glass-card p-5">
        <div className="flex items-center gap-2 text-white font-semibold mb-4">
          <Sparkles className="w-4 h-4 text-yellow-300" />
          Sparks
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {SPARK_CONTROLS.map((control) => (
            <button
              key={control.type}
              type="button"
              onClick={() => triggerSpark(control.type)}
              disabled={phase !== "watching"}
              className="rounded-xl border border-purple-500/20 bg-white/5 hover:bg-white/10 disabled:opacity-50 px-3 py-2 text-left"
            >
              <p className="text-sm text-white">
                {control.emoji} {control.label}
              </p>
              <p className="text-[11px] text-purple-200/70 mt-0.5">{control.gesture}</p>
            </button>
          ))}
        </div>

        <div className="mt-4 rounded-xl border border-purple-500/20 p-3 bg-black/25">
          <p className="text-xs text-purple-200/70 mb-2">Shared reaction waveform</p>
          <div className="h-12 flex items-end gap-1">
            {reactionBars.map((height, index) => (
              <span key={`${height}-${index}`} className="cinema-wave-bar" style={{ height: `${height * 4}px` }} />
            ))}
          </div>
        </div>
      </section>

      {showAfterglow ? (
        <section className="glass-card p-6 space-y-4">
          <h3 className="text-xl font-semibold text-white">The Afterglow</h3>
          <p className="text-lg text-purple-100/90" style={{ fontFamily: "var(--font-accent)" }}>
            What did you feel?
          </p>
          <div className="grid md:grid-cols-2 gap-3">
            <textarea
              value={mySentence}
              maxLength={200}
              onChange={(event) => setMySentence(event.target.value)}
              disabled={sentencesLocked}
              placeholder="Your one sentence..."
              className="rounded-xl bg-white/5 border border-purple-500/30 p-3 text-sm outline-none focus:border-purple-400 min-h-24"
            />
            <textarea
              value={herSentence}
              maxLength={200}
              onChange={(event) => setHerSentence(event.target.value)}
              disabled={sentencesLocked}
              placeholder="Her one sentence..."
              className="rounded-xl bg-white/5 border border-purple-500/30 p-3 text-sm outline-none focus:border-purple-400 min-h-24"
            />
          </div>
          <button
            type="button"
            onClick={() => setSentencesLocked(true)}
            disabled={sentencesLocked || !mySentence.trim() || !herSentence.trim()}
            className="rounded-xl px-4 py-2 text-sm bg-purple-600/80 hover:bg-purple-600 disabled:opacity-50"
          >
            Save Cinema Memory
          </button>
          {sentencesLocked ? (
            <div className="rounded-xl border border-amber-300/25 bg-amber-200/10 px-3 py-2 text-xs text-amber-100">
              Memory bundled: paired sentences + reaction waveform + poster snapshot placeholder.
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
