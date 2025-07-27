import { NextRequest, NextResponse } from "next/server";
import { users } from "@/app/utils/users";
import { baseApiUrl } from "@/app/utils/api/apiUtils";

export async function POST(req: NextRequest) {
  const { login, password } = await req.json();

  // 1. Check user existence AND that user is active
  const user = users.find((u) => u.login === login && u.active);
  if (!user) {
    return NextResponse.json(
      { error: "User not found or not active" },
      { status: 401 }
    );
  }

  try {
    const url = `${baseApiUrl}login.aspx?login=${encodeURIComponent(
      login
    )}&code=${encodeURIComponent(password)}`;
    const res = await fetch(url, { method: "GET" });
    const setCookie = res.headers.get("set-cookie");
    const text = await res.text();

    // Log the full XML response for debugging
    console.log("BBAPI XML Response:", text);

    // Check for either <loggedIn> or <loggedIn/>
    if (!text.includes("<loggedIn")) {
      return NextResponse.json(
        { error: "API login failed", bbapiXml: text },
        { status: 401 }
      );
    }

    if (setCookie) {
      const response = NextResponse.json({ success: true });
      response.cookies.set("bbapi_session", setCookie, {
        httpOnly: true,
        secure: true,
        path: "/",
        sameSite: "lax",
      });
      response.cookies.set("authenticated_user", login, {
        httpOnly: true,
        secure: true,
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
    return NextResponse.json({ error: "API login failed" }, { status: 500 });
  }
}
