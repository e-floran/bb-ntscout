import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Function to get Supabase client
function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required"
    );
  }
  return createClient(supabaseUrl, supabaseKey);
}

export async function GET(request: NextRequest) {
  try {
    // Get user authentication
    const login = request.cookies.get("authenticated_user")?.value;
    if (!login) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const supabase = getSupabaseClient();

    // Query user from database
    const { data: users, error } = await supabase
      .from("users")
      .select("id, login, main_team_id, active, role, is_new")
      .eq("login", login)
      .eq("active", true)
      .single();

    if (error || !users) {
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }

    // Return user profile data
    return NextResponse.json({
      login: users.login,
      mainTeamId: users.main_team_id.toString(),
      active: users.active,
      role: users.role,
      isNew: users.is_new,
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
