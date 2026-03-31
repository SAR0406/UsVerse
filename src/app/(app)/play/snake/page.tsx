"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Gamepad2, Heart, Home, RefreshCw, Smartphone, Trophy } from "lucide-react";

type Cell = { x: number; y: number };
type MatchState = "waiting" | "playing" | "finished";
type RewardItem = { id: string; score: number; reward: string; when: string };

const GRID = 14;
const START_A: Cell = { x: 3, y: 7 };
const START_B: Cell = { x: 10, y: 7 };
const STORAGE_KEY = "usverse.play.snake.loveNest.rewards";

function wrap(value: number): number {
  if (value < 0) return GRID - 1;
  if (value >= GRID) return 0;
  return value;
}

function sameCell(a: Cell, b: Cell): boolean {
  return a.x === b.x && a.y === b.y;
}

function nextCell(from: Cell, dx: number, dy: number): Cell {
  return { x: wrap(from.x + dx), y: wrap(from.y + dy) };
}

function randomFreeCell(occupied: Cell[]): Cell {
  for (let i = 0; i < 300; i += 1) {
    const candidate = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
    if (!occupied.some((cell) => sameCell(cell, candidate))) return candidate;
  }
  return { x: 0, y: 0 };
}

function rewardLabel(score: number): string {
  if (score >= 16) return "Movie night + dessert";
  if (score >= 10) return "Cook together challenge";
  if (score >= 6) return "15-minute cuddle break";
  return "Start with a hug and play again";
}

function createRewardId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function SnakeLoveNestPage() {
  const [rewardHistory, setRewardHistory] = useState<RewardItem[]>(() => {
      if (typeof window === "undefined") return [];
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      try {
        const parsed = JSON.parse(raw) as Array<{ id?: string | number; score: number; reward: string; when: string }>;
        if (!Array.isArray(parsed)) return [];
        return parsed.slice(0, 6).map((item) => ({
          id: typeof item.id === "string" ? item.id : createRewardId(),
          score: item.score,
          reward: item.reward,
          when: item.when,
        }));
      } catch (error) {
        console.warn("Unable to restore reward history from localStorage.", error);
        return [];
      }
    },
  );
  const [partnerA, setPartnerA] = useState<Cell>(START_A);
  const [partnerB, setPartnerB] = useState<Cell>(START_B);
  const [heart, setHeart] = useState<Cell>({ x: 7, y: 7 });
  const [score, setScore] = useState(0);
  const [tickMs, setTickMs] = useState(640);
  const [round, setRound] = useState(1);
  const [matchState, setMatchState] = useState<MatchState>("waiting");
  const [sensorEnabled, setSensorEnabled] = useState(false);
  const [sensorDirection, setSensorDirection] = useState<{ dx: number; dy: number }>({ dx: 1, dy: 0 });
  const partnerARef = useRef(partnerA);
  const partnerBRef = useRef(partnerB);
  const heartRef = useRef(heart);
  const scoreRef = useRef(score);
  const tickMsRef = useRef(tickMs);
  const matchStateRef = useRef<MatchState>(matchState);

  const motionSupported = useMemo(
    () =>
      typeof window !== "undefined" &&
      ("DeviceMotionEvent" in window || "DeviceOrientationEvent" in window),
    [],
  );

  useEffect(() => {
    partnerARef.current = partnerA;
  }, [partnerA]);

  useEffect(() => {
    partnerBRef.current = partnerB;
  }, [partnerB]);

  useEffect(() => {
    heartRef.current = heart;
  }, [heart]);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    tickMsRef.current = tickMs;
  }, [tickMs]);

  useEffect(() => {
    matchStateRef.current = matchState;
  }, [matchState]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rewardHistory.slice(0, 6)));
  }, [rewardHistory]);

  useEffect(() => {
    if (!sensorEnabled) return;
    const onOrientation = (event: DeviceOrientationEvent) => {
      const gamma = event.gamma ?? 0;
      const beta = event.beta ?? 0;
      if (Math.abs(gamma) > Math.abs(beta)) {
        setSensorDirection({ dx: gamma > 8 ? 1 : gamma < -8 ? -1 : 0, dy: 0 });
      } else {
        setSensorDirection({ dx: 0, dy: beta > 8 ? 1 : beta < -8 ? -1 : 0 });
      }
    };
    window.addEventListener("deviceorientation", onOrientation);
    return () => window.removeEventListener("deviceorientation", onOrientation);
  }, [sensorEnabled]);

  useEffect(() => {
    if (matchState !== "playing") return;
    const id = window.setInterval(() => {
      if (matchStateRef.current !== "playing") return;
      const nextA = nextCell(
        partnerARef.current,
        sensorEnabled ? sensorDirection.dx : 1,
        sensorEnabled ? sensorDirection.dy : 0,
      );
      const nextB = nextCell(partnerBRef.current, -1, 0);
      setPartnerA(nextA);
      setPartnerB(nextB);
      partnerARef.current = nextA;
      partnerBRef.current = nextB;

      const occupied = [nextA, nextB];
      if (occupied.some((cell) => sameCell(cell, heartRef.current))) {
        const nextScore = scoreRef.current + 1;
        const nextTick = Math.max(320, tickMsRef.current - 20);
        const nextHeart = randomFreeCell(occupied);
        setScore(nextScore);
        setTickMs(nextTick);
        setHeart(nextHeart);
        scoreRef.current = nextScore;
        tickMsRef.current = nextTick;
        heartRef.current = nextHeart;
      }

      if (sameCell(nextA, nextB)) {
        const reward = rewardLabel(scoreRef.current);
        const item = {
          id: createRewardId(),
          score: scoreRef.current,
          reward,
          when: new Date().toLocaleString(),
        };
        setRewardHistory((current) => [item, ...current].slice(0, 6));
        setMatchState("finished");
        matchStateRef.current = "finished";
      }
    }, tickMs);
    return () => window.clearInterval(id);
  }, [matchState, sensorDirection.dx, sensorDirection.dy, sensorEnabled, tickMs]);

  const board = useMemo(() => {
    const cells: Array<{ cell: Cell; kind: "empty" | "a" | "b" | "heart" }> = [];
    for (let y = 0; y < GRID; y += 1) {
      for (let x = 0; x < GRID; x += 1) {
        const cell = { x, y };
        let kind: "empty" | "a" | "b" | "heart" = "empty";
        if (sameCell(cell, heart)) kind = "heart";
        if (sameCell(cell, partnerA)) kind = "a";
        if (sameCell(cell, partnerB)) kind = "b";
        cells.push({ cell, kind });
      }
    }
    return cells;
  }, [heart, partnerA, partnerB]);

  const rewardNow = rewardLabel(score);

  const startRound = () => {
    setMatchState("playing");
    setPartnerA(START_A);
    setPartnerB(START_B);
    setHeart({ x: 7, y: 7 });
    setScore(0);
    setTickMs(640);
  };

  const nextRound = () => {
    setRound((value) => value + 1);
    startRound();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <header className="glass-card p-6 border border-purple-400/20">
        <div className="flex items-center gap-2 text-purple-300/70 text-xs tracking-wide uppercase mb-3">
          <Gamepad2 className="w-4 h-4" />
          Multiplayer /play/snake
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Snake: Love Nest Co-op</h1>
        <p className="text-sm text-purple-200/80">
          Two lovers share one tiny house board. Collect hearts, avoid crashing into each other too
          soon, and unlock real-life date rewards.
        </p>
      </header>

      <section className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-purple-200/80">Round {round}</div>
            <div className="text-sm text-pink-200">Score: {score}</div>
          </div>
          <div
            className="grid gap-1 bg-black/20 p-3 rounded-2xl"
            style={{ gridTemplateColumns: "repeat(14, minmax(0, 1fr))" }}
          >
            {board.map(({ cell, kind }) => (
              <div
                key={`${cell.x}-${cell.y}`}
                className={`aspect-square rounded-sm ${
                  kind === "a"
                    ? "bg-pink-400/90"
                    : kind === "b"
                      ? "bg-indigo-300/90"
                      : kind === "heart"
                        ? "bg-rose-300/90 animate-pulse"
                        : "bg-white/10"
                }`}
              />
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            {matchState !== "playing" ? (
              <button
                type="button"
                onClick={startRound}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium bg-purple-600/75 hover:bg-purple-600/95 transition-colors"
              >
                <Heart className="w-4 h-4" />
                {matchState === "waiting" ? "Start together" : "Replay"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setMatchState("finished")}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium bg-zinc-700/70 hover:bg-zinc-700/90 transition-colors"
              >
                Pause round
              </button>
            )}
            <button
              type="button"
              onClick={nextRound}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium bg-pink-500/70 hover:bg-pink-500/90 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              New round
            </button>
          </div>
          <p className="mt-3 text-xs text-purple-200/70">
            Controls: Partner A uses phone tilt when sensor mode is on (or auto-glide if off). Partner B
            glides opposite to create co-op tension.
          </p>
        </div>

        <div className="space-y-4">
          <div className="glass-card p-5">
            <h2 className="text-lg font-semibold text-white mb-2">Modes mix</h2>
            <ul className="space-y-2 text-sm text-purple-200/80">
              <li>• Romantic: collect hearts to unlock date missions.</li>
              <li>• Normal arcade: race score and survive longer rounds.</li>
              <li>• Sensor play: tilt-enabled movement on mobile devices.</li>
              <li>• House-life idea: this board is your shared home nest.</li>
            </ul>
          </div>

          <div className="glass-card p-5">
            <h3 className="text-white font-semibold mb-3">Real-life reward tracker</h3>
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-emerald-400/20 text-emerald-200 text-sm">
              <Trophy className="w-4 h-4" />
              Current unlock: {rewardNow}
            </div>
            <ul className="mt-3 space-y-2 text-xs text-purple-200/80">
              {rewardHistory.length === 0 ? (
                <li className="text-purple-300/60">No completed rounds yet.</li>
              ) : (
                rewardHistory.map((item) => (
                  <li key={item.id} className="rounded-xl bg-white/5 px-3 py-2">
                    {item.when} — Score {item.score}: {item.reward}
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="glass-card p-5">
            <h3 className="text-white font-semibold mb-3">Device features</h3>
            <div className="space-y-2 text-sm text-purple-200/80">
              <button
                type="button"
                disabled={!motionSupported}
                onClick={() => setSensorEnabled((value) => !value)}
                className={`w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 font-medium transition-colors ${
                  motionSupported
                    ? sensorEnabled
                      ? "bg-sky-500/80 hover:bg-sky-500"
                      : "bg-sky-500/50 hover:bg-sky-500/70"
                    : "bg-zinc-700/50 text-zinc-300 cursor-not-allowed"
                }`}
              >
                <Smartphone className="w-4 h-4" />
                {motionSupported
                  ? sensorEnabled
                    ? "Sensor mode on"
                    : "Enable sensor mode"
                  : "Sensors unavailable on this device"}
              </button>
              <button
                type="button"
                disabled
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 font-medium bg-zinc-700/50 text-zinc-300 cursor-not-allowed"
              >
                <Camera className="w-4 h-4" />
                Camera vibe mode (coming soon)
              </button>
              <p className="text-xs text-purple-300/70">
                Camera/AR are shown as a safe placeholder here so gameplay stays stable without requiring
                permissions during first load.
              </p>
            </div>
          </div>

          <div className="glass-card p-5">
            <h3 className="text-white font-semibold mb-2">Next expansion: shared house life</h3>
            <p className="text-sm text-purple-200/80">
              We can extend this into a persistent co-op house where both partners collect energy, cook,
              decorate rooms, and grow relationship stats together.
            </p>
            <div className="mt-3 inline-flex items-center gap-2 text-xs text-purple-300/70">
              <Home className="w-3.5 h-3.5" />
              This route is the MVP foundation for that larger multiplayer world.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
