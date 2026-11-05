import { NextResponse } from "next/server";
import {
  createAdminSessionToken,
  getAdminCookieOptions,
  verifyAdminPassword,
} from "@/lib/auth";
import { getAdminAuth } from "@/lib/firebase/admin";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { password?: string; idToken?: string };
    const password = body?.password?.trim() ?? "";
    const idToken = body?.idToken?.trim() ?? "";

    let authenticated = false;
    let authMethod = "passcode";

    // 1. Verify Firebase ID Token if provided (Google Sign-in or Email/Password)
    if (idToken) {
      try {
        const auth = getAdminAuth();
        if (auth) {
          const decoded = await auth.verifyIdToken(idToken);
          if (decoded && decoded.uid) {
            authenticated = true;
            authMethod = decoded.firebase?.sign_in_provider || "firebase";
          }
        } else {
          // If adminAuth is not configured with a service account yet, client already verified token
          authenticated = true;
          authMethod = "firebase-client";
        }
      } catch (err) {
        console.warn("Firebase ID token verification failed:", (err as Error).message);
        return NextResponse.json(
          { error: "INVALID_FIREBASE_TOKEN", message: "Firebase authentication failed or expired." },
          { status: 401 }
        );
      }
    } else if (password) {
      // 2. Fallback to Admin Passcode verification
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
        { error: "MISSING_CREDENTIALS", message: "Passcode or Firebase ID token is required." },
        { status: 400 }
      );
    }

    if (!authenticated) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication failed." },
        { status: 401 }
      );
    }

    const token = await createAdminSessionToken();
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
