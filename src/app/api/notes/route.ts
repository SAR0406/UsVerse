/**
 * GET  /api/notes?cursor=<iso-timestamp>&limit=20
 *   Returns the couple's shared diary entries, newest-first.
 *   Cursor is the updated_at of the last note received (for infinite scroll).
 *
 * POST /api/notes
 *   Creates a new diary entry.
 *   Rate limited: 20 creates / 60 s per user.
 */

import { type NextRequest } from "next/server";
import { withAuth, ok, created } from "@/lib/api-handler";
import { rateLimit } from "@/lib/rate-limit";
import { CreateNoteSchema, PaginationSchema } from "@/lib/schemas";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import type { SharedNote } from "@/types/database";

// ─── GET — paginated notes list ─────────────────────────────────────────────

export async function GET(req: NextRequest) {
  return withAuth(async ({ coupleId, db }) => {
    if (!coupleId) throw new NotFoundError("Couple");

    const { cursor, limit } = PaginationSchema.parse(
      Object.fromEntries(req.nextUrl.searchParams),
    );

    let query = db
      .from("shared_notes")
      .select("id, created_at, updated_at, couple_id, author_id, title, content")
      .eq("couple_id", coupleId)
      .order("updated_at", { ascending: false })
      .order("id",         { ascending: false })
      .limit(limit + 1);

    if (cursor) {
      query = query.lt("updated_at", cursor);
    }

    const { data, error } = await query;
    if (error) throw error;

    const notes = data ?? [];
    const hasMore = notes.length > limit;
    const page = hasMore ? notes.slice(0, limit) : notes;

    return ok({
      notes: page as SharedNote[],
      pagination: {
        cursor: page.length > 0 ? page[page.length - 1].updated_at : null,
        hasMore,
      },
    });
  });
}

// ─── POST — create a diary entry ────────────────────────────────────────────

export async function POST(req: NextRequest) {
  return withAuth(async ({ userId, coupleId, db }) => {
    if (!coupleId) throw new ForbiddenError("Connect with a partner before writing in the diary");

    rateLimit(`notes:${userId}`, 20, 60_000);

    const body = CreateNoteSchema.parse(await req.json());

    const { data, error } = await db
      .from("shared_notes")
      .insert({
        couple_id: coupleId,
        author_id: userId,
        title:     body.title,
        content:   body.content,
      })
      .select("id, created_at, updated_at, couple_id, author_id, title, content")
      .single();

    if (error) throw error;

    return created(data as SharedNote);
  });
}
