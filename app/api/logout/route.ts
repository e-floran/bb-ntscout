import { NextRequest, NextResponse } from "next/server";
import { baseApiUrl } from "@/app/utils/api/apiUtils";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const bbapiSession = cookieStore.get("bbapi_session")?.value;

    if (!bbapiSession) {
      return NextResponse.json({ error: "No session token" }, { status: 400 });
    }

    // Call bbapi logout endpoint
    const logoutUrl = `${baseApiUrl}logout.aspx`;
    const params = new URLSearchParams({ session: bbapiSession });
    await fetch(`${logoutUrl}?${params.toString()}`, { method: "GET" });

    // Clear cookies
    const response = NextResponse.json({ success: true });
    response.cookies.set("bbapi_session", "", { path: "/", maxAge: 0 });
    response.cookies.set("authenticated_user", "", { path: "/", maxAge: 0 });

    return response;
  } catch (err) {
    return NextResponse.json({ error: "Logout failed" }, { status: 500 });
  }
}
