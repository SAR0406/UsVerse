import { NextResponse, type NextRequest } from "next/server";
import { z, ZodError } from "zod";
import { createClient } from "@/lib/supabase/server";
import { TooManyRequestsError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";

const SignUpSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(6),
  displayName: z.string().trim().min(1).max(80),
});

export async function POST(req: NextRequest) {
  try {
    const body = SignUpSchema.parse(await req.json());
    const email = body.email.toLowerCase();

    // Rate limit email sign-up requests: 2 requests per minute per email
    rateLimit(`auth:signup-email:${email}`, 2, 60_000);

    const supabase = await createClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;
    const { error } = await supabase.auth.signUp({
      email,
      password: body.password,
      options: {
        data: { display_name: body.displayName },
        emailRedirectTo: `${appUrl}/api/auth/callback`,
      },
    });

    if (error) {
      return NextResponse.json(
        { error: { code: "AUTH_ERROR", message: error.message } },
        { status: 400 },
      );
    }

    return NextResponse.json({
      data: { message: "Check your email to confirm your account, then sign in." },
    });
  } catch (err) {
    if (err instanceof TooManyRequestsError) {
      return NextResponse.json(
        { error: { code: err.code, message: err.message } },
        { status: err.status },
      );
    }

    if (err instanceof ZodError) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Validation failed",
            details: err.flatten(),
          },
        },
        { status: 422 },
      );
    }

    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } },
      { status: 500 },
    );
  }
}
