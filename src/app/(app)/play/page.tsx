"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Crown, Gamepad2, Heart, Home, Sparkles } from "lucide-react";

type GameId = "wavelength" | "eclipse" | "telepathy" | "world-builder" | "gravity";

type ArcadeMachine = {
  id: GameId;
  title: string;
  machine: string;
  concept: string;
  emoji: string;
};

const ARCADE_MACHINES: ArcadeMachine[] = [
  {
    id: "wavelength",
    title: "Wavelength",
    machine: "Vintage television",
    concept: "Read the same abstract visual and see whether your feelings align.",
    emoji: "📺",
  },
  {
    id: "eclipse",
    title: "Eclipse",
    machine: "Circular telescope",
    concept: "Test memory details and let your relationship constellation evolve.",
    emoji: "🔭",
  },
  {
    id: "telepathy",
    title: "Telepathy",
    machine: "Glowing radio",
    concept: "Communicate an emotion with only color, hum, and a hand-drawn gesture.",
    emoji: "📻",
  },
  {
    id: "world-builder",
    title: "World Builder",
    machine: "Typewriter desk",
    concept: "Write one sentence each and build a living shared novella.",
    emoji: "⌨️",
  },
  {
    id: "gravity",
    title: "Gravity",
    machine: "Retro arcade cabinet",
    concept: "Tilt together to move one shared ball into a target you can't solve alone.",
    emoji: "🕹️",
  },
];

const LAST_PLAYED_STORAGE_KEY = "usverse.play.lastPlayed";

function isGameId(value: string): value is GameId {
  return ARCADE_MACHINES.some((machine) => machine.id === value);
}

function getArcadeRhythm(now: Date): { recommendedGame: GameId; partnerActiveGame: GameId | null } {
  const day = now.getDate();
  const hour = now.getHours();
  const recommendedGame = ARCADE_MACHINES[day % ARCADE_MACHINES.length].id;
  const activeMachine = ARCADE_MACHINES[(day + hour) % ARCADE_MACHINES.length].id;
  return {
    recommendedGame,
    partnerActiveGame: activeMachine === recommendedGame ? null : activeMachine,
  };
}

export default function PlayPage() {
  const { recommendedGame, partnerActiveGame } = useMemo(
    () => getArcadeRhythm(new Date()),
    [],
  );
  const [selectedGame, setSelectedGame] = useState<GameId>(recommendedGame);
  const [lastPlayed, setLastPlayed] = useState<GameId | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = window.localStorage.getItem(LAST_PLAYED_STORAGE_KEY);
    return stored && isGameId(stored) ? stored : null;
  });
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setPrefersReducedMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!lastPlayed) return;
    window.localStorage.setItem(LAST_PLAYED_STORAGE_KEY, lastPlayed);
  }, [lastPlayed]);

  const selectedMachine = useMemo(
    () => ARCADE_MACHINES.find((machine) => machine.id === selectedGame) ?? ARCADE_MACHINES[0],
    [selectedGame],
  );

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <header className="glass-card p-6">
        <div className="flex items-center gap-2 text-purple-300/70 text-xs tracking-wide uppercase mb-3">
          <Gamepad2 className="w-4 h-4" />
          The Arcade
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Play Universe</h1>
        <p className="text-sm text-purple-200/80">
          This should feel like wandering through a tiny midnight arcade built for two hearts.
        </p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ARCADE_MACHINES.map((machine, index) => {
          const isRecommended = machine.id === recommendedGame;
          const isPartnerActive = machine.id === partnerActiveGame;
          const isLastPlayed = machine.id === lastPlayed;
          const isSelected = machine.id === selectedGame;
          return (
            <button
              key={machine.id}
              type="button"
              onClick={() => setSelectedGame(machine.id)}
              className={`glass-card text-left p-5 border transition-transform ${
                isSelected ? "border-purple-400/50 scale-[1.01]" : "border-purple-500/10"
              } ${prefersReducedMotion ? "" : "hover:scale-[1.02]"}`}
              style={!prefersReducedMotion ? { animationDelay: `${index * 100}ms` } : undefined}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className={`text-2xl ${prefersReducedMotion ? "" : "animate-float"}`}>
                  {machine.emoji}
                </div>
                <div className="flex gap-2">
                  {isRecommended ? (
                    <span className="text-[10px] uppercase tracking-wide px-2 py-1 rounded-full bg-amber-400/20 text-amber-200">
                      Spotlight
                    </span>
                  ) : null}
                  {isLastPlayed ? (
                    <span className="text-[10px] uppercase tracking-wide px-2 py-1 rounded-full bg-emerald-400/20 text-emerald-200">
                      1-UP
                    </span>
                  ) : null}
                </div>
              </div>

              <h2 className="text-white font-semibold">{machine.title}</h2>
              <p className="text-xs text-purple-200/60 mt-1">{machine.machine}</p>
              <p className="text-xs text-purple-300/60 leading-relaxed mt-3">{machine.concept}</p>

              {isPartnerActive ? (
                <div className="mt-4 inline-flex items-center gap-1 text-[11px] text-pink-200 bg-pink-400/15 px-2 py-1 rounded-full">
                  <Sparkles className="w-3 h-3" />
                  She is here right now
                </div>
              ) : null}
            </button>
          );
        })}
      </section>

      <section className="glass-card p-6 border border-pink-400/20">
        <div className="flex items-center gap-2 text-pink-200/80 text-xs tracking-wide uppercase mb-3">
          <Heart className="w-4 h-4" />
          New couple mode
        </div>
        <h2 className="text-xl font-semibold text-white">Snake + Love Nest Co-op</h2>
        <p className="text-sm text-purple-200/80 mt-2">
          A multiplayer page for two people on desktop or mobile with romantic co-op, sensor play,
          and real-life rewards tracking.
        </p>
        <Link
          href="/play/snake"
          className="mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium bg-pink-500/70 hover:bg-pink-500/90 transition-colors"
        >
          <Gamepad2 className="w-4 h-4" />
          Open /play/snake
        </Link>
        <Link
          href="/play/love-nest"
          className="mt-3 ml-3 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium bg-indigo-500/60 hover:bg-indigo-500/80 transition-colors"
        >
          <Home className="w-4 h-4" />
          Open /play/love-nest
        </Link>
      </section>

      <section className="glass-card p-6">
        <p className="text-xs uppercase tracking-wide text-purple-300/60 mb-2">Selected machine</p>
        <h3 className="text-xl text-white font-semibold">{selectedMachine.title}</h3>
        <p className="text-sm text-purple-200/70 mt-2">{selectedMachine.concept}</p>
        <button
          type="button"
          onClick={() => setLastPlayed(selectedMachine.id)}
          className="mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium bg-purple-600/70 hover:bg-purple-600/90 transition-colors"
        >
          <Crown className="w-4 h-4" />
          Mark as last played
        </button>
        <div className="mt-4 text-xs text-purple-300/70">
          Ready for watch-together mode?{" "}
          <Link href="/cinema" className="text-purple-200 underline underline-offset-2 hover:text-white">
            Enter Cinema
          </Link>
        </div>
      </section>
    </div>
  );
}
