/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { baseApiUrl } from "@/app/utils/api/apiUtils";
import { users } from "@/app/utils/users";
import xml2js from "xml2js";
import { enrichPlayersWithHistory } from "@/app/utils/playerHistoryUtils";

type Position = "PG" | "SG" | "SF" | "PF" | "C";

const TEAM_DATA_DIR = path.join(process.cwd(), "app/data/teams");
const SEASON = 69;

function parseDate(dateString: string) {
  return new Date(dateString);
}

// Utility to humanize camelCase/PascalCase for display
function humanize(str: string) {
  if (!str) return "";
  return str
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

async function fetchXml(url: string, cookies: string) {
  const response = await fetch(url, {
    headers: cookies ? { Cookie: cookies } : undefined,
  });
  const text = await response.text();
  const parser = new xml2js.Parser({ explicitArray: false });
  return parser.parseStringPromise(text);
}

export async function GET(req: NextRequest) {
  // --- User authentication and verification ---
  const login = req.cookies.get("authenticated_user")?.value;
  if (!login) {
    return NextResponse.redirect("/login");
  }
  const user = users.find((u) => u.login === login && u.active);
  if (!user) {
    return NextResponse.redirect("/login");
  }

  // --- Read query params for advanced analysis ---
  const url = new URL(req.url);
  const teamIdParam = url.searchParams.get("teamId");
  const numberOfSeasonsParam = url.searchParams.get("numberOfSeasons");
  const bbSession = req.cookies.get("bbapi_session")?.value || "";

  // If both params are present, bypass normal flow
  if (teamIdParam && numberOfSeasonsParam) {
    const teamId = teamIdParam;
    let numSeasons = Math.max(1, Math.min(10, Number(numberOfSeasonsParam)));
    if (isNaN(numSeasons)) numSeasons = 2;

    // Analyze the requested team for numSeasons starting from SEASON
    const seasons: number[] = [];
    for (let i = 0; i < numSeasons; ++i) {
      seasons.push(SEASON - i);
    }

    // Analyze all seasons in parallel
    const seasonsData = await Promise.all(
      seasons.map((season) => analyzeTeamForSeason(teamId, bbSession, season))
    );

    // Use the teamId and fetch team name from the most recent season
    let opponentName = "";
    if (seasonsData[0]?.teamName) {
      opponentName = seasonsData[0].teamName;
    } else {
      // fallback: try to get from one of the other seasons
      const found = seasonsData.find((s) => !!s.teamName);
      if (found) opponentName = found.teamName;
    }

    return NextResponse.json({
      opponentName,
      opponentId: teamId,
      seasons,
      seasonsData,
    });
  }

  // --- Default flow: analyze mainTeamId's next opponent for 2 seasons ---
  const mainTeamId = user.mainTeamId;
  const jsonPath = path.join(TEAM_DATA_DIR, `${mainTeamId}.json`);
  if (!fs.existsSync(TEAM_DATA_DIR)) {
    fs.mkdirSync(TEAM_DATA_DIR, { recursive: true });
  }

  // Fetch team schedule for this season
  const teamScheduleUrl = `${baseApiUrl}schedule.aspx?teamid=${mainTeamId}&season=${SEASON}`;
  const teamScheduleXml = await fetchXml(teamScheduleUrl, bbSession);

  let matches = [];
  if (teamScheduleXml?.bbapi?.schedule?.match) {
    matches = teamScheduleXml.bbapi.schedule.match;
    if (!Array.isArray(matches)) matches = [matches];
  } else {
    // API error or empty schedule
    return NextResponse.json({
      error: "Calendrier de l'équipe non trouvé ou erreur API",
      details: teamScheduleXml,
    });
  }

  // Get unique player IDs for season
  const playerSet = new Set<number>();
  for (const m of matches) {
    if (
      m.homeTeam &&
      m.homeTeam.$.id == mainTeamId &&
      m.homeTeam.boxscore?.player
    ) {
      const players = Array.isArray(m.homeTeam.boxscore.player)
        ? m.homeTeam.boxscore.player
        : [m.homeTeam.boxscore.player];
      players.forEach((p: any) => playerSet.add(Number(p.$.id)));
    }
    if (
      m.awayTeam &&
      m.awayTeam.$.id == mainTeamId &&
      m.awayTeam.boxscore?.player
    ) {
      const players = Array.isArray(m.awayTeam.boxscore.player)
        ? m.awayTeam.boxscore.player
        : [m.awayTeam.boxscore.player];
      players.forEach((p: any) => playerSet.add(Number(p.$.id)));
    }
  }

  // If file does not exist, create as per example.json format
  if (!fs.existsSync(jsonPath)) {
    const jsonTeam = {
      id: Number(mainTeamId),
      players: Array.from(playerSet),
      isJunior: Number(mainTeamId) > 1000,
      continent: null,
    };
    fs.writeFileSync(jsonPath, JSON.stringify(jsonTeam, null, 2));
  }

  // Find next future match
  const now = new Date();
  const futureMatches = matches.filter(
    (m: any) => parseDate(m["$"].start) > now
  );

  if (futureMatches.length === 0) {
    return NextResponse.json({
      error: "Aucun match futur programmé pour votre équipe",
    });
  }
  const nextMatch = futureMatches.sort(
    (a: any, b: any) =>
      (parseDate(a["$"].start) as unknown as number) -
      (parseDate(b["$"].start) as unknown as number)
  )[0];

  let opponentTeam;
  if (nextMatch.homeTeam["$"].id == mainTeamId) {
    opponentTeam = nextMatch.awayTeam;
  } else {
    opponentTeam = nextMatch.homeTeam;
  }
  const opponentId = opponentTeam["$"].id;
  const opponentName = opponentTeam.teamName;
  const PREV_SEASON = SEASON - 1;

  // Run analysis for opponent, current and previous season
  const [curr, prev] = await Promise.all([
    analyzeTeamForSeason(opponentId, bbSession, SEASON),
    analyzeTeamForSeason(opponentId, bbSession, PREV_SEASON),
  ]);

  return NextResponse.json({
    opponentName,
    opponentId,
    curr,
    prev,
    season: SEASON,
    prevSeason: PREV_SEASON,
    // Add these for compatibility with your modified frontend
    seasons: [SEASON, PREV_SEASON],
    seasonsData: [curr, prev],
  });
}

// --- Analysis logic for one season of a team ---
async function analyzeTeamForSeason(
  teamId: string,
  cookies: string,
  season: number
) {
  const opponentScheduleUrl = `${baseApiUrl}schedule.aspx?teamid=${teamId}&season=${season}`;
  const opponentScheduleXml = await fetchXml(opponentScheduleUrl, cookies);

  let opponentMatches = [];
  if (opponentScheduleXml?.bbapi?.schedule?.match) {
    opponentMatches = opponentScheduleXml.bbapi.schedule.match;
    if (!Array.isArray(opponentMatches)) opponentMatches = [opponentMatches];
  } else {
    // No matches for team, return empty analysis
    return {
      teamName: "",
      offenseStrategies: {},
      defenseStrategies: {},
      avgRatings: {},
      avgEfficiency: {},
      effortDeltaList: [],
      playerSumStats: {},
      matches: [],
      players: [], // Add empty players array for consistency
      recentGames: [], // NEW: Add empty recent games array
    };
  }

  let teamName = "";
  const offenseStrategies: Record<string, number> = {};
  const defenseStrategies: Record<string, number> = {};
  const ratingsTotal: Record<string, number> = {};
  let ratingsCount = 0;
  const effTotal: Record<Position, number> = {
      PG: 0,
      SG: 0,
      SF: 0,
      PF: 0,
      C: 0,
    },
    effCount: Record<Position, number> = { PG: 0, SG: 0, SF: 0, PF: 0, C: 0 };
  const playerSumStats: Record<string, any> = {};
  const effortDeltaList: any[] = [];
  const uniquePlayers: Map<string, any> = new Map(); // Track unique players

  // Store individual matches with their strategies and data for filtering
  const matchesWithStrategies: any[] = [];

  // NEW: Store recent games data
  const recentGames: any[] = [];

  const now = new Date();
  for (const match of opponentMatches) {
    const matchId = match["$"].id;
    const matchDateStr = match["$"].start;
    const matchDate = parseDate(matchDateStr);

    // Skip future matches for current season analysis
    if (season === SEASON && matchDate >= now) continue;

    const boxscoreUrl = `${baseApiUrl}boxscore.aspx?matchid=${matchId}`;
    let boxXml;
    try {
      boxXml = await fetchXml(boxscoreUrl, cookies);
    } catch (e) {
      continue;
    }

    const matchNode = boxXml?.bbapi?.match;
    let teamNode = null;
    let opponentNode = null;

    if (
      matchNode?.awayTeam &&
      matchNode.awayTeam.$ &&
      matchNode.awayTeam.$.id == teamId
    ) {
      teamNode = matchNode.awayTeam;
      opponentNode = matchNode.homeTeam;
    } else if (
      matchNode?.homeTeam &&
      matchNode.homeTeam.$ &&
      matchNode.homeTeam.$.id == teamId
    ) {
      teamNode = matchNode.homeTeam;
      opponentNode = matchNode.awayTeam;
    } else continue;

    if (!teamName && teamNode && teamNode.teamName) {
      teamName = teamNode.teamName;
    }

    const offStrat = (teamNode.offStrategy || "").trim();
    const defStrat = (teamNode.defStrategy || "").trim();
    offenseStrategies[offStrat] = (offenseStrategies[offStrat] || 0) + 1;
    defenseStrategies[defStrat] = (defenseStrategies[defStrat] || 0) + 1;

    // Process ratings - ensure proper parsing
    const matchRatings: Record<string, number> = {};
    if (teamNode.ratings) {
      for (const [cat, value] of Object.entries(teamNode.ratings)) {
        const numValue = parseFloat(value as string);
        if (!isNaN(numValue)) {
          ratingsTotal[cat] = (ratingsTotal[cat] || 0) + numValue;
          matchRatings[cat] = numValue;
        }
      }
      ratingsCount++;
    }

    // Process efficiency - ensure proper parsing
    const matchEfficiency: Partial<Record<Position, number>> = {};
    if (teamNode.efficiency) {
      for (const pos of ["PG", "SG", "SF", "PF", "C"] as Position[]) {
        if (teamNode.efficiency[pos] !== undefined) {
          const numValue = parseFloat(teamNode.efficiency[pos]);
          if (!isNaN(numValue)) {
            effTotal[pos] += numValue;
            effCount[pos]++;
            matchEfficiency[pos] = numValue;
          }
        }
      }
    }

    // Process effort delta
    const effortDelta =
      matchNode && "effortDelta" in matchNode
        ? parseFloat(matchNode.effortDelta)
        : 0;

    if (!isNaN(effortDelta)) {
      effortDeltaList.push({
        date: matchDateStr,
        effortDelta,
        matchId: matchId,
      });
    }

    // Extract and process player stats
    const matchPlayerStats: Record<string, any> = {};
    // NEW: Extract player positions and minutes for recent games
    const gamePlayerMinutes: Record<string, any> = {};

    if (teamNode.boxscore && teamNode.boxscore.player) {
      let players = teamNode.boxscore.player;
      if (!Array.isArray(players)) players = [players];

      for (const p of players) {
        const pid = p["$"].id;
        const name = `${p.firstName} ${p.lastName}`;

        // Track unique players
        if (!uniquePlayers.has(pid)) {
          uniquePlayers.set(pid, {
            id: pid,
            name: name,
            position: p.position || null,
          });
        }

        if (!playerSumStats[pid]) {
          playerSumStats[pid] = {
            name,
            pts: 0,
            ast: 0,
            reb: 0,
            min: 0,
            games: 0,
            blk: 0,
            stl: 0,
            to: 0,
            pf: 0,
            // Add shooting statistics
            fgm: 0,
            fga: 0,
            tpm: 0,
            tpa: 0,
          };
        }

        if (
          p.performance &&
          p.performance.pts !== undefined &&
          p.performance.pts !== "N/A"
        ) {
          const stats = {
            pts: parseInt(p.performance.pts) || 0,
            ast: parseInt(p.performance.ast) || 0,
            reb: parseInt(p.performance.reb) || 0,
            blk: parseInt(p.performance.blk) || 0,
            stl: parseInt(p.performance.stl) || 0,
            to: parseInt(p.performance.to) || 0,
            pf: parseInt(p.performance.pf) || 0,
            // Add shooting statistics extraction
            fgm: parseInt(p.performance.fgm) || 0,
            fga: parseInt(p.performance.fga) || 0,
            tpm: parseInt(p.performance.tpm) || 0,
            tpa: parseInt(p.performance.tpa) || 0,
          };

          // Add to season totals
          playerSumStats[pid].pts += stats.pts;
          playerSumStats[pid].ast += stats.ast;
          playerSumStats[pid].reb += stats.reb;
          playerSumStats[pid].blk += stats.blk;
          playerSumStats[pid].stl += stats.stl;
          playerSumStats[pid].to += stats.to;
          playerSumStats[pid].pf += stats.pf;
          // Add shooting statistics aggregation
          playerSumStats[pid].fgm += stats.fgm;
          playerSumStats[pid].fga += stats.fga;
          playerSumStats[pid].tpm += stats.tpm;
          playerSumStats[pid].tpa += stats.tpa;

          // Calculate minutes
          let min = 0;
          const positionMinutes: Record<Position, number> = {
            PG: 0,
            SG: 0,
            SF: 0,
            PF: 0,
            C: 0,
          };

          for (const pos of ["PG", "SG", "SF", "PF", "C"] as Position[]) {
            if (p.minutes && p.minutes[pos]) {
              const posMin = parseInt(p.minutes[pos]) || 0;
              min += posMin;
              positionMinutes[pos] = posMin;
            }
          }

          playerSumStats[pid].min += min;
          playerSumStats[pid].games += 1;

          // Store for this match with proper structure
          matchPlayerStats[pid] = {
            name,
            ...stats,
            min,
          };

          // NEW: Store position minutes for recent games
          gamePlayerMinutes[pid] = {
            name,
            positionMinutes,
            totalMinutes: min,
          };
        }
      }
    }

    // Store match data with proper structure for filtering
    matchesWithStrategies.push({
      matchId,
      date: matchDateStr,
      effortDelta,
      offStrategy: offStrat,
      defStrategy: defStrat,
      ratings: matchRatings,
      efficiency: matchEfficiency,
      playerStats: matchPlayerStats,
    });

    // NEW: Store recent game data (all games, not limited)
    recentGames.push({
      matchId,
      date: matchDateStr,
      opponent: opponentNode
        ? {
            id: opponentNode.$ ? opponentNode.$.id : null,
            name: opponentNode.teamName || "Unknown",
          }
        : null,
      strategies: {
        offense: humanize(offStrat),
        defense: humanize(defStrat),
      },
      playerMinutes: gamePlayerMinutes,
    });
  }

  // Sort effort data by date
  effortDeltaList.sort(
    (a, b) =>
      (parseDate(a.date) as unknown as number) -
      (parseDate(b.date) as unknown as number)
  );

  // NEW: Sort recent games by date (most recent first) - analyze all games, no limit
  recentGames.sort(
    (a, b) =>
      (parseDate(b.date) as unknown as number) -
      (parseDate(a.date) as unknown as number)
  );

  // Humanize keys for frontend display
  const offenseStrategiesHumanized: Record<string, number> = {};
  Object.entries(offenseStrategies).forEach(([k, v]) => {
    offenseStrategiesHumanized[humanize(k)] = v;
  });

  const defenseStrategiesHumanized: Record<string, number> = {};
  Object.entries(defenseStrategies).forEach(([k, v]) => {
    defenseStrategiesHumanized[humanize(k)] = v;
  });

  const avgRatingsHumanized: Record<string, number> = {};
  Object.entries(ratingsTotal).forEach(([k, sum]) => {
    avgRatingsHumanized[humanize(k)] = ratingsCount ? sum / ratingsCount : 0;
  });

  const avgEfficiencyHumanized: Record<string, number> = {};
  Object.entries(effTotal).forEach(([k, sum]) => {
    avgEfficiencyHumanized[k] = effCount[k as Position]
      ? sum / effCount[k as Position]
      : 0;
  });

  // Convert unique players to array and enrich with history
  const playersArray = Array.from(uniquePlayers.values());
  const playersWithHistory = enrichPlayersWithHistory(playersArray);

  return {
    teamName,
    offenseStrategies: offenseStrategiesHumanized,
    defenseStrategies: defenseStrategiesHumanized,
    avgRatings: avgRatingsHumanized,
    avgEfficiency: avgEfficiencyHumanized,
    effortDeltaList,
    playerSumStats,
    matches: matchesWithStrategies, // Include properly structured match data
    players: playersWithHistory, // NEW: Add players with history
    recentGames: recentGames, // NEW: Add all recent games data (no limit)
  };
}
