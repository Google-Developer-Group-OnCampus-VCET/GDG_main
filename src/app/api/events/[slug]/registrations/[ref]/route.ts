import { NextResponse } from "next/server";
import { getAdminRoleFromRequest } from "@/lib/auth";
import {
  cancelRegistrationAsync,
  deleteRegistrationAsync,
  getEventBySlugAsync,
  logAuditEventAsync,
  reviewRegistrationAsync,
  revokeCheckInAttendeeAsync,
  updateRegistrationAsync,
} from "@/lib/db";
import { sendRegistrationDecisionEmail } from "@/lib/email";
import { getClientIp } from "@/lib/rate-limit";
import type { RegistrationUpdateInput } from "@/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string; ref: string }> }
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
          message: "Modifying attendee records or revoking check-ins is restricted to Master Admin.",
        },
        { status: 403 }
      );
    }

    const { slug, ref } = await params;
    const referenceId = decodeURIComponent(ref);

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { error: "INVALID_REQUEST", message: "Invalid JSON payload." },
        { status: 400 }
      );
    }

    // Mode 1: Undo / Revoke day check-in
    if (typeof body.undoCheckInDay === "number") {
      const day = Math.floor(body.undoCheckInDay);
      if (day < 1 || day > 4) {
        return NextResponse.json(
          { error: "INVALID_INPUT", message: "undoCheckInDay must be between 1 and 4." },
          { status: 400 }
        );
      }

      const revokeResult = await revokeCheckInAttendeeAsync(slug, referenceId, day);
      if (!revokeResult.success) {
        return NextResponse.json(
          { error: "REVOKE_FAILED", message: revokeResult.message },
          { status: revokeResult.message.includes("not found") ? 404 : 400 }
        );
      }

      await logAuditEventAsync({
        action: "CHECK_IN_REVOKED",
        actorRole: role,
        actorIdentifier: "Master Admin",
        ipAddress: getClientIp(request),
        userAgent: request.headers.get("user-agent") || undefined,
        eventSlug: slug,
        details: { referenceId, day },
      });

      return NextResponse.json({
        success: true,
        message: revokeResult.message,
        registration: revokeResult.registration,
      });
    }

    // Mode 1.5: Host Approval Decision ("approve" | "decline" | "waitlist")
    if (
      body.decision === "approve" ||
      body.decision === "decline" ||
      body.decision === "waitlist"
    ) {
      const decision = body.decision;
      const reviewRes = await reviewRegistrationAsync(slug, referenceId, decision, {
        force: Boolean(body.force),
      });

      if (!reviewRes.success || !reviewRes.registration) {
        const status =
          reviewRes.code === "NOT_FOUND"
            ? 404
            : reviewRes.code === "CAPACITY_FULL"
              ? 409
              : 400;
        return NextResponse.json(
          { error: reviewRes.code || "REVIEW_FAILED", message: reviewRes.message },
          { status }
        );
      }

      const shouldNotify =
        typeof body.notify === "boolean" ? body.notify : decision === "approve";
      let emailNotice = "";

      if (shouldNotify && reviewRes.previousStatus !== reviewRes.registration.status) {
        try {
          const ev = await getEventBySlugAsync(slug).catch(() => null);
          const mailRes = await sendRegistrationDecisionEmail({
            eventTitle: ev?.title || slug,
            registration: reviewRes.registration,
            decision,
            origin: request.headers.get("origin") || undefined,
          });
          if (mailRes.success) {
            emailNotice =
              decision === "approve"
                ? " & emailed official QR pass"
                : " & emailed status notification";
          }
        } catch {
          // email failure shouldn't undo saved status
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
        actorIdentifier: "Master Admin",
        ipAddress: getClientIp(request),
        userAgent: request.headers.get("user-agent") || undefined,
        eventSlug: slug,
        details: {
          referenceId,
          decision,
          previousStatus: reviewRes.previousStatus,
          newStatus: reviewRes.registration.status,
        },
      });

      return NextResponse.json({
        success: true,
        message: `${reviewRes.message}${emailNotice}`,
        registration: reviewRes.registration,
      });
    }

    // Mode 2: Update attendee details / status
    const updates: RegistrationUpdateInput = {};
    const stringFields = [
      "fullName",
      "email",
      "phone",
      "college",
      "department",
      "yearOfStudy",
      "track",
      "experienceLevel",
      "portfolioUrl",
      "notes",
    ] as const;

    for (const key of stringFields) {
      if (typeof body[key] === "string") {
        updates[key] = body[key] as string;
      }
    }

    if (
      body.status === "pending" ||
      body.status === "confirmed" ||
      body.status === "waitlisted" ||
      body.status === "declined" ||
      body.status === "cancelled"
    ) {
      updates.status = body.status;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "INVALID_INPUT", message: "No valid attendee fields provided to update." },
        { status: 400 }
      );
    }

    const result = await updateRegistrationAsync(slug, referenceId, updates);
    if (!result.success) {
      return NextResponse.json(
        { error: "UPDATE_FAILED", message: result.message },
        { status: result.message.includes("not found") ? 404 : 400 }
      );
    }

    await logAuditEventAsync({
      action: "REGISTRATION_UPDATED",
      actorRole: role,
      actorIdentifier: "Master Admin",
      ipAddress: getClientIp(request),
      userAgent: request.headers.get("user-agent") || undefined,
      eventSlug: slug,
      details: { referenceId, updatedFields: Object.keys(updates) },
    });

    return NextResponse.json({
      success: true,
      message: result.message,
      registration: result.registration,
    });
  } catch (err) {
    console.error("Admin PATCH registration error:", err);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "Failed to update attendee record." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string; ref: string }> }
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
          message: "Cancelling or deleting registrations is restricted to Master Admin.",
        },
        { status: 403 }
      );
    }

    const { slug, ref } = await params;
    const referenceId = decodeURIComponent(ref);
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode") === "hard" ? "hard" : "cancel";

    const ok =
      mode === "hard"
        ? await deleteRegistrationAsync(referenceId)
        : await cancelRegistrationAsync(referenceId);

    if (!ok) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Registration record not found." },
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
      details: { referenceId, mode },
    });

    return NextResponse.json({
      success: true,
      mode,
      message:
        mode === "hard"
          ? `Registration ${referenceId} permanently deleted.`
          : `Registration ${referenceId} cancelled.`,
    });
  } catch (err) {
    console.error("Admin DELETE registration error:", err);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "Failed to process registration removal." },
      { status: 500 }
    );
  }
}
