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

  console.log("Supabase URL:", supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'MISSING');
  console.log("Supabase Key exists:", !!supabaseKey);

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required",
    );
  }
  return createClient(supabaseUrl, supabaseKey);
}

// Utility to extract cookie pairs from Set-Cookie header(s)
function extractCookiePairs(setCookieHeader: string | null): string {
  if (!setCookieHeader) return "";

  // Split by newline or comma followed by a cookie name pattern
  // This handles multiple Set-Cookie headers more reliably
  const cookies = setCookieHeader
    .split(/,(?=[^;]+?=)/)
    .map((cookie) => {
      // Extract just the name=value pair (before first semicolon)
      const match = cookie.trim().match(/^([^;]+)/);
      return match ? match[1].trim() : "";
    })
    .filter(Boolean);

  return cookies.join("; ");
}

export async function POST(req: NextRequest) {
  const { login, password } = await req.json();

  console.log("=== Login attempt started ===");
  console.log("Login:", login);
  console.log("Password length:", password?.length);

  // Query user from database
  let userForSession;
  let redirectPath = "/"; // default redirect
  try {
    console.log("Querying database for user:", login);
    const supabase = getSupabaseClient();
    
    // Add timeout wrapper for database query
    const queryPromise = supabase
      .from("users")
      .select("id, login, main_team_id, active, role, is_new")
      .eq("login", login)
      .eq("active", true)
      .single();
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Database query timeout after 5s")), 5000)
    );
    
    const { data: users, error } = await Promise.race([queryPromise, timeoutPromise]) as any;

    console.log("Database query completed");
    console.log("Error:", error);
    console.log("User found:", !!users);

    if (error) {
      console.error("Database query failed:", error);
      // Return more specific error message
      return NextResponse.json(
        { 
          error: "Database connection failed", 
          details: "Unable to connect to database. Please try again later." 
        },
        { status: 503 }, // Service Unavailable
      );
    }
    
    if (!users) {
      return NextResponse.json(
        { error: "User not found or not active" },
        { status: 401 },
      );
    }

    // Convert database format to expected format for compatibility
    userForSession = {
      login: users.login,
      mainTeamId: users.main_team_id.toString(),
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
      }

      // Update the session data to reflect the change
      userForSession.isNew = false;
    } else {
      // Role-based redirects for experienced users
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
    return NextResponse.json(
      { 
        error: "Database connection error", 
        details: dbError instanceof Error ? dbError.message : "Unknown error" 
      }, 
      { status: 503 }
    );
  }

  // Clean up expired credentials periodically
  cleanupExpiredCredentials();

  try {
    const url = `${baseApiUrl}login.aspx?login=${encodeURIComponent(
      login,
    )}&code=${encodeURIComponent(password)}`;

    console.log("Attempting BBAPI login for user:", login);
    const res = await fetch(url, { method: "GET" });
    const setCookie = res.headers.get("set-cookie");
    const text = await res.text();

    console.log("BBAPI response status:", res.status);
    console.log("BBAPI Set-Cookie header:", setCookie);
    console.log("BBAPI response preview:", text.substring(0, 200));

    // Check for <loggedIn>
    if (!text.includes("<loggedIn")) {
      console.error("BBAPI login failed - no <loggedIn> tag found");
      return NextResponse.json(
        { error: "API login failed", bbapiXml: text },
        { status: 401 },
      );
    }

    if (setCookie) {
      // Only keep the cookie pairs, not the flags!
      const bbapiCookiePairs = extractCookiePairs(setCookie);
      console.log("Extracted cookie pairs:", bbapiCookiePairs);

      if (!bbapiCookiePairs) {
        console.error("Failed to extract cookie pairs from Set-Cookie header");
        return NextResponse.json(
          {
            error: "API login failed (invalid session cookie)",
            bbapiXml: text,
          },
          { status: 401 },
        );
      }

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
      console.error("BBAPI login succeeded but no Set-Cookie header present");
      return NextResponse.json(
        { error: "API login failed (no session cookie)", bbapiXml: text },
        { status: 401 },
      );
    }
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "API login failed" }, { status: 500 });
  }
}
