/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "fs";
import path from "path";
import axios from "axios";
import * as readline from "readline";
import { PlayerWeek, GameShapeRange } from "../app/utils/types";

interface PlayerData {
  id: string;
  nationalTeamId: string;
  weeks: PlayerWeek[];
}

class BBWeeklyGameShapeDMIUpdater {
  private baseURL = "http://bbapi.buzzerbeater.com";
  private sessionCookie = "";
  private queryCount = 0;
  private currentSeason = 69;
  private rl: readline.Interface;
  private username = "";
  private password = "";
  private processedPlayers = 0;
  private totalPlayers = 0;

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

  private async getPlayerData(playerId: string): Promise<any> {
    try {
      await this.checkSessionAndReauth();

      const response = await axios.get(`${this.baseURL}/player.aspx`, {
        params: { playerid: playerId },
        headers: { Cookie: this.sessionCookie },
      });

      this.queryCount++;

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
      // Try different XML parsing approaches based on existing scripts
      let gameShapeMatch, dmiMatch;

      // Method 1: Direct tag match (most common)
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
        gameShapeMatch = xmlData.match(/gameshape[^>]*>(\d+)</i);
      }
      if (!dmiMatch) {
        dmiMatch = xmlData.match(/dmi[^>]*>(\d+)</i);
      }

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

  private getPlayerFiles(): string[] {
    const playersDir = path.join(process.cwd(), "app", "data", "players");

    if (!fs.existsSync(playersDir)) {
      throw new Error(`Players directory not found: ${playersDir}`);
    }

    return fs
      .readdirSync(playersDir)
      .filter((file) => file.endsWith(".json") && file !== "example.json")
      .sort();
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
      try {
        return JSON.parse(fs.readFileSync(filePath, "utf8"));
      } catch (error) {
        console.error(`Error reading player file ${playerId}:`, error);
        return null;
      }
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

    fs.writeFileSync(filePath, JSON.stringify(playerData, null, 2));
  }

  async run(): Promise<void> {
    try {
      console.log("=== BB Weekly GameShape & DMI Update Script ===");
      console.log(
        "This script updates all player files with current week's gameshape and DMI data"
      );
      console.log(
        "Run this script every Friday to keep player data up to date\n"
      );

      // Login
      if (!(await this.login())) {
        throw new Error("Initial login failed");
      }

      // Get current week info
      const weekInfo = this.getCurrentWeekInfo();
      console.log(
        `Current week: ${weekInfo.id} (starts: ${
          weekInfo.weekStart.toISOString().split("T")[0]
        })\n`
      );

      // Get all player files
      const playerFiles = this.getPlayerFiles();
      this.totalPlayers = playerFiles.length;
      console.log(`Found ${this.totalPlayers} player files to process\n`);

      if (this.totalPlayers === 0) {
        console.log(
          "No player files found. Make sure you're running this from the project root."
        );
        return;
      }

      // Process each player file
      for (let i = 0; i < playerFiles.length; i++) {
        const filename = playerFiles[i];
        const playerId = filename.replace(".json", "");

        try {
          console.log(
            `Processing player ${i + 1}/${this.totalPlayers}: ${playerId}`
          );

          // Load existing player data
          const playerData = this.loadPlayerData(playerId);
          if (!playerData) {
            console.log(
              `  ⚠️  Warning: Could not load player data for ${playerId}, skipping...`
            );
            continue;
          }

          // Check if this week's data already exists
          const existingWeek = playerData.weeks.find(
            (week) =>
              week.season === this.currentSeason && week.id === weekInfo.id
          );

          if (existingWeek) {
            console.log(
              `  ℹ️  Week ${weekInfo.id} data already exists for player ${playerId}, skipping...`
            );
            continue;
          }

          // Fetch current player data from BBAPI
          const playerXMLData = await this.getPlayerData(playerId);
          const parsedData = this.parsePlayerXML(playerXMLData);

          if (!parsedData) {
            console.log(
              `  ❌ Warning: Could not parse BBAPI data for player ${playerId}, skipping...`
            );

            // Save debug XML for first few failed parses
            if (this.processedPlayers < 3) {
              const debugPath = `debug-weekly-player-${playerId}.xml`;
              fs.writeFileSync(debugPath, playerXMLData);
              console.log(`  🔍 Saved raw XML to ${debugPath} for inspection`);
            }
            continue;
          }

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
            `  ✅ Added week ${weekInfo.id} data: GS=${
              parsedData.gameShape
            }, DMI=${parsedData.dmi.toLocaleString()}`
          );
          this.processedPlayers++;

          // Small delay to be nice to the API
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`  ❌ Error processing player ${playerId}:`, error);
          console.log(`  Script can continue with next player...\n`);
          continue;
        }
      }

      console.log("\n=== Update Summary ===");
      console.log(
        `Total players processed: ${this.processedPlayers}/${this.totalPlayers}`
      );
      console.log(
        `Week ${weekInfo.id} gameshape and DMI data has been added to all updated players`
      );
      console.log("Weekly update completed successfully! 🎉");
    } catch (error) {
      console.error("\nFatal error:", error);
      console.log("Script terminated due to critical error.");
    } finally {
      await this.logout();
      this.rl.close();
    }
  }
}

// Run the script
const updater = new BBWeeklyGameShapeDMIUpdater();
updater.run().catch(console.error);
