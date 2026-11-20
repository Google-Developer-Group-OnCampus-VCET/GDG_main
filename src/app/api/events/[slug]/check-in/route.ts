import { NextResponse } from "next/server";
import { getAdminRoleFromRequest, isAdminRequestAuthenticated } from "@/lib/auth";
import { checkInAttendeeAsync, logAuditEventAsync } from "@/lib/db";
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
    let body: { referenceId?: string; day?: number };
    try {
      body = (await request.json()) as { referenceId?: string; day?: number };
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

    const day = typeof body.day === "number" && !isNaN(body.day) && body.day >= 1 ? Math.floor(body.day) : undefined;
    const role = await getAdminRoleFromRequest(request);
    const result = await checkInAttendeeAsync(slug, body.referenceId.trim(), day);

    if (!result.success) {
      const isAlreadyCheckedIn = result.message.includes("ALREADY checked in");

      if (isAlreadyCheckedIn) {
        await logAuditEventAsync({
          action: "CHECK_IN_DUPLICATE_BLOCKED",
          actorRole: role || "volunteer",
          actorIdentifier:
            role === "volunteer"
              ? "Volunteer Desk"
              : role === "core"
              ? "Core Member"
              : "Master Admin",
          ipAddress: ip,
          userAgent: request.headers.get("user-agent") || undefined,
          eventSlug: slug,
          details: {
            referenceId: body.referenceId.trim(),
            day: day ?? 1,
            attendeeName: result.registration?.fullName,
            attendeeEmail: result.registration?.email,
            reason: result.message,
          },
        });
      }

      return NextResponse.json(
        {
          error: isAlreadyCheckedIn ? "ALREADY_CHECKED_IN" : "CHECK_IN_FAILED",
          message: result.message,
          registration: result.registration,
        },
        { status: isAlreadyCheckedIn ? 409 : 404 }
      );
    }

    await logAuditEventAsync({
      action: "ATTENDEE_CHECK_IN",
      actorRole: role || "volunteer",
      actorIdentifier:
        role === "volunteer"
          ? "Volunteer Desk"
          : role === "core"
          ? "Core Member"
          : "Master Admin",
      ipAddress: ip,
      userAgent: request.headers.get("user-agent") || undefined,
      eventSlug: slug,
      details: {
        referenceId: body.referenceId.trim(),
        day: day ?? 1,
        attendeeName: result.registration?.fullName,
        attendeeEmail: result.registration?.email,
        college: result.registration?.college,
        track: result.registration?.track,
      },
    });

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
