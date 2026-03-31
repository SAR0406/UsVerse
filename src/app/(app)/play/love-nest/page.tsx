"use client";

import { useEffect, useMemo, useState } from "react";
import { Heart, Home, Sparkles, Smartphone, Trophy, Users } from "lucide-react";

type Room = "kitchen" | "living" | "garden";
type Task = {
  id: string;
  room: Room;
  title: string;
  hearts: number;
  type: "romantic" | "normal";
};

const TASKS: Task[] = [
  { id: "tea", room: "kitchen", title: "Make tea for each other", hearts: 2, type: "romantic" },
  { id: "tidy", room: "living", title: "Clean living room together", hearts: 1, type: "normal" },
  { id: "dance", room: "living", title: "30-second dance break", hearts: 2, type: "romantic" },
  { id: "plants", room: "garden", title: "Water the plants", hearts: 1, type: "normal" },
  { id: "wish", room: "garden", title: "Share one future wish", hearts: 3, type: "romantic" },
];

const STORAGE_KEY = "usverse.play.loveNest.progress";

function rewardFor(totalHearts: number): string {
  if (totalHearts >= 20) return "Weekend date unlocked";
  if (totalHearts >= 12) return "Cook a special dinner together";
  if (totalHearts >= 6) return "Photo memory challenge";
  return "Start with one sweet message";
}

export default function LoveNestPage() {
  const [selectedRoom, setSelectedRoom] = useState<Room>("living");
  const [completed, setCompleted] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as { completed?: string[] };
      if (!Array.isArray(parsed.completed)) return [];
      return parsed.completed.filter((id) => TASKS.some((task) => task.id === id));
    } catch {
      return [];
    }
  });
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [sensorBoost, setSensorBoost] = useState(false);
  const sensorSupported = useMemo(
    () =>
      typeof window !== "undefined" &&
      ("DeviceMotionEvent" in window || "DeviceOrientationEvent" in window),
    [],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ completed }));
  }, [completed]);

  useEffect(() => {
    if (!sensorBoost) return;
    const onMotion = (event: DeviceOrientationEvent) => {
      const gamma = Math.abs(event.gamma ?? 0);
      const beta = Math.abs(event.beta ?? 0);
      if (gamma > 20 || beta > 20) {
        setPartnerOnline(true);
      }
    };
    window.addEventListener("deviceorientation", onMotion);
    return () => window.removeEventListener("deviceorientation", onMotion);
  }, [sensorBoost]);

  const roomTasks = TASKS.filter((task) => task.room === selectedRoom);
  const totalHearts = completed.reduce((sum, id) => {
    const task = TASKS.find((entry) => entry.id === id);
    return sum + (task?.hearts ?? 0);
  }, 0);
  const currentReward = rewardFor(totalHearts);

  const toggleTask = (taskId: string) => {
    setCompleted((current) =>
      current.includes(taskId) ? current.filter((id) => id !== taskId) : [...current, taskId],
    );
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <header className="glass-card p-6 border border-rose-400/20">
        <div className="flex items-center gap-2 text-pink-200/80 text-xs tracking-wide uppercase mb-3">
          <Home className="w-4 h-4" />
          Couples shared house
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Love Nest Co-op</h1>
        <p className="text-sm text-purple-200/80">
          Build one home together: do romantic quests, normal chores, and unlock real-world rewards as
          a couple.
        </p>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6">
        <div className="glass-card p-5 space-y-4">
          <div className="flex flex-wrap gap-2">
            {(["living", "kitchen", "garden"] as Room[]).map((room) => (
              <button
                key={room}
                type="button"
                onClick={() => setSelectedRoom(room)}
                className={`px-3 py-2 rounded-xl text-sm capitalize transition-colors ${
                  selectedRoom === room
                    ? "bg-purple-600/80 text-white"
                    : "bg-white/10 text-purple-200 hover:bg-white/15"
                }`}
              >
                {room}
              </button>
            ))}
          </div>

          <ul className="space-y-2">
            {roomTasks.map((task) => {
              const done = completed.includes(task.id);
              return (
                <li
                  key={task.id}
                  className={`rounded-xl border p-3 ${
                    done ? "border-emerald-400/40 bg-emerald-400/10" : "border-purple-500/20 bg-white/5"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleTask(task.id)}
                    className="w-full text-left flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="text-white font-medium">{task.title}</div>
                      <div className="text-xs text-purple-200/70 mt-1 capitalize">
                        {task.type} • +{task.hearts} hearts
                      </div>
                    </div>
                    <span
                      className={`text-[10px] uppercase tracking-wide px-2 py-1 rounded-full ${
                        done ? "bg-emerald-400/20 text-emerald-200" : "bg-zinc-700/50 text-zinc-200"
                      }`}
                    >
                      {done ? "Done" : "Tap to complete"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="space-y-4">
          <div className="glass-card p-5">
            <h2 className="text-white font-semibold mb-3">Multiplayer status</h2>
            <div className="inline-flex items-center gap-2 text-sm rounded-full px-3 py-2 bg-pink-500/15 text-pink-200">
              <Users className="w-4 h-4" />
              {partnerOnline ? "Both partners active now" : "Waiting for partner to join"}
            </div>
            <p className="text-xs text-purple-200/70 mt-3">
              This MVP simulates partner activity locally and is ready to upgrade to live presence sync.
            </p>
          </div>

          <div className="glass-card p-5">
            <h3 className="text-white font-semibold mb-3">Sensor mini mode</h3>
            <button
              type="button"
              disabled={!sensorSupported}
              onClick={() => setSensorBoost((value) => !value)}
              className={`w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                sensorSupported
                  ? sensorBoost
                    ? "bg-sky-500/80 hover:bg-sky-500"
                    : "bg-sky-500/60 hover:bg-sky-500/80"
                  : "bg-zinc-700/50 text-zinc-300 cursor-not-allowed"
              }`}
            >
              <Smartphone className="w-4 h-4" />
              {sensorSupported
                ? sensorBoost
                  ? "Sensor mode enabled"
                  : "Enable sensor mode"
                : "Sensors not available"}
            </button>
            <p className="text-xs text-purple-200/70 mt-2">
              Tilt either phone strongly once to trigger a shared “partner online” spark.
            </p>
          </div>

          <div className="glass-card p-5">
            <h3 className="text-white font-semibold mb-2">Real-world rewards</h3>
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-2 bg-emerald-400/20 text-emerald-200 text-sm">
              <Trophy className="w-4 h-4" />
              Current unlock: {currentReward}
            </div>
            <div className="mt-3 text-sm text-purple-200/80 flex items-center gap-2">
              <Heart className="w-4 h-4 text-rose-300" />
              Total hearts earned: {totalHearts}
            </div>
          </div>

          <div className="glass-card p-5">
            <h3 className="text-white font-semibold mb-2">Mix of modes in one game</h3>
            <ul className="text-sm text-purple-200/80 space-y-1">
              <li>• Romantic quests for bonding</li>
              <li>• Normal house chores for progression</li>
              <li>• Sensor-triggered interaction for mobile fun</li>
              <li>• Reward tracking for real life date ideas</li>
            </ul>
            <div className="mt-3 inline-flex items-center gap-2 text-xs text-purple-300/70">
              <Sparkles className="w-3.5 h-3.5" />
              This is the first playable version of your “live together in one house” idea.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
