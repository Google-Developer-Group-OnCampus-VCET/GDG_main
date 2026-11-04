import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Allow login page and login API endpoint without authentication
  if (pathname === "/admin/console/login" || pathname === "/api/admin/login") {
    // If user is already authenticated and visits login page, redirect to console dashboard
    if (pathname === "/admin/console/login") {
      const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
      const isValid = await verifyAdminSessionToken(token);
      if (isValid) {
        return NextResponse.redirect(new URL("/admin/console", request.url));
      }
    }
    return NextResponse.next();
  }

  // Only enforce auth on admin console routes and admin API routes
  const isConsoleRoute = pathname.startsWith("/admin/console");
  const isAdminApiRoute = pathname.startsWith("/api/admin");

  if (!isConsoleRoute && !isAdminApiRoute) {
    // Non-console routes (e.g. probing plain /admin or /admin/login) pass through to Next.js 404 handler
    return NextResponse.next();
  }

  // Check admin session token
  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const isAuthenticated = await verifyAdminSessionToken(token);

  if (!isAuthenticated) {
    // For API requests, return 401 JSON
    if (isAdminApiRoute) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Admin authorization required." },
        { status: 401 }
      );
    }

    // For console page requests, redirect to /admin/console/login with return URL
    const loginUrl = new URL("/admin/console/login", request.url);
    const destination = pathname + search;
    if (destination !== "/admin/console") {
      loginUrl.searchParams.set("next", destination);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// Backward compatibility
export const middleware = proxy;

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/api/admin/:path*",
  ],
};
