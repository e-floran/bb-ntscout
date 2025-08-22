/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "fs";
import path from "path";
import { ScoutedPlayer } from "@/app/types/mainTypes";

export interface ScoutedPlayerWithLatestScouting {
  id: number;
  firstName: string;
  lastName: string;
  countryId: number;
  potential: number;
  latestScouting: {
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
  };
  hasPlayedForNT: boolean;
}

export function loadAllScoutedPlayers(): ScoutedPlayer[] {
  try {
    const scoutedPlayersDir = path.join(
      process.cwd(),
      "app",
      "data",
      "scoutedPlayers"
    );

    if (!fs.existsSync(scoutedPlayersDir)) {
      return [];
    }

    const files = fs
      .readdirSync(scoutedPlayersDir)
      .filter((file) => file.endsWith(".json"));
    const players: ScoutedPlayer[] = [];

    for (const file of files) {
      try {
        const filePath = path.join(scoutedPlayersDir, file);
        const playerData = JSON.parse(fs.readFileSync(filePath, "utf8"));
        players.push(playerData);
      } catch (error) {
        console.warn(`Error reading scouted player file ${file}:`, error);
      }
    }

    return players;
  } catch (error) {
    console.error("Error loading scouted players:", error);
    return [];
  }
}

export function loadTeamPlayers(teamId: string): string[] {
  try {
    const teamFilePath = path.join(
      process.cwd(),
      "app",
      "data",
      "teams",
      `${teamId}.json`
    );

    if (!fs.existsSync(teamFilePath)) {
      return [];
    }

    const teamData = JSON.parse(fs.readFileSync(teamFilePath, "utf8"));
    return teamData.players || [];
  } catch (error) {
    console.warn(`Error loading team players for team ${teamId}:`, error);
    return [];
  }
}

export function getLatestScouting(player: ScoutedPlayer) {
  if (!player.scoutings || player.scoutings.length === 0) {
    return null;
  }

  // Sort by scoutedAt date (most recent first)
  const sortedScoutings = [...player.scoutings].sort(
    (a, b) => new Date(b.scoutedAt).getTime() - new Date(a.scoutedAt).getTime()
  );
  return sortedScoutings[0];
}

export function filterScoutedPlayersForTeam(
  scoutedPlayers: ScoutedPlayer[],
  teamId: string,
  teamPlayers: string[]
): ScoutedPlayerWithLatestScouting[] {
  const teamIdNum = parseInt(teamId, 10);
  if (isNaN(teamIdNum)) {
    return [];
  }

  // Determine if it's a junior team (ID >= 1000) or senior team
  const isJuniorTeam = teamIdNum >= 1000;
  const countryId = isJuniorTeam ? teamIdNum - 1000 : teamIdNum;

  const filteredPlayers: ScoutedPlayerWithLatestScouting[] = [];
  for (const player of scoutedPlayers) {
    // Check if player is from the same country
    if (player.countryId !== countryId) {
      continue;
    }
    if (player.scoutings[0].age >= 20) {
    }
    const latestScouting = getLatestScouting(player);
    if (!latestScouting) {
      continue;
    }

    // Apply eligibility criteria based on team type
    let isEligible = false;

    if (isJuniorTeam) {
      // Junior team: age 20-21 and salary > 10,000
      isEligible =
        latestScouting.age >= 20 &&
        latestScouting.age <= 21 &&
        latestScouting.salary > 10000;
    } else {
      // Senior team: age > 21 and salary > 100,000
      isEligible = latestScouting.age > 21 && latestScouting.salary > 100000;
    }

    if (isEligible) {
      // Check if player has played for the national team
      const hasPlayedForNT = teamPlayers.includes(player.id.toString());

      filteredPlayers.push({
        id: player.id,
        firstName: player.firstName,
        lastName: player.lastName,
        countryId: player.countryId,
        potential: player.potential,
        latestScouting,
        hasPlayedForNT,
      });
    }
  }

  // Sort: NT players first, then by salary (highest first)
  return filteredPlayers.sort((a, b) => {
    if (a.hasPlayedForNT && !b.hasPlayedForNT) return -1;
    if (!a.hasPlayedForNT && b.hasPlayedForNT) return 1;
    return b.latestScouting.salary - a.latestScouting.salary;
  });
}

export function formatScoutedPlayersTableRows(
  players: ScoutedPlayerWithLatestScouting[]
): any[] {
  return players.map((player) => {
    const scouting = player.latestScouting;
    return [
      `${player.firstName} ${player.lastName}`,
      scouting.age.toString(),
      scouting.salary.toLocaleString(),
      scouting.tc.toString(),
      scouting.tce.toString(),
      scouting.tci.toString(),
      scouting.gs.toString(),
      scouting.js.toString(),
      scouting.jr.toString(),
      scouting.od.toString(),
      scouting.ha.toString(),
      scouting.dr.toString(),
      scouting.pa.toString(),
      scouting.is.toString(),
      scouting.id.toString(),
      scouting.rb.toString(),
      scouting.sb.toString(),
      scouting.st.toString(),
      scouting.ft.toString(),
      scouting.ex.toString(),
      player.potential.toString(),
      new Date(scouting.scoutedAt).toLocaleDateString(),
      player.hasPlayedForNT ? "Oui" : "Non",
    ];
  });
}
