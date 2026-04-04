import { createClient } from "@/lib/supabase/server";
import { UpdatePrivacySettingsSchema } from "@/lib/schemas";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let { data: privacy, error } = await supabase
    .from("privacy_settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!privacy) {
    const { data: newPrivacy, error: insertError } = await supabase
      .from("privacy_settings")
      .insert({ user_id: user.id } as never)
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    privacy = newPrivacy;
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ privacy });
}

export async function PATCH(req: NextRequest) {
  void req;
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const validation = UpdatePrivacySettingsSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.format() },
      { status: 400 }
    );
  }

  const updates = validation.data;

  const { data, error } = await supabase
    .from("privacy_settings")
    .upsert({ user_id: user.id, ...updates } as never, { onConflict: "user_id" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ privacy: data });
}
