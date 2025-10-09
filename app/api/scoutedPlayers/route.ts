/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
// Removed unused userCredentials imports
import { UserRoles } from "@/app/types/types";
import { User } from "@/app/types/mainTypes";
import { createClient } from "@supabase/supabase-js";

// Function to get Supabase client (lazy initialization)
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

// Helper function to determine team category
function getTeamCategory(teamId: string): "senior" | "junior" {
  return parseInt(teamId, 10) < 1000 ? "senior" : "junior";
}

// Helper function to check if user can access scouted players for the analyzed team
function canUserAccessScoutedPlayers(
  user: User,
  analyzedTeamId: string
): boolean {
  // Admin and Coach roles can access all teams
  if (user.role === UserRoles.Admin || user.role === UserRoles.Coach) {
    return true;
  }

  // Staff role can only access teams in the same category as their main team
  if (user.role === UserRoles.Staff) {
    const userTeamCategory = getTeamCategory(user.mainTeamId);
    const analyzedTeamCategory = getTeamCategory(analyzedTeamId);
    return userTeamCategory === analyzedTeamCategory;
  }

  // Other roles (User) cannot access scouted players
  return false;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId");

    if (!teamId) {
      return NextResponse.json(
        { error: "Team ID is required" },
        { status: 400 }
      );
    }

    // User authentication and role validation
    const login = request.cookies.get("authenticated_user")?.value;
    if (!login) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Query user from database and validate permissions
    let user;
    try {
      const supabase = getSupabaseClient();
      const { data: users, error } = await supabase
        .from("users")
        .select("id, login, main_team_id, active, role")
        .eq("login", login)
        .eq("active", true)
        .single();

      if (error || !users) {
        return NextResponse.json({ error: "Session expired" }, { status: 401 });
      }

      // Role validation for analyze endpoints (scoutedPlayers is part of analyze functionality)
      const allowedRoles = ["Admin", "Coach", "Staff"];
      if (!allowedRoles.includes(users.role)) {
        return NextResponse.json(
          { error: "Insufficient permissions to access analysis features" },
          { status: 403 }
        );
      }

      // Convert database format to expected format for compatibility
      user = {
        login: users.login,
        mainTeamId: users.main_team_id.toString(),
        active: users.active,
        role: users.role,
      };
    } catch (dbError) {
      console.error("Database error during user lookup:", dbError);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    // Check if user can access scouted players for this team
    if (!canUserAccessScoutedPlayers(user, teamId)) {
      // Return empty data for unauthorized access
      return NextResponse.json({
        players: [],
        count: 0,
        teamId,
        isJuniorTeam: parseInt(teamId, 10) >= 1000,
        message: "Access denied for this team category",
      });
    }

    // User is authorized - proceed with database queries
    const supabase = getSupabaseClient();

    // Get eligible players: both those who played for this team AND those from same country
    // Determine country_id from team_id (junior teams: teamId - 1000, senior teams: teamId)
    const countryId =
      parseInt(teamId) >= 1000 ? parseInt(teamId) - 1000 : parseInt(teamId);
    const isJuniorTeam = parseInt(teamId) >= 1000;
    console.log(`� Country ID: ${countryId}`);

    // Get scouted players with their latest scouting data, filtered by country
    // This includes both players who played for the team AND eligible players from same country
    // Build the query with age filtering based on team category
    let query = supabase
      .from("players")
      .select(
        `
        id,
        first_name,
        last_name,
        country_id,
        potential,
        current_age,
        team_id,
        scoutings!inner(
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
      .eq("country_id", countryId);

    // Add age and salary filtering based on team category
    if (isJuniorTeam) {
      // Junior team: players aged 18-21 with salary > 10,000
      query = query
        .gte("current_age", 18)
        .lte("current_age", 21)
        .gte("scoutings.salary", 10000);
    } else {
      // Senior team: players aged 22+ with salary > 100,000
      query = query.gte("current_age", 22).gte("scoutings.salary", 100000);
    }

    // Execute the query with ordering
    const { data: scoutedPlayers, error: scoutedError } = await query.order(
      "created_at",
      { foreignTable: "scoutings", ascending: false }
    );

    if (scoutedError) {
      console.error("Error fetching scouted players:", scoutedError);
      return NextResponse.json(
        { error: "Failed to fetch scouted players" },
        { status: 500 }
      );
    }

    // Format for table display
    const tableRows = formatScoutedPlayersForTable(scoutedPlayers || []);

    return NextResponse.json({
      players: tableRows,
      count: tableRows.length,
      teamId,
      isJuniorTeam: parseInt(teamId, 10) >= 1000,
    });
  } catch (error) {
    console.error("Error in scouted players API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper function to format scouted players data for table display
function formatScoutedPlayersForTable(scoutedPlayers: any[]): any[] {
  const formatted = scoutedPlayers
    .map((player) => {
      // Get the most recent scouting data (first in the array after ordering)
      const latestScouting = Array.isArray(player.scoutings)
        ? player.scoutings[0]
        : player.scoutings;

      if (!latestScouting) {
        return null;
      }

      // Format as array to match DataTable expectations
      // Headers: ["Joueur", "Âge", "Salaire", "TC", "TCE", "TCI", "GS", "JS", "JR", "OD", "HA", "DR", "PA", "IS", "ID", "RB", "SB", "ST", "FT", "EX", "POT", "Scouté le", "NT"]
      const formattedPlayer = [
        `${player.first_name} ${player.last_name}`, // Joueur
        latestScouting.age, // Âge
        latestScouting.salary?.toLocaleString() || "N/A", // Salaire
        "N/A", // TC (Total Contribution - calculate if needed)
        "N/A", // TCE (Total Contribution External)
        "N/A", // TCI (Total Contribution Internal)
        latestScouting.gameshape, // GS
        latestScouting.jump_shot, // JS
        latestScouting.jump_range, // JR
        latestScouting.outside_defense, // OD
        latestScouting.handling, // HA
        latestScouting.driving, // DR
        latestScouting.passing, // PA
        latestScouting.inside_shot, // IS
        latestScouting.inside_defense, // ID
        latestScouting.rebound, // RB
        latestScouting.shot_blocking, // SB
        latestScouting.stamina, // ST
        latestScouting.free_throw, // FT
        latestScouting.experience, // EX
        player.potential, // POT
        new Date(latestScouting.created_at).toLocaleDateString(), // Scouté le
        player.team_id ? "Oui" : "Non", // NT (has played for any national team)
      ];

      return formattedPlayer;
    })
    .filter((player) => player !== null);

  return formatted;
}
