import { createClient } from "@/lib/supabase/server";
import { UpdateProfileSchema } from "@/lib/schemas";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, username, bio")
    .eq("id", user.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile });
}

export async function PATCH(req: NextRequest) {
  void req;
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const validation = UpdateProfileSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.format() },
      { status: 400 }
    );
  }

  const updates = validation.data;

  // Check if username is already taken
  if (updates.username) {
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", updates.username)
      .neq("id", user.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "Username is already taken" },
        { status: 409 }
      );
    }
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(updates as never)
    .eq("id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: data });
}
