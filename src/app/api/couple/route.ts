/**
 * GET  /api/couple
 *   Returns the authenticated user's couple info + partner profile.
 *   Returns { couple: null } if the user has not joined a couple yet.
 *
 * POST /api/couple
 *   { action: "create" }              → creates a new couple, returns invite_code
 *   { action: "join", invite_code }   → joins an existing couple by invite code.
 *                                       If the caller has an incomplete solo couple
 *                                       (user2 = null, they are user1), it is
 *                                       abandoned automatically before joining.
 *   { action: "leave" }               → abandons an incomplete solo couple
 *                                       (user2 = null).  Clears couple_id on profile.
 *
 *   Rate limited: 5 actions / 60 s per user to prevent code-guessing.
 */

import { type NextRequest } from "next/server";
import { withAuth, ok, created } from "@/lib/api-handler";
import { rateLimit } from "@/lib/rate-limit";
import { CoupleActionSchema } from "@/lib/schemas";
import { ConflictError, NotFoundError, ForbiddenError } from "@/lib/errors";
import type { Couple, Profile } from "@/types/database";

// ─── GET — couple + partner info ───────────────────────────────────────────

export async function GET(_req: NextRequest) {
  return withAuth(async ({ userId, coupleId, db }) => {
    if (!coupleId) {
      return ok({ couple: null, partner: null, inviteCode: null });
    }

    const { data: couple, error: coupleErr } = await db
      .from("couples")
      .select("id, created_at, user1_id, user2_id, invite_code, anniversary_date, meet_date")
      .eq("id", coupleId)
      .single();

    if (coupleErr || !couple) throw new NotFoundError("Couple");

    const partnerId =
      couple.user1_id === userId ? couple.user2_id : couple.user1_id;

    let partner: Partial<Profile> | null = null;
    if (partnerId) {
      const { data: p } = await db
        .from("profiles")
        .select("id, display_name, avatar_url")
        .eq("id", partnerId)
        .single();
      partner = p;
    }

    return ok({
      couple:     couple as Couple,
      partner,
      inviteCode: couple.user2_id ? null : couple.invite_code, // hide code once couple is full
    });
  });
}

// ─── POST — create, join, or leave a couple ────────────────────────────────

export async function POST(req: NextRequest) {
  return withAuth(async ({ userId, coupleId, db }) => {
    // Rate limit: 5 attempts per minute (prevent brute-forcing invite codes)
    rateLimit(`couple:${userId}`, 5, 60_000);

    const body = CoupleActionSchema.parse(await req.json());

    // ── create ─────────────────────────────────────────────────────────────
    if (body.action === "create") {
      if (coupleId) throw new ConflictError("You are already in a couple");

      const inviteCode = crypto.randomUUID().replace(/-/g, "").substring(0, 8).toUpperCase();

      const { data: couple, error } = await db
        .from("couples")
        .insert({ user1_id: userId, invite_code: inviteCode })
        .select("id, invite_code")
        .single();

      if (error) throw error;

      // Link the user's profile to this couple
      const { error: upsertErr } = await db
        .from("profiles")
        .upsert({ id: userId, couple_id: couple.id });
      if (upsertErr) throw upsertErr;

      return created({
        couple:     couple as Pick<Couple, "id" | "invite_code">,
        inviteCode: couple.invite_code,
      });
    }

    // ── leave ──────────────────────────────────────────────────────────────
    if (body.action === "leave") {
      // Idempotent: no couple → already left
      if (!coupleId) return ok({ left: true });

      const { data: existing, error: fetchErr } = await db
        .from("couples")
        .select("id, user1_id, user2_id")
        .eq("id", coupleId)
        .single();

      if (fetchErr || !existing) {
        // Profile points to a stale couple — just clear the reference
        await db.from("profiles").update({ couple_id: null }).eq("id", userId);
        return ok({ left: true });
      }

      if (existing.user2_id !== null) {
        throw new ConflictError(
          "Cannot leave a couple that already has two members. Contact support."
        );
      }

      if (existing.user1_id !== userId) {
        throw new ForbiddenError("You are not the owner of this couple link");
      }

      // Delete the incomplete couple and clear the profile reference
      const { error: delErr } = await db
        .from("couples")
        .delete()
        .eq("id", existing.id);
      if (delErr) throw delErr;

      await db.from("profiles").update({ couple_id: null }).eq("id", userId);

      return ok({ left: true });
    }

    // ── join ───────────────────────────────────────────────────────────────
    // Keep join flow tolerant to stale profile state and race-safe:
    // 1) allow abandoning only an incomplete solo couple
    // 2) join target only if user2_id is still null

    let soloToDelete: string | null = null;

    if (coupleId) {
      const { data: existing } = await db
        .from("couples")
        .select("id, user1_id, user2_id")
        .eq("id", coupleId)
        .single();

      if (!existing) {
        // Profile points to a deleted/stale couple — clear it and continue
        await db.from("profiles").update({ couple_id: null }).eq("id", userId);
      } else if (existing.user1_id === userId && existing.user2_id === null) {
        // Caller owns an incomplete solo couple — safe to abandon
        soloToDelete = existing.id;
      } else {
        throw new ConflictError("You are already in a couple");
      }
    }

    const { data: target, error: findErr } = await db
      .from("couples")
      .select("id, user1_id, user2_id, invite_code")
      .eq("invite_code", body.invite_code)
      .single();

    if (findErr || !target) throw new NotFoundError("Invite code");
    if (target.user2_id)    throw new ConflictError("This couple already has two members");
    if (target.user1_id === userId) throw new ForbiddenError(
      soloToDelete === target.id
        ? "That\u2019s your own invite code \u2013 share it with your partner instead"
        : "You cannot join your own couple link"
    );

    // Delete the caller's solo placeholder (if any) before linking
    if (soloToDelete) {
      const { error: delErr } = await db
        .from("couples")
        .delete()
        .eq("id", soloToDelete);
      if (delErr) throw delErr;
    }

    // Claim the empty slot — only succeeds when user2_id is still null.
    // Requires the "Anyone can join incomplete couple" RLS policy on couples.
    const { data: joined, error: updateErr } = await db
      .from("couples")
      .update({ user2_id: userId })
      .eq("id", target.id)
      .eq("user2_id", null)   // prevent a race where someone else just joined
      .select("id")
      .single();

    if (updateErr || !joined) {
      throw new ConflictError(
        "This couple was just taken. Please try another code or create your own."
      );
    }

    await db.from("profiles").upsert({ id: userId, couple_id: target.id });

    return ok({ couple: { id: target.id } });
  });
}
