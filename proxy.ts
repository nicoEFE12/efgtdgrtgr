import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname, origin } = request.nextUrl;
  const sessionToken = request.cookies.get("session_token")?.value;

  // Skip static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Auth routes - allow everyone
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Login pages
  if (pathname.startsWith("/login")) {
    // If already logged in, redirect to dashboard
    if (sessionToken) {
      return NextResponse.redirect(new URL("/dashboard", origin));
    }
    return NextResponse.next();
  }

  // Protected API routes
  if (pathname.startsWith("/api/")) {
    if (!sessionToken) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // Protected dashboard routes
  if (pathname.startsWith("/dashboard")) {
    if (!sessionToken) {
      return NextResponse.redirect(new URL("/login", origin));
    }
    return NextResponse.next();
  }

  // Root redirect
  if (pathname === "/") {
    const destination = sessionToken ? "/dashboard" : "/login";
    return NextResponse.redirect(new URL(destination, origin));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
