import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { verifyPassword, createSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const user = db
      .prepare("SELECT * FROM users WHERE LOWER(email) = ? AND status = 'active'")
      .get(email.trim().toLowerCase()) as Record<string, unknown> | undefined;

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const isValid = verifyPassword(password, user.password_hash as string);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // Create session
    const { token, expiresAt } = createSession(user.id as string);

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        chapterId: user.chapter_id,
      },
    });

    // Set secure HTTP-only cookie
    response.cookies.set("gdg_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(expiresAt),
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: "Authentication failed", message: String(error) },
      { status: 500 }
    );
  }
}

