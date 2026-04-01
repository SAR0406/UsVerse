/**
 * GET /api/messages/[id]/reactions
 *   Returns all reactions for a message
 *
 * POST /api/messages/[id]/reactions
 *   Adds a reaction to a message. One reaction per user per message.
 *   Rate limited: 60 reactions / 60 s per user.
 */

import { type NextRequest } from "next/server";
import { withAuth, ok, created } from "@/lib/api-handler";
import { rateLimit } from "@/lib/rate-limit";
import { NotFoundError, ForbiddenError } from "@/lib/errors";
import { AddReactionSchema } from "@/lib/schemas";
import type { MessageReaction } from "@/types/database";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async ({ coupleId, db }) => {
    const { id } = await params;

    // Verify message belongs to user's couple
    const { data: message, error: msgErr } = await db
      .from("messages")
      .select("couple_id")
      .eq("id", id)
      .single();

    if (msgErr || !message) throw new NotFoundError("Message");
    if (message.couple_id !== coupleId)
      throw new ForbiddenError("Message not found in your couple");

    const { data, error } = await db
      .from("message_reactions")
      .select("*")
      .eq("message_id", id)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return ok({ reactions: (data as MessageReaction[]) ?? [] });
  });
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  return withAuth(async ({ userId, coupleId, db }) => {
    const { id } = await params;

    rateLimit(`reactions:${userId}`, 60, 60_000);

    const body = AddReactionSchema.parse(await req.json());

    // Verify message belongs to user's couple
    const { data: message, error: msgErr } = await db
      .from("messages")
      .select("couple_id")
      .eq("id", id)
      .single();

    if (msgErr || !message) throw new NotFoundError("Message");
    if (message.couple_id !== coupleId)
      throw new ForbiddenError("Message not found in your couple");

    // Delete existing reaction from this user if any (upsert behavior)
    await db
      .from("message_reactions")
      .delete()
      .eq("message_id", id)
      .eq("user_id", userId);

    // Insert new reaction
    const { data, error } = await db
      .from("message_reactions")
      .insert({
        message_id: id,
        user_id: userId,
        reaction: body.reaction,
      })
      .select()
      .single();

    if (error) throw error;

    return created(data as MessageReaction);
  });
}
