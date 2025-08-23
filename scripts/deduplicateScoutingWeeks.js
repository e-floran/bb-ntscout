// deduplicateScoutingWeeks.js
// This script deduplicates scouting entries in app/data/scoutedPlayers/*.json by week (weeks start on Friday)
// Usage: node scripts/deduplicateScoutingWeeks.js

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCOUTED_PLAYERS_DIR = path.join(__dirname, "../app/data/scoutedPlayers");

// Helper: get week start date (Friday) for a given date
function getWeekStart(dateStr) {
  const date = new Date(dateStr);
  // Get day of week (0=Sunday, 5=Friday)
  const day = date.getUTCDay();
  // Calculate days to subtract to get to previous Friday
  const daysToFriday = day >= 5 ? day - 5 : day + 2;
  date.setUTCDate(date.getUTCDate() - daysToFriday);
  date.setUTCHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

function processFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error(`Error parsing ${filePath}:`, e);
    return;
  }
  if (!Array.isArray(data.scoutings)) return;

  // Group by week
  const weekMap = {};
  for (const entry of data.scoutings) {
    if (!entry.scoutedAt) continue;
    const week = getWeekStart(entry.scoutedAt);
    if (
      !weekMap[week] ||
      new Date(entry.scoutedAt) > new Date(weekMap[week].scoutedAt)
    ) {
      weekMap[week] = entry;
    }
  }
  // Replace scoutings with deduplicated array
  data.scoutings = Object.values(weekMap);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function main() {
  const files = fs
    .readdirSync(SCOUTED_PLAYERS_DIR)
    .filter((f) => f.endsWith(".json"));
  for (const file of files) {
    const filePath = path.join(SCOUTED_PLAYERS_DIR, file);
    processFile(filePath);
  }
  console.log("Deduplication complete.");
}

main();
