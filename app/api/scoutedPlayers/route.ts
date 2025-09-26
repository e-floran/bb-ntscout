/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import {
  userCredentials,
  cleanupExpiredCredentials,
} from "@/app/utils/userCredentials";
import { UserRoles } from "@/app/types/types";
import { User } from "@/app/types/mainTypes";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required"
  );
}

const supabase = createClient(supabaseUrl, supabaseKey);

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

    // Get session ID and retrieve user from credentials
    const sessionId = request.cookies.get("session_id")?.value;
    if (!sessionId) {
      return NextResponse.json({ error: "No session found" }, { status: 401 });
    }

    // Clean up expired credentials and get user
    cleanupExpiredCredentials();
    const storedCredentials = userCredentials.get(sessionId);
    if (!storedCredentials) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const user = storedCredentials.user;

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
    // Get team players (those who have played for this NT)
    const { data: teamPlayers, error: teamError } = await supabase
      .from("players")
      .select("id")
      .eq("team_id", parseInt(teamId));

    if (teamError) {
      console.error("Error fetching team players:", teamError);
      return NextResponse.json(
        { error: "Failed to fetch team players" },
        { status: 500 }
      );
    }

    const teamPlayerIds = teamPlayers?.map((p) => p.id) || [];

    // Get scouted players with their latest scouting data, filtered by team
    const { data: scoutedPlayers, error: scoutedError } = await supabase
      .from("players")
      .select(
        `
        id,
        first_name,
        last_name,
        country_id,
        potential,
        current_age,
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
      .in("id", teamPlayerIds)
      .order("created_at", { foreignTable: "scoutings", ascending: false });

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
  return scoutedPlayers
    .map((player) => {
      // Get the most recent scouting data (first in the array after ordering)
      const latestScouting = Array.isArray(player.scoutings)
        ? player.scoutings[0]
        : player.scoutings;

      if (!latestScouting) {
        return null;
      }

      return {
        id: player.id,
        firstName: player.first_name,
        lastName: player.last_name,
        countryId: player.country_id,
        potential: player.potential,
        currentAge: player.current_age,
        age: latestScouting.age,
        salary: latestScouting.salary,
        gameshape: latestScouting.gameshape,
        // Skills
        jumpShot: latestScouting.jump_shot,
        jumpRange: latestScouting.jump_range,
        outsideDefense: latestScouting.outside_defense,
        handling: latestScouting.handling,
        driving: latestScouting.driving,
        passing: latestScouting.passing,
        insideShot: latestScouting.inside_shot,
        insideDefense: latestScouting.inside_defense,
        rebound: latestScouting.rebound,
        shotBlocking: latestScouting.shot_blocking,
        stamina: latestScouting.stamina,
        freeThrow: latestScouting.free_throw,
        experience: latestScouting.experience,
        scoutedAt: latestScouting.created_at,
      };
    })
    .filter((player) => player !== null); // Remove any null entries
}
