import { NextRequest, NextResponse } from "next/server";
import {
  loadAllScoutedPlayers,
  loadTeamPlayers,
  filterScoutedPlayersForTeam,
  formatScoutedPlayersTableRows,
} from "@/app/utils/scoutedPlayersUtils";

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
