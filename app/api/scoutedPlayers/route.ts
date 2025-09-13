import { NextRequest, NextResponse } from "next/server";
import {
  loadAllScoutedPlayers,
  loadTeamPlayers,
  filterScoutedPlayersForTeam,
  formatScoutedPlayersTableRows,
} from "@/app/utils/scoutedPlayersUtils";
import {
  userCredentials,
  cleanupExpiredCredentials,
} from "@/app/api/login/route";
import { UserRoles } from "@/app/types/types";
import { User } from "@/app/types/mainTypes";

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

    // User is authorized - proceed with normal flow
    // Load all scouted players
    const allScoutedPlayers = loadAllScoutedPlayers();

    // Load team players (those who have played for this NT)
    const teamPlayers = loadTeamPlayers(teamId);

    // Filter scouted players for this team
    const filteredPlayers = filterScoutedPlayersForTeam(
      allScoutedPlayers,
      teamId,
      teamPlayers
    );

    // Format for table display
    const tableRows = formatScoutedPlayersTableRows(filteredPlayers);

    return NextResponse.json({
      players: tableRows,
      count: filteredPlayers.length,
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
