import { type NextRequest } from "next/server";
import { withAuth, ok } from "@/lib/api-handler";
import { rateLimit } from "@/lib/rate-limit";
import { GenerateSuggestionsSchema } from "@/lib/schemas";
import { generateNimSuggestions } from "@/lib/nim";
import { ServiceUnavailableError } from "@/lib/errors";

const AI_SUGGESTIONS_RATE_LIMIT = 12;
const AI_SUGGESTIONS_WINDOW_MS = 60_000;

const FALLBACK_SUGGESTIONS = [
  "I've been thinking about you all day 💜",
  "You make even the hardest days feel lighter.",
  "I miss you, and I can't wait until we're together again.",
  "You are my favorite part of every day.",
];

export async function POST(req: NextRequest) {
  return withAuth(async ({ userId }) => {
    rateLimit(
      `ai-suggestions:${userId}`,
      AI_SUGGESTIONS_RATE_LIMIT,
      AI_SUGGESTIONS_WINDOW_MS,
    );

    const body = GenerateSuggestionsSchema.parse(await req.json());

    try {
      const suggestions = await generateNimSuggestions(body);
      return ok({ suggestions, model: process.env.NIM_CHAT_MODEL ?? null, source: "nim" });
    } catch (error) {
      if (error instanceof ServiceUnavailableError) {
        return ok({
          suggestions: FALLBACK_SUGGESTIONS.slice(0, body.count),
          model: null,
          source: "fallback",
        });
      }
      throw error;
    }
  });
}
