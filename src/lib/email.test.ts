import { describe, expect, it } from "vitest";
import {
  generatePassEmailHtml,
  generateAnnouncementEmailHtml,
  sendEmail,
  sendAttendeePassEmail,
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
});
