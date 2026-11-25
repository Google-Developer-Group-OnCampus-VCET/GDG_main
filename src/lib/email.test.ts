import { describe, expect, it } from "vitest";
import {
  generatePassEmailHtml,
  generateAnnouncementEmailHtml,
  generateSpeakerConfirmationEmailHtml,
  sendEmail,
  sendAttendeePassEmail,
  sendSpeakerConfirmationEmail,
} from "./email";
import type { RegistrationRecord } from "@/types";

describe("Email Communication System", () => {
  const mockRegistration: RegistrationRecord = {
    id: "reg-test-1",
    eventSlug: "dev-to-cloud",
    referenceId: "GDG-VCET-2026-0842",
    fullName: "Atharva Joshi",
    email: "atharva.joshi@vcet.edu.in",
    phone: "+91 98765 43210",
    college: "VCET",
    department: "Computer Engg",
    yearOfStudy: "3rd Year",
    track: "Track A: Web Architecture & Agents",
    experienceLevel: "Intermediate",
    status: "confirmed",
    checkedIn: false,
    checkedInDays: [],
    createdAt: new Date().toISOString(),
  };

  it("generates a complete GDG-branded pass HTML email with QR code and reference ID", () => {
    const { subject, html, text } = generatePassEmailHtml({
      eventTitle: "Zero to Hero: Dev to Cloud",
      registration: mockRegistration,
      datesText: "Dec 1–4, 2026",
      venueText: "VCET Seminar Hall",
      origin: "http://localhost:3000",
    });

    expect(subject).toContain("Dev to Cloud");
    expect(subject).toContain("#GDG-VCET-2026-0842");

    // HTML contains key elements
    expect(html).toContain("Atharva Joshi");
    expect(html).toContain("GDG-VCET-2026-0842");
    expect(html).toContain("Valid for All 4 Days");
    expect(html).toContain("Track A: Web Architecture & Agents");
    expect(html).toContain("https://api.qrserver.com/v1/create-qr-code");

    // Plain text alternative
    expect(text).toContain("Atharva Joshi");
    expect(text).toContain("GDG-VCET-2026-0842");
    expect(text).toContain("VALID FOR ALL 4 DAYS");
  });

  it("generates broadcast announcement HTML with custom message and pass link", () => {
    const { html, text } = generateAnnouncementEmailHtml({
      eventTitle: "Zero to Hero: Dev to Cloud",
      subject: "Day 1 Starts Tomorrow at 10 AM",
      message: "Please arrive 15 minutes early and bring your personal laptop.",
      recipientName: "Atharva Joshi",
      referenceId: "GDG-VCET-2026-0842",
      eventSlug: "dev-to-cloud",
      ctaText: "View Workshop Agenda",
      ctaUrl: "http://localhost:3000/events/dev-to-cloud/agenda",
    });

    expect(html).toContain("Dear Atharva Joshi");
    expect(html).toContain("bring your personal laptop");
    expect(html).toContain("View Workshop Agenda");
    expect(html).toContain("GDG-VCET-2026-0842");

    expect(text).toContain("Dear Atharva Joshi");
    expect(text).toContain("bring your personal laptop");
  });

  it("sends simulated email in dev mode when RESEND_API_KEY is not configured", async () => {
    const result = await sendEmail({
      to: "test.attendee@vcet.edu.in",
      subject: "Test Subject",
      html: "<p>Hello Test</p>",
      text: "Hello Test",
    });

    expect(result.success).toBe(true);
    expect(result.simulated).toBe(true);
    expect(result.messageId).toBeDefined();
  });

  it("dispatches attendee pass and logs the transaction in database", async () => {
    const result = await sendAttendeePassEmail({
      eventTitle: "Zero to Hero: Dev to Cloud",
      registration: mockRegistration,
      origin: "http://localhost:3000",
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain("successfully emailed");
  });

  it("generates escaped GDG-branded speaker confirmation HTML & text", () => {
    const { html, text } = generateSpeakerConfirmationEmailHtml({
      eventTitle: "Zero to Hero: Dev to Cloud",
      eventSlug: "dev-to-cloud",
      speakerName: "Riya Deshmukh",
      speakerEmail: "riya@example.com",
      speakerRole: "Staff Cloud Architect · Google",
      talkTitle: "Cloud Run & AI Agents <v2>",
      sessionFormat: "Keynote Session",
      sessionSlot: "Day 3 · Dec 3, 2026 · 10:00 AM IST",
      venue: "VCET Seminar Hall",
      subject: "Confirmed Speaker Invite: Cloud Run & AI Agents",
      message: "Thanks for confirming your keynote session!",
      ctaText: "View Event Agenda",
      ctaUrl: "https://gdg-vcet.vercel.app/events/dev-to-cloud/agenda",
    });

    expect(html).toContain("Speaker Confirmation");
    expect(html).toContain("Dear Riya Deshmukh");
    expect(html).toContain("Staff Cloud Architect · Google");
    expect(html).toContain("Cloud Run &amp; AI Agents &lt;v2&gt;");
    expect(html).toContain("Keynote Session");
    expect(html).toContain("Day 3 · Dec 3, 2026 · 10:00 AM IST");
    expect(html).toContain("View Event Agenda");

    expect(text).toContain("Dear Riya Deshmukh");
    expect(text).toContain("Cloud Run & AI Agents <v2>");
    expect(text).toContain("Day 3 · Dec 3, 2026 · 10:00 AM IST");
  });

  it("dispatches speaker confirmation email and logs type 'speaker'", async () => {
    const result = await sendSpeakerConfirmationEmail({
      eventTitle: "Zero to Hero: Dev to Cloud",
      eventSlug: "dev-to-cloud",
      speakerName: "Riya Deshmukh",
      speakerEmail: "riya.speaker@example.com",
      ccEmail: "faculty.coord@vcet.edu.in",
      talkTitle: "Building Resilient Agents",
      sessionFormat: "Hands-on Workshop",
      sessionSlot: "Day 2 · 11:00 AM IST",
      subject: "Confirmed Speaker: Building Resilient Agents",
      message: "Looking forward to your workshop!",
    });

    expect(result.success).toBe(true);
    expect(result.log.type).toBe("speaker");
    expect(result.log.recipientCount).toBe(2);
    expect(result.log.recipients).toEqual(["riya.speaker@example.com", "faculty.coord@vcet.edu.in"]);
    expect(result.message).toContain("Riya Deshmukh");
  });
});
