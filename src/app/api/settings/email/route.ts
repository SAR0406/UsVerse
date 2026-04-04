import { createClient } from "@/lib/supabase/server";
import { RequestEmailChangeSchema } from "@/lib/schemas";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const validation = RequestEmailChangeSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.format() },
      { status: 400 }
    );
  }

  const { new_email, password } = validation.data;

  // Verify current password by attempting to sign in
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password,
  });

  if (signInError) {
    return NextResponse.json(
      { error: "Invalid password" },
      { status: 401 }
    );
  }

  // Request email change (Supabase will send confirmation email)
  const { error: updateError } = await supabase.auth.updateUser({
    email: new_email,
  });

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    message: "Email change requested. Please check your new email for confirmation.",
  });
}
