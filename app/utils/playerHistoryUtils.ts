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

export function enrichPlayersWithHistory(players: any[]): PlayerWithHistory[] {
  return players.map((player) => {
    const playerId = player.id || player.playerId || String(player.id);
    const history = getPlayerHistory(playerId);
    const changes = calculateChanges(history);

    return {
      ...player, // Preserve all existing fields
      gameShapeHistory: history,
      currentGameShape: history[0]?.gameShape,
      currentDMI: history[0]?.dmi,
      gameShapeChange: changes.gameShapeChange,
      dmiChange: changes.dmiChange,
    };
  });
}
