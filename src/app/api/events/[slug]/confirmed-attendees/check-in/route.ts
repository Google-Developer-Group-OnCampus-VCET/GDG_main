import { NextResponse } from "next/server";
import { getAdminRoleFromRequest } from "@/lib/auth";
import {
  checkInConfirmedAttendeeAsync,
  logAuditEventAsync,
  revokeCheckInConfirmedAttendeeAsync,
} from "@/lib/db";
import { getClientIp } from "@/lib/rate-limit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const role = await getAdminRoleFromRequest(request);
  if (!role || (role !== "admin" && role !== "volunteer")) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "Admin or Volunteer authorization required." },
      { status: 403 }
    );
  }

  const { slug } = await params;
  const body = (await request.json().catch(() => null)) as {
    registrationId?: string;
    day?: number;
  } | null;

  const registrationId = body?.registrationId?.trim();
  const day = Number(body?.day);

  if (!registrationId || !Number.isInteger(day) || day < 1 || day > 4) {
    return NextResponse.json(
      { error: "INVALID_INPUT", message: "Valid registrationId and day (1-4) are required." },
      { status: 400 }
    );
  }

  const updated = await checkInConfirmedAttendeeAsync(slug, registrationId, day);
  if (!updated) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "Confirmed attendee not found." },
      { status: 404 }
    );
  }

  await logAuditEventAsync({
    action: "ATTENDEE_CHECK_IN",
    actorRole: role,
    actorIdentifier: role === "volunteer" ? "Volunteer Desk" : "Master Admin",
    ipAddress: getClientIp(request),
    userAgent: request.headers.get("user-agent") || undefined,
    eventSlug: slug,
    details: {
      referenceId: updated.registrationId,
      day,
      attendeeName: updated.fullName,
      attendeeEmail: updated.email,
      source: "confirmed_attendees",
    },
  });

  return NextResponse.json({ success: true, attendee: updated });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const role = await getAdminRoleFromRequest(request);
  if (role !== "admin") {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "Master Admin authorization required to revoke check-in." },
      { status: 403 }
    );
  }

  const { slug } = await params;
  const body = (await request.json().catch(() => null)) as {
    registrationId?: string;
    day?: number;
  } | null;

  const registrationId = body?.registrationId?.trim();
  const day = Number(body?.day);

  if (!registrationId || !Number.isInteger(day) || day < 1 || day > 4) {
    return NextResponse.json(
      { error: "INVALID_INPUT", message: "Valid registrationId and day (1-4) are required." },
      { status: 400 }
    );
  }

  const updated = await revokeCheckInConfirmedAttendeeAsync(slug, registrationId, day);
  if (!updated) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "Confirmed attendee not found." },
      { status: 404 }
    );
  }

  await logAuditEventAsync({
    action: "CHECK_IN_REVOKED",
    actorRole: role,
    actorIdentifier: "Master Admin",
    ipAddress: getClientIp(request),
    userAgent: request.headers.get("user-agent") || undefined,
    eventSlug: slug,
    details: {
      referenceId: updated.registrationId,
      day,
      attendeeName: updated.fullName,
      attendeeEmail: updated.email,
      source: "confirmed_attendees",
    },
  });

  return NextResponse.json({ success: true, attendee: updated });
}
