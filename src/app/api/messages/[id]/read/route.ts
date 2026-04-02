/**
 * POST /api/messages/[id]/read
 *   Marks a message as read by setting read_at timestamp.
 *   Can only mark messages from partner as read.
 *   Rate limited: 100 reads / 60 s per user.
 */

import { type NextRequest } from "next/server";
import { withAuth, ok } from "@/lib/api-handler";
import { rateLimit } from "@/lib/rate-limit";
import { NotFoundError, ForbiddenError } from "@/lib/errors";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async ({ userId, coupleId, db }) => {
    const { id } = await params;

    rateLimit(`messages_read:${userId}`, 100, 60_000);

    const { data: existing, error: fetchErr } = await db
      .from("messages")
      .select("id, sender_id, couple_id, read_at")
      .eq("id", id)
      .single();

    if (fetchErr || !existing) throw new NotFoundError("Message");
    if (existing.couple_id !== coupleId)
      throw new ForbiddenError("Message not found in your couple");
    if (existing.sender_id === userId)
      throw new ForbiddenError("Cannot mark your own messages as read");

    // Only update if not already read
    if (!existing.read_at) {
      const { data, error } = await db
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      return ok(data);
    }

    return ok(existing);
  });
}
