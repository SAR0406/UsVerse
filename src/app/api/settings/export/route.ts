import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch all user data
    const [
      profileResult,
      settingsResult,
      notificationPrefsResult,
      privacySettingsResult,
      aiPreferencesResult,
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("user_settings").select("*").eq("user_id", user.id).single(),
      supabase.from("notification_preferences").select("*").eq("user_id", user.id).single(),
      supabase.from("privacy_settings").select("*").eq("user_id", user.id).single(),
      supabase.from("ai_preferences").select("*").eq("user_id", user.id).single(),
    ]);

    // Compile all data into a single JSON object
    const exportData = {
      export_date: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
      },
      profile: profileResult.data || null,
      settings: settingsResult.data || null,
      notification_preferences: notificationPrefsResult.data || null,
      privacy_settings: privacySettingsResult.data || null,
      ai_preferences: aiPreferencesResult.data || null,
    };

    // Return as downloadable JSON file
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="usverse_data_export_${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error("Data export error:", error);
    return NextResponse.json(
      { error: "Failed to export data" },
      { status: 500 }
    );
  }
}
