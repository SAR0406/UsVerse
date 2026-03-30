/**
 * GET  /api/daily
 *   Returns today's question, the caller's answer (if any), and their
 *   partner's answer (if any).  The question index rotates daily.
 *
 * POST /api/daily
 *   Saves or updates the caller's answer for today's question.
 *   Rate limited: 20 writes / 60 s per user (prevents spam saves).
 */

import { type NextRequest } from "next/server";
import { withAuth, ok } from "@/lib/api-handler";
import { rateLimit } from "@/lib/rate-limit";
import { SaveDailyAnswerSchema } from "@/lib/schemas";
import { ForbiddenError } from "@/lib/errors";
import type { DailyAnswer } from "@/types/database";

// ─── Question bank (31 prompts, one per day cycling) ───────────────────────

const DAILY_QUESTIONS = [
  "What did you miss about me today?",
  "What made you smile today?",
  "If you could teleport right now, where would you go?",
  "What's one thing you wish I knew about how you're feeling?",
  "Describe your perfect day with me.",
  "What memory of us do you keep going back to?",
  "What's something you learned today?",
  "What's one thing you're grateful for right now?",
  "What song reminds you of us?",
  "What would you tell the version of us from one year ago?",
  "If we had one whole day together tomorrow, how would you want to spend it?",
  "What's the smallest thing I do that means the most to you?",
  "What are you looking forward to most when we're finally together again?",
  "What do you want to be doing in 5 years?",
  "What's something you've never told anyone but want to tell me?",
  "When do you feel closest to me, even from far away?",
  "What's one thing about yourself you're proud of lately?",
  "What's a dream you haven't spoken aloud yet?",
  "What does home feel like to you?",
  "If love had a color, what would ours be?",
  "What's the most beautiful thing in your world right now?",
  "What does silence between us feel like to you?",
  "What's something you want us to do together that we've never done?",
  "What would you write in a letter to future us?",
  "What part of long-distance do you find hardest?",
  "What's a small habit of mine you love?",
  "If you could give me one thing right now, what would it be?",
  "What does loving me feel like?",
  "What's a fear you have about us?",
  "What's a hope you carry about us?",
  "What made today hard? What made it worth it?",
] as const;

function getTodayQuestion(): { question: string; questionId: string; index: number } {
  const startUtc = Date.UTC(2024, 0, 1);
  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const daysDiff = Math.floor((todayUtc - startUtc) / 86_400_000);
  const index = daysDiff % DAILY_QUESTIONS.length;
  return {
    question: DAILY_QUESTIONS[index],
    questionId: `q-${index}`,
    index,
  };
}

// ─── GET — today's question + answers ──────────────────────────────────────

export async function GET(req: NextRequest) {
  void req;
  return withAuth(async ({ userId, coupleId, db }) => {
    const { question, questionId, index } = getTodayQuestion();

    let myAnswer: DailyAnswer | null = null;
    let partnerAnswer: DailyAnswer | null = null;

    if (coupleId) {
      const { data } = await db
        .from("daily_answers")
        .select("id, created_at, question_id, couple_id, user_id, answer")
        .eq("couple_id", coupleId)
        .eq("question_id", questionId);

      if (data) {
        myAnswer      = (data.find((a) => a.user_id === userId) ?? null) as DailyAnswer | null;
        partnerAnswer = (data.find((a) => a.user_id !== userId) ?? null) as DailyAnswer | null;
      }
    }

    return ok({
      question: {
        id:    questionId,
        index: index + 1,
        text:  question,
        total: DAILY_QUESTIONS.length,
      },
      myAnswer,
      partnerAnswer,
    });
  });
}

// ─── POST — save / update answer ───────────────────────────────────────────

export async function POST(req: NextRequest) {
  return withAuth(async ({ userId, coupleId, db }) => {
    if (!coupleId) throw new ForbiddenError("Connect with a partner to answer daily questions");

    // Rate limit: 20 saves per minute (prevents accidental rapid-fire)
    rateLimit(`daily:${userId}`, 20, 60_000);

    const body = SaveDailyAnswerSchema.parse(await req.json());

    // Upsert — ON CONFLICT (question_id, couple_id, user_id) DO UPDATE
    const { data, error } = await db
      .from("daily_answers")
      .upsert(
        {
          question_id: body.question_id,
          couple_id:   coupleId,
          user_id:     userId,
          answer:      body.answer,
        },
        { onConflict: "question_id,couple_id,user_id" },
      )
      .select("id, created_at, question_id, couple_id, user_id, answer")
      .single();

    if (error) throw error;

    return ok(data as DailyAnswer);
  });
}
