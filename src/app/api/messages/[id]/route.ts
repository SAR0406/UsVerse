/**
 * DELETE /api/messages/[id]
 *   Deletes a message. Only the original sender may delete their own messages.
 *   The message must belong to the authenticated user's couple.
 *   Rate limited: 30 deletes / 60 s per user.
 */

import { type NextRequest } from "next/server";
import { withAuth, noContent } from "@/lib/api-handler";
import { rateLimit } from "@/lib/rate-limit";
import { NotFoundError, ForbiddenError } from "@/lib/errors";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async ({ userId, coupleId, db }) => {
    const { id } = await params;

    rateLimit(`messages_delete:${userId}`, 30, 60_000);

    const { data: existing, error: fetchErr } = await db
      .from("messages")
      .select("id, sender_id, couple_id")
      .eq("id", id)
      .single();

    if (fetchErr || !existing) throw new NotFoundError("Message");
    if (existing.sender_id !== userId)
      throw new ForbiddenError("You can only delete your own messages");
    if (existing.couple_id !== coupleId)
      throw new ForbiddenError("Message not found in your couple");

    const { error } = await db.from("messages").delete().eq("id", id);
    if (error) throw error;

    return noContent();
  });
}
