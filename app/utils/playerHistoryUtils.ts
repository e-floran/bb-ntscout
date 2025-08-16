/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "fs";
import path from "path";
import { GameShapeHistory, PlayerWithHistory } from "@/app/types/playerHistory";

interface PlayerWeek {
  season: number;
  id: number;
  weekStart: string;
  gameShape: number;
  dmi: number;
}

interface PlayerData {
  id: string;
  nationalTeamId: string;
  weeks: PlayerWeek[];
}

// Function to get current week ID based on season start
function getCurrentWeekId(): number {
  // Season 69 started on July 11th, 2025 (Friday)
  const seasonStartDate = new Date("2025-07-11");
  const now = new Date();

  // Calculate weeks since season start
  const daysSinceStart = Math.floor(
    (now.getTime() - seasonStartDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const weeksSinceStart = Math.floor(daysSinceStart / 7);

  // Current week ID (1-14)
  return Math.min(weeksSinceStart + 1, 14);
}

export function getPlayerHistory(playerId: string): GameShapeHistory[] {
  try {
    const playerFile = path.join(
      process.cwd(),
      "app/data/players",
      `${playerId}.json`
    );

    if (!fs.existsSync(playerFile)) {
      console.log(`Player file not found: ${playerId}`);
      return [];
    }

    const playerData: PlayerData = JSON.parse(
      fs.readFileSync(playerFile, "utf8")
    );

    // Convert your existing weekly data structure to GameShapeHistory
    return (playerData.weeks || [])
      .map((week: PlayerWeek) => ({
        weekId: week.id,
        gameShape: week.gameShape,
        dmi: week.dmi,
        date: week.weekStart.split("T")[0], // Extract just the date part
      }))
      .sort((a: GameShapeHistory, b: GameShapeHistory) => b.weekId - a.weekId); // Most recent first
  } catch (error) {
    console.error(`Error loading history for player ${playerId}:`, error);
    return [];
  }
}

export function calculateChanges(history: GameShapeHistory[]): {
  gameShapeChange: number;
  dmiChange: number;
} {
  if (history.length < 2) return { gameShapeChange: 0, dmiChange: 0 };

  const [current, previous] = history.slice(0, 2);
  return {
    gameShapeChange: current.gameShape - previous.gameShape,
    dmiChange: current.dmi - previous.dmi,
  };
}

export function calculateDMIComparisonToLastGS9(history: GameShapeHistory[]): {
  percentage: number;
  lastGS9DMI: number;
  lastGS9WeekId: number;
} | null {
  if (!history || history.length === 0) return null;

  const currentWeek = history[0];

  // If current GameShape is 9, always return 100%
  if (currentWeek.gameShape === 9) {
    return {
      percentage: 100,
      lastGS9DMI: currentWeek.dmi,
      lastGS9WeekId: currentWeek.weekId,
    };
  }

  // Find the most recent week with GameShape = 9
  const lastGS9Week = history.find((week) => week.gameShape === 9);

  if (!lastGS9Week) {
    return null; // No GS=9 week found
  }

  // Calculate percentage: (current DMI / last GS9 DMI) * 100
  const percentage = (currentWeek.dmi / lastGS9Week.dmi) * 100;

  return {
    percentage: Math.round(percentage * 10) / 10, // Round to 1 decimal place
    lastGS9DMI: lastGS9Week.dmi,
    lastGS9WeekId: lastGS9Week.weekId,
  };
}

export function enrichPlayersWithHistory(players: any[]): PlayerWithHistory[] {
  const currentWeekId = getCurrentWeekId();

  return players.map((player) => {
    const playerId = player.id || player.playerId || String(player.id);
    const history = getPlayerHistory(playerId);

    // Check if we have current week data
    const currentWeekData = history.find(
      (week) => week.weekId === currentWeekId
    );
    const hasCurrentWeekData = !!currentWeekData;

    // Use current week data if available, otherwise use most recent
    const dataToUse = currentWeekData || history[0];

    const changes = calculateChanges(history);
    const dmiComparison = calculateDMIComparisonToLastGS9(history);

    return {
      ...player, // Preserve all existing fields
      gameShapeHistory: history,
      currentGameShape: hasCurrentWeekData ? dataToUse?.gameShape : undefined,
      currentDMI: hasCurrentWeekData ? dataToUse?.dmi : undefined,
      gameShapeChange: hasCurrentWeekData ? changes.gameShapeChange : 0,
      dmiChange: hasCurrentWeekData ? changes.dmiChange : 0,
      dmiComparisonToLastGS9: hasCurrentWeekData ? dmiComparison : null,
      // Add metadata to track data freshness
      mostRecentWeekId: history[0]?.weekId,
      isCurrentWeekDataAvailable: hasCurrentWeekData,
    };
  });
}
