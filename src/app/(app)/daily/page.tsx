"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { HelpCircle, Send, Heart } from "lucide-react";
import type { DailyAnswer } from "@/types/database";
import { format } from "date-fns";

interface DailyQuestion {
  id: string;
  index: number;
  text: string;
  total: number;
}

export default function DailyPage() {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [question, setQuestion] = useState<DailyQuestion | null>(null);
  const [myAnswer, setMyAnswer] = useState<string>("");
  const [partnerAnswer, setPartnerAnswer] = useState<DailyAnswer | null>(null);
  const [savedAnswer, setSavedAnswer] = useState<DailyAnswer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const today = format(new Date(), "yyyy-MM-dd");

  const loadAnswers = useCallback(async () => {
    setErrorMessage(null);
    try {
      const res = await fetch("/api/daily");
      const json = (await res.json()) as {
        data?: {
          question: { id: string; index: number; text: string; total: number };
          myAnswer: DailyAnswer | null;
          partnerAnswer: DailyAnswer | null;
        };
        error?: { message?: string };
      };
      if (!res.ok) {
        throw new Error(json.error?.message ?? "Failed to load daily question");
      }
      if (json.data) {
        setQuestion(json.data.question);
        if (json.data.myAnswer) {
          setSavedAnswer(json.data.myAnswer);
          setMyAnswer(json.data.myAnswer.answer);
        }
        if (json.data.partnerAnswer) {
          setPartnerAnswer(json.data.partnerAnswer);
        }
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load daily question",
      );
    }
  }, []);

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      await loadAnswers();

      // Resolve coupleId for real-time subscription
      const res = await fetch("/api/couple");
      const json = (await res.json()) as { data?: { couple: { id: string } | null } };
      if (json.data?.couple?.id) setCoupleId(json.data.couple.id);

      setLoading(false);
    }
    init();
  }, [supabase, loadAnswers]);

  // Subscribe to partner's answer
  useEffect(() => {
    if (!coupleId || !userId) return;
    const channel = supabase
      .channel(`daily-${coupleId}-${today}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "daily_answers",
          filter: `couple_id=eq.${coupleId}`,
        },
        (payload) => {
          const answer = payload.new as DailyAnswer;
          if (answer.user_id !== userId) {
            setPartnerAnswer(answer);
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [coupleId, userId, today, supabase]);

  async function handleSave() {
    if (!myAnswer.trim() || !question) return;
    setSaving(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question_id: question.id, answer: myAnswer }),
      });
      const json = (await res.json()) as { error?: { message?: string } };
      if (!res.ok) {
        throw new Error(json.error?.message ?? "Failed to save answer");
      }

      setSaved(true);
      // Refresh so savedAnswer state is current (prevents duplicate upsert on re-save)
      await loadAnswers();
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to save answer",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return (
      <div className="flex items-center justify-center h-full p-20">
        <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <HelpCircle className="w-5 h-5 text-purple-400" />
          <h1 className="text-2xl font-bold text-white">Daily Question</h1>
        </div>
        <p className="text-purple-300/50 text-sm">
          {format(new Date(), "EEEE, MMMM d")} · Question #{question?.index ?? "—"}
        </p>
      </div>

      {!coupleId && (
        <div className="glass-card p-4 mb-6 border border-amber-500/30 bg-amber-500/5">
          <p className="text-amber-300 text-sm">
            📌 Connect with your partner in Chat first to unlock shared answers.
          </p>
        </div>
      )}
      {errorMessage && (
        <p className="mb-4 text-sm text-red-300/80">{errorMessage}</p>
      )}

      {/* Question card */}
      <div className="glass-card p-8 mb-6 text-center">
        <div className="text-4xl mb-4">🌙</div>
        <h2 className="text-xl md:text-2xl font-semibold text-white leading-relaxed">
          {question?.text ?? "Loading question..."}
        </h2>
      </div>

      {/* My answer */}
      <div className="glass-card p-6 mb-4">
        <h3 className="text-sm font-medium text-purple-400/70 mb-3 uppercase tracking-wider">
          Your Answer
        </h3>
        <textarea
          value={myAnswer}
          onChange={(e) => setMyAnswer(e.target.value)}
          placeholder="Pour your heart out…"
          rows={4}
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-purple-500/20 text-white placeholder-purple-300/30 text-sm focus:outline-none focus:border-purple-500/50 resize-none"
        />
        <div className="flex justify-between items-center mt-3">
          {saved && (
            <span className="text-emerald-400 text-xs">✓ Saved</span>
          )}
          {!saved && <span />}
          <button
            onClick={handleSave}
            disabled={!question || !myAnswer.trim() || saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 text-white text-sm hover:bg-purple-500 disabled:opacity-40 transition-all"
          >
            {saving ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send className="w-3 h-3" />
            )}
            Share with her
          </button>
        </div>
      </div>

      {/* Partner's answer */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-medium text-purple-400/70 mb-3 uppercase tracking-wider flex items-center gap-2">
          <Heart className="w-3.5 h-3.5 text-pink-400" />
          Her Answer
        </h3>
        {partnerAnswer ? (
          <div className="px-4 py-3 rounded-xl bg-pink-500/5 border border-pink-500/20">
            <p className="text-purple-100 text-sm leading-relaxed">
              {partnerAnswer.answer}
            </p>
          </div>
        ) : (
          <div className="text-center py-6 text-purple-400/30 text-sm">
            {savedAnswer
              ? "Waiting for her answer… she might be thinking 💭"
              : "Share your answer first, then see hers ✨"}
          </div>
        )}
      </div>

      {/* Past questions hint */}
      <p className="text-center text-purple-400/30 text-xs mt-6">
        A new question every day. {question?.total ?? "—"} questions total. 💫
      </p>
    </div>
  );
}
