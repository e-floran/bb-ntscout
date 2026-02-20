/* eslint-disable @typescript-eslint/no-explicit-any */
import * as readline from "readline";
import fs from "fs";
import path from "path";
import xml2js from "xml2js";

type Position = "PG" | "SG" | "SF" | "PF" | "C";

interface GameData {
  gameId: string;
  gameDate: string;
  teamRatings: Record<string, number>;
  positionsEfficiencies: Record<Position, number>;
}

const SEASON = 71;
const TEAM_IDS = [11, 50, 1011];
const BASE_API_URL = "http://bbapi.buzzerbeater.com"; // Fixed: use http instead of https
const OUTPUT_DIR = path.join(process.cwd(), "app/data/mainTeams");

// Query tracking for re-authentication
let queryCount = 0;
let userCredentials: { login: string; password: string } | null = null;
let currentCookies = "";

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function parseDate(dateString: string) {
  return new Date(dateString);
}

async function fetchXml(url: string, cookies: string) {
  const response = await fetch(url, {
    headers: cookies ? { Cookie: cookies } : undefined,
  });
  const text = await response.text();
  const parser = new xml2js.Parser({ explicitArray: false });
  return parser.parseStringPromise(text);
}

async function promptInput(question: string, hidden = false): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    if (hidden) {
      // Hide password input
      const stdin = process.stdin;
      stdin.setRawMode(true);
      rl.question(question, () => {});

      let password = "";
      stdin.on("data", (char) => {
        const stringChar = char.toString();
        switch (stringChar) {
          case "\n":
          case "\r":
          case "\u0004": // Ctrl+D
            stdin.setRawMode(false);
            rl.close();
            console.log("");
            resolve(password);
            break;
          case "\u0003": // Ctrl+C
            process.exit();
            break;
          default:
            password += stringChar;
            break;
        }
      });
    } else {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer);
      });
    }
  });
}

async function authenticate(): Promise<string> {
  console.log("Authentication required for BuzzerBeater API");
  const login = await promptInput("Login: ");
  const password = await promptInput("Password: ", true);

  // Store credentials for re-authentication
  userCredentials = { login, password };

  return performLogin(login, password);
}

async function performLogin(login: string, password: string): Promise<string> {
  // Use the same approach as fridayScript - GET request with params
  const loginUrl = `${BASE_API_URL}/login.aspx`;

  const response = await fetch(loginUrl, {
    method: "GET", // Changed from POST to GET
    // Remove body and use URL params instead
  });

  // Actually, let me use the exact same pattern as fridayScript
  const loginResponse = await fetch(
    `${loginUrl}?login=${encodeURIComponent(login)}&code=${encodeURIComponent(
      password,
    )}`,
  );

  const responseText = await loginResponse.text();

  // Check for successful login like fridayScript does
  if (!responseText.includes("<loggedIn")) {
    throw new Error("Login failed - invalid credentials or API error");
  }

  const setCookieHeader = loginResponse.headers.get("set-cookie");
  if (!setCookieHeader) {
    throw new Error("Failed to authenticate - no session cookie received");
  }

  // Extract cookies the same way as fridayScript
  const cookies = setCookieHeader
    .split(",")
    .map((cookie) => cookie.split(";")[0].trim())
    .join("; ");

  currentCookies = cookies;
  return cookies;
}

async function fetchXmlWithReauth(url: string, cookies: string): Promise<any> {
  queryCount++;

  // Re-authenticate every 50 queries
  if (queryCount >= 50 && userCredentials) {
    console.log(`Re-authenticating after ${queryCount} queries...`);
    currentCookies = await performLogin(
      userCredentials.login,
      userCredentials.password,
    );
    cookies = currentCookies;
    queryCount = 0; // Reset counter after re-auth
  }

  const response = await fetch(url, {
    headers: cookies ? { Cookie: cookies } : undefined,
  });
  const text = await response.text();

  // Check for authentication errors in the response
  if (text.includes("<error") || text.includes("NotAuthorized")) {
    if (userCredentials) {
      console.log("Session expired, re-authenticating...");
      currentCookies = await performLogin(
        userCredentials.login,
        userCredentials.password,
      );
      queryCount = 0; // Reset counter

      // Retry the request with new cookies
      const retryResponse = await fetch(url, {
        headers: { Cookie: currentCookies },
      });
      const retryText = await retryResponse.text();
      const parser = new xml2js.Parser({ explicitArray: false });
      return parser.parseStringPromise(retryText);
    }
    throw new Error("Authentication failed and no credentials stored");
  }

  const parser = new xml2js.Parser({ explicitArray: false });
  return parser.parseStringPromise(text);
}

async function gatherTeamData(
  teamId: number,
  cookies: string,
): Promise<GameData[]> {
  console.log(`Gathering data for team ${teamId}...`);

  const scheduleUrl = `${BASE_API_URL}/schedule.aspx?teamid=${teamId}&season=${SEASON}`;
  const scheduleXml = await fetchXmlWithReauth(
    scheduleUrl,
    currentCookies || cookies,
  );

  let matches = [];
  if (scheduleXml?.bbapi?.schedule?.match) {
    matches = scheduleXml.bbapi.schedule.match;
    if (!Array.isArray(matches)) matches = [matches];
  } else {
    console.warn(`No matches found for team ${teamId}`);
    return [];
  }

  const gameDataList: GameData[] = [];
  const now = new Date();

  for (const match of matches) {
    const matchId = match["$"].id;
    const matchDateStr = match["$"].start;
    const matchDate = parseDate(matchDateStr);

    // Skip future matches
    if (matchDate >= now) continue;

    console.log(`Processing match ${matchId} for team ${teamId}...`);

    const boxscoreUrl = `${BASE_API_URL}/boxscore.aspx?matchid=${matchId}`;
    let boxXml;
    try {
      boxXml = await fetchXmlWithReauth(boxscoreUrl, currentCookies || cookies);
    } catch (e) {
      console.warn(`Failed to fetch boxscore for match ${matchId}`);
      continue;
    }

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
      for (const [category, value] of Object.entries(teamNode.ratings)) {
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

    gameDataList.push({
      gameId: matchId,
      gameDate: matchDateStr,
      teamRatings,
      positionsEfficiencies,
    });
  }

  console.log(`Collected ${gameDataList.length} games for team ${teamId}`);
  return gameDataList;
}

async function main() {
  try {
    console.log("Starting team ratings and efficiency data collection...");

    // Authenticate
    currentCookies = await authenticate();
    console.log("Authentication successful!");

    // Process each team
    for (const teamId of TEAM_IDS) {
      try {
        const gameData = await gatherTeamData(teamId, currentCookies);

        // Save to JSON file
        const outputPath = path.join(OUTPUT_DIR, `${teamId}.json`);
        fs.writeFileSync(outputPath, JSON.stringify(gameData, null, 2));

        console.log(`Data saved for team ${teamId} to ${outputPath}`);
      } catch (error) {
        console.error(`Error processing team ${teamId}:`, error);
      }
    }

    console.log(`Data collection completed! Total queries made: ${queryCount}`);
  } catch (error) {
    console.error("Script failed:", error);
    process.exit(1);
  }
}

// Run the script
main();
