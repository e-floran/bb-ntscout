/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { baseApiUrl } from "@/app/utils/api/apiUtils";
import xml2js from "xml2js";
import axios from "axios";
import {
  userCredentials,
  cleanupExpiredCredentials,
} from "@/app/utils/userCredentials";
import { User } from "@/app/types/mainTypes";
import { createClient } from "@supabase/supabase-js";

// Import getCurrentWeekId function for proper current week detection
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

type Position = "PG" | "SG" | "SF" | "PF" | "C";

const SEASON = 69;

// Session management class for handling BBAPI timeouts
class BBAPISessionManager {
  private queryCount = 0;
  private sessionCookie = "";
  private userLogin = "";
  private userPassword = "";
  private user: User | undefined = undefined;
  private hasCredentials = false;

  constructor(initialCookie?: string, sessionId?: string) {
    this.sessionCookie = initialCookie || "";

    // Try to get credentials from stored session or environment variables
    if (sessionId) {
      cleanupExpiredCredentials();
      const storedCredentials = userCredentials.get(sessionId);
      if (storedCredentials) {
        this.userLogin = storedCredentials.login;
        this.userPassword = storedCredentials.password;
        this.user = storedCredentials.user;
        this.hasCredentials = true;
        console.log("Using stored session credentials for re-authentication");
      }
    }

    // Fallback to environment variables (for scripts)
    if (!this.hasCredentials) {
      this.userLogin = process.env.BB_USERNAME || "";
      this.userPassword = process.env.BB_PASSWORD || "";
      this.hasCredentials = !!(this.userLogin && this.userPassword);
      if (this.hasCredentials) {
        console.log("Using environment variables for re-authentication");
      }
    }
  }

  private async login(): Promise<boolean> {
    // Only attempt login if we have credentials
    if (!this.hasCredentials) {
      console.log(
        "No credentials available for re-authentication, continuing with existing session"
      );
      return false;
    }

    try {
      console.log("Re-authenticating BBAPI session...");
      const response = await axios.get(`${baseApiUrl}login.aspx`, {
        params: {
          login: this.userLogin,
          code: this.userPassword,
        },
      });

      const responseText = response.data;

      if (!responseText.includes("<loggedIn")) {
        console.error("Login failed - invalid credentials or API error");
        return false;
      }

      const setCookieHeader = response.headers["set-cookie"];
      if (setCookieHeader) {
        this.sessionCookie = setCookieHeader
          .map((cookie) => cookie.split(";")[0].trim())
          .join("; ");
        console.log("Re-authentication successful!");
        return true;
      }

      console.error("Login failed - no session cookie received");
      return false;
    } catch (error) {
      console.error("Login error:", error);
      return false;
    }
  }

  private async logout(): Promise<void> {
    // Only logout if we have credentials to log back in
    if (!this.hasCredentials) {
      return;
    }

    try {
      await axios.get(`${baseApiUrl}logout.aspx`, {
        headers: { Cookie: this.sessionCookie },
      });
      console.log("Logged out from BBAPI");
    } catch (error) {
      console.error("Logout error:", error);
    }
  }

  private async checkSessionAndReauth(): Promise<boolean> {
    // Only attempt re-authentication if we have credentials
    if (this.queryCount >= 50 && this.hasCredentials) {
      console.log("Re-authenticating due to query limit...");
      await this.logout();
      if (await this.login()) {
        this.queryCount = 0;
        return true;
      } else {
        console.log(
          "Re-authentication failed, continuing with existing session"
        );
        this.queryCount = 0; // Reset count to avoid repeated attempts
      }
    }
    return false;
  }

  async fetchXml(url: string): Promise<any> {
    try {
      // Check if we need to re-authenticate (only if we have credentials)
      await this.checkSessionAndReauth();

      const response = await fetch(url, {
        headers: this.sessionCookie
          ? { Cookie: this.sessionCookie }
          : undefined,
      });

      this.queryCount++;

      const text = await response.text();

      // Check for authentication errors
      if (text.includes("<error") && text.includes("NotAuthorized")) {
        console.log("Session expired detected");

        // Only attempt re-authentication if we have credentials
        if (this.hasCredentials && (await this.login())) {
          console.log("Retrying request with new session");
          const retryResponse = await fetch(url, {
            headers: { Cookie: this.sessionCookie },
          });
          this.queryCount++;
          const retryText = await retryResponse.text();
          const parser = new xml2js.Parser({ explicitArray: false });
          return parser.parseStringPromise(retryText);
        } else {
          // No credentials available, return the error response to let the frontend handle it
          console.log(
            "No credentials for re-authentication, returning session expired error"
          );
          const parser = new xml2js.Parser({ explicitArray: false });
          return parser.parseStringPromise(text);
        }
      }

      const parser = new xml2js.Parser({ explicitArray: false });
      return parser.parseStringPromise(text);
    } catch (error) {
      console.error("Error fetching XML:", error);
      throw error;
    }
  }

  getCookie(): string {
    return this.sessionCookie;
  }
}

// Global session manager instance
let sessionManager: BBAPISessionManager;

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

// Helper function to calculate averages from main team data
function calculateMainTeamAverages(teamId: string) {
  const mainTeamsDir = path.join(process.cwd(), "app/data/mainTeams");
  const teamFilePath = path.join(mainTeamsDir, `${teamId}.json`);

  if (!fs.existsSync(teamFilePath)) {
    return { avgRatings: {}, avgEfficiency: {}, maxRatings: {} };
  }

  try {
    const gameData = JSON.parse(fs.readFileSync(teamFilePath, "utf8"));

    if (!Array.isArray(gameData) || gameData.length === 0) {
      return { avgRatings: {}, avgEfficiency: {}, maxRatings: {} };
    }

    // Calculate average ratings and maximums
    const ratingsTotal: Record<string, number> = {};
    const ratingsCount: Record<string, number> = {};
    const ratingsMax: Record<string, number> = {};

    gameData.forEach((game: any) => {
      if (game.teamRatings) {
        Object.entries(game.teamRatings).forEach(([category, value]) => {
          if (typeof value === "number") {
            ratingsTotal[category] = (ratingsTotal[category] || 0) + value;
            ratingsCount[category] = (ratingsCount[category] || 0) + 1;
            ratingsMax[category] = Math.max(ratingsMax[category] || 0, value);
          }
        });
      }
    });

    const avgRatings: Record<string, number> = {};
    const maxRatings: Record<string, number> = {};
    Object.keys(ratingsTotal).forEach((category) => {
      if (ratingsCount[category] > 0) {
        // Use the original camelCase keys to match the analyzed team data
        avgRatings[category] = ratingsTotal[category] / ratingsCount[category];
        maxRatings[category] = ratingsMax[category];
      }
    });

    // Calculate average efficiency
    const efficiencyTotal: Record<string, number> = {};
    const efficiencyCount: Record<string, number> = {};

    gameData.forEach((game: any) => {
      if (game.positionsEfficiencies) {
        Object.entries(game.positionsEfficiencies).forEach(
          ([position, value]) => {
            if (typeof value === "number") {
              efficiencyTotal[position] =
                (efficiencyTotal[position] || 0) + value;
              efficiencyCount[position] = (efficiencyCount[position] || 0) + 1;
            }
          }
        );
      }
    });

    const avgEfficiency: Record<string, number> = {};
    Object.keys(efficiencyTotal).forEach((position) => {
      if (efficiencyCount[position] > 0) {
        avgEfficiency[position] =
          efficiencyTotal[position] / efficiencyCount[position];
      }
    });

    return { avgRatings, avgEfficiency, maxRatings };
  } catch (error) {
    console.error(`Error reading main team data for ${teamId}:`, error);
    return { avgRatings: {}, avgEfficiency: {}, maxRatings: {} };
  }
}

export async function GET(req: NextRequest) {
  // --- User authentication and verification ---
  const login = req.cookies.get("authenticated_user")?.value;
  if (!login) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Query user from database
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

    // Convert database format to expected format for compatibility
    user = {
      login: users.login,
      mainTeamId: users.main_team_id.toString(), // Convert back to string for compatibility
      active: users.active,
      role: users.role,
    };
  } catch (dbError) {
    console.error("Database error during user lookup:", dbError);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  // Initialize session manager with existing cookie and session ID
  const bbSession = req.cookies.get("bbapi_session")?.value || "";
  const sessionId = req.cookies.get("session_id")?.value;
  sessionManager = new BBAPISessionManager(bbSession, sessionId);

  // --- Read query params for advanced analysis ---
  const url = new URL(req.url);
  const teamIdParam = url.searchParams.get("teamId");
  const numberOfSeasonsParam = url.searchParams.get("numberOfSeasons");

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
      seasons.map((season) => analyzeTeamForSeason(teamId, season))
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

    // Get main team averages for comparison
    const mainTeamAverages = calculateMainTeamAverages(user.mainTeamId);

    return NextResponse.json({
      opponentName,
      opponentId: teamId,
      seasons,
      seasonsData,
      mainTeamAverages,
    });
  }

  // --- Default flow: analyze mainTeamId's next opponent for 1 season ---
  const mainTeamId = user.mainTeamId;

  // Fetch team schedule for this season
  const teamScheduleUrl = `${baseApiUrl}schedule.aspx?teamid=${mainTeamId}&season=${SEASON}`;
  const teamScheduleXml = await sessionManager.fetchXml(teamScheduleUrl);

  let matches = [];

  if (teamScheduleXml?.bbapi?.schedule?.match) {
    matches = teamScheduleXml.bbapi.schedule.match;
    if (!Array.isArray(matches)) matches = [matches];
  } else {
    // API error or empty schedule
    // Check for NotAuthorized error in XML response
    if (teamScheduleXml?.bbapi?.error?.["$"]?.message === "NotAuthorized") {
      // Return a JSON error so frontend can handle redirect
      return NextResponse.json({ error: "session_expired" }, { status: 401 });
    }
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

  // Ensure team exists in database
  const supabase = getSupabaseClient();
  await ensureTeamExists(supabase, Number(mainTeamId), Array.from(playerSet));

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

  // Run analysis for opponent, current season
  const curr = await analyzeTeamForSeason(opponentId, SEASON);

  // Get main team averages for comparison
  const mainTeamAverages = calculateMainTeamAverages(user.mainTeamId);

  return NextResponse.json({
    opponentName,
    opponentId,
    curr,
    season: SEASON,
    // Add these for compatibility with your modified frontend
    seasons: [SEASON],
    seasonsData: [curr],
    mainTeamAverages,
  });
}

// --- Analysis logic for one season of a team ---
async function analyzeTeamForSeason(teamId: string, season: number) {
  const opponentScheduleUrl = `${baseApiUrl}schedule.aspx?teamid=${teamId}&season=${season}`;
  const opponentScheduleXml = await sessionManager.fetchXml(
    opponentScheduleUrl
  );

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
      players: [],
      recentGames: [],
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
  const uniquePlayers: Map<string, any> = new Map();

  // Store individual matches with their strategies and data for filtering
  const matchesWithStrategies: any[] = [];

  // Store recent games data
  const recentGames: any[] = [];

  const gdpList: any[] = [];

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
      boxXml = await sessionManager.fetchXml(boxscoreUrl);
    } catch {
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

    const matchGdp = teamNode.gdp;

    gdpList.push({
      date: matchDateStr,
      matchId,
      opponent: opponentNode?.teamName || "Unknown",
      gdp: (matchGdp.focus || "").trim() + " " + (matchGdp.pace || "").trim(),
    });

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
      // If analyzed team is away, invert effortDelta sign
      let adjustedEffortDelta = effortDelta;
      if (teamNode === matchNode.awayTeam) {
        adjustedEffortDelta = -effortDelta;
      }
      // Get opponent name for this match
      let opponentName = "";
      if (opponentNode && opponentNode.teamName) {
        opponentName = opponentNode.teamName;
      }
      effortDeltaList.push({
        date: matchDateStr,
        effortDelta: adjustedEffortDelta,
        matchId: matchId,
        opponent: opponentName,
      });
    }

    // Extract and process player stats
    const matchPlayerStats: Record<string, any> = {};
    // Extract player positions and minutes for recent games
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

          // Store position minutes for recent games
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
      gdp: matchGdp,
      type: matchNode?.$ ? matchNode.$.type : undefined,
      partials: teamNode?.score?.$ ? teamNode.score.$.partials : undefined,
    });

    // Store recent game data (all games, not limited)
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

  gdpList.sort(
    (a, b) => (parseDate(a.date) as any) - (parseDate(b.date) as any)
  );

  // Sort recent games by date (most recent first) - analyze all games, no limit
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

  // Convert unique players to array and enrich with history from database
  const playersArray = Array.from(uniquePlayers.values());
  const supabase = getSupabaseClient();
  const playersWithHistory = await enrichPlayersWithHistoryFromDB(
    supabase,
    playersArray
  );

  return {
    teamName,
    offenseStrategies: offenseStrategiesHumanized,
    defenseStrategies: defenseStrategiesHumanized,
    avgRatings: avgRatingsHumanized,
    avgEfficiency: avgEfficiencyHumanized,
    effortDeltaList,
    playerSumStats,
    matches: matchesWithStrategies,
    players: playersWithHistory,
    recentGames: recentGames,
    gdpList,
  };
}

// Helper function to enrich players with history from database
async function enrichPlayersWithHistoryFromDB(
  supabase: any,
  players: any[]
): Promise<any[]> {
  const enrichedPlayers = [];

  for (const player of players) {
    try {
      // Get player weeks data from database
      const { data: weeks, error } = await supabase
        .from("player_weeks")
        .select("week_number, season, gameshape, dmi")
        .eq("player_id", parseInt(player.id))
        .order("season", { ascending: false })
        .order("week_number", { ascending: false });

      if (error) {
        console.error(`Error fetching weeks for player ${player.id}:`, error);
        enrichedPlayers.push({ ...player, weeks: [] });
        continue;
      }

      // Transform weeks data to match PlayerHistoryCard expected format
      const gameShapeHistory =
        weeks?.map((week: any) => ({
          season: week.season,
          weekId: week.week_number,
          gameShape: week.gameshape,
          dmi: week.dmi,
        })) || [];

      // Use the exact current week ID from the utility function
      const actualCurrentWeekId = getCurrentWeekId();
      const currentSeason = SEASON;

      // Find the data for the actual current week
      const currentWeekData = weeks?.find(
        (week: any) =>
          week.season === currentSeason &&
          week.week_number === actualCurrentWeekId
      );

      // Find the previous week data for change calculations
      const previousWeekData = weeks?.find(
        (week: any) =>
          week.season === currentSeason &&
          week.week_number === actualCurrentWeekId - 1
      );

      // We have current data only if we have data for the exact current week
      const hasCurrentData = currentWeekData != null;

      const currentDMI = currentWeekData?.dmi || 0;
      const currentGameShape = currentWeekData?.gameshape || 0;
      const gameShapeChange =
        hasCurrentData && previousWeekData
          ? currentGameShape - previousWeekData.gameshape
          : 0;
      const dmiChange =
        hasCurrentData && previousWeekData
          ? currentDMI - previousWeekData.dmi
          : 0;

      // Find last GS=9 week for comparison
      const lastGS9Week = weeks?.find((week: any) => week.gameshape === 9);
      const dmiComparisonToLastGS9 =
        lastGS9Week && hasCurrentData
          ? {
              percentage: (currentDMI / lastGS9Week.dmi) * 100,
              lastGS9WeekId: lastGS9Week.week_number,
              lastGS9DMI: lastGS9Week.dmi,
            }
          : null;

      const enrichedPlayer = {
        ...player,
        // Original weeks format for compatibility
        weeks:
          weeks?.map((week: any) => ({
            season: week.season,
            id: week.week_number,
            gameShape: week.gameshape,
            dmi: week.dmi,
          })) || [],
        // PlayerHistoryCard expected format
        gameShapeHistory,
        isCurrentWeekDataAvailable: hasCurrentData,
        currentDMI,
        currentGameShape,
        gameShapeChange,
        dmiChange,
        dmiComparisonToLastGS9,
        currentWeek: currentWeekData?.week_number || 0,
        currentSeason: currentWeekData?.season || 69,
      };

      enrichedPlayers.push(enrichedPlayer);
    } catch (error) {
      console.error(`Error enriching player ${player.id}:`, error);
      enrichedPlayers.push({ ...player, weeks: [] });
    }
  }

  return enrichedPlayers;
}

// Helper function to ensure team and players exist in database
async function ensureTeamExists(
  supabase: any,
  teamId: number,
  playerIds: number[]
): Promise<void> {
  try {
    // Ensure team exists
    const { error: teamError } = await supabase
      .from("teams")
      .upsert({ id: teamId, name: null });

    if (teamError) {
      console.error(`Error upserting team ${teamId}:`, teamError);
      return;
    }

    // Ensure all players exist with proper team_id and country_id
    for (const playerId of playerIds) {
      const countryId = teamId < 1000 ? teamId : teamId - 100;

      const { error: playerError } = await supabase.from("players").upsert({
        id: playerId,
        team_id: teamId,
        country_id: countryId,
      });

      if (playerError) {
        console.error(`Error upserting player ${playerId}:`, playerError);
      }
    }
  } catch (error) {
    console.error("Error ensuring team exists:", error);
  }
}
