import { NextResponse } from "next/server";
import crypto from "node:crypto";
import QRCode from "qrcode";
import { getAdminRoleFromRequest, isAdminRequestAuthenticated } from "@/lib/auth";
import {
  confirmedAttendeeToRegistrationRecord,
  getConfirmedAttendeesAsync,
  getEventBySlugAsync,
  getRegistrationByReference,
  getRegistrationsAsync,
  getEmailLogsAsync,
  cancelRegistrationAsync,
  deleteRegistrationAsync,
  logAuditEventAsync,
  logEmailRecordAsync,
} from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  sendAttendeePassEmail,
  sendEmail,
  generateAnnouncementEmailHtml,
  sendSpeakerConfirmationEmail,
  type EmailAttachment,
} from "@/lib/email";
import { generatePassPdfBytes } from "@/lib/pass-pdf";
import { formatEventDateRange } from "@/lib/events";
import type { EmailLog } from "@/types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const isAuthenticated = await isAdminRequestAuthenticated(request);
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Admin authorization required." },
        { status: 401 }
      );
    }

    const { slug } = await params;
    const logs = await getEmailLogsAsync(slug);

    return NextResponse.json({ success: true, logs });
  } catch (err) {
    if ((err as { digest?: string })?.digest?.startsWith("NEXT_")) {
      throw err;
    }
    console.error("GET email logs error:", err);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "Failed to load email logs." },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const ip = getClientIp(request);

    // Rate limit: 40 emails / min per IP
    const rate = checkRateLimit(`email:${ip}`, {
      limit: 40,
      windowMs: 60 * 1000,
    });
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: "RATE_LIMITED",
          message: "Too many email requests. Please wait a minute.",
        },
        {
          status: 429,
          headers: { "Retry-After": String(rate.retryAfterSeconds) },
        }
      );
    }

    let body: {
      action?: "send-pass" | "self-send" | "broadcast" | "speaker-confirmation";
      referenceId?: string;
      email?: string;
      subject?: string;
      message?: string;
      audience?: string;
      track?: string;
      includePassLink?: boolean;
      attachPassPdf?: boolean;
      revokePasses?: boolean;
      hardDelete?: boolean;
      recipientRef?: string;
      recipientEmail?: string;
      ctaText?: string;
      ctaUrl?: string;
      speakerName?: string;
      speakerEmail?: string;
      speakerRole?: string;
      ccEmail?: string;
      talkTitle?: string;
      sessionFormat?: string;
      sessionSlot?: string;
      venue?: string;
    };

    try {
      body = (await request.json()) as typeof body;
    } catch {
      return NextResponse.json(
        { error: "INVALID_REQUEST", message: "Invalid JSON payload." },
        { status: 400 }
      );
    }

    const event = await getEventBySlugAsync(slug);
    if (!event) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Event not found." },
        { status: 404 }
      );
    }

    const origin =
      request.headers.get("origin") ||
      request.headers.get("referer")?.replace(/\/$/, "") ||
      "https://gdg-vcet.edu.in";

    // 1. Self-send (attendees requesting their own pass from confirmation screen)
    if (body.action === "self-send") {
      if (!body.referenceId?.trim() || !body.email?.trim()) {
        return NextResponse.json(
          { error: "INVALID_REQUEST", message: "Reference ID and email are required." },
          { status: 400 }
        );
      }

      const targetRefUpper = body.referenceId.trim().toUpperCase();
      const confirmedListSelf = await getConfirmedAttendeesAsync(slug);
      const confirmedMatchSelf = confirmedListSelf.find(
        (a) => a.registrationId.toUpperCase() === targetRefUpper
      );
      const reg = confirmedMatchSelf
        ? confirmedAttendeeToRegistrationRecord(confirmedMatchSelf)
        : getRegistrationByReference(targetRefUpper);
      if (
        !reg ||
        reg.eventSlug !== slug ||
        reg.email.toLowerCase() !== body.email.trim().toLowerCase()
      ) {
        return NextResponse.json(
          { error: "NOT_FOUND", message: "Matching registration not found." },
          { status: 404 }
        );
      }

      if (reg.status && reg.status !== "confirmed") {
        return NextResponse.json(
          {
            error: "NOT_CONFIRMED",
            message:
              reg.status === "pending"
                ? "Your application is still pending host approval. Your pass will be emailed once approved."
                : `Your registration status is currently ${reg.status}.`,
          },
          { status: 403 }
        );
      }

      const result = await sendAttendeePassEmail({
        eventTitle: event.title,
        registration: reg,
        origin,
        sender: "Attendee Self-Service",
      });

      return NextResponse.json({
        success: result.success,
        simulated: result.simulated,
        message: result.message,
      });
    }

    // Admin Auth check for all other admin email actions
    const isAuthenticated = await isAdminRequestAuthenticated(request);
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Admin authorization required." },
        { status: 401 }
      );
    }

    // 2. Admin: Send individual pass
    if (body.action === "send-pass") {
      if (!body.referenceId?.trim()) {
        return NextResponse.json(
          { error: "INVALID_REQUEST", message: "Reference ID is required." },
          { status: 400 }
        );
      }

      const targetRefUpper = body.referenceId.trim().toUpperCase();
      const confirmedListSelf = await getConfirmedAttendeesAsync(slug);
      const confirmedMatchSelf = confirmedListSelf.find(
        (a) => a.registrationId.toUpperCase() === targetRefUpper
      );
      const reg = confirmedMatchSelf
        ? confirmedAttendeeToRegistrationRecord(confirmedMatchSelf)
        : getRegistrationByReference(targetRefUpper);
      if (!reg || reg.eventSlug !== slug) {
        return NextResponse.json(
          { error: "NOT_FOUND", message: "Pass reference not found for this event." },
          { status: 404 }
        );
      }

      if (reg.status && reg.status !== "confirmed") {
        return NextResponse.json(
          {
            error: "NOT_CONFIRMED",
            message: `Cannot email confirmed QR pass while status is "${reg.status}". Approve the registration first.`,
          },
          { status: 400 }
        );
      }

      const result = await sendAttendeePassEmail({
        eventTitle: event.title,
        registration: reg,
        origin,
        sender: "Chapter Organizer",
      });

      return NextResponse.json({
        success: result.success,
        simulated: result.simulated,
        message: result.message,
      });
    }

    // 3. Admin: Broadcast Announcement or Batch Passes
    if (body.action === "broadcast") {
      const role = await getAdminRoleFromRequest(request);
      if (role !== "admin") {
        return NextResponse.json(
          {
            error: "FORBIDDEN",
            message: "Broadcast announcements can only be dispatched by master admin.",
          },
          { status: 403 }
        );
      }

      const subject = body.subject?.trim();
      const message = body.message?.trim();

      if (!subject || !message) {
        return NextResponse.json(
          { error: "INVALID_REQUEST", message: "Subject and message are required for broadcasts." },
          { status: 400 }
        );
      }

      const audience = body.audience || "all";
      const confirmedListBroadcast = await getConfirmedAttendeesAsync(slug);
      const allRegistrations =
        confirmedListBroadcast.length > 0
          ? confirmedListBroadcast.map(confirmedAttendeeToRegistrationRecord)
          : await getRegistrationsAsync(slug);

      // Filter audience
      let recipientsList = allRegistrations.filter((r) => r.status !== "cancelled");

      if (audience.startsWith("ref-")) {
        const targetRef = audience.replace("ref-", "").trim().toUpperCase();
        recipientsList = allRegistrations.filter((r) => r.referenceId.toUpperCase() === targetRef);
      } else if (body.recipientRef) {
        const targetRef = body.recipientRef.trim().toUpperCase();
        recipientsList = allRegistrations.filter((r) => r.referenceId.toUpperCase() === targetRef);
      } else if (body.recipientEmail) {
        const targetEmail = body.recipientEmail.trim().toLowerCase();
        recipientsList = allRegistrations.filter(
          (r) => r.email.toLowerCase() === targetEmail
        );
      } else if (audience === "year-1" || audience === "1st-year") {
        recipientsList = recipientsList.filter(
          (r) => r.yearOfStudy === "1st Year" || r.yearOfStudy?.includes("1")
        );
      } else if (audience === "year-2" || audience === "2nd-year") {
        recipientsList = recipientsList.filter(
          (r) => r.yearOfStudy === "2nd Year" || r.yearOfStudy?.includes("2")
        );
      } else if (audience === "year-3" || audience === "3rd-year") {
        recipientsList = recipientsList.filter(
          (r) => r.yearOfStudy === "3rd Year" || r.yearOfStudy?.includes("3")
        );
      } else if (audience === "year-4" || audience === "4th-year") {
        recipientsList = recipientsList.filter(
          (r) => r.yearOfStudy === "4th Year" || r.yearOfStudy?.includes("4")
        );
      } else if (audience.startsWith("day-")) {
        const dayNum = parseInt(audience.replace("day-", ""), 10);
        recipientsList = recipientsList.filter(
          (r) => r.checkedInDays?.includes(dayNum) || (dayNum === 1 && r.checkedIn)
        );
      } else if (audience === "absent") {
        recipientsList = recipientsList.filter(
          (r) => !r.checkedIn && (!r.checkedInDays || r.checkedInDays.length === 0)
        );
      } else if (audience === "track" && body.track && body.track !== "all") {
        recipientsList = recipientsList.filter((r) => r.track === body.track);
      } else if (audience === "all-days") {
        recipientsList = recipientsList.filter(
          (r) => (r.checkedInDays?.length || 0) >= 4
        );
      }

      if (recipientsList.length === 0) {
        return NextResponse.json(
          { error: "NO_RECIPIENTS", message: "No attendees found matching the selected audience." },
          { status: 400 }
        );
      }

      // If requested, revoke/cancel passes in database and release seats
      if (body.revokePasses) {
        for (const recipient of recipientsList) {
          try {
            if (body.hardDelete) {
              await deleteRegistrationAsync(recipient.referenceId);
            } else {
              await cancelRegistrationAsync(recipient.referenceId);
            }
            await logAuditEventAsync({
              action: "REGISTRATION_CANCELLED",
              actorRole: "admin",
              actorIdentifier: "dev@admin26",
              eventSlug: slug,
              details: {
                referenceId: recipient.referenceId,
                fullName: recipient.fullName,
                email: recipient.email,
                yearOfStudy: recipient.yearOfStudy,
                mode: body.hardDelete ? "hard-deleted" : "pass-cancelled",
                reason: "Pass revoked via broadcast email due to lack of departmental permission",
              },
            });
          } catch (cancelErr) {
            console.warn("Failed to cancel pass for", recipient.referenceId, cancelErr);
          }
        }
      }

      let simulatedCount = 0;
      let sentCount = 0;
      let errorCount = 0;

      const datesText = formatEventDateRange(event);
      const venueText =
        event.location ||
        event.workshop?.venueText ||
        "Vidyavardhini's College of Engineering and Technology, Vasai";

      // Dispatch announcement emails
      for (const recipient of recipientsList) {
        let attachments: EmailAttachment[] | undefined;
        if (body.attachPassPdf) {
          try {
            const [pdfBytes, qrBuffer] = await Promise.all([
              generatePassPdfBytes({
                eventTitle: event.title,
                datesText,
                venueText,
                registration: recipient,
              }),
              QRCode.toBuffer(recipient.referenceId, {
                width: 280,
                margin: 1,
                color: { dark: "#1A1B1E", light: "#FFFFFF" },
              }),
            ]);
            attachments = [
              {
                filename: "pass-qr.png",
                content: qrBuffer,
                contentType: "image/png",
                cid: "attendee-pass-qr",
              },
              {
                filename: `GDG-VCET-Pass-${recipient.referenceId}.pdf`,
                content: pdfBytes,
                contentType: "application/pdf",
              },
            ];
          } catch (attErr) {
            console.warn("Failed to generate pass attachment for", recipient.referenceId, attErr);
          }
        }

        const { html, text } = generateAnnouncementEmailHtml({
          eventTitle: event.title,
          subject,
          message,
          recipientName: recipient.fullName,
          referenceId: body.includePassLink ? recipient.referenceId : undefined,
          eventSlug: slug,
          ctaText: body.ctaText?.trim(),
          ctaUrl: body.ctaUrl?.trim(),
          origin,
          attachPassDetails: body.attachPassPdf
            ? {
                fullName: recipient.fullName,
                referenceId: recipient.referenceId,
                track: recipient.track,
                college: recipient.college,
                datesText,
                venueText,
              }
            : undefined,
        });

        const res = await sendEmail({
          to: recipient.email,
          subject,
          html,
          text,
          attachments,
        });

        if (res.success) {
          if (res.simulated) simulatedCount++;
          else sentCount++;
        } else {
          errorCount++;
        }
      }

      const isSimulated = simulatedCount > 0 && sentCount === 0;

      // Log the broadcast in DB
      const logRecord: EmailLog = {
        id: crypto.randomUUID(),
        eventSlug: slug,
        type: "announcement",
        subject,
        recipientCount: recipientsList.length,
        recipients: recipientsList.slice(0, 20).map((r) => r.email),
        sentAt: new Date().toISOString(),
        status: errorCount > 0 && sentCount === 0 && simulatedCount === 0 ? "failed" : isSimulated ? "simulated" : "sent",
        sender: "Admin Console Broadcast",
        previewText: message.slice(0, 140),
      };

      await logEmailRecordAsync(logRecord);

      await logAuditEventAsync({
        action: "EMAIL_BROADCAST",
        actorRole: role || "admin",
        actorIdentifier: "Master Admin",
        ipAddress: getClientIp(request),
        userAgent: request.headers.get("user-agent") || undefined,
        eventSlug: slug,
        details: {
          subject,
          type: "announcement",
          recipientCount: recipientsList.length,
          simulated: isSimulated,
          status: logRecord.status,
        },
      });

      return NextResponse.json({
        success: true,
        count: recipientsList.length,
        revokedCount: body.revokePasses ? recipientsList.length : 0,
        revokedReferenceIds: body.revokePasses ? recipientsList.map((r) => r.referenceId) : [],
        simulated: isSimulated,
        message: `Successfully broadcasted to ${recipientsList.length} attendees${
          body.revokePasses ? ` (${recipientsList.length} passes cancelled & seats freed)` : ""
        }${isSimulated ? " (Simulated Mode)" : ""}!`,
      });
    }

    // 4. Admin: Speaker Talk Confirmation Email
    if (body.action === "speaker-confirmation") {
      const role = await getAdminRoleFromRequest(request);
      if (role !== "admin") {
        return NextResponse.json(
          {
            error: "FORBIDDEN",
            message: "Speaker confirmation emails can only be dispatched by master admin.",
          },
          { status: 403 }
        );
      }

      const speakerName = body.speakerName?.trim();
      const speakerEmail = body.speakerEmail?.trim();
      const ccEmail = body.ccEmail?.trim();
      const talkTitle = body.talkTitle?.trim();
      const subject = body.subject?.trim();
      const message = body.message?.trim();
      const ctaUrl = body.ctaUrl?.trim();

      const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

      if (!speakerName || !speakerEmail || !talkTitle || !subject || !message) {
        return NextResponse.json(
          {
            error: "INVALID_REQUEST",
            message: "Speaker name, email, confirmed talk title, subject, and message are required.",
          },
          { status: 400 }
        );
      }

      if (!emailRegex.test(speakerEmail)) {
        return NextResponse.json(
          { error: "INVALID_REQUEST", message: "Please provide a valid speaker email address." },
          { status: 400 }
        );
      }

      if (ccEmail && !emailRegex.test(ccEmail)) {
        return NextResponse.json(
          { error: "INVALID_REQUEST", message: "Please provide a valid CC email address." },
          { status: 400 }
        );
      }

      if (ctaUrl && !/^https?:\/\//i.test(ctaUrl)) {
        return NextResponse.json(
          { error: "INVALID_REQUEST", message: "Action URL must start with http:// or https://." },
          { status: 400 }
        );
      }

      const result = await sendSpeakerConfirmationEmail({
        eventTitle: event.title,
        eventSlug: slug,
        speakerName,
        speakerEmail,
        speakerRole: body.speakerRole?.trim(),
        ccEmail,
        talkTitle,
        sessionFormat: body.sessionFormat?.trim() || "Technical Session",
        sessionSlot: body.sessionSlot?.trim() || "Schedule TBD",
        venue:
          body.venue?.trim() ||
          event.location ||
          "Vidyavardhini's College of Engineering and Technology, Vasai",
        subject,
        message,
        ctaText: body.ctaText?.trim(),
        ctaUrl,
        sender: "Speaker Relations (Master Admin)",
      });

      if (!result.success) {
        return NextResponse.json(
          { error: "EMAIL_FAILED", message: result.message },
          { status: 502 }
        );
      }

      await logAuditEventAsync({
        action: "SPEAKER_CONFIRMATION_SENT",
        actorRole: role || "admin",
        actorIdentifier: "Master Admin",
        ipAddress: getClientIp(request),
        userAgent: request.headers.get("user-agent") || undefined,
        eventSlug: slug,
        details: {
          speakerName,
          speakerEmail,
          ...(ccEmail ? { ccEmail } : {}),
          talkTitle,
          sessionFormat: body.sessionFormat?.trim() || "Technical Session",
          sessionSlot: body.sessionSlot?.trim() || "Schedule TBD",
          subject,
          simulated: Boolean(result.simulated),
        },
      });

      return NextResponse.json({
        success: true,
        simulated: result.simulated,
        log: result.log,
        message: result.message,
      });
    }

    return NextResponse.json(
      { error: "INVALID_ACTION", message: "Unsupported email action." },
      { status: 400 }
    );
  } catch (err) {
    if ((err as { digest?: string })?.digest?.startsWith("NEXT_")) {
      throw err;
    }
    console.error("Email API error:", err);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "Failed to process email request." },
      { status: 500 }
    );
  }
}
