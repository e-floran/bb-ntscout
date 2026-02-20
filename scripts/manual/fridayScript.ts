/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "fs";
import path from "path";
import axios from "axios";
import * as readline from "readline";
import { PlayerWeek, GameShapeRange } from "../../app/types/types";
import { updateLastUpdateTimestamp } from "../../app/utils/updateLastUpdate";
import { createClient } from "@supabase/supabase-js";

// Load environment variables from .env file manually
function loadEnvFile() {
  try {
    const envPath = path.join(process.cwd(), ".env.local");
    const envFile = fs.readFileSync(envPath, "utf8");

    envFile.split("\n").forEach((line) => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith("#")) {
        const [key, ...valueParts] = trimmedLine.split("=");
        if (key && valueParts.length > 0) {
          const value = valueParts.join("=").replace(/^["']|["']$/g, ""); // Remove quotes
          process.env[key.trim()] = value.trim();
        }
      }
    });
    console.log("✅ Environment variables loaded from .env file");
  } catch (error) {
    console.log("⚠️  Could not load .env file:", error);
  }
}

// Load environment variables
loadEnvFile();

class BBWeeklyGameShapeDMIUpdater {
  private baseURL = "http://bbapi.buzzerbeater.com";
  private sessionCookie = "";
  private queryCount = 0;
  private currentSeason = 71;
  private username = "";
  private password = "";
  private processedPlayers = 0;
  private totalPlayers = 0;
  private supabase: any;

  constructor() {
    // Initialize Supabase client from environment variables
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    console.log("🔍 Initializing Supabase client...");
    console.log("SUPABASE_URL:", supabaseUrl ? "✅ Set" : "❌ Missing");
    console.log("SUPABASE_ANON_KEY:", supabaseKey ? "✅ Set" : "❌ Missing");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        "SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required",
      );
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
    console.log("✅ Supabase client initialized successfully");
  }

  private async promptForCredentials(): Promise<void> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve) => {
      rl.question("Enter your Buzzerbeater username: ", (username) => {
        this.username = username;

        // Hide password input
        process.stdout.write("Enter your Buzzerbeater password: ");
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.setEncoding("utf8");

        let password = "";
        process.stdin.on("data", (char) => {
          const charStr = char.toString();

          if (charStr === "\u0003") {
            // Ctrl+C
            process.exit(1);
          } else if (charStr === "\r" || charStr === "\n") {
            // Enter
            process.stdin.setRawMode(false);
            process.stdin.pause();
            process.stdout.write("\n");
            this.password = password;
            rl.close();
            resolve();
          } else if (charStr === "\u007f" || charStr === "\b") {
            // Backspace
            if (password.length > 0) {
              password = password.slice(0, -1);
              process.stdout.write("\b \b");
            }
          } else if (charStr >= " ") {
            // Printable characters
            password += charStr;
            process.stdout.write("*");
          }
        });
      });
    });
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
    xmlData: string,
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
    // Season 71 started on January 23rd, 2026 (Friday)
    const seasonStartDate = new Date("2026-01-23");
    const now = new Date();

    // Calculate weeks since season start
    const daysSinceStart = Math.floor(
      (now.getTime() - seasonStartDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const weeksSinceStart = Math.floor(daysSinceStart / 7);

    // Current week ID (1-14)
    const currentWeekId = Math.min(weeksSinceStart + 1, 14);

    // Calculate the start of current week (Friday)
    const currentWeekStart = new Date(seasonStartDate);
    currentWeekStart.setDate(seasonStartDate.getDate() + weeksSinceStart * 7);

    return { id: currentWeekId, weekStart: currentWeekStart };
  }

  private async getPlayers(): Promise<string[]> {
    console.log("🔍 Fetching all players from database...");

    // Get total count first
    const { count, error: countError } = await this.supabase
      .from("players")
      .select("*", { count: "exact", head: true });

    if (countError) {
      console.error("Error getting player count:", countError);
    } else {
      console.log(`📊 Total players in database: ${count}`);
    }

    // Fetch all players with pagination to avoid limits
    let allPlayers: any[] = [];
    let from = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      console.log(`📥 Fetching players ${from + 1} to ${from + batchSize}...`);

      const { data, error } = await this.supabase
        .from("players")
        .select("id")
        .order("id")
        .range(from, from + batchSize - 1);

      if (error) {
        throw new Error(
          `Failed to fetch players from database: ${error.message}`,
        );
      }

      if (data && data.length > 0) {
        allPlayers = allPlayers.concat(data);
        from += batchSize;
        hasMore = data.length === batchSize; // Continue if we got a full batch
      } else {
        hasMore = false;
      }
    }

    console.log(`✅ Fetched ${allPlayers.length} total players from database`);
    return allPlayers.map((player: any) => player.id.toString());
  }

  private async checkPlayerWeekExists(
    playerId: string,
    weekId: number,
    season: number,
  ): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("player_weeks")
      .select("id")
      .eq("player_id", parseInt(playerId))
      .eq("week_number", weekId)
      .eq("season", season)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 is "not found" error
      console.error(
        `Error checking week data for player ${playerId}:`,
        error.message,
      );
      return false;
    }

    return !!data;
  }

  private async savePlayerWeek(
    playerId: string,
    week: PlayerWeek,
  ): Promise<void> {
    const weekData = {
      player_id: parseInt(playerId),
      week_number: week.id,
      season: week.season,
      gameshape: week.gameShape,
      dmi: week.dmi,
    };

    console.log(`  🔍 Attempting to save week data:`, weekData);

    const { error } = await this.supabase
      .from("player_weeks")
      .upsert(weekData, {
        onConflict: "player_id,week_number,season",
      });

    if (error) {
      console.error(`  ❌ Database error for player ${playerId}:`, error);
      throw new Error(
        `Failed to save week data for player ${playerId}: ${error.message} (Code: ${error.code})`,
      );
    }

    console.log(`  ✅ Successfully saved to database for player ${playerId}`);
  }

  async run(): Promise<void> {
    try {
      console.log("=== BB Weekly GameShape & DMI Update Script ===");
      console.log(
        "This script updates all player files with current week's gameshape and DMI data",
      );
      console.log(
        "Run this script every Friday to keep player data up to date\n",
      );

      // Prompt for credentials
      await this.promptForCredentials();

      // Login
      if (!(await this.login())) {
        throw new Error("Initial login failed");
      }

      // Get current week info
      const weekInfo = this.getCurrentWeekInfo();
      console.log(
        `Current week: ${weekInfo.id} (starts: ${
          weekInfo.weekStart.toISOString().split("T")[0]
        })\n`,
      );

      // Get all players from database
      const playerIds = await this.getPlayers();
      this.totalPlayers = playerIds.length;
      console.log(`Found ${this.totalPlayers} players to process\n`);

      if (this.totalPlayers === 0) {
        console.log("No players found in database.");
        return;
      }

      // Process each player
      for (let i = 0; i < playerIds.length; i++) {
        const playerId = playerIds[i];

        try {
          console.log(
            `Processing player ${i + 1}/${this.totalPlayers}: ${playerId}`,
          );

          // Check if this week's data already exists
          const weekExists = await this.checkPlayerWeekExists(
            playerId,
            weekInfo.id,
            this.currentSeason,
          );

          if (weekExists) {
            console.log(
              `  ℹ️  Week ${weekInfo.id} data already exists for player ${playerId}, skipping...`,
            );
            continue;
          }

          // Fetch current player data from BBAPI
          const playerXMLData = await this.getPlayerData(playerId);
          const parsedData = this.parsePlayerXML(playerXMLData);

          if (!parsedData) {
            console.log(
              `  ❌ Warning: Could not parse BBAPI data for player ${playerId}, skipping...`,
            );

            // Save debug XML for first few failed parses
            if (this.processedPlayers < 3) {
              const debugPath = `debug-weekly-player-${playerId}.xml`;
              fs.writeFileSync(debugPath, playerXMLData);
              console.log(`  🔍 Saved raw XML to ${debugPath} for inspection`);
            }
            continue;
          }

          // Create new week data
          const newWeek: PlayerWeek = {
            season: this.currentSeason,
            id: weekInfo.id,
            weekStart: weekInfo.weekStart,
            gameShape: parsedData.gameShape,
            dmi: parsedData.dmi,
          };

          await this.savePlayerWeek(playerId, newWeek);

          console.log(
            `  ✅ Added week ${weekInfo.id} data: GS=${
              parsedData.gameShape
            }, DMI=${parsedData.dmi.toLocaleString()}`,
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
        `Total players processed: ${this.processedPlayers}/${this.totalPlayers}`,
      );
      console.log(
        `Week ${weekInfo.id} gameshape and DMI data has been added to all updated players`,
      );
      console.log("Weekly update completed successfully! 🎉");
      updateLastUpdateTimestamp();
    } catch (error) {
      console.error("\nFatal error:", error);
      console.log("Script terminated due to critical error.");
      process.exit(1);
    } finally {
      await this.logout();
    }
  }
}

// Run the script
const updater = new BBWeeklyGameShapeDMIUpdater();
updater.run().catch((error) => {
  console.error("Script failed:", error);
  process.exit(1);
});
