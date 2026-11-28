import { NextResponse } from "next/server";
import { getAdminRoleFromRequest } from "@/lib/auth";
import {
  computeConfirmedAttendeeStats,
  createConfirmedAttendeeAsync,
  getConfirmedAttendeesAsync,
  getFirestoreConfirmedAttendeesMeta,
  logAuditEventAsync,
  syncFirestoreConfirmedAttendeesMeta,
} from "@/lib/db";
import { getClientIp } from "@/lib/rate-limit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const role = await getAdminRoleFromRequest(request);
  if (!role) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "Admin authorization required." },
      { status: 401 }
    );
  }

  const { slug } = await params;
  const url = new URL(request.url);
  const clientVersion = Number(url.searchParams.get("version") || 0);

  // 1-doc version check (cached 30s): avoids reading all 126 docs on idle polls
  let meta = await getFirestoreConfirmedAttendeesMeta(slug);
  if (meta && clientVersion > 0 && meta.version === clientVersion) {
    return NextResponse.json(
      {
        success: true,
        unchanged: true,
        version: meta.version,
      },
      {
        headers: {
          "Cache-Control": "private, max-age=5, stale-while-revalidate=15",
        },
      }
    );
  }

  const attendees = await getConfirmedAttendeesAsync(slug);
  if (!meta) {
    // Self-heal: persist meta document so subsequent polls do a 1-doc version check
    await syncFirestoreConfirmedAttendeesMeta(slug, attendees);
    meta = await getFirestoreConfirmedAttendeesMeta(slug);
  }
  const stats = computeConfirmedAttendeeStats(attendees);

  return NextResponse.json(
    {
      success: true,
      version: meta?.version ?? Date.now(),
      attendees,
      stats,
    },
    {
      headers: {
        "Cache-Control": "private, max-age=5, stale-while-revalidate=15",
      },
    }
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const role = await getAdminRoleFromRequest(request);
  if (!role || (role !== "admin" && role !== "core" && role !== "volunteer")) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "Admin, core, or volunteer authorization required." },
      { status: 401 }
    );
  }

  const { slug } = await params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json(
      { error: "INVALID_INPUT", message: "Request body is required." },
      { status: 400 }
    );
  }

  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!fullName) {
    return NextResponse.json(
      { error: "INVALID_INPUT", message: "Participant full name is required." },
      { status: 400 }
    );
  }

  if (!email || !email.includes("@")) {
    return NextResponse.json(
      { error: "INVALID_INPUT", message: "A valid email address is required." },
      { status: 400 }
    );
  }

  const attendee = await createConfirmedAttendeeAsync(slug, {
    fullName,
    email,
    phone: typeof body.phone === "string" ? body.phone.trim() : "",
    college: typeof body.college === "string" ? body.college.trim() : undefined,
    department: typeof body.department === "string" ? body.department.trim() : undefined,
    yearOfStudy: typeof body.yearOfStudy === "string" ? body.yearOfStudy.trim() : undefined,
    track: typeof body.track === "string" ? body.track.trim() : undefined,
    experienceLevel: typeof body.experienceLevel === "string" ? body.experienceLevel.trim() : undefined,
    portfolioUrl: typeof body.portfolioUrl === "string" ? body.portfolioUrl.trim() : undefined,
    confirmationSource:
      typeof body.confirmationSource === "string" && body.confirmationSource.trim()
        ? body.confirmationSource.trim()
        : "Walk-in Desk",
    registrationSource:
      typeof body.registrationSource === "string" && body.registrationSource.trim()
        ? body.registrationSource.trim()
        : "Desk Registration",
    notes: typeof body.notes === "string" ? body.notes.trim() : undefined,
    registrationId:
      typeof body.registrationId === "string" && body.registrationId.trim()
        ? body.registrationId.trim()
        : undefined,
    checkedIn: Boolean(body.checkedIn),
    checkedInDays: Array.isArray(body.checkedInDays)
      ? body.checkedInDays
          .map(Number)
          .filter((n) => Number.isInteger(n) && n >= 1 && n <= 4)
      : body.checkedIn
        ? [1]
        : [],
  });

  await logAuditEventAsync({
    action: "REGISTRATION_CREATED",
    actorRole: role,
    actorIdentifier:
      role === "admin"
        ? "Master Admin"
        : role === "core"
          ? "Core Member"
          : "Volunteer Desk",
    ipAddress: getClientIp(request),
    userAgent: request.headers.get("user-agent") || undefined,
    eventSlug: slug,
    details: {
      referenceId: attendee.registrationId,
      attendeeName: attendee.fullName,
      attendeeEmail: attendee.email,
      source: attendee.confirmationSource,
      checkedInDays: attendee.checkedInDays,
      srNo: attendee.srNo,
    },
  });

  return NextResponse.json({ success: true, attendee }, { status: 201 });
}
