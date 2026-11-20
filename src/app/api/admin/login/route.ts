import { NextResponse } from "next/server";
import {
  createAdminSessionToken,
  getAdminCookieOptions,
  isAuthorizedAdminEmail,
  resolveAdminCredentials,
  type AdminRole,
} from "@/lib/auth";
import { getAdminAuth } from "@/lib/firebase/admin";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { logAuditEventAsync } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rate = checkRateLimit(`login:${ip}`, {
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: "RATE_LIMITED",
          message: "Too many login attempts. Please wait and try again.",
        },
        {
          status: 429,
          headers: { "Retry-After": String(rate.retryAfterSeconds) },
        }
      );
    }

    let body: {
      email?: string;
      password?: string;
      idToken?: string;
    };
    try {
      body = (await request.json()) as {
        email?: string;
        password?: string;
        idToken?: string;
      };
    } catch {
      return NextResponse.json(
        { error: "INVALID_REQUEST", message: "Invalid JSON payload." },
        { status: 400 }
      );
    }

    const email = body?.email?.trim() ?? "";
    const password = body?.password?.trim() ?? "";
    const idToken = body?.idToken?.trim() ?? "";

    let authenticated = false;
    let role: AdminRole = "admin";
    let authMethod = "passcode";

    // 1. Verify Firebase ID Token if provided (requires server-side Firebase Admin Auth + allowlist/claim)
    if (idToken) {
      const auth = await getAdminAuth();
      if (!auth) {
        console.error("Firebase Auth unavailable: server-side token verification is not configured.");
        return NextResponse.json(
          {
            error: "FIREBASE_AUTH_UNAVAILABLE",
            message: "Authentication service temporarily unavailable.",
          },
          { status: 503 }
        );
      }

      try {
        const decoded = await auth.verifyIdToken(idToken, true);
        const hasAdminClaim = decoded.admin === true;
        const hasAllowlistedEmail = Boolean(
          decoded.email &&
            decoded.email_verified !== false &&
            isAuthorizedAdminEmail(decoded.email)
        );

        if (!decoded?.uid || (!hasAdminClaim && !hasAllowlistedEmail)) {
          return NextResponse.json(
            {
              error: "FORBIDDEN",
              message: "This account is not authorized as a chapter admin.",
            },
            { status: 403 }
          );
        }

        authenticated = true;
        role = "admin";
        authMethod = decoded.firebase?.sign_in_provider || "firebase";
      } catch (err) {
        console.warn("Firebase ID token verification failed:", (err as Error).message);
        return NextResponse.json(
          { error: "INVALID_FIREBASE_TOKEN", message: "Firebase authentication failed or expired." },
          { status: 401 }
        );
      }
    } else if (password || email) {
      // 2. Multi-role Passcode or Email & Password verification:
      // Supports dev@admin26 (Master), vcet@gdg26 (Core Member), and team@vcet26 (Volunteer)
      const cred = resolveAdminCredentials({
        email,
        password,
        passcode: password || email,
      });

      if (cred.authenticated && cred.role) {
        authenticated = true;
        role = cred.role;
        authMethod = cred.authMethod;
      } else {
        await logAuditEventAsync({
          action: "AUTH_LOGIN_FAILED",
          actorRole: "system",
          actorIdentifier: email || "unknown",
          ipAddress: ip,
          userAgent: request.headers.get("user-agent") || undefined,
          details: { reason: "INVALID_CREDENTIALS" },
        });

        return NextResponse.json(
          {
            error: "INVALID_CREDENTIALS",
            message: "Invalid credentials. Please verify your passcode or organizer account.",
          },
          { status: 401 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "MISSING_CREDENTIALS", message: "Passcode or email credentials are required." },
        { status: 400 }
      );
    }

    if (!authenticated) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication failed." },
        { status: 401 }
      );
    }

    let token: string;
    try {
      token = await createAdminSessionToken(role, email || undefined);
    } catch (err) {
      console.error("Admin session signing unavailable: secrets not configured:", (err as Error).message);
      return NextResponse.json(
        {
          error: "AUTH_NOT_CONFIGURED",
          message: "Authentication service temporarily unavailable.",
        },
        { status: 503 }
      );
    }

    const cookieOptions = getAdminCookieOptions();
    const defaultRedirect =
      role === "volunteer"
        ? "/admin/console/events/dev-to-cloud/check-in"
        : "/admin/console";

    const response = NextResponse.json({
      success: true,
      role,
      authMethod,
      redirectUrl: defaultRedirect,
      message: `Authenticated successfully as ${
        role === "admin" ? "Master Admin" : role === "core" ? "Core Member" : "Volunteer Desk"
      }.`,
    });

    response.cookies.set(cookieOptions.name, token, {
      httpOnly: cookieOptions.httpOnly,
      secure: cookieOptions.secure,
      sameSite: cookieOptions.sameSite,
      path: cookieOptions.path,
      maxAge: cookieOptions.maxAge,
    });

    await logAuditEventAsync({
      action: "AUTH_LOGIN",
      actorRole: role,
      actorIdentifier: email || (role === "admin" ? "Master Admin" : role === "core" ? "Core Member" : "Volunteer Desk"),
      ipAddress: ip,
      userAgent: request.headers.get("user-agent") || undefined,
      details: {
        role,
        authMethod,
        redirectUrl: defaultRedirect,
      },
    });

    return response;
  } catch (err) {
    console.error("Admin login error:", err);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "Failed to process admin login." },
      { status: 500 }
    );
  }
}
