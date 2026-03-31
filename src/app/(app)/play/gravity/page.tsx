"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Gamepad2, Smartphone, Target, Trophy } from "lucide-react";

type Phase = "idle" | "playing" | "won" | "lost";
type RoundRecord = { id: string; round: number; timeMs: number; reward: string; when: string };

const AREA = 360;
const BALL_R = 14;
const TARGET_R = 20;
const FRICTION = 0.87;
const KEY_FORCE = 0.55;
const SENSOR_SCALE = 0.5;
const MAX_VEL = 7;
const TIME_LIMIT_MS = 60_000;
const STORAGE_KEY = "usverse.play.gravity.history";

function randomTarget(excludeX: number, excludeY: number): { x: number; y: number } {
  const margin = 48;
  for (let i = 0; i < 40; i += 1) {
    const x = margin + Math.random() * (AREA - 2 * margin);
    const y = margin + Math.random() * (AREA - 2 * margin);
    const dx = x - excludeX;
    const dy = y - excludeY;
    if (Math.sqrt(dx * dx + dy * dy) > 80) return { x, y };
  }
  return { x: margin, y: margin };
}

function rewardLabel(ms: number): string {
  if (ms < 8_000) return "Express date — pick anywhere and go right now";
  if (ms < 20_000) return "Cook a meal together tonight";
  if (ms < 40_000) return "Movie night at home";
  return "Warm long hug and replay tomorrow";
}

function makeId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function GravityPage() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [history, setHistory] = useState<RoundRecord[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as unknown[];
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter(
          (item): item is RoundRecord =>
            typeof item === "object" &&
            item !== null &&
            typeof (item as RoundRecord).id === "string" &&
            typeof (item as RoundRecord).round === "number" &&
            typeof (item as RoundRecord).timeMs === "number" &&
            typeof (item as RoundRecord).reward === "string" &&
            typeof (item as RoundRecord).when === "string",
        )
        .slice(0, 5);
    } catch {
      return [];
    }
  });
  const [sensorMode, setSensorMode] = useState(false);
  const [ballPos, setBallPos] = useState({ x: AREA / 2, y: AREA / 2 });
  const [targetPos, setTargetPos] = useState(() =>
    randomTarget(AREA / 2, AREA / 2),
  );
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT_MS);

  const sensorSupported = useMemo(
    () => typeof window !== "undefined" && "DeviceOrientationEvent" in window,
    [],
  );

  // Physics state lives in refs so the animation loop never triggers re-renders.
  const ballRef = useRef({ x: AREA / 2, y: AREA / 2, vx: 0, vy: 0 });
  const targetRef = useRef(targetPos);
  const inputRef = useRef({ ax: 0, ay: 0 });
  const keysRef = useRef<Set<string>>(new Set());
  const frameRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);
  const phaseRef = useRef<Phase>("idle");
  const roundRef = useRef(round);

  useEffect(() => {
    roundRef.current = round;
  }, [round]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 5)));
  }, [history]);

  // Keyboard listeners — active regardless of game phase so players can practice aim.
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => keysRef.current.add(e.key);
    const onUp = (e: KeyboardEvent) => keysRef.current.delete(e.key);
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  // Device orientation — only when sensor mode is active.
  useEffect(() => {
    if (!sensorMode) {
      inputRef.current.ax = 0;
      inputRef.current.ay = 0;
      return;
    }
    const onOrientation = (e: DeviceOrientationEvent) => {
      const gamma = e.gamma ?? 0; // left-right tilt → horizontal
      // beta: subtract ~20° to compensate for the natural forward-tilted hold angle of a phone,
      // so "flat on table" maps to zero vertical force.
      const beta = (e.beta ?? 0) - 20;
      inputRef.current.ax = (gamma / 90) * SENSOR_SCALE;
      inputRef.current.ay = (beta / 90) * SENSOR_SCALE;
    };
    window.addEventListener("deviceorientation", onOrientation);
    return () => window.removeEventListener("deviceorientation", onOrientation);
  }, [sensorMode]);

  // Main animation loop — starts/stops with phase.
  useEffect(() => {
    if (phase !== "playing") {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      return;
    }

    function tick() {
      if (phaseRef.current !== "playing") return;

      // Keyboard input supersedes sensor when sensor mode is off.
      if (!sensorMode) {
        const k = keysRef.current;
        const left = k.has("a") || k.has("A") || k.has("ArrowLeft");
        const right = k.has("d") || k.has("D") || k.has("ArrowRight");
        const up = k.has("w") || k.has("W") || k.has("ArrowUp");
        const down = k.has("s") || k.has("S") || k.has("ArrowDown");
        inputRef.current.ax = left ? -KEY_FORCE : right ? KEY_FORCE : 0;
        inputRef.current.ay = up ? -KEY_FORCE : down ? KEY_FORCE : 0;
      }

      // Apply physics.
      const b = ballRef.current;
      b.vx = Math.min(MAX_VEL, Math.max(-MAX_VEL, b.vx * FRICTION + inputRef.current.ax));
      b.vy = Math.min(MAX_VEL, Math.max(-MAX_VEL, b.vy * FRICTION + inputRef.current.ay));
      b.x += b.vx;
      b.y += b.vy;

      // Boundary bounce.
      if (b.x < BALL_R) { b.x = BALL_R; b.vx *= -0.55; }
      if (b.x > AREA - BALL_R) { b.x = AREA - BALL_R; b.vx *= -0.55; }
      if (b.y < BALL_R) { b.y = BALL_R; b.vy *= -0.55; }
      if (b.y > AREA - BALL_R) { b.y = AREA - BALL_R; b.vy *= -0.55; }

      setBallPos({ x: b.x, y: b.y });

      // Win check.
      const t = targetRef.current;
      const dx = b.x - t.x;
      const dy = b.y - t.y;
      if (Math.sqrt(dx * dx + dy * dy) < BALL_R + TARGET_R) {
        const timeMs = Date.now() - startTimeRef.current;
        const record: RoundRecord = {
          id: makeId(),
          round: roundRef.current,
          timeMs,
          reward: rewardLabel(timeMs),
          when: new Date().toLocaleString(),
        };
        phaseRef.current = "won";
        setPhase("won");
        setScore((prev) => prev + 1);
        setHistory((prev) => [record, ...prev].slice(0, 5));
        return;
      }

      // Time limit.
      const elapsed = Date.now() - startTimeRef.current;
      setTimeLeft(TIME_LIMIT_MS - elapsed);
      if (elapsed >= TIME_LIMIT_MS) {
        phaseRef.current = "lost";
        setPhase("lost");
        return;
      }

      frameRef.current = requestAnimationFrame(tick);
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [phase, sensorMode]);

  function startRound() {
    const center = { x: AREA / 2, y: AREA / 2 };
    const newTarget = randomTarget(center.x, center.y);
    targetRef.current = newTarget;
    setTargetPos(newTarget);
    ballRef.current = { x: center.x, y: center.y, vx: 0, vy: 0 };
    setBallPos(center);
    setTimeLeft(TIME_LIMIT_MS);
    startTimeRef.current = Date.now();
    phaseRef.current = "playing";
    setPhase("playing");
  }

  function nextRound() {
    setRound((r) => r + 1);
    startRound();
  }

  const timeLeftSec = Math.ceil(timeLeft / 1000);
  const latestReward = history[0]?.reward ?? rewardLabel(TIME_LIMIT_MS);
  const overlayEmoji = phase === "won" ? "🎯" : phase === "lost" ? "⏰" : "🕹️";
  const overlayText =
    phase === "won" ? "You reached it!" : phase === "lost" ? "Time's up!" : "Gravity awaits";

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <header className="glass-card p-6 border border-purple-400/20">
        <div className="flex items-center gap-2 text-purple-300/70 text-xs tracking-wide uppercase mb-3">
          <Gamepad2 className="w-4 h-4" />
          Arcade machine · Gravity
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Gravity</h1>
        <p className="text-sm text-purple-200/80">
          Tilt or steer together to move one shared ball into the glowing star — a puzzle you
          cannot solve alone.
        </p>
        <Link
          href="/play"
          className="mt-3 inline-flex items-center gap-1 text-xs text-purple-300/70 hover:text-purple-200 transition-colors"
        >
          <ChevronLeft className="w-3 h-3" />
          Back to arcade
        </Link>
      </header>

      <section className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
        {/* Play board */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3 text-sm text-purple-200/80">
            <span>Round {round}</span>
            <span>Score: {score}</span>
            {phase === "playing" && (
              <span className={timeLeftSec <= 10 ? "text-rose-300 font-semibold" : ""}>
                {timeLeftSec}s
              </span>
            )}
          </div>

          <div
            className="relative bg-black/20 rounded-2xl overflow-hidden mx-auto select-none"
            style={{ width: AREA, height: AREA, maxWidth: "100%" }}
          >
            {/* Target star */}
            <div
              className="absolute rounded-full bg-amber-400/80 animate-pulse flex items-center justify-center"
              style={{
                width: TARGET_R * 2,
                height: TARGET_R * 2,
                left: targetPos.x - TARGET_R,
                top: targetPos.y - TARGET_R,
              }}
            >
              <Target className="w-4 h-4 text-amber-900" />
            </div>

            {/* Ball */}
            <div
              className="absolute rounded-full bg-gradient-to-br from-pink-400 to-indigo-400 shadow-lg"
              style={{
                width: BALL_R * 2,
                height: BALL_R * 2,
                left: ballPos.x - BALL_R,
                top: ballPos.y - BALL_R,
                transition: "none",
              }}
            />

            {/* Idle / won / lost overlay */}
            {phase !== "playing" && (
              <div className="absolute inset-0 bg-black/45 flex items-center justify-center rounded-2xl">
                <div className="text-center space-y-2">
                  <div className="text-5xl">{overlayEmoji}</div>
                  <p className="text-white font-semibold">{overlayText}</p>
                  {phase === "won" && history[0] && (
                    <p className="text-xs text-emerald-300 px-4">
                      {(history[0].timeMs / 1000).toFixed(1)}s — {history[0].reward}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            {phase !== "playing" ? (
              <button
                type="button"
                onClick={phase === "won" ? nextRound : startRound}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium bg-purple-600/75 hover:bg-purple-600/95 transition-colors"
              >
                {phase === "idle" ? "Start together" : phase === "won" ? "Next round" : "Try again"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  phaseRef.current = "idle";
                  setPhase("idle");
                }}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium bg-zinc-700/70 hover:bg-zinc-700/90 transition-colors"
              >
                Pause
              </button>
            )}
          </div>

          <p className="mt-3 text-xs text-purple-200/70">
            Keyboard: A/D or ←/→ for horizontal · W/S or ↑/↓ for vertical. Two players, one
            ball, one star — cooperate or fail.
          </p>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Sensor toggle */}
          <div className="glass-card p-5">
            <h3 className="text-white font-semibold mb-3">Sensor tilt mode</h3>
            <button
              type="button"
              disabled={!sensorSupported}
              onClick={() => setSensorMode((v) => !v)}
              className={`w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                sensorSupported
                  ? sensorMode
                    ? "bg-sky-500/80 hover:bg-sky-500"
                    : "bg-sky-500/60 hover:bg-sky-500/80"
                  : "bg-zinc-700/50 text-zinc-300 cursor-not-allowed"
              }`}
            >
              <Smartphone className="w-4 h-4" />
              {sensorSupported
                ? sensorMode
                  ? "Tilt mode on"
                  : "Enable tilt mode"
                : "Tilt not available"}
            </button>
            <p className="text-xs text-purple-200/70 mt-2">
              Tilt your phone left/right and forward/back to steer the ball together.
            </p>
          </div>

          {/* Reward tracker */}
          <div className="glass-card p-5">
            <h3 className="text-white font-semibold mb-2">Real-world reward</h3>
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-2 bg-emerald-400/20 text-emerald-200 text-sm">
              <Trophy className="w-4 h-4" />
              {latestReward}
            </div>
            <ul className="mt-3 space-y-2 text-xs text-purple-200/80">
              {history.length === 0 ? (
                <li className="text-purple-300/60">No rounds completed yet.</li>
              ) : (
                history.map((rec) => (
                  <li key={rec.id} className="rounded-xl bg-white/5 px-3 py-2">
                    Round {rec.round} · {(rec.timeMs / 1000).toFixed(1)}s — {rec.reward}
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* Controls reference */}
          <div className="glass-card p-5">
            <h3 className="text-white font-semibold mb-2">Controls</h3>
            <ul className="text-sm text-purple-200/80 space-y-1">
              <li>⬅️➡️ A / D or ← / → — horizontal</li>
              <li>⬆️⬇️ W / S or ↑ / ↓ — vertical</li>
              <li>📱 Tilt — when sensor mode is enabled</li>
              <li>🎯 Reach the glowing star before time runs out</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
