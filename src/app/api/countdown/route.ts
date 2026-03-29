/**
 * GET   /api/countdown
 *   Returns the couple's meet_date and anniversary_date.
 *
 * PATCH /api/countdown
 *   Updates meet_date and/or anniversary_date.
 *   Rate limited: 10 updates / 60 s per user.
 */

import { type NextRequest } from "next/server";
import { withAuth, ok } from "@/lib/api-handler";
import { rateLimit } from "@/lib/rate-limit";
import { UpdateCountdownSchema } from "@/lib/schemas";
import { NotFoundError, ForbiddenError } from "@/lib/errors";

// ─── GET ────────────────────────────────────────────────────────────────────

export async function GET(_req: NextRequest) {
  return withAuth(async ({ coupleId, db }) => {
    if (!coupleId) throw new NotFoundError("Couple");

    const { data, error } = await db
      .from("couples")
      .select("id, meet_date, anniversary_date")
      .eq("id", coupleId)
      .single();

    if (error || !data) throw new NotFoundError("Couple");

    return ok({
      coupleId:        data.id,
      meetDate:        data.meet_date,
      anniversaryDate: data.anniversary_date,
    });
  });
}

// ─── PATCH ──────────────────────────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  return withAuth(async ({ userId, coupleId, db }) => {
    if (!coupleId) throw new ForbiddenError("Connect with a partner first");

    rateLimit(`countdown:${userId}`, 10, 60_000);

    const body = UpdateCountdownSchema.parse(await req.json());

    const update: Record<string, string | null> = {};
    if (body.meet_date        !== undefined) update.meet_date        = body.meet_date;
    if (body.anniversary_date !== undefined) update.anniversary_date = body.anniversary_date;

    const { data, error } = await db
      .from("couples")
      .update(update)
      .eq("id", coupleId)
      .select("id, meet_date, anniversary_date")
      .single();

    if (error) throw error;

    return ok({
      coupleId:        data.id,
      meetDate:        data.meet_date,
      anniversaryDate: data.anniversary_date,
    });
  });
}
