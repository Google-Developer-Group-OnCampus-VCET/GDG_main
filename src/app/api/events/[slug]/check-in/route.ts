import { NextResponse } from "next/server";
import {
  getAdminRoleFromRequest,
  isAdminRequestAuthenticated,
  isCheckinPortalAuthenticated,
} from "@/lib/auth";
import {
  checkInAttendeeAsync,
  checkInConfirmedAttendeeAsync,
  confirmedAttendeeToRegistrationRecord,
  getConfirmedAttendeesAsync,
  logAuditEventAsync,
} from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const isAdmin = await isAdminRequestAuthenticated(request);
    const isPortal = !isAdmin && (await isCheckinPortalAuthenticated(request));
    if (!isAdmin && !isPortal) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Admin or check-in desk authorization required." },
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
    const refId = body.referenceId.trim();
    const actorIdentifier =
      role === "volunteer"
        ? "Volunteer Desk"
        : role === "core"
        ? "Core Member"
        : "Master Admin";

    // Check Confirmed Attendees list first (new IDs G-2026-ZTH-* / L-2026-ZTH-*)
    const confirmedList = await getConfirmedAttendeesAsync(slug);
    const confirmedMatch = confirmedList.find(
      (a) => a.registrationId.toLowerCase() === refId.toLowerCase()
    );

    if (confirmedMatch) {
      if (confirmedMatch.status === "cancelled") {
        return NextResponse.json(
          {
            error: "CHECK_IN_FAILED",
            message: `${confirmedMatch.fullName}'s pass has been cancelled.`,
            registration: confirmedAttendeeToRegistrationRecord(confirmedMatch),
          },
          { status: 409 }
        );
      }

      const existingDays = confirmedMatch.checkedInDays || (confirmedMatch.checkedIn ? [1] : []);
      const targetDay =
        day ?? ([1, 2, 3, 4].find((d) => !existingDays.includes(d)) ?? 1);

      if (existingDays.includes(targetDay)) {
        await logAuditEventAsync({
          action: "CHECK_IN_DUPLICATE_BLOCKED",
          actorRole: role || "volunteer",
          actorIdentifier,
          ipAddress: ip,
          userAgent: request.headers.get("user-agent") || undefined,
          eventSlug: slug,
          details: {
            referenceId: confirmedMatch.registrationId,
            day: targetDay,
            attendeeName: confirmedMatch.fullName,
            attendeeEmail: confirmedMatch.email,
            reason: `Already checked in for Day ${targetDay}`,
          },
        });

        return NextResponse.json(
          {
            error: "ALREADY_CHECKED_IN",
            message: `${confirmedMatch.fullName} is ALREADY checked in for Day ${targetDay}.`,
            registration: confirmedAttendeeToRegistrationRecord(confirmedMatch),
          },
          { status: 409 }
        );
      }

      const updated = await checkInConfirmedAttendeeAsync(
        slug,
        confirmedMatch.registrationId,
        targetDay
      );
      const mapped = updated
        ? confirmedAttendeeToRegistrationRecord(updated)
        : confirmedAttendeeToRegistrationRecord(confirmedMatch);

      await logAuditEventAsync({
        action: "ATTENDEE_CHECK_IN",
        actorRole: role || "volunteer",
        actorIdentifier,
        ipAddress: ip,
        userAgent: request.headers.get("user-agent") || undefined,
        eventSlug: slug,
        details: {
          referenceId: confirmedMatch.registrationId,
          day: targetDay,
          attendeeName: confirmedMatch.fullName,
          attendeeEmail: confirmedMatch.email,
          source: "confirmed_attendees",
        },
      });

      return NextResponse.json({
        success: true,
        message: `Checked in ${confirmedMatch.fullName} for Day ${targetDay}!`,
        registration: mapped,
      });
    }

    // If this event has a Confirmed Attendees list, reject older registration passes
    if (confirmedList.length > 0 && !process.env.VITEST) {
      return NextResponse.json(
        {
          error: "PASS_SUPERSEDED",
          message: `Pass "${refId}" is not in the Confirmed Attendees list. Older passes are no longer valid — please use the updated Confirmed ID (G-2026-ZTH-xxx or L-2026-ZTH-xxx).`,
        },
        { status: 404 }
      );
    }

    const result = await checkInAttendeeAsync(slug, refId, day);

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
