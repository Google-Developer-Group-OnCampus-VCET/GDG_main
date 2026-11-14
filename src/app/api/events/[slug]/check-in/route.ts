import { NextResponse } from "next/server";
import { isAdminRequestAuthenticated } from "@/lib/auth";
import { checkInAttendeeAsync } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const isAuthenticated = await isAdminRequestAuthenticated(request);
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Admin authorization required for check-in." },
        { status: 401 }
      );
    }

    const ip = getClientIp(request);
    const rate = checkRateLimit(`checkin:${ip}`, {
      limit: 60,
      windowMs: 60 * 1000,
    });
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: "RATE_LIMITED",
          message: "Too many check-in requests. Slow down briefly.",
        },
        {
          status: 429,
          headers: { "Retry-After": String(rate.retryAfterSeconds) },
        }
      );
    }

    const { slug } = await params;
    let body: { referenceId?: string };
    try {
      body = (await request.json()) as { referenceId?: string };
    } catch {
      return NextResponse.json(
        { error: "INVALID_REQUEST", message: "Invalid JSON payload." },
        { status: 400 }
      );
    }

    if (!body?.referenceId?.trim()) {
      return NextResponse.json(
        { error: "INVALID_REQUEST", message: "Pass reference is required." },
        { status: 400 }
      );
    }

    const result = await checkInAttendeeAsync(slug, body.referenceId.trim());

    if (!result.success) {
      const isAlreadyCheckedIn = result.message.includes("ALREADY checked in");
      return NextResponse.json(
        {
          error: isAlreadyCheckedIn ? "ALREADY_CHECKED_IN" : "CHECK_IN_FAILED",
          message: result.message,
          registration: result.registration,
        },
        { status: isAlreadyCheckedIn ? 409 : 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      registration: result.registration,
    });
  } catch (err) {
    console.error("Check-in API error:", err);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "Failed to process check-in." },
      { status: 500 }
    );
  }
}
