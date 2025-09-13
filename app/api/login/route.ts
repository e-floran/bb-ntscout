import { NextRequest, NextResponse } from "next/server";
import { users } from "@/app/utils/users";
import { baseApiUrl } from "@/app/utils/api/apiUtils";
import { User } from "@/app/types/mainTypes";

// In-memory storage for user credentials during their session
const userCredentials = new Map<
  string,
  { login: string; password: string; timestamp: number; user: User }
>();

// Clean up expired credentials (older than 4 hours)
const CREDENTIAL_EXPIRY = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
function cleanupExpiredCredentials() {
  const now = Date.now();
  for (const [sessionId, data] of userCredentials.entries()) {
    if (now - data.timestamp > CREDENTIAL_EXPIRY) {
      userCredentials.delete(sessionId);
    }
  }
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

  const user = users.find((u) => u.login === login && u.active);
  if (!user) {
    return NextResponse.json(
      { error: "User not found or not active" },
      { status: 401 }
    );
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
        user,
        timestamp: Date.now(),
      });

      const response = NextResponse.json({ success: true });
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

// Export functions for use in other routes
export { userCredentials, cleanupExpiredCredentials };
