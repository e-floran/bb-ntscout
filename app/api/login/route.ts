import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { baseApiUrl } from "@/app/utils/api/apiUtils";
import {
  userCredentials,
  cleanupExpiredCredentials,
} from "@/app/utils/userCredentials";
import { UserRoles } from "@/app/types/types";

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

// Utility to extract cookie pairs from Set-Cookie header(s)
function extractCookiePairs(setCookieHeader: string): string {
  // Handles multiple cookies separated by comma
  return setCookieHeader
    .split(",")
    .map((s) => s.split(";")[0].trim())
    .join("; ");
}

export async function POST(req: NextRequest) {
  const { login, password } = await req.json();

  // Query user from database
  let userForSession;
  let redirectPath = "/"; // default redirect
  try {
    const supabase = getSupabaseClient();
    const { data: users, error } = await supabase
      .from("users")
      .select("id, login, main_team_id, active, role, is_new")
      .eq("login", login)
      .eq("active", true)
      .single();

    if (error || !users) {
      return NextResponse.json(
        { error: "User not found or not active" },
        { status: 401 }
      );
    }

    // Convert database format to expected format for compatibility
    userForSession = {
      login: users.login,
      mainTeamId: users.main_team_id.toString(), // Convert back to string for session compatibility
      active: users.active,
      role: users.role,
      isNew: users.is_new,
    };

    // Determine redirect path based on user type and is_new status
    if (users.is_new) {
      redirectPath = "/"; // new users go to index

      // Update user to mark them as no longer new
      const { error: updateError } = await supabase
        .from("users")
        .update({ is_new: false, updated_at: new Date().toISOString() })
        .eq("id", users.id);

      if (updateError) {
        console.error("Error updating user is_new status:", updateError);
        // Don't fail the login process for update error, just log it
      }

      // Update the session data to reflect the change
      userForSession.isNew = false;
    } else {
      switch (users.role) {
        case UserRoles.Scout:
          redirectPath = "/scouting";
          break;
        case UserRoles.Admin:
        case UserRoles.Coach:
        case UserRoles.Staff:
          redirectPath = "/analyze";
          break;
        case UserRoles.User:
        default:
          redirectPath = "/";
          break;
      }
    }
  } catch (dbError) {
    console.error("Database error during login:", dbError);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  // Clean up expired credentials periodically
  cleanupExpiredCredentials();

  try {
    const url = `${baseApiUrl}login.aspx?login=${encodeURIComponent(
      login
    )}&code=${encodeURIComponent(password)}`;
    const res = await fetch(url, { method: "GET" });
    const setCookie = res.headers.get("set-cookie");
    const text = await res.text();

    // Check for <loggedIn>
    if (!text.includes("<loggedIn")) {
      return NextResponse.json(
        { error: "API login failed", bbapiXml: text },
        { status: 401 }
      );
    }

    if (setCookie) {
      // Only keep the cookie pairs, not the flags!
      const bbapiCookiePairs = extractCookiePairs(setCookie);

      // Store credentials in memory for this session
      const sessionId = `${login}_${Date.now()}_${Math.random()}`;
      userCredentials.set(sessionId, {
        login,
        password,
        user: userForSession,
        timestamp: Date.now(),
      });

      const response = NextResponse.json({
        success: true,
        redirectTo: redirectPath,
      });
      response.cookies.set("bbapi_session", bbapiCookiePairs, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // only secure if prod
        path: "/",
        sameSite: "lax",
      });
      response.cookies.set("authenticated_user", login, {
        httpOnly: false, // allow reading from JS if needed
        secure: process.env.NODE_ENV === "production",
        path: "/",
        sameSite: "lax",
      });
      // Store session ID for credential lookup
      response.cookies.set("session_id", sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        sameSite: "lax",
      });
      return response;
    } else {
      return NextResponse.json(
        { error: "API login failed (no session cookie)", bbapiXml: text },
        { status: 401 }
      );
    }
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "API login failed" }, { status: 500 });
  }
}
