import { NextResponse } from "next/server";
import {
  createAdminSessionToken,
  getAdminCookieOptions,
  isAuthorizedAdminEmail,
  verifyAdminEmailPassword,
  verifyAdminPassword,
} from "@/lib/auth";
import { getAdminAuth } from "@/lib/firebase/admin";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

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
    let authMethod = "passcode";

    // 1. Verify Firebase ID Token if provided (requires server-side Firebase Admin Auth + allowlist/claim)
    if (idToken) {
      const auth = await getAdminAuth();
      if (!auth) {
        return NextResponse.json(
          {
            error: "FIREBASE_AUTH_UNAVAILABLE",
            message: "Server-side Firebase token verification is not configured.",
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
        authMethod = decoded.firebase?.sign_in_provider || "firebase";
      } catch (err) {
        console.warn("Firebase ID token verification failed:", (err as Error).message);
        return NextResponse.json(
          { error: "INVALID_FIREBASE_TOKEN", message: "Firebase authentication failed or expired." },
          { status: 401 }
        );
      }
    } else if (email && password) {
      // 2. Direct Email & Password verification (env configuration: ADMIN_EMAIL & ADMIN_PASSWORD)
      if (verifyAdminEmailPassword(email, password)) {
        authenticated = true;
        authMethod = "email";
      } else {
        return NextResponse.json(
          { error: "INVALID_CREDENTIALS", message: "Invalid email or password." },
          { status: 401 }
        );
      }
    } else if (password) {
      // 3. Fallback to Admin Passcode verification
      if (verifyAdminPassword(password)) {
        authenticated = true;
        authMethod = "passcode";
      } else {
        return NextResponse.json(
          { error: "INVALID_CREDENTIALS", message: "Invalid admin passcode." },
          { status: 401 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "MISSING_CREDENTIALS", message: "Email and password or passcode is required." },
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
      token = await createAdminSessionToken();
    } catch (err) {
      console.error("Admin session signing unavailable:", (err as Error).message);
      return NextResponse.json(
        {
          error: "AUTH_NOT_CONFIGURED",
          message: "Admin authentication secrets are not configured on the server.",
        },
        { status: 503 }
      );
    }

    const cookieOptions = getAdminCookieOptions();

    const response = NextResponse.json({
      success: true,
      authMethod,
      message: "Admin authentication successful.",
    });

    response.cookies.set(cookieOptions.name, token, {
      httpOnly: cookieOptions.httpOnly,
      secure: cookieOptions.secure,
      sameSite: cookieOptions.sameSite,
      path: cookieOptions.path,
      maxAge: cookieOptions.maxAge,
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
