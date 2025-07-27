import { NextRequest, NextResponse } from "next/server";

// This matcher protects all routes except for /login, /api/*, and static assets
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login).*)"],
};

export function middleware(request: NextRequest) {
  const isAuthenticated = request.cookies.get("authenticated_user");
  if (!isAuthenticated) {
    // Redirect unauthenticated users to /login
    return NextResponse.redirect(new URL("/login", request.url));
  }
  // If authenticated, allow the request to proceed
  return NextResponse.next();
}
