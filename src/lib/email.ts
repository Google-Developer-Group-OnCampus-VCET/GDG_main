import crypto from "node:crypto";
import nodemailer from "nodemailer";
import type { RegistrationRecord, EmailLog } from "@/types";
import { getEventBySlugAsync, logEmailRecordAsync } from "@/lib/db";

export interface SendEmailPayload {
  to: string | string[];
  cc?: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface SendEmailResult {
  success: boolean;
  simulated?: boolean;
  messageId?: string;
  error?: string;
}

export const CHAPTER_OFFICIAL_EMAIL = "vcet_gdg@vcet.edu.in";
export const CHAPTER_FROM_SENDER = `GDG on Campus VCET <${CHAPTER_OFFICIAL_EMAIL}>`;

/**
 * Sends an email using:
 * 1. Google Workspace / Gmail SMTP via vcet_gdg@vcet.edu.in (when SMTP_PASS or GMAIL_APP_PASSWORD is set)
 * 2. Resend API (when RESEND_API_KEY is configured)
 * 3. Simulated Dev Mode (gracefully logs and saves records when no external credentials are set)
 */
export async function sendEmail(payload: SendEmailPayload): Promise<SendEmailResult> {
  const recipients = Array.isArray(payload.to) ? payload.to : [payload.to];
  const fromEmail = process.env.EMAIL_FROM?.trim() || CHAPTER_FROM_SENDER;
  const replyTo = payload.replyTo || CHAPTER_OFFICIAL_EMAIL;

  // 1. Check for Google Workspace / Gmail SMTP
  const smtpPass = process.env.SMTP_PASS?.trim() || process.env.GMAIL_APP_PASSWORD?.trim();
  const smtpUser = process.env.SMTP_USER?.trim() || CHAPTER_OFFICIAL_EMAIL;
  const smtpHost = process.env.SMTP_HOST?.trim() || "smtp.gmail.com";
  const smtpPort = Number(process.env.SMTP_PORT) || 465;

  if (smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const info = await transporter.sendMail({
        from: fromEmail,
        to: recipients,
        ...(payload.cc ? { cc: payload.cc } : {}),
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        replyTo,
      });

      return { success: true, messageId: info.messageId };
    } catch (err) {
      console.error("SMTP error sending email via Google Workspace:", err);
      return { success: false, error: (err as Error).message };
    }
  }

  // 2. Check for Resend API
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (apiKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: recipients,
          ...(payload.cc ? { cc: Array.isArray(payload.cc) ? payload.cc : [payload.cc] } : {}),
          subject: payload.subject,
          html: payload.html,
          text: payload.text,
          reply_to: replyTo,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Resend API error:", errorText);
        return { success: false, error: `Email dispatch failed: ${errorText}` };
      }

      const data = (await res.json()) as { id?: string };
      return { success: true, messageId: data.id || crypto.randomUUID() };
    } catch (err) {
      console.error("Network error sending email via Resend:", err);
      return { success: false, error: (err as Error).message };
    }
  }

  // 3. Simulated Mode (when no external credentials are configured yet)
  console.log(`[SIMULATED EMAIL DISPATCH] From: ${fromEmail} | To: ${recipients.join(", ")} | Subject: ${payload.subject}`);
  return {
    success: true,
    simulated: true,
    messageId: `sim_${crypto.randomUUID().slice(0, 8)}`,
  };
}

/**
 * Generates responsive, GDG-branded HTML for official attendee entry pass
 */
export function generatePassEmailHtml(options: {
  eventTitle: string;
  registration: RegistrationRecord;
  datesText?: string;
  venueText?: string;
  origin?: string;
}): { subject: string; html: string; text: string } {
  const {
    eventTitle,
    registration,
    datesText = "Dec 1–4, 2026",
    venueText = "Vidyavardhini's College of Engineering and Technology, Vasai (Seminar Hall & Labs)",
    origin = "https://gdg-vcet.edu.in",
  } = options;

  const subject = `Your Official Pass: ${eventTitle} · #${registration.referenceId}`;
  const passUrl = `${origin}/events/${registration.eventSlug}/register?ref=${registration.referenceId}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
    registration.referenceId
  )}&color=0f172a&bgcolor=ffffff&margin=1`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px 12px; color: #1e293b; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .color-bar { height: 6px; width: 100%; display: table; }
    .color-bar div { display: table-cell; height: 6px; width: 25%; }
    .c-blue { background-color: #4285F4; }
    .c-red { background-color: #EA4335; }
    .c-yellow { background-color: #FBBC04; }
    .c-green { background-color: #34A853; }
    .content { padding: 32px 28px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; background-color: #eff6ff; color: #2563eb; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    .title { font-size: 24px; font-weight: 800; color: #0f172a; margin: 12px 0 6px 0; line-height: 1.25; }
    .subtitle { font-size: 13px; color: #64748b; margin-bottom: 24px; }
    .pass-card { border: 2px dashed #cbd5e1; border-radius: 14px; background-color: #f8fafc; padding: 20px; text-align: center; margin-bottom: 24px; }
    .ref-id { font-family: monospace; font-size: 20px; font-weight: 800; letter-spacing: 1px; color: #0f172a; background: #ffffff; border: 1px solid #cbd5e1; display: inline-block; padding: 6px 16px; border-radius: 8px; margin: 8px 0; }
    .qr-box { margin: 16px auto; width: 160px; height: 160px; background: #ffffff; padding: 10px; border-radius: 12px; border: 1px solid #e2e8f0; }
    .qr-img { width: 100%; height: 100%; display: block; }
    .pass-notice { font-size: 11px; font-weight: 700; color: #059669; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 6px; }
    .details-table { width: 100%; border-collapse: collapse; margin-top: 16px; text-align: left; font-size: 13px; }
    .details-table td { padding: 8px 12px; border-top: 1px solid #e2e8f0; }
    .details-label { color: #64748b; font-weight: 600; width: 35%; }
    .details-value { color: #0f172a; font-weight: 700; }
    .cta-btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 700; font-size: 14px; margin: 16px 0; }
    .footer { padding: 20px 28px; background-color: #f1f5f9; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="color-bar">
      <div class="c-blue"></div>
      <div class="c-red"></div>
      <div class="c-yellow"></div>
      <div class="c-green"></div>
    </div>
    <div class="content">
      <span class="badge">Google Developer Groups on Campus · VCET</span>
      <h1 class="title">${eventTitle}</h1>
      <p class="subtitle">Official 4-Day Workshop Admission Pass &middot; Dec 1–4, 2026</p>

      <p style="font-size: 14px; line-height: 1.5; color: #334155;">
        Hi <strong>${registration.fullName}</strong>,<br>
        Your seat has been officially reserved for <strong>${eventTitle}</strong>. Below is your scannable event entry pass.
      </p>

      <div class="pass-card">
        <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Pass Reference ID</div>
        <div class="ref-id">#${registration.referenceId}</div>

        <div class="qr-box">
          <img class="qr-img" src="${qrUrl}" alt="Pass QR Code #${registration.referenceId}" />
        </div>
        <div class="pass-notice">✓ Valid for All 4 Days (Dec 1–4, 2026)</div>
        <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Show this QR code at the check-in desk each day.</div>

        <table class="details-table">
          <tr>
            <td class="details-label">Attendee</td>
            <td class="details-value">${registration.fullName}</td>
          </tr>
          <tr>
            <td class="details-label">Assigned Track</td>
            <td class="details-value">${registration.track || "General Admission"}</td>
          </tr>
          <tr>
            <td class="details-label">Dates & Times</td>
            <td class="details-value">${datesText} (10:00 AM – 02:00 PM IST)</td>
          </tr>
          <tr>
            <td class="details-label">Location</td>
            <td class="details-value">${venueText}</td>
          </tr>
          <tr>
            <td class="details-label">Academic</td>
            <td class="details-value">${registration.department} · ${registration.yearOfStudy}</td>
          </tr>
        </table>
      </div>

      <div style="text-align: center;">
        <a href="${passUrl}" class="cta-btn" target="_blank">View Live Pass &amp; Download PDF</a>
      </div>

      <div style="margin-top: 24px; padding: 16px; background-color: #eff6ff; border-radius: 10px; border: 1px solid #bfdbfe; font-size: 12px; color: #1e40af;">
        <strong>4-Day Checklist:</strong> Please bring your college ID card, your personal laptop, and charger. Attendees completing all 4 days will receive an official GDG on Campus Completion Certificate!
      </div>
    </div>

    <div class="footer">
      Google Developer Groups on Campus &middot; Vidyavardhini's College of Engineering and Technology<br>
      K.T. Marg, Vasai West, Maharashtra 401202 &middot; Questions? Contact <a href="mailto:vcet_gdg@vcet.edu.in" style="color: #2563eb;">vcet_gdg@vcet.edu.in</a>
    </div>
  </div>
</body>
</html>`;

  const text = `Google Developer Groups on Campus VCET - Event Pass
======================================================
Event: ${eventTitle}
Dates: ${datesText} (10:00 AM – 02:00 PM IST)
Location: ${venueText}

Attendee: ${registration.fullName}
Pass Reference ID: #${registration.referenceId}
Track: ${registration.track || "General Admission"}
Department: ${registration.department} (${registration.yearOfStudy})

**VALID FOR ALL 4 DAYS (Dec 1–4, 2026)**
Show this pass reference at the check-in desk each morning.

View / Download your Pass:
${passUrl}

Questions? Email vcet_gdg@vcet.edu.in`;

  return { subject, html, text };
}

/**
 * Generates responsive, GDG-branded HTML for broadcast announcements and updates
 */
export function generateAnnouncementEmailHtml(options: {
  eventTitle: string;
  subject: string;
  message: string;
  recipientName?: string;
  referenceId?: string;
  eventSlug?: string;
  ctaText?: string;
  ctaUrl?: string;
  origin?: string;
}): { html: string; text: string } {
  const {
    eventTitle,
    subject,
    message,
    recipientName = "Attendee",
    referenceId,
    eventSlug = "dev-to-cloud",
    ctaText,
    ctaUrl,
    origin = "https://gdg-vcet.edu.in",
  } = options;

  // Convert plain text newlines to clean HTML paragraphs
  const messageHtml = message
    .split(/\n\s*\n/)
    .map((paragraph) => `<p style="margin: 0 0 16px 0; line-height: 1.6;">${paragraph.replace(/\n/g, "<br>")}</p>`)
    .join("");

  const passUrl = referenceId ? `${origin}/events/${eventSlug}/register?ref=${referenceId}` : undefined;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px 12px; color: #1e293b; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .color-bar { height: 6px; width: 100%; display: table; }
    .color-bar div { display: table-cell; height: 6px; width: 25%; }
    .c-blue { background-color: #4285F4; }
    .c-red { background-color: #EA4335; }
    .c-yellow { background-color: #FBBC04; }
    .c-green { background-color: #34A853; }
    .content { padding: 32px 28px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; background-color: #f1f5f9; color: #475569; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    .title { font-size: 22px; font-weight: 800; color: #0f172a; margin: 12px 0 16px 0; line-height: 1.3; }
    .body-content { font-size: 14px; color: #334155; line-height: 1.6; }
    .cta-btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 700; font-size: 13px; margin: 16px 0; }
    .pass-box { margin-top: 24px; padding: 14px 18px; border-radius: 10px; background-color: #f8fafc; border: 1px solid #cbd5e1; font-size: 12px; color: #475569; }
    .footer { padding: 20px 28px; background-color: #f1f5f9; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="color-bar">
      <div class="c-blue"></div>
      <div class="c-red"></div>
      <div class="c-yellow"></div>
      <div class="c-green"></div>
    </div>
    <div class="content">
      <span class="badge">${eventTitle} · Announcement</span>
      <h1 class="title">${subject}</h1>

      <p style="font-size: 14px; color: #0f172a; font-weight: 600; margin-bottom: 16px;">
        Dear ${recipientName},
      </p>

      <div class="body-content">
        ${messageHtml}
      </div>

      ${
        ctaUrl && ctaText
          ? `<div style="text-align: center; margin: 24px 0;">
              <a href="${ctaUrl}" class="cta-btn" target="_blank">${ctaText}</a>
            </div>`
          : ""
      }

      ${
        passUrl && referenceId
          ? `<div class="pass-box">
              <strong>Your Pass Reference ID:</strong> <span style="font-family: monospace; font-weight: 700; color: #0f172a;">#${referenceId}</span><br>
              <a href="${passUrl}" style="color: #2563eb; font-weight: 600; text-decoration: underline; margin-top: 4px; display: inline-block;">View your official 4-day pass &amp; QR code &rarr;</a>
            </div>`
          : ""
      }
    </div>

    <div class="footer">
      Google Developer Groups on Campus &middot; Vidyavardhini's College of Engineering and Technology<br>
      K.T. Marg, Vasai West, Maharashtra 401202 &middot; <a href="mailto:vcet_gdg@vcet.edu.in" style="color: #2563eb;">vcet_gdg@vcet.edu.in</a>
    </div>
  </div>
</body>
</html>`;

  const text = `${eventTitle} - ${subject}
======================================================
Dear ${recipientName},

${message}

${ctaUrl ? `Link: ${ctaUrl}` : ""}
${passUrl ? `Your Pass: ${passUrl} (ID: #${referenceId})` : ""}

Google Developer Groups on Campus VCET`;

  return { html, text };
}

/**
 * Sends a single attendee their official entry pass email
 */
export async function sendAttendeePassEmail(options: {
  eventTitle: string;
  registration: RegistrationRecord;
  origin?: string;
  sender?: string;
}): Promise<{ success: boolean; simulated?: boolean; message: string }> {
  const { eventTitle, registration, origin, sender } = options;
  const { subject, html, text } = generatePassEmailHtml({
    eventTitle,
    registration,
    origin,
  });

  const sendResult = await sendEmail({
    to: registration.email,
    subject,
    html,
    text,
  });

  const logRecord: EmailLog = {
    id: crypto.randomUUID(),
    eventSlug: registration.eventSlug,
    type: "pass",
    subject,
    recipientCount: 1,
    recipients: [registration.email],
    sentAt: new Date().toISOString(),
    status: sendResult.success ? (sendResult.simulated ? "simulated" : "sent") : "failed",
    sender: sender || "Admin Terminal",
    previewText: `Official pass for ${registration.fullName} (#${registration.referenceId})`,
  };

  await logEmailRecordAsync(logRecord);

  if (!sendResult.success) {
    return { success: false, message: sendResult.error || "Failed to dispatch email." };
  }

  const modeText = sendResult.simulated ? " (Logged in Simulated Mode)" : "";
  return {
    success: true,
    simulated: sendResult.simulated,
    message: `Pass successfully emailed to ${registration.email}${modeText}!`,
  };
}

export async function sendApplicationReceivedEmail(options: {
  eventTitle: string;
  registration: RegistrationRecord;
  origin?: string;
}): Promise<{ success: boolean; simulated?: boolean; message: string }> {
  const { eventTitle, registration } = options;
  const subject = `Application Received (Pending Review): ${eventTitle}`;
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#f8fafc; margin:0; padding:24px 12px; color:#1e293b;">
  <div style="max-width:600px; margin:0 auto; background:#fff; border-radius:16px; overflow:hidden; border:1px solid #e2e8f0;">
    <div style="height:6px; background:linear-gradient(90deg,#4285F4 25%,#EA4335 25% 50%,#FBBC05 50% 75%,#34A853 75%);"></div>
    <div style="padding:28px;">
      <span style="display:inline-block; padding:4px 12px; border-radius:9999px; background:#fffbeb; color:#92400e; border:1px solid #fde68a; font-size:11px; font-weight:700; text-transform:uppercase;">Pending Host Approval</span>
      <h1 style="font-size:22px; font-weight:800; color:#0f172a; margin:12px 0 8px 0;">${escapeHtml(eventTitle)}</h1>
      <p style="font-size:14px; line-height:1.6; color:#334155;">
        Hi <strong>${escapeHtml(registration.fullName)}</strong>,<br><br>
        We have received your registration request for <strong>${escapeHtml(eventTitle)}</strong>. Your application ID is <strong style="font-family:monospace;">#${escapeHtml(registration.referenceId)}</strong>.
      </p>
      <p style="font-size:13px; line-height:1.6; color:#475569; background:#f8fafc; padding:14px; border-radius:10px; border:1px solid #e2e8f0;">
        Because seats for this session require organizer approval, our team will review your application shortly. Once approved, we will email your official scannable QR entry pass.
      </p>
    </div>
    <div style="padding:16px 28px; background:#f1f5f9; border-top:1px solid #e2e8f0; font-size:11px; color:#64748b; text-align:center;">
      Google Developer Groups on Campus &middot; VCET Vasai
    </div>
  </div>
</body>
</html>`;

  const text = `${eventTitle} — Application Received (Pending Review)\n\nHi ${registration.fullName},\nWe received your registration request (#${registration.referenceId}). Our team will review your application and email your official QR entry pass once approved.\n\nGoogle Developer Groups on Campus · VCET`;

  const sendResult = await sendEmail({
    to: registration.email,
    subject,
    html,
    text,
  });

  await logEmailRecordAsync({
    id: crypto.randomUUID(),
    eventSlug: registration.eventSlug,
    type: "announcement",
    subject,
    recipientCount: 1,
    recipients: [registration.email],
    sentAt: new Date().toISOString(),
    status: sendResult.success ? (sendResult.simulated ? "simulated" : "sent") : "failed",
    sender: "Registration Queue",
    previewText: `Application pending notice for ${registration.fullName} (#${registration.referenceId})`,
  });

  return {
    success: sendResult.success,
    simulated: sendResult.simulated,
    message: sendResult.success
      ? `Application receipt sent to ${registration.email}.`
      : sendResult.error || "Failed to send application notice.",
  };
}

export async function sendRegistrationDecisionEmail(options: {
  eventTitle: string;
  registration: RegistrationRecord;
  decision: "approve" | "decline" | "waitlist";
  origin?: string;
}): Promise<{ success: boolean; simulated?: boolean; message: string }> {
  const { eventTitle, registration, decision, origin } = options;

  if (decision === "approve") {
    const ev = await getEventBySlugAsync(registration.eventSlug).catch(() => null);
    const { subject, html, text } = generatePassEmailHtml({
      eventTitle,
      registration,
      datesText: ev?.workshop?.datesText,
      venueText: ev?.location || ev?.workshop?.venueText,
      origin,
    });
    const approvedSubject = `You're Approved! ${subject}`;
    const approvedHtml = html.replace(
      "Your seat has been officially reserved for",
      "Great news — your registration request has been <strong>approved</strong> and your seat is officially reserved for"
    );
    const sendResult = await sendEmail({
      to: registration.email,
      subject: approvedSubject,
      html: approvedHtml,
      text,
    });
    await logEmailRecordAsync({
      id: crypto.randomUUID(),
      eventSlug: registration.eventSlug,
      type: "pass",
      subject: approvedSubject,
      recipientCount: 1,
      recipients: [registration.email],
      sentAt: new Date().toISOString(),
      status: sendResult.success ? (sendResult.simulated ? "simulated" : "sent") : "failed",
      sender: "Host Approval Queue",
      previewText: `Approved QR pass for ${registration.fullName} (#${registration.referenceId})`,
    });
    return {
      success: sendResult.success,
      simulated: sendResult.simulated,
      message: sendResult.success
        ? `Approval pass emailed to ${registration.email}.`
        : sendResult.error || "Failed to email pass.",
    };
  }

  const isWaitlist = decision === "waitlist";
  const subject = isWaitlist
    ? `Waitlist Update: ${eventTitle}`
    : `Registration Update: ${eventTitle}`;
  const statusBadge = isWaitlist ? "Waitlisted" : "Not Selected This Cohort";
  const bodyCopy = isWaitlist
    ? `Thank you for applying to <strong>${escapeHtml(eventTitle)}</strong>. Seats are currently filled, so we have placed your application (#${escapeHtml(registration.referenceId)}) on our waitlist. If a spot opens up, we will approve your registration and email your pass right away.`
    : `Thank you for applying to <strong>${escapeHtml(eventTitle)}</strong>. Unfortunately, due to limited seats in this cohort, we are unable to confirm a spot for your application (#${escapeHtml(registration.referenceId)}) this time. We hope to see you at our upcoming chapter sessions!`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#f8fafc; margin:0; padding:24px 12px; color:#1e293b;">
  <div style="max-width:600px; margin:0 auto; background:#fff; border-radius:16px; overflow:hidden; border:1px solid #e2e8f0;">
    <div style="height:6px; background:linear-gradient(90deg,#4285F4 25%,#EA4335 25% 50%,#FBBC05 50% 75%,#34A853 75%);"></div>
    <div style="padding:28px;">
      <span style="display:inline-block; padding:4px 12px; border-radius:9999px; background:#f1f5f9; color:#334155; font-size:11px; font-weight:700; text-transform:uppercase;">${statusBadge}</span>
      <h1 style="font-size:22px; font-weight:800; color:#0f172a; margin:12px 0 12px 0;">${escapeHtml(eventTitle)}</h1>
      <p style="font-size:14px; line-height:1.6; color:#334155;">Hi <strong>${escapeHtml(registration.fullName)}</strong>,</p>
      <p style="font-size:14px; line-height:1.6; color:#334155;">${bodyCopy}</p>
    </div>
    <div style="padding:16px 28px; background:#f1f5f9; border-top:1px solid #e2e8f0; font-size:11px; color:#64748b; text-align:center;">
      Google Developer Groups on Campus &middot; VCET Vasai
    </div>
  </div>
</body>
</html>`;

  const text = `${eventTitle} — ${statusBadge}\n\nHi ${registration.fullName},\n${
    isWaitlist
      ? "You have been added to the waitlist. We will notify you if a seat opens up."
      : "Unfortunately we could not confirm a seat for this cohort due to limited capacity. Watch out for our upcoming events!"
  }\n\nGoogle Developer Groups on Campus · VCET`;

  const sendResult = await sendEmail({ to: registration.email, subject, html, text });
  await logEmailRecordAsync({
    id: crypto.randomUUID(),
    eventSlug: registration.eventSlug,
    type: "announcement",
    subject,
    recipientCount: 1,
    recipients: [registration.email],
    sentAt: new Date().toISOString(),
    status: sendResult.success ? (sendResult.simulated ? "simulated" : "sent") : "failed",
    sender: "Host Approval Queue",
    previewText: `${decision} notification for ${registration.fullName}`,
  });

  return {
    success: sendResult.success,
    simulated: sendResult.simulated,
    message: sendResult.success
      ? `Notification emailed to ${registration.email}.`
      : sendResult.error || "Failed to send update email.",
  };
}

export interface SpeakerConfirmationEmailOptions {
  eventTitle: string;
  eventSlug?: string;
  speakerName: string;
  speakerEmail: string;
  speakerRole?: string;
  ccEmail?: string;
  talkTitle: string;
  sessionFormat?: string;
  sessionSlot?: string;
  venue?: string;
  subject: string;
  message: string;
  ctaText?: string;
  ctaUrl?: string;
  sender?: string;
}

/**
 * Generates responsive, GDG-branded HTML and plain-text email for confirmed speakers
 */
export function generateSpeakerConfirmationEmailHtml(
  options: SpeakerConfirmationEmailOptions
): { html: string; text: string } {
  const {
    eventTitle,
    speakerName,
    speakerRole,
    talkTitle,
    sessionFormat = "Technical Session",
    sessionSlot = "Schedule TBD",
    venue = "Vidyavardhini's College of Engineering and Technology, Vasai",
    subject,
    message,
    ctaText,
    ctaUrl,
  } = options;

  const safeEventTitle = escapeHtml(eventTitle);
  const safeSubject = escapeHtml(subject);
  const safeSpeakerName = escapeHtml(speakerName);
  const safeSpeakerRole = speakerRole?.trim() ? escapeHtml(speakerRole.trim()) : "";
  const safeTalkTitle = escapeHtml(talkTitle);
  const safeFormat = escapeHtml(sessionFormat);
  const safeSlot = escapeHtml(sessionSlot);
  const safeVenue = escapeHtml(venue);
  const safeCtaText = ctaText?.trim() ? escapeHtml(ctaText.trim()) : "";
  const safeCtaUrl = ctaUrl?.trim() ? escapeHtml(ctaUrl.trim()) : "";

  const messageHtml = message
    .split(/\n\s*\n/)
    .map(
      (paragraph) =>
        `<p style="margin: 0 0 16px 0; line-height: 1.65;">${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeSubject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px 12px; color: #1e293b; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .color-bar { height: 6px; width: 100%; display: table; }
    .color-bar div { display: table-cell; height: 6px; width: 25%; }
    .c-blue { background-color: #4285F4; }
    .c-red { background-color: #EA4335; }
    .c-yellow { background-color: #FBBC04; }
    .c-green { background-color: #34A853; }
    .content { padding: 32px 28px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; background-color: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    .title { font-size: 22px; font-weight: 800; color: #0f172a; margin: 12px 0 16px 0; line-height: 1.3; }
    .body-content { font-size: 14px; color: #334155; line-height: 1.65; }
    .session-card { margin: 22px 0; border-radius: 14px; border: 1px solid #cbd5e1; background-color: #f8fafc; overflow: hidden; }
    .session-card-head { padding: 12px 16px; background-color: #eff6ff; border-bottom: 1px solid #dbeafe; font-size: 11px; font-weight: 800; color: #1d4ed8; text-transform: uppercase; letter-spacing: 0.6px; }
    .details-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .details-table td { padding: 10px 16px; border-top: 1px solid #e2e8f0; vertical-align: top; }
    .details-table tr:first-child td { border-top: none; }
    .details-label { color: #64748b; font-weight: 600; width: 32%; }
    .details-value { color: #0f172a; font-weight: 700; }
    .logistics-box { margin-top: 20px; padding: 14px 16px; border-radius: 10px; background-color: #f8fafc; border: 1px solid #e2e8f0; font-size: 12px; color: #475569; line-height: 1.55; }
    .cta-btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: 700; font-size: 13px; }
    .footer { padding: 20px 28px; background-color: #f1f5f9; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="color-bar">
      <div class="c-blue"></div>
      <div class="c-red"></div>
      <div class="c-yellow"></div>
      <div class="c-green"></div>
    </div>
    <div class="content">
      <span class="badge">${safeEventTitle} · Speaker Confirmation</span>
      <h1 class="title">${safeSubject}</h1>

      <p style="font-size: 14px; color: #0f172a; font-weight: 600; margin-bottom: 16px;">
        Dear ${safeSpeakerName},
      </p>

      <div class="body-content">
        ${messageHtml}
      </div>

      <div class="session-card">
        <div class="session-card-head">Confirmed Talk &amp; Session Brief</div>
        <table class="details-table">
          <tr>
            <td class="details-label">Session Title</td>
            <td class="details-value">${safeTalkTitle}</td>
          </tr>
          <tr>
            <td class="details-label">Speaker</td>
            <td class="details-value">${safeSpeakerName}${safeSpeakerRole ? ` <span style="font-weight: 500; color: #475569;">(${safeSpeakerRole})</span>` : ""}</td>
          </tr>
          <tr>
            <td class="details-label">Format</td>
            <td class="details-value">${safeFormat}</td>
          </tr>
          <tr>
            <td class="details-label">Date &amp; Time</td>
            <td class="details-value">${safeSlot}</td>
          </tr>
          <tr>
            <td class="details-label">Venue</td>
            <td class="details-value">${safeVenue}</td>
          </tr>
        </table>
      </div>

      <div class="logistics-box">
        <strong>Speaker Tech &amp; Hospitality Checklist:</strong> HDMI/USB-C projection, wireless microphone, and campus Wi-Fi are ready in the hall. We recommend arriving 20–30 minutes ahead of your slot for AV &amp; slide deck verification. For urgent coordination, reply directly to <a href="mailto:vcet_gdg@vcet.edu.in" style="color: #2563eb;">vcet_gdg@vcet.edu.in</a>.
      </div>

      ${
        safeCtaUrl && safeCtaText
          ? `<div style="text-align: center; margin: 24px 0 8px 0;">
              <a href="${safeCtaUrl}" class="cta-btn" target="_blank">${safeCtaText}</a>
            </div>`
          : ""
      }
    </div>

    <div class="footer">
      Google Developer Groups on Campus &middot; Vidyavardhini's College of Engineering and Technology<br>
      K.T. Marg, Vasai West, Maharashtra 401202 &middot; <a href="mailto:vcet_gdg@vcet.edu.in" style="color: #2563eb;">vcet_gdg@vcet.edu.in</a>
    </div>
  </div>
</body>
</html>`;

  const text = `${eventTitle} — Official Speaker Confirmation
======================================================
Dear ${speakerName},

${message}

Confirmed Session Brief:
- Session Title: ${talkTitle}
- Speaker: ${speakerName}${speakerRole?.trim() ? ` (${speakerRole.trim()})` : ""}
- Format: ${sessionFormat}
- Date & Time: ${sessionSlot}
- Venue: ${venue}

Speaker Tech Checklist:
HDMI/USB-C projection, wireless microphone, and Wi-Fi are provided. Please arrive 20-30 minutes early for AV check.

${ctaUrl ? `Event Link: ${ctaUrl}` : ""}

Point of Contact: vcet_gdg@vcet.edu.in
Google Developer Groups on Campus · VCET Vasai`;

  return { html, text };
}

/**
 * Dispatches an official confirmation email to a speaker after confirming their talk
 */
export async function sendSpeakerConfirmationEmail(
  options: SpeakerConfirmationEmailOptions
): Promise<{ success: boolean; simulated?: boolean; log: EmailLog; message: string }> {
  const {
    eventSlug = "dev-to-cloud",
    speakerName,
    speakerEmail,
    ccEmail,
    talkTitle,
    subject,
    sender,
  } = options;

  const { html, text } = generateSpeakerConfirmationEmailHtml(options);
  const ccTrimmed = ccEmail?.trim();

  const sendResult = await sendEmail({
    to: speakerEmail.trim(),
    ...(ccTrimmed ? { cc: ccTrimmed } : {}),
    subject,
    html,
    text,
  });

  const recipients = ccTrimmed ? [speakerEmail.trim(), ccTrimmed] : [speakerEmail.trim()];

  const logRecord: EmailLog = {
    id: crypto.randomUUID(),
    eventSlug,
    type: "speaker",
    subject,
    recipientCount: recipients.length,
    recipients,
    sentAt: new Date().toISOString(),
    status: sendResult.success ? (sendResult.simulated ? "simulated" : "sent") : "failed",
    sender: sender || "Speaker Relations",
    previewText: `${speakerName} · ${talkTitle}`,
  };

  await logEmailRecordAsync(logRecord);

  if (!sendResult.success) {
    return {
      success: false,
      log: logRecord,
      message: sendResult.error || "Failed to dispatch speaker confirmation email.",
    };
  }

  const modeText = sendResult.simulated ? " (Simulated Mode)" : "";
  return {
    success: true,
    simulated: sendResult.simulated,
    log: logRecord,
    message: `Speaker confirmation emailed to ${speakerName} (${speakerEmail.trim()})${modeText}!`,
  };
}
