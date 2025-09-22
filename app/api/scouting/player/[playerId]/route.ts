import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

interface Scouting {
  age: number;
  salary: number;
  tce: number;
  tci: number;
  tc: number;
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

interface ScoutedPlayer {
  id: number;
  firstName: string;
  lastName: string;
  countryId: number;
  potential: number;
  scoutings: Scouting[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ playerId: string }> }
) {
  try {
    const { playerId } = await params;
    const dataDir = path.join(process.cwd(), "app", "data", "scoutedPlayers");
    const filePath = path.join(dataDir, `${playerId}.json`);

    if (fs.existsSync(filePath)) {
      // Player file exists, read and return with latest scouting
      const fileContent = fs.readFileSync(filePath, "utf8");
      const playerData: ScoutedPlayer = JSON.parse(fileContent);

      // Find the most recent scouting entry
      let latestScouting = null;
      if (playerData.scoutings && playerData.scoutings.length > 0) {
        latestScouting = playerData.scoutings.reduce((latest, current) => {
          return new Date(current.scoutedAt) > new Date(latest.scoutedAt)
            ? current
            : latest;
        });
      }

      return NextResponse.json({
        id: playerData.id,
        firstName: playerData.firstName,
        lastName: playerData.lastName,
        countryId: playerData.countryId,
        potential: playerData.potential,
        latestScouting,
      });
    } else {
      // Player file doesn't exist, return basic structure for new player
      return NextResponse.json({
        id: parseInt(playerId),
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
