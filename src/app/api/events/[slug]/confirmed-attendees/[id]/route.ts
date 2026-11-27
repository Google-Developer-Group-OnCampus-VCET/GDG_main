import { NextResponse } from "next/server";
import { getAdminRoleFromRequest } from "@/lib/auth";
import {
  updateConfirmedAttendeeAsync,
  deleteConfirmedAttendeeAsync,
  logAuditEventAsync,
} from "@/lib/db";
import { getClientIp } from "@/lib/rate-limit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const role = await getAdminRoleFromRequest(request);
  if (role !== "admin") {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "Master Admin authorization required." },
      { status: 403 }
    );
  }

  const { slug, id } = await params;
  const registrationId = decodeURIComponent(id);
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json(
      { error: "INVALID_INPUT", message: "Request body is required." },
      { status: 400 }
    );
  }

  const updates = {
    ...(typeof body.fullName === "string" ? { fullName: body.fullName.trim() } : {}),
    ...(typeof body.email === "string" ? { email: body.email.trim() } : {}),
    ...(typeof body.phone === "string" ? { phone: body.phone.trim() } : {}),
    ...(typeof body.college === "string" ? { college: body.college.trim() } : {}),
    ...(typeof body.department === "string" ? { department: body.department.trim() } : {}),
    ...(typeof body.yearOfStudy === "string" ? { yearOfStudy: body.yearOfStudy.trim() } : {}),
    ...(typeof body.track === "string" ? { track: body.track.trim() } : {}),
    ...(body.status === "confirmed" || body.status === "cancelled"
      ? { status: body.status as "confirmed" | "cancelled" }
      : {}),
    ...(typeof body.notes === "string" ? { notes: body.notes.trim() } : {}),
    ...(Array.isArray(body.checkedInDays)
      ? {
          checkedInDays: body.checkedInDays
            .map(Number)
            .filter((n) => Number.isInteger(n) && n >= 1 && n <= 4),
        }
      : {}),
  };

  const updated = await updateConfirmedAttendeeAsync(slug, registrationId, updates);
  if (!updated) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "Confirmed attendee not found." },
      { status: 404 }
    );
  }

  await logAuditEventAsync({
    action: updates.status === "cancelled" ? "REGISTRATION_CANCELLED" : "REGISTRATION_UPDATED",
    actorRole: role,
    actorIdentifier: "Master Admin",
    ipAddress: getClientIp(request),
    userAgent: request.headers.get("user-agent") || undefined,
    eventSlug: slug,
    details: {
      referenceId: updated.registrationId,
      attendeeName: updated.fullName,
      attendeeEmail: updated.email,
      updates,
      source: "confirmed_attendees",
    },
  });

  return NextResponse.json({ success: true, attendee: updated });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const role = await getAdminRoleFromRequest(request);
  if (role !== "admin") {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "Master Admin authorization required." },
      { status: 403 }
    );
  }

  const { slug, id } = await params;
  const registrationId = decodeURIComponent(id);
  const deleted = await deleteConfirmedAttendeeAsync(slug, registrationId);

  if (!deleted) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "Confirmed attendee not found." },
      { status: 404 }
    );
  }

  await logAuditEventAsync({
    action: "REGISTRATION_CANCELLED",
    actorRole: role,
    actorIdentifier: "Master Admin",
    ipAddress: getClientIp(request),
    userAgent: request.headers.get("user-agent") || undefined,
    eventSlug: slug,
    details: {
      referenceId: registrationId,
      source: "confirmed_attendees",
    },
  });

  return NextResponse.json({ success: true });
}
