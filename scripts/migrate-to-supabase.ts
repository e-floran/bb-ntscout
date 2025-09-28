import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateData() {
  try {
    console.log("Starting data migration to Supabase...");

    // 1. Migrate teams
    await migrateTeams();

    // 2. Migrate players from teams
    await migratePlayersFromTeams();

    // 3. Migrate player weeks
    await migratePlayerWeeks();

    // 4. Migrate scouted players
    await migrateScoutedPlayers();

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

async function migrateTeams() {
  console.log("Migrating teams...");
  const teamsDir = path.join(process.cwd(), "app/data/teams");
  const teamFiles = fs
    .readdirSync(teamsDir)
    .filter((file) => file.endsWith(".json"));

  for (const file of teamFiles) {
    const teamId = parseInt(path.basename(file, ".json"));

    // Insert team (we only have ID, no name from JSON)
    const { error } = await supabase
      .from("teams")
      .upsert({ id: teamId, name: null });

    if (error) {
      console.error(`Error inserting team ${teamId}:`, error);
    } else {
      console.log(`✓ Team ${teamId} inserted`);
    }
  }
}

async function migratePlayersFromTeams() {
  console.log("Migrating players from teams...");
  const teamsDir = path.join(process.cwd(), "app/data/teams");
  const teamFiles = fs
    .readdirSync(teamsDir)
    .filter((file) => file.endsWith(".json"));

  for (const file of teamFiles) {
    const teamId = parseInt(path.basename(file, ".json"));
    const teamData = JSON.parse(
      fs.readFileSync(path.join(teamsDir, file), "utf-8")
    );

    if (teamData.players && Array.isArray(teamData.players)) {
      for (const playerId of teamData.players) {
        const countryId = teamId < 1000 ? teamId : teamId - 100;

        const { error } = await supabase.from("players").upsert({
          id: playerId,
          team_id: teamId,
          country_id: countryId,
        });

        if (error) {
          console.error(`Error inserting player ${playerId}:`, error);
        }
      }
      console.log(
        `✓ Processed ${teamData.players.length} players for team ${teamId}`
      );
    }
  }
}

async function migratePlayerWeeks() {
  console.log("Migrating player weeks...");
  const playersDir = path.join(process.cwd(), "app/data/players");
  const playerFiles = fs
    .readdirSync(playersDir)
    .filter((file) => file.endsWith(".json"));

  for (const file of playerFiles) {
    const playerId = parseInt(path.basename(file, ".json"));
    const playerData = JSON.parse(
      fs.readFileSync(path.join(playersDir, file), "utf-8")
    );

    if (playerData.weeks && Array.isArray(playerData.weeks)) {
      for (const week of playerData.weeks) {
        const { error } = await supabase.from("player_weeks").upsert({
          player_id: playerId,
          week_number: week.id,
          season: week.season,
          gameshape: week.gameshape,
          dmi: week.dmi,
        });

        if (error) {
          console.error(`Error inserting week for player ${playerId}:`, error);
        }
      }
      console.log(
        `✓ Processed ${playerData.weeks.length} weeks for player ${playerId}`
      );
    }
  }
}

async function migrateScoutedPlayers() {
  console.log("Migrating scouted players...");
  const scoutedDir = path.join(process.cwd(), "app/data/scoutedPlayers");
  const scoutedFiles = fs
    .readdirSync(scoutedDir)
    .filter((file) => file.endsWith(".json"));

  for (const file of scoutedFiles) {
    const scoutedData = JSON.parse(
      fs.readFileSync(path.join(scoutedDir, file), "utf-8")
    );

    // Update or insert player with scouted data
    const currentAge = scoutedData.scoutings?.[0]?.age || null;

    const { error: playerError } = await supabase.from("players").upsert({
      id: scoutedData.id,
      first_name: scoutedData.firstName,
      last_name: scoutedData.lastName,
      country_id: scoutedData.countryId,
      potential: scoutedData.potential,
      current_age: currentAge,
    });

    if (playerError) {
      console.error(
        `Error upserting scouted player ${scoutedData.id}:`,
        playerError
      );
      continue;
    }

    // Insert scoutings
    if (scoutedData.scoutings && Array.isArray(scoutedData.scoutings)) {
      for (const scouting of scoutedData.scoutings) {
        const { error: scoutingError } = await supabase
          .from("scoutings")
          .insert({
            player_id: scoutedData.id,
            age: scouting.age,
            salary: scouting.salary,
            gameshape: scouting.gs,
            jump_shot: scouting.js,
            jump_range: scouting.jr,
            outside_defense: scouting.od,
            handling: scouting.ha,
            driving: scouting.dr,
            passing: scouting.pa,
            inside_shot: scouting.is,
            inside_defense: scouting.id,
            rebound: scouting.rb,
            shot_blocking: scouting.sb,
            stamina: scouting.st,
            free_throw: scouting.ft,
            experience: scouting.ex,
          });

        if (scoutingError) {
          console.error(
            `Error inserting scouting for player ${scoutedData.id}:`,
            scoutingError
          );
        }
      }
      console.log(
        `✓ Processed ${scoutedData.scoutings.length} scoutings for player ${scoutedData.id}`
      );
    }
  }
}

// Run the migration
migrateData();
