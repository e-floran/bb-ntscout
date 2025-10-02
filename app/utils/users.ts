import { User } from "../types/mainTypes";
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

// Database-driven user functions to replace the hardcoded users array

export async function getUserByLogin(login: string): Promise<User | null> {
  try {
    const supabase = getSupabaseClient();
    const { data: user, error } = await supabase
      .from("users")
      .select("id, login, main_team_id, active, role")
      .eq("login", login)
      .single();

    if (error || !user) {
      return null;
    }

    return {
      login: user.login,
      mainTeamId: user.main_team_id.toString(), // Convert to string for compatibility
      active: user.active,
      role: user.role,
    };
  } catch (error) {
    console.error("Error fetching user by login:", error);
    return null;
  }
}

export async function getActiveUsers(): Promise<User[]> {
  try {
    const supabase = getSupabaseClient();
    const { data: users, error } = await supabase
      .from("users")
      .select("id, login, main_team_id, active, role")
      .eq("active", true);

    if (error || !users) {
      return [];
    }

    return users.map((user) => ({
      login: user.login,
      mainTeamId: user.main_team_id.toString(), // Convert to string for compatibility
      active: user.active,
      role: user.role,
    }));
  } catch (error) {
    console.error("Error fetching active users:", error);
    return [];
  }
}

export async function getAllUsers(): Promise<User[]> {
  try {
    const supabase = getSupabaseClient();
    const { data: users, error } = await supabase
      .from("users")
      .select("id, login, main_team_id, active, role")
      .order("login");

    if (error || !users) {
      return [];
    }

    return users.map((user) => ({
      login: user.login,
      mainTeamId: user.main_team_id.toString(), // Convert to string for compatibility
      active: user.active,
      role: user.role,
    }));
  } catch (error) {
    console.error("Error fetching all users:", error);
    return [];
  }
}

export async function getUsersByTeam(teamId: string): Promise<User[]> {
  try {
    const supabase = getSupabaseClient();
    const { data: users, error } = await supabase
      .from("users")
      .select("id, login, main_team_id, active, role")
      .eq("main_team_id", parseInt(teamId));

    if (error || !users) {
      return [];
    }

    return users.map((user) => ({
      login: user.login,
      mainTeamId: user.main_team_id.toString(), // Convert to string for compatibility
      active: user.active,
      role: user.role,
    }));
  } catch (error) {
    console.error("Error fetching users by team:", error);
    return [];
  }
}

// For backward compatibility, export a function that returns all active users
// This can replace direct access to the users array
export async function getUsers(): Promise<User[]> {
  return getActiveUsers();
}

// Deprecated: Use database functions instead
// This is kept for backward compatibility but should be replaced
export const users: User[] = [];
console.warn(
  "users array is deprecated. Use getUserByLogin(), getActiveUsers(), or getAllUsers() instead."
);
