import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

// Load environment variables from .env.local
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  const envLines = envContent.split("\n");
  for (const line of envLines) {
    if (line.trim() && !line.startsWith("#")) {
      const [key, value] = line.split("=");
      if (key && value) {
        process.env[key.trim()] = value.trim();
      }
    }
  }
}

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixGameshape() {
  try {
    console.log("Fixing gameshape column in player_weeks table...");

    const playersDir = path.join(process.cwd(), "app/data/players");
    const playerFiles = fs
      .readdirSync(playersDir)
      .filter((file) => file.endsWith(".json"));

    let totalUpdated = 0;

    for (const file of playerFiles) {
      const playerId = parseInt(path.basename(file, ".json"));
      const playerData = JSON.parse(
        fs.readFileSync(path.join(playersDir, file), "utf-8")
      );

      if (playerData.weeks && Array.isArray(playerData.weeks)) {
        for (const week of playerData.weeks) {
          // Update the specific row with the correct gameshape value
          const { error } = await supabase
            .from("player_weeks")
            .update({ gameshape: week.gameShape })
            .eq("player_id", playerId)
            .eq("week_number", week.id)
            .eq("season", week.season);

          if (error) {
            console.error(
              `Error updating gameshape for player ${playerId}, week ${week.id}:`,
              error
            );
          } else {
            totalUpdated++;
          }
        }
        console.log(
          `✓ Fixed gameshape for ${playerData.weeks.length} weeks for player ${playerId}`
        );
      }
    }

    console.log(
      `\n🎉 Successfully updated gameshape for ${totalUpdated} player week records!`
    );
  } catch (error) {
    console.error("Fix failed:", error);
    process.exit(1);
  }
}

// Run the fix
fixGameshape();
