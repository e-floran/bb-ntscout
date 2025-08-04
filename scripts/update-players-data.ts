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
  playerIndex: number;
}

class BBPlayerDataUpdater {
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
      // Only ask for credentials on first login
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

      // First check if login was successful by looking for <loggedIn> tag
      if (!responseText.includes("<loggedIn")) {
        console.error("Login failed - invalid credentials or API error");
        console.log("Response:", responseText.substring(0, 500));
        return false;
      }

      const setCookieHeader = response.headers["set-cookie"];
      if (setCookieHeader) {
        // Extract all cookie pairs, not just the first one
        this.sessionCookie = setCookieHeader
          .map((cookie) => cookie.split(";")[0].trim())
          .join("; ");

        console.log("Login successful!");
        console.log("Session cookies:", this.sessionCookie);
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

  private async getPlayerData(playerId: string): Promise<any> {
    try {
      console.log(`Making request with cookies: ${this.sessionCookie}`);
      const response = await axios.get(`${this.baseURL}/player.aspx`, {
        params: { playerid: playerId },
        headers: { Cookie: this.sessionCookie },
      });

      this.queryCount++;

      // Log response to debug authentication issues
      if (response.data.includes("<error")) {
        console.error("API Error response:", response.data.substring(0, 500));
      }

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  private parsePlayerXML(
    xmlData: string
  ): { gameShape: GameShapeRange; dmi: number } | null {
    try {
      console.log("Raw XML response length:", xmlData.length);

      // Log first 500 characters to debug
      console.log("XML sample:", xmlData.substring(0, 500));

      // Try different XML parsing approaches
      let gameShapeMatch, dmiMatch;

      // Method 1: Direct tag match
      gameShapeMatch = xmlData.match(/<gameShape>(\d+)<\/gameShape>/i);
      dmiMatch = xmlData.match(/<dmi>(\d+)<\/dmi>/i);

      // Method 2: Try with different whitespace/formatting
      if (!gameShapeMatch) {
        gameShapeMatch = xmlData.match(/<gameShape[^>]*>(\d+)<\/gameShape>/i);
      }
      if (!dmiMatch) {
        dmiMatch = xmlData.match(/<dmi[^>]*>(\d+)<\/dmi>/i);
      }

      // Method 3: Try to find any numeric values that might be gameShape/DMI
      if (!gameShapeMatch) {
        // Look for gameShape with any casing
        gameShapeMatch = xmlData.match(/gameshape[^>]*>(\d+)</i);
      }
      if (!dmiMatch) {
        // Look for DMI with any casing
        dmiMatch = xmlData.match(/dmi[^>]*>(\d+)</i);
      }

      console.log("GameShape match:", gameShapeMatch);
      console.log("DMI match:", dmiMatch);

      if (gameShapeMatch && dmiMatch) {
        const gameShape = parseInt(gameShapeMatch[1]);
        const dmi = parseInt(dmiMatch[1]);

        // Validate ranges
        if (gameShape >= 1 && gameShape <= 9 && dmi >= 0) {
          return {
            gameShape: gameShape as GameShapeRange,
            dmi: dmi,
          };
        } else {
          console.log("Invalid values - GameShape:", gameShape, "DMI:", dmi);
        }
      }

      // If we still can't parse, let's see what tags are actually in the XML
      console.log(
        "Available XML tags:",
        xmlData.match(/<[^>\/]+>/g)?.slice(0, 20)
      );

      return null;
    } catch (error) {
      console.error("Error parsing player XML:", error);
      return null;
    }
  }

  private getCurrentWeekInfo(): { id: number; weekStart: Date } {
    // Season 69 started on July 11th, 2025 (Friday)
    const seasonStartDate = new Date("2025-07-11");
    const now = new Date();

    // Calculate weeks since season start
    const daysSinceStart = Math.floor(
      (now.getTime() - seasonStartDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const weeksSinceStart = Math.floor(daysSinceStart / 7);

    // Current week ID (1-14)
    const currentWeekId = Math.min(weeksSinceStart + 1, 14);

    // Calculate the start of current week (Friday)
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

  private loadPlayerData(playerId: string): PlayerData | null {
    const filePath = path.join(
      process.cwd(),
      "app",
      "data",
      "players",
      `${playerId}.json`
    );

    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, "utf8"));
    }
    return null;
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

  private saveResumeData(teamId: string, playerIndex: number): void {
    const resumeData: ResumeData = { teamId, playerIndex };
    fs.writeFileSync("resume.json", JSON.stringify(resumeData, null, 2));
  }

  private loadResumeData(): ResumeData | null {
    if (fs.existsSync("resume.json")) {
      return JSON.parse(fs.readFileSync("resume.json", "utf8"));
    }
    return null;
  }

  private deleteResumeData(): void {
    if (fs.existsSync("resume.json")) {
      fs.unlinkSync("resume.json");
    }
  }

  async run(): Promise<void> {
    console.log("BB Player Data Updater");
    console.log("=====================");

    // Check for resume data
    const resumeData = this.loadResumeData();
    let startFromTeam: string | null = null;
    let startFromPlayerIndex = 0;

    if (resumeData) {
      const shouldResume = await this.question(
        `Found previous session that stopped at team ${resumeData.teamId}, player index ${resumeData.playerIndex}. Resume? (y/n): `
      );
      if (shouldResume.toLowerCase() === "y") {
        startFromTeam = resumeData.teamId;
        startFromPlayerIndex = resumeData.playerIndex;
      } else {
        this.deleteResumeData();
      }
    }

    // Login (credentials will be asked only once)
    if (!(await this.login())) {
      this.rl.close();
      return;
    }

    try {
      const teamFiles = this.getTeamFiles();
      const weekInfo = this.getCurrentWeekInfo();

      console.log(`\nProcessing ${teamFiles.length} teams...`);
      console.log(
        `Current week: ${weekInfo.id}, starting ${
          weekInfo.weekStart.toISOString().split("T")[0]
        }`
      );

      let shouldStart = !startFromTeam;

      for (const teamFile of teamFiles) {
        const teamData = this.loadTeamData(teamFile);

        // Skip teams until we reach the resume point
        if (!shouldStart) {
          if (teamData.id === startFromTeam) {
            shouldStart = true;
          } else {
            continue;
          }
        }

        console.log(
          `\nProcessing team: ${teamData.id} (${teamData.players.length} players)`
        );

        const startIndex =
          teamData.id === startFromTeam ? startFromPlayerIndex : 0;

        for (let i = startIndex; i < teamData.players.length; i++) {
          const playerId = teamData.players[i];

          try {
            // Check if we need to re-login (every 50 queries)
            if (this.queryCount >= 50) {
              console.log("Re-authenticating...");
              await this.logout();
              if (!(await this.login())) {
                throw new Error("Re-authentication failed");
              }
              this.queryCount = 0;
            }

            console.log(
              `  Processing player ${i + 1}/${
                teamData.players.length
              }: ${playerId}`
            );

            // Get player data from API
            const playerXMLData = await this.getPlayerData(playerId);
            const parsedData = this.parsePlayerXML(playerXMLData);

            if (!parsedData) {
              console.log(
                `    Warning: Could not parse data for player ${playerId}`
              );
              // Let's save the raw XML to a debug file for the first failed player
              if (i === startIndex) {
                fs.writeFileSync(`debug-player-${playerId}.xml`, playerXMLData);
                console.log(
                  `    Saved raw XML to debug-player-${playerId}.xml for inspection`
                );
              }
              continue;
            }

            // Load or create player data file
            let playerData = this.loadPlayerData(playerId);
            if (!playerData) {
              playerData = {
                id: playerId,
                nationalTeamId: teamData.id,
                weeks: [],
              };
              console.log(`    Created new player file for ${playerId}`);
            }

            // Check if this week's data already exists
            const existingWeek = playerData.weeks.find(
              (week) =>
                week.season === this.currentSeason && week.id === weekInfo.id
            );

            if (!existingWeek) {
              // Add new week data
              const newWeek: PlayerWeek = {
                season: this.currentSeason,
                id: weekInfo.id,
                weekStart: weekInfo.weekStart,
                gameShape: parsedData.gameShape,
                dmi: parsedData.dmi,
              };

              playerData.weeks.push(newWeek);
              this.savePlayerData(playerData);
              console.log(
                `    Added week ${weekInfo.id} data for player ${playerId} (GS: ${parsedData.gameShape}, DMI: ${parsedData.dmi})`
              );
            } else {
              console.log(
                `    Week ${weekInfo.id} data already exists for player ${playerId}`
              );
            }

            // Save resume data
            this.saveResumeData(teamData.id, i + 1);
          } catch (error) {
            console.error(
              `\nError processing player ${playerId} from team ${teamData.id}:`
            );
            console.error(error);
            console.log(
              `\nScript stopped at team: ${teamData.id}, player index: ${i}`
            );
            console.log("You can resume later by running the script again.");

            await this.logout();
            this.rl.close();
            return;
          }
        }

        console.log(`Completed team: ${teamData.id}`);
      }

      console.log("\n✅ All teams processed successfully!");
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
const updater = new BBPlayerDataUpdater();
updater.run().catch(console.error);
