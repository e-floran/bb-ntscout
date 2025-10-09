import { NextRequest, NextResponse } from "next/server";

// This matcher protects all routes except for /login, /api/*, and static assets
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login).*)"],
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files, API routes, and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.includes(".") ||
    pathname.startsWith("/api")
  ) {
    return NextResponse.next();
  }

  // Public routes that don't require authentication
  if (pathname === "/login") {
    return NextResponse.next();
  }

  // All other pages require authentication
  const authenticatedUser = request.cookies.get("authenticated_user")?.value;
  const bbapiSession = request.cookies.get("bbapi_session")?.value;

  if (!authenticatedUser || !bbapiSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("message", "session_expired");
    return NextResponse.redirect(loginUrl);
  }

  // User is authenticated, let them through
  return NextResponse.next();
}
