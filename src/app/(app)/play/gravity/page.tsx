"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Gamepad2,
  Smartphone,
  Target,
  Trophy,
  Users,
  Waves,
} from "lucide-react";
import { vibrateCelebrate, vibratePress, vibrateTap } from "@/lib/haptics";

type Phase = "idle" | "playing" | "won" | "lost";
type RoundRecord = { id: string; round: number; timeMs: number; reward: string; when: string };
type TiltBroadcast = {
  type: "tilt";
  sender: string;
  ax: number;
  ay: number;
  sentAt: number;
};
type TrailPoint = {
  id: string;
  x: number;
  y: number;
  life: number;
  mix: number;
};

const AREA = 360;
const BALL_R = 14;
const TARGET_R = 20;
const FRICTION = 0.87;
const KEY_FORCE = 0.55;
const SENSOR_SCALE = 0.5;
const MAX_VEL = 7;
const TIME_LIMIT_MS = 60_000;
const STORAGE_KEY = "usverse.play.gravity.history";
const BLEND_STORAGE_KEY = "usverse.play.gravity.blend";
const CHANNEL_NAME = "usverse.play.gravity.tilt";
const PARTNER_TIMEOUT_MS = 2800;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function lerp(start: number, end: number, amount: number): number {
  return start + (end - start) * amount;
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "").trim();
  const full =
    normalized.length === 3
      ? `${normalized[0]}${normalized[0]}${normalized[1]}${normalized[1]}${normalized[2]}${normalized[2]}`
      : normalized;
  return [
    Number.parseInt(full.slice(0, 2), 16),
    Number.parseInt(full.slice(2, 4), 16),
    Number.parseInt(full.slice(4, 6), 16),
  ];
}

function mixHex(left: string, right: string, amount: number): string {
  const [lr, lg, lb] = hexToRgb(left);
  const [rr, rg, rb] = hexToRgb(right);
  const red = Math.round(lerp(lr, rr, amount));
  const green = Math.round(lerp(lg, rg, amount));
  const blue = Math.round(lerp(lb, rb, amount));
  return `rgb(${red}, ${green}, ${blue})`;
}

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
  if (ms < 8_000) return "Express date - pick anywhere and go right now";
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
  const [targetPos, setTargetPos] = useState(() => randomTarget(AREA / 2, AREA / 2));
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT_MS);
  const [trailPoints, setTrailPoints] = useState<TrailPoint[]>([]);
  const [partnerActive, setPartnerActive] = useState(false);
  const [partnerTilt, setPartnerTilt] = useState({ ax: 0, ay: 0 });
  const [blendRatio, setBlendRatio] = useState(() => {
    if (typeof window === "undefined") return 0.3;
    const raw = Number(window.localStorage.getItem(BLEND_STORAGE_KEY));
    if (Number.isFinite(raw)) return clamp(raw, 0.08, 0.92);
    return 0.3;
  });

  const sensorSupported = useMemo(
    () => typeof window !== "undefined" && "DeviceOrientationEvent" in window,
    [],
  );
  const channelAvailable = useMemo(() => typeof BroadcastChannel !== "undefined", []);

  const ballRef = useRef({ x: AREA / 2, y: AREA / 2, vx: 0, vy: 0 });
  const targetRef = useRef(targetPos);
  const localInputRef = useRef({ ax: 0, ay: 0 });
  const keysRef = useRef<Set<string>>(new Set());
  const frameRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);
  const phaseRef = useRef<Phase>("idle");
  const roundRef = useRef(round);
  const contributionRef = useRef({ partnerShareSum: 0, frames: 0 });

  const sessionIdRef = useRef(makeId());
  const channelRef = useRef<BroadcastChannel | null>(null);
  const lastBroadcastRef = useRef(0);
  const partnerInputRef = useRef({ ax: 0, ay: 0, updatedAt: 0 });

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    roundRef.current = round;
  }, [round]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 5)));
  }, [history]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(BLEND_STORAGE_KEY, String(blendRatio));
  }, [blendRatio]);

  useEffect(() => {
    if (!channelAvailable) return;

    const channel = new BroadcastChannel(CHANNEL_NAME);
    channelRef.current = channel;

    channel.onmessage = (event: MessageEvent<TiltBroadcast>) => {
      const payload = event.data;
      if (!payload || payload.type !== "tilt") return;
      if (payload.sender === sessionIdRef.current) return;
      partnerInputRef.current = {
        ax: clamp(payload.ax, -1, 1),
        ay: clamp(payload.ay, -1, 1),
        updatedAt: payload.sentAt,
      };
      setPartnerTilt({ ax: payload.ax, ay: payload.ay });
      setPartnerActive(true);
    };

    const staleWatcher = window.setInterval(() => {
      const stale = Date.now() - partnerInputRef.current.updatedAt > PARTNER_TIMEOUT_MS;
      if (stale) {
        setPartnerActive(false);
        setPartnerTilt({ ax: 0, ay: 0 });
      }
    }, 300);

    return () => {
      window.clearInterval(staleWatcher);
      channel.close();
      channelRef.current = null;
    };
  }, [channelAvailable]);

  function broadcastLocalTilt(ax: number, ay: number) {
    const channel = channelRef.current;
    if (!channel) return;
    const now = Date.now();
    if (now - lastBroadcastRef.current < 95) return;
    lastBroadcastRef.current = now;
    const payload: TiltBroadcast = {
      type: "tilt",
      sender: sessionIdRef.current,
      ax: clamp(ax, -1, 1),
      ay: clamp(ay, -1, 1),
      sentAt: now,
    };
    channel.postMessage(payload);
  }

  useEffect(() => {
    const onDown = (event: KeyboardEvent) => keysRef.current.add(event.key);
    const onUp = (event: KeyboardEvent) => keysRef.current.delete(event.key);
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  useEffect(() => {
    if (!sensorMode) {
      localInputRef.current.ax = 0;
      localInputRef.current.ay = 0;
      return;
    }
    const onOrientation = (event: DeviceOrientationEvent) => {
      const gamma = event.gamma ?? 0;
      const beta = (event.beta ?? 0) - 20;
      localInputRef.current.ax = clamp((gamma / 90) * SENSOR_SCALE, -1, 1);
      localInputRef.current.ay = clamp((beta / 90) * SENSOR_SCALE, -1, 1);
      if (phaseRef.current === "playing") {
        broadcastLocalTilt(localInputRef.current.ax, localInputRef.current.ay);
      }
    };
    window.addEventListener("deviceorientation", onOrientation);
    return () => window.removeEventListener("deviceorientation", onOrientation);
  }, [sensorMode]);

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

      let localAx = localInputRef.current.ax;
      let localAy = localInputRef.current.ay;

      if (!sensorMode) {
        const keys = keysRef.current;
        const left = keys.has("a") || keys.has("A") || keys.has("ArrowLeft");
        const right = keys.has("d") || keys.has("D") || keys.has("ArrowRight");
        const up = keys.has("w") || keys.has("W") || keys.has("ArrowUp");
        const down = keys.has("s") || keys.has("S") || keys.has("ArrowDown");
        localAx = left ? -KEY_FORCE : right ? KEY_FORCE : 0;
        localAy = up ? -KEY_FORCE : down ? KEY_FORCE : 0;
        localInputRef.current.ax = localAx;
        localInputRef.current.ay = localAy;
      }

      broadcastLocalTilt(localAx, localAy);

      const partnerFresh = Date.now() - partnerInputRef.current.updatedAt < PARTNER_TIMEOUT_MS;
      const partnerAx = partnerFresh ? partnerInputRef.current.ax : 0;
      const partnerAy = partnerFresh ? partnerInputRef.current.ay : 0;

      const combinedAx = localAx + partnerAx * 0.92;
      const combinedAy = localAy + partnerAy * 0.92;

      const ball = ballRef.current;
      ball.vx = Math.min(MAX_VEL, Math.max(-MAX_VEL, ball.vx * FRICTION + combinedAx));
      ball.vy = Math.min(MAX_VEL, Math.max(-MAX_VEL, ball.vy * FRICTION + combinedAy));
      ball.x += ball.vx;
      ball.y += ball.vy;

      if (ball.x < BALL_R) {
        ball.x = BALL_R;
        ball.vx *= -0.55;
      }
      if (ball.x > AREA - BALL_R) {
        ball.x = AREA - BALL_R;
        ball.vx *= -0.55;
      }
      if (ball.y < BALL_R) {
        ball.y = BALL_R;
        ball.vy *= -0.55;
      }
      if (ball.y > AREA - BALL_R) {
        ball.y = AREA - BALL_R;
        ball.vy *= -0.55;
      }

      setBallPos({ x: ball.x, y: ball.y });

      const localForce = Math.hypot(localAx, localAy);
      const partnerForce = Math.hypot(partnerAx, partnerAy);
      const partnerShare = partnerForce / (localForce + partnerForce + 0.0001);
      contributionRef.current.partnerShareSum += partnerShare;
      contributionRef.current.frames += 1;

      setTrailPoints((previous) => {
        const aged = previous
          .map((point) => ({ ...point, life: point.life - 0.03 }))
          .filter((point) => point.life > 0.06);
        return [
          ...aged,
          {
            id: `${performance.now().toFixed(2)}-${Math.random().toString(36).slice(2, 6)}`,
            x: ball.x,
            y: ball.y,
            life: 1,
            mix: partnerShare,
          },
        ].slice(-72);
      });

      const target = targetRef.current;
      const dx = ball.x - target.x;
      const dy = ball.y - target.y;
      if (Math.sqrt(dx * dx + dy * dy) < BALL_R + TARGET_R) {
        const timeMs = Date.now() - startTimeRef.current;
        const record: RoundRecord = {
          id: makeId(),
          round: roundRef.current,
          timeMs,
          reward: rewardLabel(timeMs),
          when: new Date().toLocaleString(),
        };

        const averagePartnerShare =
          contributionRef.current.frames > 0
            ? contributionRef.current.partnerShareSum / contributionRef.current.frames
            : 0;
        const nextBlend = clamp(lerp(blendRatio, averagePartnerShare, 0.35), 0.08, 0.92);

        setBlendRatio(nextBlend);
        phaseRef.current = "won";
        setPhase("won");
        setScore((previous) => previous + 1);
        setHistory((previous) => [record, ...previous].slice(0, 5));
        vibrateCelebrate();
        return;
      }

      const elapsed = Date.now() - startTimeRef.current;
      setTimeLeft(TIME_LIMIT_MS - elapsed);
      if (elapsed >= TIME_LIMIT_MS) {
        phaseRef.current = "lost";
        setPhase("lost");
        vibratePress();
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
  }, [blendRatio, phase, sensorMode]);

  function startRound() {
    const center = { x: AREA / 2, y: AREA / 2 };
    const nextTarget = randomTarget(center.x, center.y);
    targetRef.current = nextTarget;
    setTargetPos(nextTarget);
    ballRef.current = { x: center.x, y: center.y, vx: 0, vy: 0 };
    setBallPos(center);
    setTimeLeft(TIME_LIMIT_MS);
    setTrailPoints([]);
    contributionRef.current = { partnerShareSum: 0, frames: 0 };
    startTimeRef.current = Date.now();
    phaseRef.current = "playing";
    setPhase("playing");
    vibrateTap();
  }

  function nextRound() {
    setRound((value) => value + 1);
    startRound();
  }

  const timeLeftSec = Math.ceil(timeLeft / 1000);
  const latestReward = history[0]?.reward ?? rewardLabel(TIME_LIMIT_MS);
  const overlayEmoji = phase === "won" ? "🎯" : phase === "lost" ? "⏰" : "🕹️";
  const overlayText =
    phase === "won" ? "You reached it together!" : phase === "lost" ? "Time's up!" : "Gravity awaits";

  const localColor = mixHex("#ff6b9d", "#7fb8ff", blendRatio * 0.55);
  const remoteColor = mixHex("#c8b6e2", "#83d1ff", Math.min(1, blendRatio + 0.2));
  const partnerForceAmount = Math.hypot(partnerTilt.ax, partnerTilt.ay);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <header className="glass-card p-6 border border-purple-400/20">
        <div className="flex items-center gap-2 text-purple-300/70 text-xs tracking-wide uppercase mb-3">
          <Gamepad2 className="w-4 h-4" />
          Arcade machine - Gravity
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Gravity</h1>
        <p className="text-sm text-purple-200/80">
          One ball, two gravitational signatures. Your tilt and your partner&apos;s tilt blend in real
          time into one shared force field.
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
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3 text-sm text-purple-200/80">
            <span>Round {round}</span>
            <span>Score: {score}</span>
            {phase === "playing" && (
              <span className={timeLeftSec <= 10 ? "text-rose-300 font-semibold" : ""}>{timeLeftSec}s</span>
            )}
          </div>

          <div
            className="relative bg-black/20 rounded-2xl overflow-hidden mx-auto select-none"
            style={{ width: AREA, height: AREA, maxWidth: "100%" }}
          >
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

            {trailPoints.map((point) => (
              <span
                key={point.id}
                className="absolute rounded-full pointer-events-none"
                style={{
                  width: 6,
                  height: 6,
                  left: point.x - 3,
                  top: point.y - 3,
                  opacity: point.life,
                  background: mixHex("#ff6b9d", "#7fb8ff", point.mix),
                }}
              />
            ))}

            <div
              className="absolute rounded-full shadow-lg"
              style={{
                width: BALL_R * 2,
                height: BALL_R * 2,
                left: ballPos.x - BALL_R,
                top: ballPos.y - BALL_R,
                transition: "none",
                background: `linear-gradient(135deg, ${localColor}, ${remoteColor})`,
                boxShadow: `0 0 18px ${mixHex("#ff6b9d", "#7fb8ff", blendRatio)}`,
              }}
            />

            {phase !== "playing" && (
              <div className="absolute inset-0 bg-black/45 flex items-center justify-center rounded-2xl">
                <div className="text-center space-y-2">
                  <div className="text-5xl">{overlayEmoji}</div>
                  <p className="text-white font-semibold">{overlayText}</p>
                  {phase === "won" && history[0] && (
                    <p className="text-xs text-emerald-300 px-4">
                      {(history[0].timeMs / 1000).toFixed(1)}s - {history[0].reward}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="absolute left-2 top-2 rounded-full px-2 py-1 text-[10px] bg-black/35 text-purple-100">
              {partnerActive ? "Partner gravity live" : "Waiting for partner signal"}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            {phase !== "playing" ? (
              <button
                type="button"
                onClick={phase === "won" ? nextRound : startRound}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium bg-purple-600/75 hover:bg-purple-600/95 transition-colors touch-pressable"
              >
                {phase === "idle" ? "Start together" : phase === "won" ? "Next round" : "Try again"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  phaseRef.current = "idle";
                  setPhase("idle");
                  vibratePress();
                }}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium bg-zinc-700/70 hover:bg-zinc-700/90 transition-colors touch-pressable"
              >
                Pause
              </button>
            )}
          </div>

          <p className="mt-3 text-xs text-purple-200/70">
            Open this page on a second tab or device to add a live partner tilt stream. The ball responds
            to both fields at once.
          </p>
        </div>

        <div className="space-y-4">
          <div className="glass-card p-5">
            <h3 className="text-white font-semibold mb-3">Shared gravity channel</h3>
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-2 bg-white/10 text-sm text-purple-100">
              <Users className="w-4 h-4" />
              {channelAvailable ? (partnerActive ? "Partner connected" : "Channel ready") : "Broadcast unavailable"}
            </div>
            <p className="text-xs text-purple-200/70 mt-2">
              Partner pull now: {partnerForceAmount.toFixed(2)} - local and remote vectors are blended every
              frame.
            </p>
            <div className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, partnerForceAmount * 100)}%`,
                  background: "linear-gradient(90deg, #7fb8ff, #b8e3ff)",
                }}
              />
            </div>
          </div>

          <div className="glass-card p-5">
            <h3 className="text-white font-semibold mb-3">Sensor tilt mode</h3>
            <button
              type="button"
              disabled={!sensorSupported}
              onClick={() => {
                setSensorMode((value) => !value);
                vibrateTap();
              }}
              className={`w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                sensorSupported
                  ? sensorMode
                    ? "bg-sky-500/80 hover:bg-sky-500"
                    : "bg-sky-500/60 hover:bg-sky-500/80"
                  : "bg-zinc-700/50 text-zinc-300 cursor-not-allowed"
              }`}
            >
              <Smartphone className="w-4 h-4" />
              {sensorSupported ? (sensorMode ? "Tilt mode on" : "Enable tilt mode") : "Tilt not available"}
            </button>
            <p className="text-xs text-purple-200/70 mt-2">
              If tilt is off, keyboard steering still broadcasts your gravity to your partner.
            </p>
          </div>

          <div className="glass-card p-5">
            <h3 className="text-white font-semibold mb-2">Trail memory</h3>
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-2 bg-emerald-400/20 text-emerald-200 text-sm">
              <Waves className="w-4 h-4" />
              Blend learned: {Math.round(blendRatio * 100)}%
            </div>
            <p className="text-xs text-purple-200/70 mt-2">
              Each win nudges the default ball color toward your combined gravity style.
            </p>
          </div>

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
                history.map((record) => (
                  <li key={record.id} className="rounded-xl bg-white/5 px-3 py-2">
                    Round {record.round} - {(record.timeMs / 1000).toFixed(1)}s - {record.reward}
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
