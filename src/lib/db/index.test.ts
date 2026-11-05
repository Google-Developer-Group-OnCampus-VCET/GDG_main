import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  checkInAttendee,
  cleanupTestRegistrations,
  createRegistration,
  getEventStats,
  getRegistrationByReference,
  getRegistrations,
} from "./index";

describe("Database & Registration Engine", () => {
  beforeAll(() => {
    cleanupTestRegistrations();
  });

  afterAll(() => {
    cleanupTestRegistrations();
  });
  it("initializes database and computes stats accurately", () => {
    const stats = getEventStats("devcraft-2025");
    expect(stats.capacity).toBe(150);
    expect(stats.totalRegistered).toBeGreaterThanOrEqual(124);
    expect(stats.remaining).toBeLessThanOrEqual(26);
    expect(stats.isOpen).toBe(true);
    expect(stats.trackCounts["Track A: Modern Web & Gemini AI"]).toBeGreaterThan(0);
    expect(stats.trackCounts["Track B: Cloud Architecture & GCP"]).toBeGreaterThan(0);
  });

  it("fetches seeded registration by reference ID", () => {
    const reg = getRegistrationByReference("GDG-VCET-2025-0842");
    expect(reg).not.toBeNull();
    expect(reg?.fullName).toBe("Atharva Joshi");
    expect(reg?.department).toBe("Computer Engg");
    expect(reg?.track).toBe("Track A: Modern Web & Gemini AI");
  });

  it("creates a new registration successfully with unique reference ID", () => {
    const uniqueEmail = `test.developer.${Date.now()}@vcet.edu.in`;
    const result = createRegistration("devcraft-2025", {
      fullName: "Test Candidate",
      email: uniqueEmail,
      phone: "+91 98765 00000",
      college: "Vidyavardhini's College of Engineering and Technology",
      department: "Information Tech",
      yearOfStudy: "3rd Year",
      track: "Track A: Modern Web & Gemini AI",
      experienceLevel: "Intermediate",
      portfolioUrl: "https://github.com/test-cand",
      notes: "Looking forward to learning Next.js",
      agreedToCoc: true,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.registration.referenceId).toMatch(/^GDG-VCET-2025-\d{4}$/);
      expect(result.registration.fullName).toBe("Test Candidate");
      expect(result.registration.email).toBe(uniqueEmail);

      // Verify it can be retrieved by reference
      const fetched = getRegistrationByReference(result.registration.referenceId);
      expect(fetched).not.toBeNull();
      expect(fetched?.email).toBe(uniqueEmail);
    }
  });

  it("defaults college to VCET when omitted or empty", () => {
    const uniqueEmail = `test.default.college.${Date.now()}@vcet.edu.in`;
    const result = createRegistration("devcraft-2025", {
      fullName: "Default College Tester",
      email: uniqueEmail,
      phone: "+91 98765 22222",
      track: "Track A: Modern Web & Gemini AI",
      agreedToCoc: true,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.registration.college).toBe(
        "Vidyavardhini's College of Engineering & Technology (VCET)"
      );
    }
  });

  it("rejects duplicate email submissions for the same event", () => {
    const duplicateEmail = "atharva.joshi@vcet.edu.in"; // Seeded email
    const result = createRegistration("devcraft-2025", {
      fullName: "Atharva Joshi Duplicate",
      email: duplicateEmail,
      phone: "+91 98765 43210",
      college: "VCET",
      department: "Computer Engg",
      yearOfStudy: "3rd Year",
      track: "Track A: Modern Web & Gemini AI",
      experienceLevel: "Intermediate",
      agreedToCoc: true,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("DUPLICATE_EMAIL");
      expect(result.message).toContain("already registered");
    }
  });

  it("rejects submission if required fields are missing or CoC not agreed", () => {
    const result = createRegistration("devcraft-2025", {
      fullName: "",
      email: "missing.fields@vcet.edu.in",
      phone: "",
      college: "",
      department: "",
      yearOfStudy: "",
      track: "",
      experienceLevel: "",
      agreedToCoc: false,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("INVALID_INPUT");
    }
  });

  it("performs attendee check-in and prevents double check-in", () => {
    // Create a fresh registration to guarantee a non-checked-in state
    const regResult = createRegistration("devcraft-2025", {
      fullName: "Check-in Tester",
      email: `checkin.${Date.now()}@vcet.edu.in`,
      phone: "+91 98765 11111",
      college: "VCET",
      department: "Computer Engg",
      yearOfStudy: "2nd Year",
      track: "Track A: Modern Web & Gemini AI",
      experienceLevel: "Beginner",
      agreedToCoc: true,
    });
    expect(regResult.success).toBe(true);
    if (!regResult.success) return;

    const ref = regResult.registration.referenceId;
    const check1 = checkInAttendee("devcraft-2025", ref);
    expect(check1.success).toBe(true);
    expect(check1.registration?.checkedIn).toBe(true);

    // Double check-in must fail gracefully
    const check2 = checkInAttendee("devcraft-2025", ref);
    expect(check2.success).toBe(false);
    expect(check2.message).toContain("ALREADY checked in");
  });

  it("handles non-existent reference IDs on check-in", () => {
    const check = checkInAttendee("devcraft-2025", "GDG-VCET-2025-9999");
    expect(check.success).toBe(false);
    expect(check.message).toContain("not found");
  });

  it("supports query filtering in getRegistrations", () => {
    const list = getRegistrations("devcraft-2025", { search: "Atharva" });
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list[0].fullName).toBe("Atharva Joshi");
  });
});
