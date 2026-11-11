import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAdminUserByFirebaseUid } from "@/lib/db";
import { verifyFirebaseSessionCookie } from "@/lib/firebase/auth";
import { SESSION_COOKIE_NAME } from "@/lib/auth";

/**
 * This is the proxy/middleware the repository audit found effectively missing. A previous
 * version at this same path (now replaced) enforced auth only for `/admin/console/**`
 * (a dead, separate passcode-based admin surface, now deleted) and left plain `/admin/**` —
 * the real admin panel — completely unguarded; it also checked a cookie belonging to that
 * other auth system, so it would never have recognized a real session even where it did run.
 * This is now the single real gate for every admin page and admin API route, backed by the
 * one real Firebase-session system.
 *
 * This only proves "there is a valid, active session" (coarse-grained authentication).
 * Fine-grained authorization (which permission a route needs) is still enforced inside each
 * route handler via requirePermission() — this is defense in depth, not a replacement for it.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/admin");
  const isCheckIn = /^\/api\/events\/[^/]+\/check-in$/.test(pathname);

  if (!isAdminPage && !isAdminApi && !isCheckIn) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const verified = sessionCookie ? await verifyFirebaseSessionCookie(sessionCookie) : null;
  const profile = verified ? getAdminUserByFirebaseUid(verified.uid) : null;
  const authenticated = Boolean(profile && profile.status === "active");

  if (authenticated) {
    return NextResponse.next();
  }

  if (isAdminPage) {
    const loginUrl = new URL("/admin/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.json({ error: "Authentication required." }, { status: 401 });
}

// Backward compatibility: some Next.js tooling/docs still reference the "middleware" export.
export const middleware = proxy;

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/api/events/:slug/check-in"],
};
