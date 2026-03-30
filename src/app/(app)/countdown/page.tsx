"use client";

import { useState, useEffect } from "react";
import { Timer, Heart, Edit3, Save } from "lucide-react";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { countdownCardParticles } from "@/lib/animations";

interface CountdownData {
  meetDate: string | null;
  anniversaryDate: string | null;
}

interface CountdownApiData extends CountdownData {
  coupleId: string;
}

export default function CountdownPage() {
  const [countdown, setCountdown] = useState<CountdownData>({
    meetDate: null,
    anniversaryDate: null,
  });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [meetDateInput, setMeetDateInput] = useState("");
  const [anniversaryInput, setAnniversaryInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());

  // Live clock
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function init() {
      setErrorMessage(null);
      try {
        const res = await fetch("/api/countdown");
        const json = (await res.json()) as {
          data?: CountdownApiData;
          error?: { message?: string };
        };
        const data = json.data;
        if (res.ok && data) {
          setCountdown({
            meetDate: data.meetDate,
            anniversaryDate: data.anniversaryDate,
          });
          setMeetDateInput(data.meetDate ?? "");
          setAnniversaryInput(data.anniversaryDate ?? "");
        } else {
          setErrorMessage(json.error?.message ?? "Failed to load countdown");
        }
      } catch {
        setErrorMessage("Failed to load countdown");
      }
      setLoading(false);
    }
    init();
  }, []);

  async function handleSave() {
    setSaving(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/countdown", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meet_date: meetDateInput || null,
          anniversary_date: anniversaryInput || null,
        }),
      });
      const json = (await res.json()) as {
        data?: CountdownApiData;
        error?: { message?: string };
      };
      const data = json.data;
      if (res.ok && data) {
        setCountdown({
          meetDate: data.meetDate,
          anniversaryDate: data.anniversaryDate,
        });
        setMeetDateInput(data.meetDate ?? "");
        setAnniversaryInput(data.anniversaryDate ?? "");
        setEditing(false);
      } else {
        setErrorMessage(json.error?.message ?? "Failed to save countdown");
      }
    } catch {
      setErrorMessage("Failed to save countdown");
    } finally {
      setSaving(false);
    }
  }

  function getDaysUntil(dateStr: string | null): number | null {
    if (!dateStr) return null;
    try {
      return differenceInCalendarDays(parseISO(dateStr), now);
    } catch {
      return null;
    }
  }

  function getTimeUntil(dateStr: string | null) {
    if (!dateStr) return null;
    try {
      const target = parseISO(dateStr);
      const diff = target.getTime() - now.getTime();
      if (diff <= 0) return null;
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      return { days, hours, minutes, seconds };
    } catch {
      return null;
    }
  }

  const meetDays = getDaysUntil(countdown.meetDate);
  const timeUntilMeet = getTimeUntil(countdown.meetDate);
  const anniversaryDays = getDaysUntil(countdown.anniversaryDate);
  const isToday = meetDays === 0;

  const meetPast = meetDays !== null && meetDays < 0;

  if (loading)
    return (
      <div className="flex items-center justify-center h-full p-20">
        <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Timer className="w-5 h-5 text-purple-400" />
            <h1 className="text-2xl font-bold text-white">Countdown</h1>
          </div>
          <p className="text-purple-300/50 text-sm">
            Every second, closer to you. ⏳
          </p>
        </div>
        <button
          onClick={() => setEditing(!editing)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-purple-500/20 text-purple-300/60 hover:text-purple-300 hover:border-purple-500/40 text-sm transition-all"
        >
          <Edit3 className="w-3.5 h-3.5" />
          {editing ? "Cancel" : "Edit dates"}
        </button>
      </div>
      {errorMessage && (
        <p className="mb-4 text-sm text-red-300/80">{errorMessage}</p>
      )}

      {/* Edit form */}
      {editing && (
        <div className="glass-card p-6 mb-6">
          <h3 className="text-sm font-medium text-purple-400/70 mb-4 uppercase tracking-wider">
            Set Your Dates
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-purple-300/70 mb-1.5">
                📅 Next time we meet
              </label>
              <input
                type="date"
                value={meetDateInput}
                onChange={(e) => setMeetDateInput(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-purple-500/20 text-white text-sm focus:outline-none focus:border-purple-500/50 [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="block text-sm text-purple-300/70 mb-1.5">
                💜 Anniversary date
              </label>
              <input
                type="date"
                value={anniversaryInput}
                onChange={(e) => setAnniversaryInput(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-purple-500/20 text-white text-sm focus:outline-none focus:border-purple-500/50 [color-scheme:dark]"
              />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-purple-600 text-white text-sm hover:bg-purple-500 disabled:opacity-40 transition-all"
            >
              {saving ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-3 h-3" />
              )}
              Save
            </button>
          </div>
        </div>
      )}

      {/* Main countdown — next meet */}
      <div
        className="relative overflow-hidden rounded-3xl p-8 mb-6 text-center border border-white/15 countdown-poster"
      >
        <div className="absolute inset-0 pointer-events-none">
          {countdownCardParticles.map((particle) => (
            <span
              key={particle.id}
              className="countdown-particle-float"
              style={{
                left: particle.left,
                animationDelay: particle.delay,
                animationDuration: particle.duration,
              }}
            >
              {particle.symbol}
            </span>
          ))}
        </div>
        <div className="relative z-10">
          <div className="text-5xl mb-4">❤️</div>
        {countdown.meetDate ? (
          <>
            {meetPast ? (
              <>
                <h2 className="text-2xl font-bold text-white mb-2">
                  You&apos;re together! 🎉
                </h2>
                <p className="text-purple-300/60 text-sm">
                  {format(parseISO(countdown.meetDate), "MMMM d, yyyy")}
                </p>
              </>
            ) : (
              <>
                <p className="text-[color:var(--text-soft)] text-sm mb-3 uppercase tracking-wider">
                  Days until we&apos;re in the same place again
                </p>
                <div className="countdown-flip-stage mb-5">
                  <div
                    key={`flip-${meetDays ?? "none"}`}
                    className="countdown-flip-digit countdown-flip-in countdown-glow-gold"
                    aria-live="polite"
                    aria-atomic="true"
                  >
                    {isToday ? "TODAY!" : String(meetDays ?? "—")}
                  </div>
                  <span className="sr-only">Days until we are in the same place again</span>
                </div>
                {timeUntilMeet && (
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    {[
                      { value: timeUntilMeet.days, label: "days" },
                      { value: timeUntilMeet.hours, label: "hours" },
                      { value: timeUntilMeet.minutes, label: "min" },
                      { value: timeUntilMeet.seconds, label: "sec" },
                    ].map((unit) => (
                      <div
                        key={unit.label}
                        className="flex flex-col items-center"
                      >
                        <div className="w-full py-3 rounded-xl bg-purple-600/20 border border-purple-500/20 text-2xl md:text-3xl font-bold text-white">
                          {String(unit.value).padStart(2, "0")}
                        </div>
                        <span className="text-xs text-purple-400/50 mt-1">
                          {unit.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {meetDays !== null && (
                  <p className="text-[color:var(--foreground)]/80 text-sm">
                    {meetDays === 0
                      ? "Today is the day! 🎊"
                      : meetDays === 1
                        ? "Tomorrow! 🌟"
                        : `${meetDays} days left`}{" "}
                    ·{" "}
                    {format(parseISO(countdown.meetDate!), "MMMM d, yyyy")}
                  </p>
                )}
              </>
            )}
          </>
        ) : (
          <div>
            <p className="text-white text-lg mb-2">
              Set your next meeting date
            </p>
            <p className="text-purple-300/50 text-sm">
              So you both have something to look forward to ✨
            </p>
            <button
              onClick={() => setEditing(true)}
              className="mt-4 px-6 py-2.5 rounded-full bg-purple-600 text-white text-sm hover:bg-purple-500 transition-all"
            >
              Add date
            </button>
          </div>
        )}
        </div>
      </div>

      {/* Anniversary */}
      {countdown.anniversaryDate && (
        <div className="glass-card p-6 text-center">
          <Heart className="w-5 h-5 text-pink-400 mx-auto mb-3" />
          <p className="text-purple-300/60 text-sm uppercase tracking-wider mb-2">
            Anniversary
          </p>
          <p className="text-white font-semibold">
            {format(parseISO(countdown.anniversaryDate), "MMMM d, yyyy")}
          </p>
          {anniversaryDays !== null && anniversaryDays >= 0 && (
            <p className="text-purple-300/50 text-sm mt-1">
              {anniversaryDays === 0
                ? "Today! 🎊 Happy anniversary!"
                : `${anniversaryDays} days away 💜`}
            </p>
          )}
        </div>
      )}

      {/* Motivational */}
      {meetDays !== null && meetDays > 0 && (
        <div className="mt-6 text-center">
          <p className="text-purple-400/40 text-xs italic">
            {meetDays > 30
              ? `${meetDays} days of love letters, good nights, and soft messages. Keep going. 💌`
              : meetDays > 7
                ? `Only ${meetDays} days. So close you can almost feel it. ✨`
                : `${meetDays} days. The wait is almost over. 🌙`}
          </p>
        </div>
      )}

      {isToday && (
        <div className="fixed inset-0 z-50 pointer-events-none flex flex-col items-center justify-center bg-[color:var(--background)]/75 backdrop-blur-sm">
          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: 28 }, (_, index) => {
              const symbols = ["🎉", "💕", "✨", "🌸", "⭐"] as const;
              return (
                <span
                  key={`celebrate-${index}`}
                  className="countdown-particle-float"
                  style={{
                    left: `${(index * 13) % 100}%`,
                    animationDelay: `${(index % 8) * 0.18}s`,
                    animationDuration: `${3.2 + (index % 4) * 0.5}s`,
                  }}
                >
                  {symbols[index % symbols.length]}
                </span>
              );
            })}
          </div>
          <p
            className="text-[4rem] leading-none mb-4"
            style={{ fontFamily: "var(--font-accent), cursive" }}
          >
            TODAY! 🎉
          </p>
          <p className="text-[color:var(--foreground)] text-lg text-center px-6">
            You made it through every mile. Go hold each other. 💞
          </p>
        </div>
      )}
    </div>
  );
}
