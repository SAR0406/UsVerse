/**
 * API handler utilities:
 *  - Typed JSON response helpers
 *  - `withAuth`: authenticates the request, resolves userId + coupleId,
 *    injects a Supabase server client, and wraps in error handling + logging.
 *
 * Usage in a route handler:
 *
 *   export async function POST(req: NextRequest) {
 *     return withAuth(async ({ userId, coupleId, db, traceId }) => {
 *       // ... validated, authenticated handler body
 *     });
 *   }
 */

import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createClient } from "@/lib/supabase/server";
import { logger, newTraceId } from "@/lib/logger";
import { UnauthorizedError, ValidationError, isAppError } from "@/lib/errors";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// ─── Response envelope ─────────────────────────────────────────────────────

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status });
}

export function created<T>(data: T): NextResponse {
  return NextResponse.json({ data }, { status: 201 });
}

export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

export function errorResponse(err: unknown, traceId?: string): NextResponse {
  if (err instanceof ZodError) {
    const wrapped = new ValidationError("Validation failed", err.flatten());
    return NextResponse.json(
      { error: { code: wrapped.code, message: wrapped.message, details: wrapped.details } },
      { status: wrapped.status },
    );
  }

  if (isAppError(err)) {
    // Never leak internal details for server errors (5xx)
    const safe = err.status >= 500
      ? { code: err.code, message: "An unexpected error occurred" }
      : { code: err.code, message: err.message, details: err.details };
    return NextResponse.json({ error: safe }, { status: err.status });
  }

  // Unknown error — log and return generic 500
  logger.error("unhandled_error", {
    traceId,
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } },
    { status: 500 },
  );
}

// ─── Auth context ──────────────────────────────────────────────────────────

export interface AuthContext {
  userId: string;
  coupleId: string | null;
  db: SupabaseClient<Database>;
  traceId: string;
}

type AuthedHandler = (ctx: AuthContext) => Promise<NextResponse>;

/**
 * Wraps a route handler with:
 * 1. A unique traceId for log correlation
 * 2. Supabase session validation (returns 401 if not authenticated)
 * 3. coupleId resolution from the user's profile
 * 4. Request duration logging
 * 5. Centralised error handling
 */
export async function withAuth(handler: AuthedHandler): Promise<NextResponse> {
  const traceId = newTraceId();
  const start = Date.now();

  try {
    const db = await createClient();

    const {
      data: { user },
      error: authError,
    } = await db.auth.getUser();

    if (authError || !user) {
      throw new UnauthorizedError("Authentication required");
    }

    const { data: profile } = await db
      .from("profiles")
      .select("couple_id")
      .eq("id", user.id)
      .maybeSingle();

    const result = await handler({
      userId: user.id,
      coupleId: profile?.couple_id ?? null,
      db,
      traceId,
    });

    result.headers.set("x-trace-id", traceId);

    logger.info("api.request", {
      traceId,
      userId: user.id,
      duration_ms: Date.now() - start,
      status: result.status,
    });

    return result;
  } catch (err) {
    logger.warn("api.error", {
      traceId,
      duration_ms: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
      code: isAppError(err) ? err.code : "UNKNOWN",
    });
    const res = errorResponse(err, traceId);
    res.headers.set("x-trace-id", traceId);
    return res;
  }
}
