import { describe, expect, it } from "vitest";
import {
  checkInAttendee,
  createRegistration,
  getEventStats,
  getRegistrationByReference,
  getRegistrations,
} from "./db";
import { events } from "@/content/events";
import { formatEventDateRange, isUpcoming } from "./events";

describe("Comprehensive System Verification", () => {
  const TEST_SLUG = "devcraft-2025";

  describe("1. Public Event Navigation & Data Integrity", () => {
    it("preserves all 6 historical events and integrates flagship DevCraft 2025", () => {
      expect(events.length).toBe(7);
      const devcraft = events.find((e) => e.slug === TEST_SLUG);
      expect(devcraft).toBeDefined();
      expect(devcraft?.workshop).toBeDefined();
      expect(devcraft?.workshop?.capacity).toBe(150);
      expect(devcraft?.workshop?.agenda.length).toBeGreaterThan(6);
      expect(devcraft?.workshop?.speakers.length).toBeGreaterThan(8);
      expect(devcraft?.workshop?.sponsors.length).toBeGreaterThan(6);

      // Verify historical events remain unchanged
      const pastSeminar = events.find(
        (e) => e.slug === "pathway-to-global-opportunities-studying-abroad-seminar"
      );
      expect(pastSeminar).toBeDefined();
      expect(pastSeminar?.workshop).toBeUndefined();
      expect(pastSeminar?.startsAt).toBe("2026-10-21");
    });

    it("formats event dates properly for both date-only and timed events", () => {
      const devcraft = events.find((e) => e.slug === TEST_SLUG)!;
      const formatted = formatEventDateRange(devcraft);
      expect(formatted).toContain("November 2026");
      expect(formatted).toContain("IST");
    });

    it("correctly marks DevCraft 2025 as upcoming", () => {
      const devcraft = events.find((e) => e.slug === TEST_SLUG)!;
      const now = new Date("2026-11-01T12:00:00+05:30");
      expect(isUpcoming(devcraft, now)).toBe(true);
    });
  });

  describe("2. Registration Engine & Input Validation", () => {
    it("handles valid registration and issues a persistent reference ID", () => {
      const uniqueEmail = `attendee.${Date.now()}@vcet.edu.in`;
      const result = createRegistration(TEST_SLUG, {
        fullName: "Soham Parab",
        email: uniqueEmail,
        phone: "+91 98200 12345",
        college: "Vidyavardhini's College of Engineering and Technology",
        department: "Computer Engg",
        yearOfStudy: "3rd Year",
        track: "Track A: Modern Web & Gemini AI",
        experienceLevel: "Intermediate",
        portfolioUrl: "https://github.com/sohamparab",
        notes: "Interested in React 19 server actions",
        agreedToCoc: true,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.registration.referenceId).toMatch(/^GDG-VCET-2025-\d{4}$/);
        expect(result.registration.fullName).toBe("Soham Parab");
        expect(result.registration.status).toBe("confirmed");
        expect(result.registration.checkedIn).toBe(false);

        // Verify retrieval by reference
        const found = getRegistrationByReference(result.registration.referenceId);
        expect(found?.email).toBe(uniqueEmail);
      }
    });

    it("rejects invalid input when required fields are missing", () => {
      const result = createRegistration(TEST_SLUG, {
        fullName: "",
        email: "incomplete@vcet.edu.in",
        phone: "",
        college: "",
        department: "",
        yearOfStudy: "",
        track: "",
        experienceLevel: "",
        agreedToCoc: true,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("INVALID_INPUT");
        expect(result.message).toContain("required fields");
      }
    });

    it("rejects registration when Code of Conduct agreement is unchecked", () => {
      const result = createRegistration(TEST_SLUG, {
        fullName: "No Consent User",
        email: `noconsent.${Date.now()}@vcet.edu.in`,
        phone: "+91 98000 00000",
        college: "VCET",
        department: "Information Tech",
        yearOfStudy: "2nd Year",
        track: "Track B: Cloud Architecture & GCP",
        experienceLevel: "Beginner",
        agreedToCoc: false,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("INVALID_INPUT");
        expect(result.message).toContain("Code of Conduct");
      }
    });

    it("enforces uniqueness: rejects duplicate registrations with same email", () => {
      const testEmail = `duplicate.check.${Date.now()}@vcet.edu.in`;

      const first = createRegistration(TEST_SLUG, {
        fullName: "Duplicate First",
        email: testEmail,
        phone: "+91 98111 22233",
        college: "VCET",
        department: "AI & Data Science",
        yearOfStudy: "3rd Year",
        track: "Track A: Modern Web & Gemini AI",
        experienceLevel: "Intermediate",
        agreedToCoc: true,
      });
      expect(first.success).toBe(true);

      const second = createRegistration(TEST_SLUG, {
        fullName: "Duplicate Second",
        email: testEmail,
        phone: "+91 98111 22233",
        college: "VCET",
        department: "AI & Data Science",
        yearOfStudy: "3rd Year",
        track: "Track B: Cloud Architecture & GCP",
        experienceLevel: "Advanced",
        agreedToCoc: true,
      });
      expect(second.success).toBe(false);
      if (!second.success) {
        expect(second.error).toBe("DUPLICATE_EMAIL");
        expect(second.message).toContain("already registered");
      }
    });
  });

  describe("3. Check-In & Attendance Verification", () => {
    it("processes live attendee check-in and prevents double check-in", () => {
      const attendee = createRegistration(TEST_SLUG, {
        fullName: "Check-in Attendee",
        email: `checkin.verify.${Date.now()}@vcet.edu.in`,
        phone: "+91 98333 44455",
        college: "VCET",
        department: "Electronics & Telecomm",
        yearOfStudy: "4th Year",
        track: "Track B: Cloud Architecture & GCP",
        experienceLevel: "Advanced",
        agreedToCoc: true,
      });

      expect(attendee.success).toBe(true);
      if (!attendee.success) return;

      const ref = attendee.registration.referenceId;

      // First check-in succeeds
      const checkIn1 = checkInAttendee(TEST_SLUG, ref);
      expect(checkIn1.success).toBe(true);
      expect(checkIn1.registration?.checkedIn).toBe(true);
      expect(checkIn1.registration?.checkedInAt).toBeDefined();

      // Second check-in on the same pass fails with duplicate warning
      const checkIn2 = checkInAttendee(TEST_SLUG, ref);
      expect(checkIn2.success).toBe(false);
      expect(checkIn2.message).toContain("ALREADY checked in");
    });

    it("rejects invalid or forged pass references", () => {
      const checkIn = checkInAttendee(TEST_SLUG, "GDG-VCET-FAKE-9999");
      expect(checkIn.success).toBe(false);
      expect(checkIn.message).toContain("not found");
    });
  });

  describe("4. Administrative Dashboard & Analytics", () => {
    it("retrieves registrations with query and track filtering", () => {
      const allRegs = getRegistrations(TEST_SLUG);
      expect(allRegs.length).toBeGreaterThan(120);

      const trackAOnly = getRegistrations(TEST_SLUG, {
        track: "Track A: Modern Web & Gemini AI",
      });
      expect(trackAOnly.length).toBeGreaterThan(0);
      expect(trackAOnly.every((r) => r.track === "Track A: Modern Web & Gemini AI")).toBe(true);
    });

    it("provides accurate aggregate metrics in getEventStats", () => {
      const stats = getEventStats(TEST_SLUG);
      expect(stats.capacity).toBe(150);
      expect(stats.totalRegistered).toBeGreaterThanOrEqual(124);
      expect(stats.remaining).toBeLessThanOrEqual(26);
      expect(stats.percentFilled).toBeGreaterThanOrEqual(82);
      expect(stats.trackCounts["Track A: Modern Web & Gemini AI"]).toBeGreaterThan(0);
      expect(stats.trackCounts["Track B: Cloud Architecture & GCP"]).toBeGreaterThan(0);
      expect(stats.checkedInCount).toBeGreaterThan(0);
    });
  });
});

