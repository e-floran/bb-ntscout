import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Function to get Supabase client
function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required"
    );
  }

  return createClient(supabaseUrl, supabaseKey);
}

interface PlayerData {
  id: number;
  firstName: string;
  lastName: string;
  countryId: number;
  potential: number;
}

interface ScoutingData {
  age: number;
  salary: number;
  gs: number;
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

export async function POST(request: NextRequest) {
  try {
    const {
      playerId,
      playerData,
      scoutingData,
    }: {
      playerId: number;
      playerData: PlayerData;
      scoutingData: ScoutingData;
    } = await request.json();

    if (!playerId || !playerData || !scoutingData) {
      return NextResponse.json(
        { error: "Missing required data" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // First, upsert the player data
    const { error: playerError } = await supabase.from("players").upsert({
      id: playerData.id,
      first_name: playerData.firstName,
      last_name: playerData.lastName,
      country_id: playerData.countryId,
      potential: playerData.potential,
      current_age: scoutingData.age, // Update current age from scouting data
      updated_at: new Date().toISOString(),
    });

    if (playerError) {
      console.error("Error upserting player:", playerError);
      return NextResponse.json(
        { error: "Failed to save player data" },
        { status: 500 }
      );
    }

    // Then, insert the scouting data
    const { error: scoutingError } = await supabase.from("scoutings").insert({
      player_id: playerData.id,
      age: scoutingData.age,
      salary: scoutingData.salary,
      gameshape: scoutingData.gs,
      jump_shot: scoutingData.js,
      jump_range: scoutingData.jr,
      outside_defense: scoutingData.od,
      handling: scoutingData.ha,
      driving: scoutingData.dr,
      passing: scoutingData.pa,
      inside_shot: scoutingData.is,
      inside_defense: scoutingData.id,
      rebound: scoutingData.rb,
      shot_blocking: scoutingData.sb,
      stamina: scoutingData.st,
      free_throw: scoutingData.ft,
      experience: scoutingData.ex,
      created_at: scoutingData.scoutedAt,
    });

    if (scoutingError) {
      console.error("Error inserting scouting data:", scoutingError);
      return NextResponse.json(
        { error: "Failed to save scouting data" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Player and scouting data saved successfully",
    });
  } catch (error) {
    console.error("Error in scouting submit:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
