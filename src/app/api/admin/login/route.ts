import { NextResponse } from "next/server";
import {
  createAdminSessionToken,
  getAdminCookieOptions,
  verifyAdminPassword,
} from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { password?: string };
    const password = body?.password?.trim() ?? "";

    if (!password) {
      return NextResponse.json(
        { error: "MISSING_PASSWORD", message: "Admin passcode is required." },
        { status: 400 }
      );
    }

    if (!verifyAdminPassword(password)) {
      return NextResponse.json(
        { error: "INVALID_CREDENTIALS", message: "Invalid admin passcode." },
        { status: 401 }
      );
    }

    const token = await createAdminSessionToken();
    const cookieOptions = getAdminCookieOptions();

    const response = NextResponse.json({
      success: true,
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

