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
  href?: string;
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
    href: "/play/gravity",
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
    <div className="mobile-px py-4 sm:p-6 max-w-5xl mx-auto space-y-4 sm:space-y-6">
      <header className="glass-card p-4 sm:p-6">
        <div className="flex items-center gap-2 text-purple-300/70 text-[10px] sm:text-xs tracking-wide uppercase mb-2 sm:mb-3">
          <Gamepad2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          The Arcade
        </div>
        <h1 className="text-mobile-3xl sm:text-3xl font-bold text-white mb-2">Play Universe</h1>
        <p className="text-mobile-sm sm:text-sm text-purple-200/80 leading-relaxed">
          This should feel like wandering through a tiny midnight arcade built for two hearts.
        </p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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
              className={`tap-target glass-card text-left p-4 sm:p-5 border transition-transform touch-pressable active:scale-95 ${
                isSelected ? "border-purple-400/50 scale-[1.01]" : "border-purple-500/10"
              } ${prefersReducedMotion ? "" : "hover:scale-[1.02]"}`}
              style={!prefersReducedMotion ? { animationDelay: `${index * 100}ms` } : undefined}
            >
              <div className="flex items-start justify-between gap-3 mb-2 sm:mb-3">
                <div className={`text-2xl sm:text-3xl ${prefersReducedMotion ? "" : "animate-float"}`}>
                  {machine.emoji}
                </div>
                <div className="flex gap-1.5 sm:gap-2 flex-wrap justify-end">
                  {isRecommended ? (
                    <span className="text-[9px] sm:text-[10px] uppercase tracking-wide px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full bg-amber-400/20 text-amber-200">
                      Spotlight
                    </span>
                  ) : null}
                  {isLastPlayed ? (
                    <span className="text-[9px] sm:text-[10px] uppercase tracking-wide px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full bg-emerald-400/20 text-emerald-200">
                      1-UP
                    </span>
                  ) : null}
                </div>
              </div>

              <h2 className="text-sm sm:text-base text-white font-semibold leading-tight">{machine.title}</h2>
              <p className="text-[11px] sm:text-xs text-purple-200/60 mt-0.5 sm:mt-1 leading-relaxed">{machine.machine}</p>
              <p className="text-[11px] sm:text-xs text-purple-300/60 leading-relaxed mt-2 sm:mt-3">{machine.concept}</p>

              {machine.href ? (
                <Link
                  href={machine.href}
                  onClick={(e) => e.stopPropagation()}
                  className="tap-target mt-2 sm:mt-3 inline-flex items-center gap-1 text-[10px] sm:text-[11px] text-purple-100 bg-purple-500/40 hover:bg-purple-500/60 px-2 py-1 rounded-full transition-colors touch-pressable"
                >
                  <Gamepad2 className="w-3 h-3" />
                  Play now
                </Link>
              ) : null}

              {isPartnerActive ? (
                <div className="mt-3 sm:mt-4 inline-flex items-center gap-1 text-[10px] sm:text-[11px] text-pink-200 bg-pink-400/15 px-2 py-1 rounded-full">
                  <Sparkles className="w-3 h-3" />
                  She is here right now
                </div>
              ) : null}
            </button>
          );
        })}
      </section>

      <section className="glass-card p-4 sm:p-6 border border-pink-400/20">
        <div className="flex items-center gap-2 text-pink-200/80 text-[10px] sm:text-xs tracking-wide uppercase mb-2 sm:mb-3">
          <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          New couple mode
        </div>
        <h2 className="text-mobile-xl sm:text-xl font-semibold text-white">Choose your couple mode</h2>
        <p className="text-mobile-sm sm:text-sm text-purple-200/80 mt-2 leading-relaxed">
          Pick between fast romantic Snake rounds or dive into the full shared house-life experience.
        </p>
        <div className="mt-3 sm:mt-4 flex flex-wrap gap-2 sm:gap-3">
          <Link
            href="/play/snake"
            className="tap-target inline-flex items-center gap-2 rounded-xl px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium bg-pink-500/70 hover:bg-pink-500/90 transition-colors touch-pressable active:scale-95"
          >
            <Gamepad2 className="w-4 h-4" />
            Snake Love Nest
          </Link>
          <Link
            href="/play/love-nest"
            className="tap-target inline-flex items-center gap-2 rounded-xl px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium bg-indigo-500/60 hover:bg-indigo-500/80 transition-colors touch-pressable active:scale-95"
          >
            <Home className="w-4 h-4" />
            Our Home 🏡 — full game
          </Link>
        </div>
      </section>

      <section className="glass-card p-4 sm:p-6">
        <p className="text-[10px] sm:text-xs uppercase tracking-wide text-purple-300/60 mb-2">Selected machine</p>
        <h3 className="text-mobile-lg sm:text-xl text-white font-semibold">{selectedMachine.title}</h3>
        <p className="text-mobile-sm sm:text-sm text-purple-200/70 mt-2 leading-relaxed">{selectedMachine.concept}</p>
        <button
          type="button"
          onClick={() => setLastPlayed(selectedMachine.id)}
          className="tap-target mt-3 sm:mt-4 inline-flex items-center gap-2 rounded-xl px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium bg-purple-600/70 hover:bg-purple-600/90 transition-colors touch-pressable active:scale-95"
        >
          <Crown className="w-4 h-4" />
          Mark as last played
        </button>
        <div className="mt-3 sm:mt-4 text-[11px] sm:text-xs text-purple-300/70">
          Ready for watch-together mode?{" "}
          <Link href="/cinema" className="text-purple-200 underline underline-offset-2 hover:text-white transition-colors">
            Enter Cinema
          </Link>
        </div>
      </section>
    </div>
  );
}
