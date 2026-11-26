import { NextResponse } from "next/server";
import { getAdminRoleFromRequest } from "@/lib/auth";
import {
  createRegistrationAsync,
  getEventBySlugAsync,
  getRegistrationsPaginatedAsync,
  logAuditEventAsync,
  reviewRegistrationAsync,
} from "@/lib/db";
import { sendRegistrationDecisionEmail } from "@/lib/email";
import { getClientIp } from "@/lib/rate-limit";
import type { RegistrationInput, RegistrationRecord } from "@/types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const role = await getAdminRoleFromRequest(request);
    if (!role) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Admin authorization required." },
        { status: 401 }
      );
    }

    const { slug } = await params;
    const url = new URL(request.url);

    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
    const pageSize = Math.min(2000, Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "50", 10)));
    const status = url.searchParams.get("status") ?? "confirmed";
    const track = url.searchParams.get("track") ?? "all";
    const checkedIn = url.searchParams.get("checkedIn") ?? "all";
    const search = url.searchParams.get("search") ?? "";
    const department = url.searchParams.get("department") ?? "all";
    const yearOfStudy = url.searchParams.get("yearOfStudy") ?? "all";

    const result = await getRegistrationsPaginatedAsync(slug, {
      page,
      pageSize,
      status,
      track,
      checkedIn,
      search,
      department,
      yearOfStudy,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error("GET paginated registrations error:", err);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "Failed to load registrations." },
      { status: 500 }
    );
  }
}


export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const role = await getAdminRoleFromRequest(request);
    if (!role) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Admin authorization required." },
        { status: 401 }
      );
    }

    if (role !== "admin") {
      return NextResponse.json(
        {
          error: "FORBIDDEN",
          message: "Adding walk-in attendees directly is restricted to Master Admin.",
        },
        { status: 403 }
      );
    }

    const { slug } = await params;

    let body: Partial<RegistrationInput>;
    try {
      body = (await request.json()) as Partial<RegistrationInput>;
    } catch {
      return NextResponse.json(
        { error: "INVALID_REQUEST", message: "Invalid JSON payload." },
        { status: 400 }
      );
    }

    if (!body?.fullName?.trim() || !body?.email?.trim()) {
      return NextResponse.json(
        { error: "INVALID_INPUT", message: "Full name and email are required." },
        { status: 400 }
      );
    }

    const result = await createRegistrationAsync(
      slug,
      {
        fullName: body.fullName.trim(),
        email: body.email.trim(),
        phone: body.phone?.trim() || "0000000000",
        college: body.college?.trim() || "VCET",
        department: body.department?.trim() || "Computer Engineering",
        yearOfStudy: body.yearOfStudy?.trim() || "2nd Year (SE)",
        track: body.track?.trim() || "4-Day All-Access",
        experienceLevel: body.experienceLevel?.trim() || "Beginner",
        portfolioUrl: body.portfolioUrl?.trim() || undefined,
        notes: body.notes?.trim() || "Added manually via Admin Console",
        agreedToCoc: true,
      },
      { forceConfirmed: true }
    );

    if (!result.success) {
      return NextResponse.json(
        {
          error: "CREATE_FAILED",
          message: result.error || "Failed to register attendee.",
        },
        { status: 400 }
      );
    }

    await logAuditEventAsync({
      action: "REGISTRATION_CREATED",
      actorRole: role,
      actorIdentifier: "Master Admin (Walk-in)",
      ipAddress: getClientIp(request),
      userAgent: request.headers.get("user-agent") || undefined,
      eventSlug: slug,
      details: {
        referenceId: result.registration.referenceId,
        fullName: result.registration.fullName,
        email: result.registration.email,
        source: "admin_manual_add",
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Attendee added to roster.",
        registration: result.registration,
        referenceId: result.registration.referenceId,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Admin POST attendee registration error:", err);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "Failed to add attendee." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const role = await getAdminRoleFromRequest(request);
    if (!role) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Admin authorization required." },
        { status: 401 }
      );
    }

    if (role !== "admin") {
      return NextResponse.json(
        {
          error: "FORBIDDEN",
          message: "Bulk approval decisions are restricted to Master Admin.",
        },
        { status: 403 }
      );
    }

    const { slug } = await params;

    let body: {
      referenceIds?: string[];
      decision?: "approve" | "decline" | "waitlist";
      notify?: boolean;
      force?: boolean;
    };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return NextResponse.json(
        { error: "INVALID_REQUEST", message: "Invalid JSON payload." },
        { status: 400 }
      );
    }

    if (
      !Array.isArray(body?.referenceIds) ||
      body.referenceIds.length === 0 ||
      (body.decision !== "approve" &&
        body.decision !== "decline" &&
        body.decision !== "waitlist")
    ) {
      return NextResponse.json(
        {
          error: "INVALID_INPUT",
          message: "Provide referenceIds array and valid decision (approve, decline, waitlist).",
        },
        { status: 400 }
      );
    }

    const decision = body.decision;
    const shouldNotify = body.notify ?? decision === "approve";
    const event = await getEventBySlugAsync(slug).catch(() => null);
    const origin = request.headers.get("origin") || undefined;

    const updatedRegistrations: RegistrationRecord[] = [];
    const failed: { referenceId: string; message: string }[] = [];

    for (const rawRef of body.referenceIds) {
      const res = await reviewRegistrationAsync(slug, rawRef, decision, {
        force: Boolean(body.force),
      });

      if (!res.success || !res.registration) {
        failed.push({ referenceId: rawRef, message: res.message });
        continue;
      }

      updatedRegistrations.push(res.registration);

      if (shouldNotify && res.previousStatus !== res.registration.status) {
        try {
          await sendRegistrationDecisionEmail({
            eventTitle: event?.title || slug,
            registration: res.registration,
            decision,
            origin,
          });
        } catch {
          // non-fatal email delivery failure
        }
      }
    }

    await logAuditEventAsync({
      action:
        decision === "approve"
          ? "REGISTRATION_APPROVED"
          : decision === "decline"
            ? "REGISTRATION_DECLINED"
            : "REGISTRATION_UPDATED",
      actorRole: role,
      actorIdentifier: "Master Admin (Bulk Review)",
      ipAddress: getClientIp(request),
      userAgent: request.headers.get("user-agent") || undefined,
      eventSlug: slug,
      details: {
        decision,
        approvedCount: updatedRegistrations.length,
        failedCount: failed.length,
        referenceIds: updatedRegistrations.map((r) => r.referenceId),
      },
    });

    if (updatedRegistrations.length === 0 && failed.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "BULK_REVIEW_FAILED",
          message: failed[0].message,
          failed,
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${decision === "approve" ? "Approved" : decision === "decline" ? "Declined" : "Waitlisted"} ${updatedRegistrations.length} applicant(s)${
        failed.length > 0 ? ` (${failed.length} skipped)` : ""
      }.`,
      registrations: updatedRegistrations,
      failed,
    });
  } catch (err) {
    console.error("Admin PATCH bulk registration review error:", err);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "Failed to process bulk review." },
      { status: 500 }
    );
  }
}
