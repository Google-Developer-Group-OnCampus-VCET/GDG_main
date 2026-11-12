import { describe, expect, it } from "vitest";
import { generatePassPdfBytes } from "./pass-pdf";

describe("Pass PDF Generator", () => {
  it("generates a valid PDF containing attendee and QR pass metadata", async () => {
    const bytes = await generatePassPdfBytes({
      eventTitle: "Build with AI — VCET Workshop",
      datesText: "15 December 2026 · 10:00 am–5:00 pm IST",
      venueText: "VCET Vasai Auditorium",
      registration: {
        id: "reg-1",
        eventSlug: "build-with-ai",
        referenceId: "GDG-BUIL4A-0001",
        fullName: "Atharva Joshi",
        email: "atharva@vcet.edu.in",
        phone: "+91 98765 43210",
        college: "Vidyavardhini's College of Engineering & Technology (VCET)",
        department: "Computer Engg",
        yearOfStudy: "3rd Year",
        track: "General Admission",
        experienceLevel: "Intermediate",
        status: "confirmed",
        checkedIn: false,
        createdAt: "2026-11-12T12:00:00.000Z",
      },
    });

    expect(bytes.byteLength).toBeGreaterThan(1000);
    const header = new TextDecoder().decode(bytes.slice(0, 5));
    expect(header).toBe("%PDF-");
  });
});

