/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "fs";
import path from "path";
import axios from "axios";
import * as readline from "readline";
import { PlayerWeek, GameShapeRange } from "../app/utils/types";

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
  private rl: readline.Interface;
  private username = "";
  private password = "";

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  private async question(query: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(query, resolve);
    });
  }

  private async login(): Promise<boolean> {
    try {
      if (!this.username || !this.password) {
        this.username = await this.question("Enter your BB username: ");
        this.password = await this.question(
          "Enter your BB read-only password: "
        );
      }

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

  private async getBoxscoreData(
    matchId: string
  ): Promise<{
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

  private getTeamFiles(): string[] {
    const teamsDir = path.join(process.cwd(), "app", "data", "teams");
    return fs.readdirSync(teamsDir).filter((file) => file.endsWith(".json"));
  }

  private loadTeamData(filename: string): TeamData {
    const filePath = path.join(process.cwd(), "app", "data", "teams", filename);
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return {
      id: path.basename(filename, ".json"),
      players: data.players || [],
    };
  }

  private saveTeamData(teamData: TeamData): void {
    const filePath = path.join(
      process.cwd(),
      "app",
      "data",
      "teams",
      `${teamData.id}.json`
    );
    const fullData = { id: teamData.id, players: teamData.players };
    fs.writeFileSync(filePath, JSON.stringify(fullData, null, 2));
  }

  private savePlayerData(playerData: PlayerData): void {
    const filePath = path.join(
      process.cwd(),
      "app",
      "data",
      "players",
      `${playerData.id}.json`
    );
    const dir = path.dirname(filePath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, JSON.stringify(playerData, null, 2));
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

  async run(): Promise<void> {
    console.log("BB Post-Monday New Players Checker");
    console.log("==================================");

    // Check for resume data
    const resumeData = this.loadResumeData();
    let processedTeams: Set<string> = new Set();

    if (resumeData) {
      const shouldResume = await this.question(
        `Found previous session. Resume from team ${resumeData.teamId}? (y/n): `
      );
      if (shouldResume.toLowerCase() === "y") {
        processedTeams = new Set(resumeData.processedTeams);
        console.log(
          `Resuming... ${processedTeams.size} teams already processed.`
        );
      } else {
        this.deleteResumeData();
      }
    }

    if (!(await this.login())) {
      this.rl.close();
      return;
    }

    try {
      const teamFiles = this.getTeamFiles();
      const weekInfo = this.getCurrentWeekInfo();
      let newPlayersFound = 0;
      let teamsChecked = 0;

      console.log(`\nChecking ${teamFiles.length} teams for new players...`);
      console.log(
        `Current week: ${weekInfo.id}, starting ${
          weekInfo.weekStart.toISOString().split("T")[0]
        }`
      );

      for (const teamFile of teamFiles) {
        const teamData = this.loadTeamData(teamFile);

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

            // Load the current team data file
            const currentTeamData = this.loadTeamData(`${gameTeam.id}.json`);
            const newPlayerIds = gameTeam.players.filter(
              (playerId) => !currentTeamData.players.includes(playerId)
            );

            if (newPlayerIds.length > 0) {
              console.log(
                `  Found ${newPlayerIds.length} new players for team ${
                  gameTeam.id
                }: ${newPlayerIds.join(", ")}`
              );

              // Add new players to team file
              currentTeamData.players.push(...newPlayerIds);
              this.saveTeamData(currentTeamData);

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

                  // Create new player file
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

                  this.savePlayerData(playerData);
                  newPlayersFound++;

                  console.log(
                    `    Created player file for ${newPlayerId} (GS: ${parsedData.gameShape}, DMI: ${parsedData.dmi})`
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

          // Save progress
          this.saveResumeData(teamData.id, Array.from(processedTeams));
        } catch (error) {
          console.error(`Error processing team ${teamData.id}:`, error);
          console.log("Saving progress and stopping...");
          this.saveResumeData(teamData.id, Array.from(processedTeams));
          break;
        }
      }

      console.log(`\n✅ Post-Monday check completed!`);
      console.log(`Teams checked: ${teamsChecked}`);
      console.log(`New players found: ${newPlayersFound}`);

      if (newPlayersFound === 0) {
        console.log("🎉 No last-minute roster additions found!");
      }

      this.deleteResumeData();
    } catch (error) {
      console.error("Fatal error:", error);
    } finally {
      await this.logout();
      this.rl.close();
    }
  }
}

// Run the script
const checker = new BBPostMondayPlayerChecker();
checker.run().catch(console.error);
