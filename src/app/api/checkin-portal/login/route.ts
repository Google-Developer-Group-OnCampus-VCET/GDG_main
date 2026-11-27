import { NextResponse } from "next/server";
import {
  createCheckinPortalToken,
  getCheckinPortalCookieOptions,
  verifyCheckinPortalPasscode,
} from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rate = checkRateLimit(`checkin-login:${ip}`, {
    limit: 20,
    windowMs: 60 * 1000,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "RATE_LIMITED", message: "Too many attempts. Please wait a minute." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
    );
  }

  const body = (await request.json().catch(() => null)) as { passcode?: string } | null;
  const passcode = body?.passcode?.trim() ?? "";

  if (!passcode) {
    return NextResponse.json(
      { error: "MISSING_PASSCODE", message: "Please enter the check-in passcode." },
      { status: 400 }
    );
  }

  if (!verifyCheckinPortalPasscode(passcode)) {
    return NextResponse.json(
      { error: "INVALID_PASSCODE", message: "Invalid check-in passcode." },
      { status: 401 }
    );
  }

  const token = await createCheckinPortalToken();
  const cookieOpts = getCheckinPortalCookieOptions();
  const response = NextResponse.json({ success: true });
  response.cookies.set(cookieOpts.name, token, {
    httpOnly: cookieOpts.httpOnly,
    secure: cookieOpts.secure,
    sameSite: cookieOpts.sameSite,
    path: cookieOpts.path,
    maxAge: cookieOpts.maxAge,
  });

  return response;
}
