import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const DeleteAccountSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const validation = DeleteAccountSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.format() },
      { status: 400 }
    );
  }

  const { password } = validation.data;

  // Verify password before deletion
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

  try {
    // Delete user data from profiles (cascade will handle related data)
    const { error: deleteProfileError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", user.id);

    if (deleteProfileError) {
      console.error("Profile deletion error:", deleteProfileError);
      // Continue even if profile deletion fails
    }

    // Delete the auth user (this is the critical step)
    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(user.id);

    if (deleteAuthError) {
      console.error("Auth deletion error:", deleteAuthError);
      return NextResponse.json(
        { error: "Failed to delete account. Please contact support." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Account deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}
