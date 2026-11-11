import { NextResponse } from "next/server";
import { checkInAttendee } from "@/lib/db";
import { AuthError, requirePermission } from "@/lib/auth";
import { checkRateLimit, clientIpFrom } from "@/lib/rate-limit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const operator = await requirePermission("manage_attendance");

    const ip = clientIpFrom(request);
    if (!checkRateLimit(`check-in:${ip}`, 60, 60 * 1000)) {
      return NextResponse.json(
        { error: "RATE_LIMITED", message: "Too many check-in attempts. Please slow down." },
        { status: 429 }
      );
    }

    const { slug } = await params;
    const body = (await request.json()) as { referenceId?: string };

    if (!body?.referenceId?.trim()) {
      return NextResponse.json(
        { error: "INVALID_REQUEST", message: "Pass reference ID is required." },
        { status: 400 }
      );
    }

    const result = checkInAttendee(slug, body.referenceId.trim(), operator.name);

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
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Check-in API error:", err);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "Failed to process check-in." },
      { status: 500 }
    );
  }
}

