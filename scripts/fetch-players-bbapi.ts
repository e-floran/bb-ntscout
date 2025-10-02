/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required"
  );
}

const supabase = createClient(supabaseUrl, supabaseKey);

// API endpoints
const BASE_URL = "https://buzzerbeater.com/BBAPI/api/Players";
const AUTHENTICATE_URL =
  "https://buzzerbeater.com/BBAPI/Users/authenticate/web";
const TRANSFER_SEARCH_URL = `${BASE_URL}/transfer-search`;
const TRANSFER_RESULTS_URL = `${BASE_URL}/transfer-results`;

// Type definitions

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

// Helper: get week start date (Friday) for a given date
function getWeekStart(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getUTCDay();
  const daysToFriday = day >= 5 ? day - 5 : day + 2;
  date.setUTCDate(date.getUTCDate() - daysToFriday);
  date.setUTCHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

// Save player data to database, preventing duplicate scouting entries for the same week
async function savePlayerData(player: ApiPlayer): Promise<void> {
  try {
    // Transform the player data
    const transformedPlayer = transformPlayerData(player);
    const newScouting = transformedPlayer.scoutings[0];
    const newWeek = getWeekStart(newScouting.scoutedAt);

    // Check if this player already exists in the database
    const { data: existingPlayer, error: playerError } = await supabase
      .from("players")
      .select("id")
      .eq("id", player.playerId)
      .single();

    // Upsert player data (this will update existing or create new)
    const { error: upsertPlayerError } = await supabase.from("players").upsert({
      id: player.playerId,
      first_name: player.firstName,
      last_name: player.lastName,
      country_id: player.countryId,
      potential: player.potential,
      current_age: player.age,
    });

    if (upsertPlayerError) {
      throw new Error(
        `Failed to upsert player ${player.playerId}: ${upsertPlayerError.message}`
      );
    }

    // Check if a scouting entry for the same week already exists
    const { data: existingScoutings, error: scoutingCheckError } =
      await supabase
        .from("scoutings")
        .select("id, created_at")
        .eq("player_id", player.playerId);

    if (scoutingCheckError) {
      throw new Error(
        `Failed to check existing scoutings for player ${player.playerId}: ${scoutingCheckError.message}`
      );
    }

    const weekExists = existingScoutings?.some(
      (s: any) => getWeekStart(s.created_at) === newWeek
    );

    if (!weekExists) {
      // Insert new scouting data
      const { error: scoutingError } = await supabase.from("scoutings").insert({
        player_id: player.playerId,
        age: newScouting.age,
        salary: newScouting.salary,
        gameshape: newScouting.gs,
        jump_shot: newScouting.js,
        jump_range: newScouting.jr,
        outside_defense: newScouting.od,
        handling: newScouting.ha,
        driving: newScouting.dr,
        passing: newScouting.pa,
        inside_shot: newScouting.is,
        inside_defense: newScouting.id,
        rebound: newScouting.rb,
        shot_blocking: newScouting.sb,
        stamina: newScouting.st,
        free_throw: newScouting.ft,
        experience: newScouting.ex,
        created_by: 0, // Set to 0 for automated scouting entries
      });

      if (scoutingError) {
        throw new Error(
          `Failed to save scouting data for player ${player.playerId}: ${scoutingError.message}`
        );
      }

      console.log(
        `Saved player ${player.playerId} (${player.firstName} ${player.lastName}) to database`
      );
    } else {
      console.log(
        `Scouting data for player ${player.playerId} (${player.firstName} ${player.lastName}) already exists for this week`
      );
    }
  } catch (error) {
    console.error(`❌ Error saving player data:`, error);
    throw error;
  }
}

// Main function
async function main(): Promise<void> {
  try {
    console.log("=== BB-NTScout Player Fetcher ===\n");

    // Get credentials from environment variables
    const username = process.env.BB_USERNAME || "";
    const password = process.env.BB_PASSWORD || "";

    if (!username || !password) {
      throw new Error(
        "BB_USERNAME and BB_PASSWORD environment variables are required"
      );
    }

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
              await savePlayerData(player);
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
    console.log(`Player data saved to database`);
  } catch (error) {
    console.error("Script failed:", (error as Error).message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\nScript interrupted by user");
  process.exit(0);
});

// Run the script
main();
