import { NextResponse } from "next/server";
import { getAdminUserByFirebaseUid } from "@/lib/db";
import { createFirebaseSessionCookie, verifyIdToken } from "@/lib/firebase/auth";
import { SESSION_COOKIE_NAME, sessionMaxAgeMs } from "@/lib/auth";
import { checkRateLimit, clientIpFrom } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const ip = clientIpFrom(request);
    if (!checkRateLimit(`session:${ip}`, 10, 10 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many sign-in attempts. Please try again later." }, { status: 429 });
    }

    const body = (await request.json()) as { idToken?: string };
    const idToken = body?.idToken;

    if (!idToken) {
      return NextResponse.json({ error: "idToken is required." }, { status: 400 });
    }

    const verified = await verifyIdToken(idToken);

    const profile = getAdminUserByFirebaseUid(verified.uid);
    if (!profile) {
      return NextResponse.json(
        { error: "No admin profile is linked to this account." },
        { status: 403 }
      );
    }

    if (profile.status !== "active") {
      return NextResponse.json(
        { error: "This account is not active. Contact a chapter admin." },
        { status: 403 }
      );
    }

    const maxAgeMs = sessionMaxAgeMs();
    const sessionCookie = await createFirebaseSessionCookie(idToken, maxAgeMs);

    const response = NextResponse.json({
      success: true,
      user: {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role,
        chapterId: profile.chapterId,
      },
    });

    response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: Math.floor(maxAgeMs / 1000),
    });

    return response;
  } catch (error) {
    console.error("Session creation failed:", error);
    return NextResponse.json({ error: "Authentication failed." }, { status: 401 });
  }
}
