/**
 * GET  /api/messages?cursor=<iso-timestamp>&limit=50
 *   Returns messages for the authenticated user's couple, oldest-first.
 *   Cursor is the created_at of the last message received (for loading older history).
 *
 * POST /api/messages
 *   Sends a new message. Supports idempotency_key to prevent duplicates on retry.
 *   Rate limited: 60 messages / 60 s per user.
 */

import { type NextRequest } from "next/server";
import { withAuth, ok, created } from "@/lib/api-handler";
import { rateLimit, getIdempotentResult, setIdempotentResult } from "@/lib/rate-limit";
import { SendMessageSchema, PaginationSchema } from "@/lib/schemas";
import { NotFoundError, ForbiddenError } from "@/lib/errors";
import type { Message } from "@/types/database";

// ─── GET — paginated message history ───────────────────────────────────────

export async function GET(req: NextRequest) {
  return withAuth(async ({ coupleId, db }) => {
    if (!coupleId) throw new NotFoundError("Couple");

    const { cursor, limit } = PaginationSchema.parse(
      Object.fromEntries(req.nextUrl.searchParams),
    );

    let query = db
      .from("messages")
      .select("id, created_at, couple_id, sender_id, content, message_type")
      .eq("couple_id", coupleId)
      .order("created_at", { ascending: true })
      .order("id",         { ascending: true })
      .limit(limit + 1); // fetch one extra to compute hasMore

    if (cursor) {
      query = query.gt("created_at", cursor);
    }

    const { data, error } = await query;
    if (error) throw error;

    const messages = data ?? [];
    const hasMore = messages.length > limit;
    const page = hasMore ? messages.slice(0, limit) : messages;

    return ok({
      messages: page as Message[],
      pagination: {
        cursor: page.length > 0 ? page[page.length - 1].created_at : null,
        hasMore,
      },
    });
  });
}

// ─── POST — send a message ──────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  return withAuth(async ({ userId, coupleId, db, traceId }) => {
    if (!coupleId) throw new ForbiddenError("Connect with a partner before sending messages");

    // Rate limit: 60 messages per minute per user
    rateLimit(`messages:${userId}`, 60, 60_000);

    const body = SendMessageSchema.parse(await req.json());

    // Idempotency: if the same key was used before, return the cached result
    if (body.idempotency_key) {
      const cached = getIdempotentResult<Message>(`msg:${userId}:${body.idempotency_key}`);
      if (cached) return ok(cached);
    }

    const { data, error } = await db
      .from("messages")
      .insert({
        couple_id:    coupleId,
        sender_id:    userId,
        content:      body.content,
        message_type: body.message_type,
      })
      .select("id, created_at, couple_id, sender_id, content, message_type")
      .single();

    if (error) {
      // Log context for debugging without leaking to the client
      void traceId;
      throw error;
    }

    const message = data as Message;

    if (body.idempotency_key) {
      setIdempotentResult(`msg:${userId}:${body.idempotency_key}`, message);
    }

    return created(message);
  });
}
