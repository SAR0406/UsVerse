/**
 * DELETE /api/messages/[id]/reactions/[reactionId]
 *   Removes a reaction from a message. Only the reaction author can delete.
 *   Rate limited: 60 deletes / 60 s per user.
 */

import { type NextRequest } from "next/server";
import { withAuth, noContent } from "@/lib/api-handler";
import { rateLimit } from "@/lib/rate-limit";
import { NotFoundError, ForbiddenError } from "@/lib/errors";

interface RouteParams {
  params: Promise<{ id: string; reactionId: string }>;
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async ({ userId, db }) => {
    const { reactionId } = await params;

    rateLimit(`reactions_delete:${userId}`, 60, 60_000);

    const { data: existing, error: fetchErr } = await db
      .from("message_reactions")
      .select("id, user_id")
      .eq("id", reactionId)
      .single();

    if (fetchErr || !existing) throw new NotFoundError("Reaction");
    if (existing.user_id !== userId)
      throw new ForbiddenError("You can only delete your own reactions");

    const { error } = await db
      .from("message_reactions")
      .delete()
      .eq("id", reactionId);

    if (error) throw error;

    return noContent();
  });
}
