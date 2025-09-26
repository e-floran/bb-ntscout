/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "fs";
import path from "path";
import axios from "axios";
import { PlayerWeek, GameShapeRange } from "../app/types/types";
import { updateLastUpdateTimestamp } from "@/app/utils/updateLastUpdate";
import xml2js from "xml2js";
import { createClient } from "@supabase/supabase-js";

type Position = "PG" | "SG" | "SF" | "PF" | "C";

interface GameData {
  gameId: string;
  gameDate: string;
  teamRatings: Record<string, number>;
  positionsEfficiencies: Record<Position, number>;
}

interface TeamData {
  id: string;
  players: string[];
}

interface PlayerData {
  id: string;
  nationalTeamId: string;
  weeks: PlayerWeek[];
}

interface ResumeData {
  teamId: string;
  processedTeams: string[];
}

interface MatchData {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  start: string;
  completed: boolean;
}

class BBPostMondayPlayerChecker {
  private baseURL = "http://bbapi.buzzerbeater.com";
  private sessionCookie = "";
  private queryCount = 0;
  private currentSeason = 69;
  private username = "";
  private password = "";
  private supabase: any;

  private readonly MAIN_TEAMS = [11, 50, 1011];
  private readonly MAIN_TEAMS_DIR = path.join(
    process.cwd(),
    "app/data/mainTeams"
  );

  constructor() {
    // Get credentials from environment variables for automation
    this.username = process.env.BB_USERNAME || "";
    this.password = process.env.BB_PASSWORD || "";

    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        "SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required"
      );
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);

    if (!this.username || !this.password) {
      throw new Error(
        "BB_USERNAME and BB_PASSWORD environment variables are required"
      );
    }
  }

  private async login(): Promise<boolean> {
    try {
      console.log("Logging in...");
      const response = await axios.get(`${this.baseURL}/login.aspx`, {
        params: { login: this.username, code: this.password },
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
        console.log("Login successful!");
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
    try {
      await axios.get(`${this.baseURL}/logout.aspx`, {
        headers: { Cookie: this.sessionCookie },
      });
      console.log("Logged out");
    } catch (error) {
      console.error("Logout error:", error);
    }
  }

  private async checkSessionAndReauth(): Promise<boolean> {
    if (this.queryCount >= 50) {
      console.log("Re-authenticating due to query limit...");
      await this.logout();
      if (!(await this.login())) {
        throw new Error("Re-authentication failed");
      }
      this.queryCount = 0;
      return true;
    }
    return false;
  }

  private async getTeamSchedule(teamId: string): Promise<MatchData[]> {
    try {
      await this.checkSessionAndReauth();

      console.log(`Fetching schedule for team ${teamId}...`);
      const response = await axios.get(`${this.baseURL}/schedule.aspx`, {
        params: {
          teamid: teamId,
          season: this.currentSeason,
        },
        headers: { Cookie: this.sessionCookie },
      });

      this.queryCount++;

      const xmlData = response.data;
      return this.parseScheduleXML(xmlData);
    } catch (error) {
      console.error(`Error fetching schedule for team ${teamId}:`, error);
      throw error;
    }
  }

  private parseScheduleXML(xmlData: string): MatchData[] {
    const matches: MatchData[] = [];

    // Match pattern for matches in XML
    const matchPattern =
      /<match id='(\d+)' start='([^']+)'[^>]*type='[^']*'[^>]*>(.*?)<\/match>/gs;
    let match;

    while ((match = matchPattern.exec(xmlData)) !== null) {
      const matchId = match[1];
      const startDate = match[2];
      const matchContent = match[3];

      // Extract home and away team IDs
      const homeTeamMatch = matchContent.match(/<homeTeam id='(\d+)'>/);
      const awayTeamMatch = matchContent.match(/<awayTeam id='(\d+)'>/);

      // Check if match is completed (has scores)
      const hasScores = matchContent.includes("<score");

      if (homeTeamMatch && awayTeamMatch) {
        matches.push({
          id: matchId,
          homeTeamId: homeTeamMatch[1],
          awayTeamId: awayTeamMatch[1],
          start: startDate,
          completed: hasScores,
        });
      }
    }

    return matches;
  }

  private async getBoxscoreData(matchId: string): Promise<{
    homeTeamPlayers: string[];
    awayTeamPlayers: string[];
    homeTeamId: string;
    awayTeamId: string;
  }> {
    try {
      await this.checkSessionAndReauth();

      console.log(`Fetching boxscore for match ${matchId}...`);
      const response = await axios.get(`${this.baseURL}/boxscore.aspx`, {
        params: { matchid: matchId },
        headers: { Cookie: this.sessionCookie },
      });

      this.queryCount++;

      return this.parseBoxscoreXML(response.data);
    } catch (error) {
      console.error(`Error fetching boxscore for match ${matchId}:`, error);
      throw error;
    }
  }

  private parseBoxscoreXML(xmlData: string): {
    homeTeamPlayers: string[];
    awayTeamPlayers: string[];
    homeTeamId: string;
    awayTeamId: string;
  } {
    const homeTeamPlayers: string[] = [];
    const awayTeamPlayers: string[] = [];

    // Extract team IDs
    const homeTeamMatch = xmlData.match(/<homeTeam id='(\d+)'>/);
    const awayTeamMatch = xmlData.match(/<awayTeam id='(\d+)'>/);

    if (!homeTeamMatch || !awayTeamMatch) {
      throw new Error("Could not parse team IDs from boxscore");
    }

    const homeTeamId = homeTeamMatch[1];
    const awayTeamId = awayTeamMatch[1];

    // Extract home team section
    const homeTeamSection = xmlData.match(
      /<homeTeam id='\d+'>(.*?)<\/homeTeam>/s
    );
    if (homeTeamSection) {
      const homePlayerMatches =
        homeTeamSection[1].matchAll(/<player id='(\d+)'>/g);
      for (const match of homePlayerMatches) {
        homeTeamPlayers.push(match[1]);
      }
    }

    // Extract away team section
    const awayTeamSection = xmlData.match(
      /<awayTeam id='\d+'>(.*?)<\/awayTeam>/s
    );
    if (awayTeamSection) {
      const awayPlayerMatches =
        awayTeamSection[1].matchAll(/<player id='(\d+)'>/g);
      for (const match of awayPlayerMatches) {
        awayTeamPlayers.push(match[1]);
      }
    }

    return { homeTeamPlayers, awayTeamPlayers, homeTeamId, awayTeamId };
  }

  private async getPlayerData(playerId: string): Promise<any> {
    try {
      await this.checkSessionAndReauth();

      const response = await axios.get(`${this.baseURL}/player.aspx`, {
        params: { playerid: playerId },
        headers: { Cookie: this.sessionCookie },
      });

      this.queryCount++;
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  private parsePlayerXML(
    xmlData: string
  ): { gameShape: GameShapeRange; dmi: number } | null {
    try {
      let gameShapeMatch = xmlData.match(/<gameShape>(\d+)<\/gameShape>/i);
      let dmiMatch = xmlData.match(/<dmi>(\d+)<\/dmi>/i);

      if (!gameShapeMatch) {
        gameShapeMatch = xmlData.match(/<gameShape[^>]*>(\d+)<\/gameShape>/i);
      }
      if (!dmiMatch) {
        dmiMatch = xmlData.match(/<dmi[^>]*>(\d+)<\/dmi>/i);
      }

      if (gameShapeMatch && dmiMatch) {
        const gameShape = parseInt(gameShapeMatch[1]);
        const dmi = parseInt(dmiMatch[1]);

        if (gameShape >= 1 && gameShape <= 9 && dmi >= 0) {
          return {
            gameShape: gameShape as GameShapeRange,
            dmi: dmi,
          };
        }
      }

      return null;
    } catch (error) {
      console.error("Error parsing player XML:", error);
      return null;
    }
  }

  private getCurrentWeekInfo(): { id: number; weekStart: Date } {
    const seasonStartDate = new Date("2025-07-11");
    const now = new Date();

    const daysSinceStart = Math.floor(
      (now.getTime() - seasonStartDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const weeksSinceStart = Math.floor(daysSinceStart / 7);
    const currentWeekId = Math.min(weeksSinceStart + 1, 14);

    const currentWeekStart = new Date(seasonStartDate);
    currentWeekStart.setDate(seasonStartDate.getDate() + weeksSinceStart * 7);

    return { id: currentWeekId, weekStart: currentWeekStart };
  }

  private async getTeams(): Promise<TeamData[]> {
    const { data, error } = await this.supabase.from("teams").select("id");

    if (error) {
      throw new Error(`Failed to fetch teams: ${error.message}`);
    }

    const teams: TeamData[] = [];
    for (const team of data) {
      const { data: players, error: playersError } = await this.supabase
        .from("players")
        .select("id")
        .eq("team_id", team.id);

      if (playersError) {
        console.error(
          `Failed to fetch players for team ${team.id}:`,
          playersError.message
        );
        continue;
      }

      teams.push({
        id: team.id.toString(),
        players: players.map((p) => p.id.toString()),
      });
    }

    return teams;
  }

  private async loadTeamData(teamId: string): Promise<TeamData> {
    const { data: players, error } = await this.supabase
      .from("players")
      .select("id")
      .eq("team_id", parseInt(teamId));

    if (error) {
      throw new Error(
        `Failed to load team data for ${teamId}: ${error.message}`
      );
    }

    return {
      id: teamId,
      players: players.map((p: any) => p.id.toString()),
    };
  }

  private async saveTeamData(teamData: TeamData): Promise<void> {
    // Add new players to the team (they should already exist in players table from loadTeamData)
    // No additional action needed since we're using the players table relationship
    console.log(
      `Team ${teamData.id} data is handled via players table relationship`
    );
  }

  private async savePlayerData(playerData: PlayerData): Promise<void> {
    // Insert the new player
    const { error: playerError } = await this.supabase.from("players").upsert({
      id: parseInt(playerData.id),
      team_id: parseInt(playerData.nationalTeamId),
      country_id:
        parseInt(playerData.nationalTeamId) < 1000
          ? parseInt(playerData.nationalTeamId)
          : parseInt(playerData.nationalTeamId) - 100,
    });

    if (playerError) {
      throw new Error(
        `Failed to save player ${playerData.id}: ${playerError.message}`
      );
    }

    // Insert the player weeks
    for (const week of playerData.weeks) {
      const { error: weekError } = await this.supabase
        .from("player_weeks")
        .upsert({
          player_id: parseInt(playerData.id),
          week_number: week.id,
          season: week.season,
          gameshape: week.gameShape,
          dmi: week.dmi,
        });

      if (weekError) {
        throw new Error(
          `Failed to save week data for player ${playerData.id}: ${weekError.message}`
        );
      }
    }
  }

  private saveResumeData(teamId: string, processedTeams: string[]): void {
    const resumeData: ResumeData = { teamId, processedTeams };
    fs.writeFileSync("resume-monday.json", JSON.stringify(resumeData, null, 2));
  }

  private loadResumeData(): ResumeData | null {
    if (fs.existsSync("resume-monday.json")) {
      return JSON.parse(fs.readFileSync("resume-monday.json", "utf8"));
    }
    return null;
  }

  private deleteResumeData(): void {
    if (fs.existsSync("resume-monday.json")) {
      fs.unlinkSync("resume-monday.json");
    }
  }

  private getLastMondayGame(matches: MatchData[]): MatchData | null {
    // Find the most recent completed match that occurred on a Monday
    const completedMatches = matches.filter((match) => match.completed);

    // Sort by start date descending (most recent first)
    completedMatches.sort(
      (a, b) => new Date(b.start).getTime() - new Date(a.start).getTime()
    );

    // Find the most recent Monday game
    for (const match of completedMatches) {
      const matchDate = new Date(match.start);
      if (matchDate.getDay() === 1) {
        // Monday is day 1
        return match;
      }
    }

    return null;
  }

  private async updateMainTeamsLatestGames(): Promise<void> {
    console.log("\n=== Updating Main Teams Latest Games ===");

    // Ensure main teams directory exists
    if (!fs.existsSync(this.MAIN_TEAMS_DIR)) {
      fs.mkdirSync(this.MAIN_TEAMS_DIR, { recursive: true });
    }

    for (const teamId of this.MAIN_TEAMS) {
      try {
        console.log(`Checking latest games for team ${teamId}...`);

        // Load existing team data
        const teamFilePath = path.join(this.MAIN_TEAMS_DIR, `${teamId}.json`);
        let existingGames: GameData[] = [];

        if (fs.existsSync(teamFilePath)) {
          try {
            existingGames = JSON.parse(fs.readFileSync(teamFilePath, "utf8"));
          } catch (error) {
            console.error(`Error reading team file ${teamId}:`, error);
            existingGames = [];
          }
        }

        // Get the latest game ID we have on file
        const latestGameId =
          existingGames.length > 0
            ? Math.max(...existingGames.map((g) => parseInt(g.gameId)))
            : 0;

        // Fetch team schedule for current season
        await this.checkSessionAndReauth();
        const scheduleResponse = await axios.get(
          `${this.baseURL}/schedule.aspx`,
          {
            params: { teamid: teamId, season: this.currentSeason },
            headers: { Cookie: this.sessionCookie },
          }
        );
        this.queryCount++;

        const parser = new xml2js.Parser({ explicitArray: false });
        const scheduleXml = await parser.parseStringPromise(
          scheduleResponse.data
        );

        let matches = [];
        if (scheduleXml?.bbapi?.schedule?.match) {
          matches = scheduleXml.bbapi.schedule.match;
          if (!Array.isArray(matches)) matches = [matches];
        } else {
          console.warn(`No matches found for team ${teamId}`);
          continue;
        }

        // Filter for completed games that are newer than our latest
        const now = new Date();
        const newGames: GameData[] = [];

        for (const match of matches) {
          const matchId = parseInt(match["$"].id);
          const matchDateStr = match["$"].start;
          const matchDate = new Date(matchDateStr);

          // Skip if game is in the future or we already have it
          if (matchDate >= now || matchId <= latestGameId) continue;

          console.log(`Processing new match ${matchId} for team ${teamId}...`);

          // Fetch boxscore for this match
          await this.checkSessionAndReauth();

          try {
            const boxscoreResponse = await axios.get(
              `${this.baseURL}/boxscore.aspx`,
              {
                params: { matchid: matchId },
                headers: { Cookie: this.sessionCookie },
              }
            );
            this.queryCount++;

            const boxXml = await parser.parseStringPromise(
              boxscoreResponse.data
            );
            const matchNode = boxXml?.bbapi?.match;
            let teamNode = null;

            // Find the correct team node
            if (
              matchNode?.awayTeam &&
              matchNode.awayTeam.$ &&
              matchNode.awayTeam.$.id == teamId
            ) {
              teamNode = matchNode.awayTeam;
            } else if (
              matchNode?.homeTeam &&
              matchNode.homeTeam.$ &&
              matchNode.homeTeam.$.id == teamId
            ) {
              teamNode = matchNode.homeTeam;
            } else {
              console.warn(`Team ${teamId} not found in match ${matchId}`);
              continue;
            }

            // Extract team ratings
            const teamRatings: Record<string, number> = {};
            if (teamNode.ratings) {
              for (const [category, value] of Object.entries(
                teamNode.ratings
              )) {
                const numValue = parseFloat(value as string);
                if (!isNaN(numValue)) {
                  teamRatings[category] = numValue;
                }
              }
            }

            // Extract position efficiencies
            const positionsEfficiencies: Record<Position, number> = {
              PG: 0,
              SG: 0,
              SF: 0,
              PF: 0,
              C: 0,
            };

            if (teamNode.efficiency) {
              for (const pos of ["PG", "SG", "SF", "PF", "C"] as Position[]) {
                if (teamNode.efficiency[pos] !== undefined) {
                  const numValue = parseFloat(teamNode.efficiency[pos]);
                  if (!isNaN(numValue)) {
                    positionsEfficiencies[pos] = numValue;
                  }
                }
              }
            }

            newGames.push({
              gameId: matchId.toString(),
              gameDate: matchDateStr,
              teamRatings,
              positionsEfficiencies,
            });

            console.log(`  ✅ Added new game ${matchId} for team ${teamId}`);
          } catch (error) {
            console.warn(
              `Failed to fetch boxscore for match ${matchId}:`,
              error
            );
            continue;
          }

          // Small delay to be nice to the API
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        // Add new games to existing data and save
        if (newGames.length > 0) {
          const updatedGames = [...existingGames, ...newGames];

          // Sort by game date (most recent first)
          updatedGames.sort(
            (a, b) =>
              new Date(b.gameDate).getTime() - new Date(a.gameDate).getTime()
          );

          fs.writeFileSync(teamFilePath, JSON.stringify(updatedGames, null, 2));
          console.log(
            `  📝 Saved ${newGames.length} new games for team ${teamId}`
          );
        } else {
          console.log(`  ℹ️  No new games found for team ${teamId}`);
        }
      } catch (error) {
        console.error(`Error updating team ${teamId}:`, error);
        continue;
      }
    }

    console.log("Main teams update completed! 🎉");
  }

  async run(): Promise<void> {
    console.log("BB Post-Monday New Players Checker");
    console.log("==================================");

    // For automation, skip resume logic and process all teams
    const processedTeams: Set<string> = new Set();

    if (!(await this.login())) {
      throw new Error("Login failed");
    }

    try {
      const teams = await this.getTeams();
      const weekInfo = this.getCurrentWeekInfo();
      let newPlayersFound = 0;
      let teamsChecked = 0;

      console.log(`\nChecking ${teams.length} teams for new players...`);
      console.log(
        `Current week: ${weekInfo.id}, starting ${
          weekInfo.weekStart.toISOString().split("T")[0]
        }`
      );

      for (const teamData of teams) {
        // Skip if already processed
        if (processedTeams.has(teamData.id)) {
          console.log(`Skipping team ${teamData.id} (already processed)`);
          continue;
        }

        try {
          console.log(`\nChecking team: ${teamData.id}`);

          // Get team schedule
          const schedule = await this.getTeamSchedule(teamData.id);
          const lastMondayGame = this.getLastMondayGame(schedule);

          if (!lastMondayGame) {
            console.log(
              `  No recent Monday games found for team ${teamData.id}`
            );
            processedTeams.add(teamData.id);
            teamsChecked++;
            continue;
          }

          console.log(
            `  Found last Monday game: ${lastMondayGame.id} on ${lastMondayGame.start}`
          );

          // Get boxscore data
          const boxscoreData = await this.getBoxscoreData(lastMondayGame.id);

          // Process both teams from this game
          const teamsToProcess = [
            {
              id: boxscoreData.homeTeamId,
              players: boxscoreData.homeTeamPlayers,
            },
            {
              id: boxscoreData.awayTeamId,
              players: boxscoreData.awayTeamPlayers,
            },
          ];

          for (const gameTeam of teamsToProcess) {
            if (processedTeams.has(gameTeam.id)) {
              console.log(
                `  Team ${gameTeam.id} already processed (from another game)`
              );
              continue;
            }

            // Load the current team data from database
            const currentTeamData = await this.loadTeamData(gameTeam.id);
            const newPlayerIds = gameTeam.players.filter(
              (playerId) => !currentTeamData.players.includes(playerId)
            );

            if (newPlayerIds.length > 0) {
              console.log(
                `  Found ${newPlayerIds.length} new players for team ${
                  gameTeam.id
                }: ${newPlayerIds.join(", ")}`
              );

              // Process each new player
              for (const newPlayerId of newPlayerIds) {
                try {
                  console.log(`    Processing new player: ${newPlayerId}`);

                  // Get player data
                  const playerXMLData = await this.getPlayerData(newPlayerId);
                  const parsedData = this.parsePlayerXML(playerXMLData);

                  if (!parsedData) {
                    console.log(
                      `    Warning: Could not parse data for new player ${newPlayerId}`
                    );
                    continue;
                  }

                  // Create new player record
                  const newWeek: PlayerWeek = {
                    season: this.currentSeason,
                    id: weekInfo.id,
                    weekStart: weekInfo.weekStart,
                    gameShape: parsedData.gameShape,
                    dmi: parsedData.dmi,
                  };

                  const playerData: PlayerData = {
                    id: newPlayerId,
                    nationalTeamId: gameTeam.id,
                    weeks: [newWeek],
                  };

                  await this.savePlayerData(playerData);
                  newPlayersFound++;

                  console.log(
                    `    Created player record for ${newPlayerId} (GS: ${parsedData.gameShape}, DMI: ${parsedData.dmi})`
                  );
                } catch (error) {
                  console.error(
                    `    Error processing new player ${newPlayerId}:`,
                    error
                  );
                }
              }
            } else {
              console.log(`  No new players found for team ${gameTeam.id}`);
            }

            processedTeams.add(gameTeam.id);
          }

          teamsChecked++;
        } catch (error) {
          console.error(`Error processing team ${teamData.id}:`, error);
          // Continue with next team instead of stopping
          continue;
        }
      }

      console.log(`\n✅ Post-Monday check completed!`);
      console.log(`Teams checked: ${teamsChecked}`);
      console.log(`New players found: ${newPlayersFound}`);

      if (newPlayersFound === 0) {
        console.log("🎉 No last-minute roster additions found!");
      }

      // NEW: Update main teams latest games
      await this.updateMainTeamsLatestGames();

      updateLastUpdateTimestamp();
      this.deleteResumeData();
    } catch (error) {
      console.error("Fatal error:", error);
      process.exit(1);
    } finally {
      await this.logout();
    }
  }
}

// Run the script
const checker = new BBPostMondayPlayerChecker();
checker.run().catch((error) => {
  console.error("Script failed:", error);
  process.exit(1);
});
