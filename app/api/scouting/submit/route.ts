import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

interface ScoutingData {
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

interface PlayerData {
  id: number;
  firstName: string;
  lastName: string;
  countryId: number;
  potential: number;
}

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

// Helper function to calculate skill points like in the original script
function calculateSkillPoints(scoutingData: ScoutingData) {
  const guardSkillPoints =
    scoutingData.js +
    scoutingData.jr +
    scoutingData.od +
    scoutingData.ha +
    scoutingData.dr;
  const bigSkillPoints =
    scoutingData.pa +
    scoutingData.is +
    scoutingData.id +
    scoutingData.rb +
    scoutingData.sb;
  const totalSkillPoints =
    guardSkillPoints + bigSkillPoints + scoutingData.st + scoutingData.ft;

  return {
    tce: guardSkillPoints,
    tci: bigSkillPoints,
    tc: totalSkillPoints,
  };
}

// Helper: get week start date (Friday) for a given date
function getWeekStart(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getUTCDay();
  const daysToFriday = day >= 5 ? day - 5 : day + 2;
  date.setUTCDate(date.getUTCDate() - daysToFriday);
  date.setUTCHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

export async function POST(request: NextRequest) {
  try {
    const {
      playerId,
      playerData,
      scoutingData,
    }: {
      playerId: number;
      playerData: PlayerData;
      scoutingData: ScoutingData;
    } = await request.json();

    const dataDir = path.join(process.cwd(), "app", "data", "scoutedPlayers");

    // Create data directory if it doesn't exist
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const filePath = path.join(dataDir, `${playerId}.json`);

    // Calculate skill totals
    const skillTotals = calculateSkillPoints(scoutingData);

    // Create new scouting entry
    const newScouting: Scouting = {
      age: scoutingData.age,
      salary: scoutingData.salary,
      tce: skillTotals.tce,
      tci: skillTotals.tci,
      tc: skillTotals.tc,
      gs: scoutingData.gs,
      js: scoutingData.js,
      jr: scoutingData.jr,
      od: scoutingData.od,
      ha: scoutingData.ha,
      dr: scoutingData.dr,
      pa: scoutingData.pa,
      is: scoutingData.is,
      id: scoutingData.id,
      rb: scoutingData.rb,
      sb: scoutingData.sb,
      st: scoutingData.st,
      ft: scoutingData.ft,
      ex: scoutingData.ex,
      scoutedAt: scoutingData.scoutedAt,
    };

    let scoutedPlayer: ScoutedPlayer;

    if (fs.existsSync(filePath)) {
      // File exists, read and update
      const existingData: ScoutedPlayer = JSON.parse(
        fs.readFileSync(filePath, "utf8")
      );

      // Check if a scouting entry for the same week already exists
      const newWeek = getWeekStart(newScouting.scoutedAt);
      const weekExists = existingData.scoutings.some(
        (s) => getWeekStart(s.scoutedAt) === newWeek
      );

      if (weekExists) {
        // Replace the existing entry for this week
        scoutedPlayer = {
          ...existingData,
          scoutings: existingData.scoutings.map((s) =>
            getWeekStart(s.scoutedAt) === newWeek ? newScouting : s
          ),
        };
      } else {
        // Add new scouting entry
        scoutedPlayer = {
          ...existingData,
          scoutings: [...existingData.scoutings, newScouting],
        };
      }
    } else {
      // Create new player file
      scoutedPlayer = {
        id: playerId,
        firstName: playerData.firstName || "",
        lastName: playerData.lastName || "",
        countryId: playerData.countryId || 0,
        potential: playerData.potential || 0,
        scoutings: [newScouting],
      };
    }

    // Write the file
    fs.writeFileSync(filePath, JSON.stringify(scoutedPlayer, null, 2));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error submitting scouting data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
