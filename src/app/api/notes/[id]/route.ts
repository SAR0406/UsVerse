/**
 * PATCH  /api/notes/[id]
 *   Updates a diary entry. Only the author may edit their own entries.
 *
 * DELETE /api/notes/[id]
 *   Deletes a diary entry. Only the author may delete their own entries.
 *
 * Ownership is validated before the DB mutation — not via RLS alone —
 * so we can return a meaningful 403 instead of a silent no-op.
 */

import { type NextRequest } from "next/server";
import { withAuth, ok, noContent } from "@/lib/api-handler";
import { rateLimit } from "@/lib/rate-limit";
import { UpdateNoteSchema } from "@/lib/schemas";
import { NotFoundError, ForbiddenError } from "@/lib/errors";
import type { SharedNote } from "@/types/database";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ─── PATCH — update a diary entry ──────────────────────────────────────────

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  return withAuth(async ({ userId, db }) => {
    const { id } = await params;

    rateLimit(`notes:${userId}`, 30, 60_000);

    // Validate ownership before running the update
    const { data: existing, error: fetchErr } = await db
      .from("shared_notes")
      .select("id, author_id")
      .eq("id", id)
      .single();

    if (fetchErr || !existing) throw new NotFoundError("Note");
    if (existing.author_id !== userId) throw new ForbiddenError("You can only edit your own diary entries");

    const body = UpdateNoteSchema.parse(await req.json());

    const { data, error } = await db
      .from("shared_notes")
      .update({
        ...(body.title   !== undefined && { title:   body.title }),
        ...(body.content !== undefined && { content: body.content }),
      })
      .eq("id", id)
      .select("id, created_at, updated_at, couple_id, author_id, title, content")
      .single();

    if (error) throw error;

    return ok(data as SharedNote);
  });
}

// ─── DELETE — remove a diary entry ─────────────────────────────────────────

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async ({ userId, db }) => {
    const { id } = await params;

    const { data: existing, error: fetchErr } = await db
      .from("shared_notes")
      .select("id, author_id")
      .eq("id", id)
      .single();

    if (fetchErr || !existing) throw new NotFoundError("Note");
    if (existing.author_id !== userId) throw new ForbiddenError("You can only delete your own diary entries");

    const { error } = await db.from("shared_notes").delete().eq("id", id);
    if (error) throw error;

    return noContent();
  });
}
