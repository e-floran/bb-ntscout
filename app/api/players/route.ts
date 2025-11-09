/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

export async function GET(req: NextRequest) {
  // User authentication and verification
  const login = req.cookies.get("authenticated_user")?.value;
  if (!login) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Query user from database and validate permissions
  const supabase = getSupabaseClient();
  const { data: users, error: userError } = await supabase
    .from("users")
    .select("id, login, role, active, main_team_id")
    .eq("login", login)
    .eq("active", true)
    .single();

  if (userError || !users) {
    return NextResponse.json({ error: "Session expired" }, { status: 401 });
  }

  // Server-side role validation - only Admin, Coach, Scout, Staff can access
  const allowedRoles = ["Admin", "Coach", "Scout", "Staff"];
  if (!allowedRoles.includes(users.role)) {
    return NextResponse.json(
      { error: "Insufficient permissions to access players data" },
      { status: 403 }
    );
  }

  // Team-based access control for non-Admin users
  // Only allow access if user's main_team_id is 11 (France senior) or 1011 (France U21)
  if (users.role !== "Admin") {
    const allowedTeamIds = [11, 1011];
    if (!allowedTeamIds.includes(users.main_team_id)) {
      return NextResponse.json(
        {
          error: "Access denied",
          message: "Cette page est réservée aux équipes de France",
        },
        { status: 403 }
      );
    }
  }

  // Get query parameters for filtering
  const url = new URL(req.url);
  const nameFilter = url.searchParams.get("name");
  const minAge = url.searchParams.get("minAge");
  const maxAge = url.searchParams.get("maxAge");
  const minPotential = url.searchParams.get("minPotential");
  const maxPotential = url.searchParams.get("maxPotential");

  try {
    // Build query for French players (country_id = 11 for France)
    // Only include players with first_name and last_name not null
    let query = supabase
      .from("players")
      .select(
        `
        id, 
        first_name, 
        last_name, 
        current_age, 
        potential, 
        team_id,
        scoutings (
          age,
          salary,
          gameshape,
          jump_shot,
          jump_range,
          outside_defense,
          handling,
          driving,
          passing,
          inside_shot,
          inside_defense,
          rebound,
          shot_blocking,
          stamina,
          free_throw,
          experience,
          created_at
        )
      `
      )
      .eq("country_id", 11)
      .not("first_name", "is", null)
      .not("last_name", "is", null);

    // Apply filters
    if (nameFilter) {
      query = query.or(
        `first_name.ilike.%${nameFilter}%,last_name.ilike.%${nameFilter}%`
      );
    }

    if (minAge) {
      query = query.gte("current_age", parseInt(minAge));
    }

    if (maxAge) {
      query = query.lte("current_age", parseInt(maxAge));
    }

    if (minPotential) {
      query = query.gte("potential", parseInt(minPotential));
    }

    if (maxPotential) {
      query = query.lte("potential", parseInt(maxPotential));
    }

    // Order by last name initially (we'll sort by salary in JS after transformation)
    query = query.order("last_name", { ascending: true });

    const { data: players, error: playersError } = await query;

    if (playersError) {
      console.error("Error fetching players:", playersError);
      return NextResponse.json(
        { error: "Failed to fetch players" },
        { status: 500 }
      );
    }

    // Transform data and get latest scouting for each player
    const transformedPlayers = players?.map((player: any) => {
      // Get latest scouting (scoutings are ordered by created_at desc by default)
      const latestScouting = player.scoutings?.[0] || null;

      return {
        id: player.id,
        first_name: player.first_name,
        last_name: player.last_name,
        age: player.current_age,
        potential: player.potential,
        team_id: player.team_id,
        latestScouting: latestScouting
          ? {
              age: latestScouting.age,
              salary: latestScouting.salary,
              gs: latestScouting.gameshape,
              js: latestScouting.jump_shot,
              jr: latestScouting.jump_range,
              od: latestScouting.outside_defense,
              ha: latestScouting.handling,
              dr: latestScouting.driving,
              pa: latestScouting.passing,
              is: latestScouting.inside_shot,
              id: latestScouting.inside_defense,
              rb: latestScouting.rebound,
              sb: latestScouting.shot_blocking,
              st: latestScouting.stamina,
              ft: latestScouting.free_throw,
              ex: latestScouting.experience,
              scoutedAt: latestScouting.created_at,
            }
          : null,
      };
    });

    // Sort by salary (descending) - players with scouting data first, then by salary
    const sortedPlayers = transformedPlayers?.sort((a, b) => {
      const salaryA = a.latestScouting?.salary || 0;
      const salaryB = b.latestScouting?.salary || 0;
      return salaryB - salaryA; // Descending order (highest salary first)
    });

    return NextResponse.json({ players: sortedPlayers || [] });
  } catch (error) {
    console.error("Error in players API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
