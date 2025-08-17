/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "fs";
import path from "path";
import readline from "readline";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Promisify readline question
const question = (query: string): Promise<string> =>
  new Promise((resolve) => rl.question(query, resolve));

// API endpoints
const BASE_URL = "https://buzzerbeater.com/BBAPI/api/Players";
const AUTHENTICATE_URL =
  "https://buzzerbeater.com/BBAPI/Users/authenticate/web";
const TRANSFER_SEARCH_URL = `${BASE_URL}/transfer-search`;
const TRANSFER_RESULTS_URL = `${BASE_URL}/transfer-results`;

// Type definitions
interface AuthRequest {
  username: string;
  password: string;
}

interface AuthResponse {
  jwtToken: string;
  refreshToken: string;
  countryId: number;
  primaryTeamId: number;
  secondTeamId: number;
  primaryTeamName: string;
  secondTeamName: string;
  primaryLeagueId: number;
  secondLeagueId: number;
  alias: string;
  supporterUntil: string;
  languagePref: string;
  currentSeason: number;
  isSupporter: boolean;
  hasSecondTeam: boolean;
  isNationalTeamCoach: boolean;
}

interface TransferSearchRequest {
  minAge?: number;
  maxAge?: number;
  minSalary?: number;
  pointsTotal?: number;
  minPotential?: number;
}

interface TransferSearchResponse {
  searchId: string;
  pages: number;
  numResults: number;
  timeStamp: string;
}

interface TransferResultsRequest {
  searchId: string;
  pageNum: number;
}

interface ApiPlayer {
  playerId: number;
  firstName: string;
  lastName: string;
  countryId: number;
  countryName: string;
  position: number;
  curPrice: number;
  auctionOver: string;
  bidTeamId: number;
  dmi: number;
  age: number;
  height: number;
  salary: number;
  skinColor: number;
  faceType: number;
  eyeBrowType: number;
  eyeType: number;
  mouthType: number;
  noseType: number;
  hairColor: number;
  hairType: number;
  isInjured: boolean;
  injuredWeeks: number;
  minInjuryDays: number;
  maxInjuryDays: number;
  isForSale: boolean;
  isRookie: boolean;
  isNTPlayer: boolean;
  isU21Player: boolean;
  name: string;
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
  gs: number;
  potential: number;
  guardSkillPoints: number;
  bigSkillPoints: number;
  skillPoints: number;
}

// The API returns players directly as an array, not wrapped in an object
type TransferResultsResponse = ApiPlayer[];

interface Scouting {
  age: number;
  salary: number;
  tce: number;
  tci: number;
  tc: number;
  gs: number;
  // Individual skills
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
}

interface ScoutedPlayer {
  id: number;
  firstName: string;
  lastName: string;
  countryId: number;
  potential: number;
  scoutings: Scouting[];
}

// Search configurations
const SEARCH_CONFIGS: TransferSearchRequest[] = [
  { maxAge: 21, minSalary: 10000 },
  { maxAge: 21, minPotential: 10 },
  { minAge: 27, maxAge: 35, minPotential: 10, pointsTotal: 120 },
  { minAge: 22, maxAge: 26, minPotential: 10, pointsTotal: 100 },
];

// Helper function to make API requests
async function makeRequest<T>(
  url: string,
  body: any,
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const responseText = await response.text();
      throw new Error(
        `HTTP error! status: ${response.status}, body: ${responseText}`
      );
    }

    const responseText = await response.text();
    return JSON.parse(responseText) as T;
  } catch (error) {
    console.error(`Error making request to ${url}:`, error);
    throw error;
  }
}

// Authenticate and get JWT token
async function authenticate(
  username: string,
  password: string
): Promise<string> {
  console.log("Authenticating...");
  const response = await makeRequest<AuthResponse>(AUTHENTICATE_URL, {
    username,
    password,
  });

  if (!response.jwtToken) {
    throw new Error("Authentication failed - no jwtToken received");
  }

  console.log("Authentication successful!");
  return response.jwtToken;
}

// Perform transfer search
async function performTransferSearch(
  searchConfig: TransferSearchRequest,
  token: string
): Promise<TransferSearchResponse> {
  console.log("Performing search with config:", searchConfig);
  const response = await makeRequest<TransferSearchResponse>(
    TRANSFER_SEARCH_URL,
    searchConfig,
    token
  );

  console.log(
    `Search completed - ${response.numResults} results across ${response.pages} pages`
  );
  return response;
}

// Get transfer results for a specific page
async function getTransferResults(
  searchId: string,
  pageNum: number,
  token: string
): Promise<TransferResultsResponse> {
  console.log(`Fetching results for page ${pageNum + 1}...`);
  const response = await makeRequest<TransferResultsResponse>(
    TRANSFER_RESULTS_URL,
    { searchId, pageNum },
    token
  );
  return response;
}

// Transform player data to match ScoutedPlayer type
function transformPlayerData(player: ApiPlayer): ScoutedPlayer {
  return {
    id: player.playerId,
    firstName: player.firstName,
    lastName: player.lastName,
    countryId: player.countryId,
    potential: player.potential,
    scoutings: [
      {
        age: player.age,
        salary: player.salary,
        tce: player.guardSkillPoints,
        tci: player.bigSkillPoints,
        tc: player.skillPoints,
        gs: player.gs,
        // Individual skills
        js: player.js,
        jr: player.jr,
        od: player.od,
        ha: player.ha,
        dr: player.dr,
        pa: player.pa,
        is: player.is,
        id: player.id,
        rb: player.rb,
        sb: player.sb,
        st: player.st,
        ft: player.ft,
        ex: player.ex,
        scoutedAt: new Date().toISOString(),
      },
    ],
  };
}

// Save player data to JSON file
function savePlayerData(player: ApiPlayer, searchIndex: number): void {
  try {
    const dataDir = path.join(__dirname, "..", "app", "data", "scoutedPlayers");

    // Create data directory if it doesn't exist
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const filename = `${player.playerId}.json`;
    const filepath = path.join(dataDir, filename);

    // Transform the player data
    const transformedPlayer = transformPlayerData(player);

    // If file already exists, merge the scouting data
    if (fs.existsSync(filepath)) {
      try {
        const existingData: ScoutedPlayer = JSON.parse(
          fs.readFileSync(filepath, "utf8")
        );
        if (existingData.scoutings) {
          transformedPlayer.scoutings = [
            ...existingData.scoutings,
            ...transformedPlayer.scoutings,
          ];
        }
      } catch (error) {
        console.warn(
          `Warning: Could not merge existing data for player ${player.playerId}:`,
          (error as Error).message
        );
      }
    }

    fs.writeFileSync(filepath, JSON.stringify(transformedPlayer, null, 2));
    console.log(
      `Saved player ${player.playerId} (${player.firstName} ${player.lastName}) to ${filename}`
    );
  } catch (error) {
    console.error(`❌ Error saving player data:`, error);
    throw error;
  }
}

// Main function
async function main(): Promise<void> {
  try {
    console.log("=== BB-NTScout Player Fetcher ===\n");

    // Get credentials from user
    const username = await question("Enter your Buzzerbeater username: ");
    const password = await question("Enter your Buzzerbeater password: ");
    console.log();

    // Authenticate
    const token = await authenticate(username, password);
    console.log();

    let totalPlayersProcessed = 0;

    // Process each search configuration
    for (let i = 0; i < SEARCH_CONFIGS.length; i++) {
      const searchConfig = SEARCH_CONFIGS[i];
      console.log(`\n--- Search ${i + 1}/${SEARCH_CONFIGS.length} ---`);

      try {
        // Perform search
        const searchResponse = await performTransferSearch(searchConfig, token);
        const { searchId, pages, numResults } = searchResponse;

        if (numResults === 0) {
          console.log("No results found for this search configuration.");
          continue;
        }

        // Fetch all pages of results
        for (let pageNum = 0; pageNum < pages; pageNum++) {
          const playersArray = await getTransferResults(
            searchId,
            pageNum,
            token
          );

          if (Array.isArray(playersArray)) {
            console.log(
              `Found ${playersArray.length} players on page ${pageNum + 1}`
            );

            // Save each player
            for (const player of playersArray) {
              savePlayerData(player, i);
              totalPlayersProcessed++;
            }
          } else {
            console.log(`Unexpected response format for page ${pageNum + 1}`);
          }

          // Add small delay between pages to be respectful to the API
          if (pageNum < pages - 1) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }

        console.log(
          `Completed search ${i + 1} - processed players from this search`
        );
      } catch (error) {
        console.error(`Error in search ${i + 1}:`, (error as Error).message);
        console.log("Continuing with next search...");
      }

      // Add delay between searches
      if (i < SEARCH_CONFIGS.length - 1) {
        console.log("Waiting before next search...");
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    console.log(`\n=== Completed ===`);
    console.log(`Total players processed: ${totalPlayersProcessed}`);
    console.log(`Player data saved to: app/data/scoutedPlayers/`);
  } catch (error) {
    console.error("Script failed:", (error as Error).message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\nScript interrupted by user");
  rl.close();
  process.exit(0);
});

// Run the script
main();
