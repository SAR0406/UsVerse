/**
 * GET  /api/presence?limit=20
 *   Returns the most recent presence events for the couple.
 *
 * POST /api/presence
 *   Fires a presence/touch event.
 *   Rate limited: 30 events / 60 s per user.
 *   Supports idempotency_key to prevent duplicate sends on retry.
 */

import { type NextRequest } from "next/server";
import { withAuth, ok, created } from "@/lib/api-handler";
import { rateLimit, getIdempotentResult, setIdempotentResult } from "@/lib/rate-limit";
import { SendPresenceSchema, PaginationSchema } from "@/lib/schemas";
import { NotFoundError, ForbiddenError } from "@/lib/errors";
import type { PresenceEvent } from "@/types/database";

// Partner-facing message labels for each event type
const PRESENCE_MESSAGES: Record<string, string> = {
  thinking_of_you: "is thinking of you 💭",
  heartbeat:       "sent you a heartbeat 💓",
  missing_you:     "is missing you so much 🥺",
  studying:        "is studying 📚",
  sleeping:        "is going to sleep 😴",
  silent_mode:     "feels empty and misses you but can't express it 💔",
};

// ─── GET — recent presence events ──────────────────────────────────────────

export async function GET(req: NextRequest) {
  return withAuth(async ({ coupleId, db }) => {
    if (!coupleId) throw new NotFoundError("Couple");

    const { limit } = PaginationSchema.parse(
      Object.fromEntries(req.nextUrl.searchParams),
    );

    const { data, error } = await db
      .from("presence_events")
      .select("id, created_at, couple_id, user_id, event_type, message")
      .eq("couple_id", coupleId)
      .order("created_at", { ascending: false })
      .limit(Math.min(limit, 50));

    if (error) throw error;

    return ok({ events: (data ?? []) as PresenceEvent[] });
  });
}

// ─── POST — send a presence/touch event ────────────────────────────────────

export async function POST(req: NextRequest) {
  return withAuth(async ({ userId, coupleId, db }) => {
    if (!coupleId) throw new ForbiddenError("Connect with a partner first");

    // Rate limit: 30 presence events per minute per user
    rateLimit(`presence:${userId}`, 30, 60_000);

    const body = SendPresenceSchema.parse(await req.json());

    // Idempotency — avoid duplicate taps on flaky connections
    if (body.idempotency_key) {
      const cached = getIdempotentResult<PresenceEvent>(
        `presence:${userId}:${body.idempotency_key}`,
      );
      if (cached) return ok(cached);
    }

    const { data, error } = await db
      .from("presence_events")
      .insert({
        couple_id:  coupleId,
        user_id:    userId,
        event_type: body.event_type,
        message:    body.message ?? PRESENCE_MESSAGES[body.event_type] ?? null,
      })
      .select("id, created_at, couple_id, user_id, event_type, message")
      .single();

    if (error) throw error;

    const event = data as PresenceEvent;

    if (body.idempotency_key) {
      setIdempotentResult(`presence:${userId}:${body.idempotency_key}`, event);
    }

    return created(event);
  });
}
