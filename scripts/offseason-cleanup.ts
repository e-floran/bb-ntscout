import fs from "fs";
import path from "path";
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

async function offseasonCleanup() {
  // Initialize Supabase client
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  console.log("🔍 Initializing Supabase client...");
  console.log("SUPABASE_URL:", supabaseUrl ? "✅ Set" : "❌ Missing");
  console.log("SUPABASE_ANON_KEY:", supabaseKey ? "✅ Set" : "❌ Missing");

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required"
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  console.log("✅ Supabase client initialized successfully");

  try {
    console.log("Starting offseason cleanup...");

    // 1. Delete all entries in player_weeks table
    console.log("Deleting all player_weeks entries...");
    const { error: deleteWeeksError, count: deletedWeeksCount } = await supabase
      .from("player_weeks")
      .delete()
      .neq("id", 0); // Delete all records

    if (deleteWeeksError) {
      throw new Error(
        `Failed to delete player_weeks: ${deleteWeeksError.message}`
      );
    }
    console.log(`Deleted ${deletedWeeksCount || "all"} player_weeks entries`);

    // 2. Get players to remove (low potential and old age)
    console.log("Finding players to remove (potential < 9 AND age > 20)...");
    const { data: playersToRemove, error: playersError } = await supabase
      .from("players")
      .select("id")
      .not("potential", "is", null)
      .lt("potential", 9)
      .not("current_age", "is", null)
      .gt("current_age", 20);

    if (playersError) {
      throw new Error(
        `Failed to find players to remove: ${playersError.message}`
      );
    }

    const playerIds = playersToRemove?.map((row) => row.id) || [];
    console.log(`Found ${playerIds.length} players to remove`);

    if (playerIds.length > 0) {
      // 2a. Delete corresponding scoutings entries
      console.log("Deleting scouting entries for removed players...");
      const { error: deleteScoutingsError, count: deletedScoutingsCount } =
        await supabase.from("scoutings").delete().in("player_id", playerIds);

      if (deleteScoutingsError) {
        throw new Error(
          `Failed to delete scoutings: ${deleteScoutingsError.message}`
        );
      }
      console.log(`Deleted ${deletedScoutingsCount || 0} scouting entries`);

      // 2b. Delete the players themselves
      console.log("Deleting players...");
      const { error: deletePlayersError, count: deletedPlayersCount } =
        await supabase.from("players").delete().in("id", playerIds);

      if (deletePlayersError) {
        throw new Error(
          `Failed to delete players: ${deletePlayersError.message}`
        );
      }
      console.log(`Deleted ${deletedPlayersCount || 0} players`);
    }

    // 3. Age all remaining players by 1 year
    console.log("Aging all remaining players by 1 year...");
    const { error: ageUpdateError, count: ageUpdateCount } = await supabase
      .from("players")
      .update({
        current_age: supabase.rpc("increment_age"),
        updated_at: new Date().toISOString(),
      })
      .not("current_age", "is", null);

    // If RPC doesn't work, use a workaround by fetching and updating
    if (ageUpdateError && ageUpdateError.message.includes("rpc")) {
      console.log("Using alternative age update method...");

      // Get all players with non-null current_age
      const { data: playersToAge, error: fetchError } = await supabase
        .from("players")
        .select("id, current_age")
        .not("current_age", "is", null);

      if (fetchError) {
        throw new Error(
          `Failed to fetch players for aging: ${fetchError.message}`
        );
      }

      if (playersToAge && playersToAge.length > 0) {
        // Update each player's age
        const updates = playersToAge.map((player) => ({
          id: player.id,
          current_age: player.current_age + 1,
          updated_at: new Date().toISOString(),
        }));

        const { error: batchUpdateError } = await supabase
          .from("players")
          .upsert(updates);

        if (batchUpdateError) {
          throw new Error(
            `Failed to update player ages: ${batchUpdateError.message}`
          );
        }

        console.log(`Updated age for ${updates.length} players`);
      }
    } else if (ageUpdateError) {
      throw new Error(
        `Failed to update player ages: ${ageUpdateError.message}`
      );
    } else {
      console.log(`Updated age for ${ageUpdateCount || 0} players`);
    }

    console.log("Offseason cleanup completed successfully!");

    // Final stats
    const { count: remainingPlayers } = await supabase
      .from("players")
      .select("*", { count: "exact", head: true });

    const { count: remainingScoutings } = await supabase
      .from("scoutings")
      .select("*", { count: "exact", head: true });

    console.log(`\nFinal counts:`);
    console.log(`Remaining players: ${remainingPlayers || 0}`);
    console.log(`Remaining scoutings: ${remainingScoutings || 0}`);
    console.log(`Player weeks: 0 (all deleted)`);
  } catch (error) {
    console.error("Error during offseason cleanup:", error);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  offseasonCleanup()
    .then(() => {
      console.log("Script finished successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Script failed:", error);
      process.exit(1);
    });
}

export { offseasonCleanup };
