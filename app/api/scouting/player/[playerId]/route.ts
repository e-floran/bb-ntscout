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

interface LatestScouting {
  age: number;
  salary: number;
  gs: number;
  js: number;
  jr: number;
  od: number;
  ha: number;
  dr: number;
  pa: number;
  is: number;
  id: number;
  rb: number;
  sb: number;
  st: number;
  ft: number;
  ex: number;
  scoutedAt: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ playerId: string }> }
) {
  try {
    // User authentication and role validation
    const login = request.cookies.get("authenticated_user")?.value;
    if (!login) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const supabase = getSupabaseClient();

    // Validate user permissions
    const { data: users, error: userError } = await supabase
      .from("users")
      .select("id, login, main_team_id, active, role")
      .eq("login", login)
      .eq("active", true)
      .single();

    if (userError || !users) {
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }

    // Role validation for scouting endpoints
    const allowedRoles = ["Admin", "Coach", "Staff", "Scout"];
    if (!allowedRoles.includes(users.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions to access scouting features" },
        { status: 403 }
      );
    }

    const { playerId } = await params;
    const playerIdInt = parseInt(playerId);

    if (isNaN(playerIdInt)) {
      return NextResponse.json({ error: "Invalid player ID" }, { status: 400 });
    }

    // Get player data from database
    const { data: playerData, error: playerError } = await supabase
      .from("players")
      .select("id, first_name, last_name, country_id, potential")
      .eq("id", playerIdInt)
      .single();

    if (playerError && playerError.code !== "PGRST116") {
      console.error("Error fetching player:", playerError);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    let latestScouting: LatestScouting | null = null;

    if (playerData) {
      // Player exists, get their latest scouting data
      const { data: scoutingData, error: scoutingError } = await supabase
        .from("scoutings")
        .select("*")
        .eq("player_id", playerIdInt)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (scoutingError && scoutingError.code !== "PGRST116") {
        console.error("Error fetching scouting data:", scoutingError);
        // Continue without scouting data rather than failing
      }

      if (scoutingData) {
        latestScouting = {
          age: scoutingData.age,
          salary: scoutingData.salary,
          gs: scoutingData.gameshape,
          js: scoutingData.jump_shot,
          jr: scoutingData.jump_range,
          od: scoutingData.outside_defense,
          ha: scoutingData.handling,
          dr: scoutingData.driving,
          pa: scoutingData.passing,
          is: scoutingData.inside_shot,
          id: scoutingData.inside_defense,
          rb: scoutingData.rebound,
          sb: scoutingData.shot_blocking,
          st: scoutingData.stamina,
          ft: scoutingData.free_throw,
          ex: scoutingData.experience,
          scoutedAt: scoutingData.created_at,
        };
      }

      return NextResponse.json({
        id: playerData.id,
        firstName: playerData.first_name || "",
        lastName: playerData.last_name || "",
        countryId: playerData.country_id || 0,
        potential: playerData.potential || 0,
        latestScouting,
      });
    } else {
      // Player doesn't exist in database, return basic structure for new player
      return NextResponse.json({
        id: playerIdInt,
        firstName: "",
        lastName: "",
        countryId: 0,
        potential: 0,
        latestScouting: null,
      });
    }
  } catch (error) {
    console.error("Error looking up player:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
