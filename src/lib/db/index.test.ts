import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import os from "node:os";
import path from "node:path";
import {
  buildEventReferenceId,
  checkInAttendee,
  cleanupTestRegistrations,
  createEvent,
  createEventAsync,
  createRegistration,
  getAllEvents,
  getAllEventsAsync,
  getDatabase,
  getEventStats,
  getRegistrationByReference,
  getRegistrations,
  resolveWritableDbPath,
  updateEvent,
  updateEventAsync,
} from "./index";

describe("Database & Registration Engine", () => {
  beforeAll(() => {
    cleanupTestRegistrations();
    getDatabase().prepare("DELETE FROM events WHERE slug LIKE 'test-%'").run();
  });

  afterAll(() => {
    cleanupTestRegistrations();
    getDatabase().prepare("DELETE FROM events WHERE slug LIKE 'test-%'").run();
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
      expect(result.registration.referenceId).toMatch(/^GDG-VCET-2026-\d{4}$/);
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

  it("creates a new event and retrieves it in the events directory", async () => {
    const testSlug = `test-hackathon-${Date.now()}`;
    const result = await createEventAsync({
      title: "VCET AI Hackathon 2026",
      slug: testSlug,
      startsAt: "2026-12-15T09:00:00+05:30",
      format: "in-person",
      location: "VCET Vasai Labs",
      capacity: 100,
      topics: ["ai-ml", "web"],
      summary: "Annual flagship AI hackathon",
      isRegistrationOpen: true,
    });

    expect(result.success).toBe(true);
    expect(result.event).toBeDefined();
    expect(result.event?.slug).toBe(testSlug);
    expect(result.event?.title).toBe("VCET AI Hackathon 2026");

    // Verify it appears in getAllEventsAsync & getAllEvents
    const all = await getAllEventsAsync();
    const found = all.find((e) => e.slug === testSlug);
    expect(found).toBeDefined();
    expect(found?.location).toBe("VCET Vasai Labs");

    const syncAll = getAllEvents();
    expect(syncAll.length).toBeGreaterThan(0);

    // Duplicate slug must be rejected
    const dupResult = createEvent({
      title: "Duplicate Event",
      slug: testSlug,
      startsAt: "2026-12-16T09:00:00+05:30",
    });
    expect(dupResult.success).toBe(false);
    expect(dupResult.error).toContain("already exists");
  });

  it("rejects registration for non-existent events", () => {
    const result = createRegistration("non-existent-event-xyz", {
      fullName: "Test User",
      email: `test.missing.${Date.now()}@vcet.edu.in`,
      phone: "+91 98765 00001",
      track: "General Admission",
      agreedToCoc: true,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("EVENT_NOT_FOUND");
    }
  });

  it("enforces custom capacity and closed status on newly created events", () => {
    const closedSlug = `test-closed-${Date.now()}`;
    createEvent({
      title: "Closed Workshop",
      slug: closedSlug,
      startsAt: "2026-12-20T10:00:00+05:30",
      capacity: 10,
      isRegistrationOpen: false,
    });

    const closedAttempt = createRegistration(closedSlug, {
      fullName: "Closed Event Tester",
      email: `test.closed.${Date.now()}@vcet.edu.in`,
      phone: "+91 98765 00002",
      track: "General Admission",
      agreedToCoc: true,
    });
    expect(closedAttempt.success).toBe(false);
    if (!closedAttempt.success) {
      expect(closedAttempt.error).toBe("REGISTRATION_CLOSED");
    }

    const capSlug = `test-cap-${Date.now()}`;
    createEvent({
      title: "Tiny Capacity Event",
      slug: capSlug,
      startsAt: "2026-12-21T10:00:00+05:30",
      capacity: 1,
      isRegistrationOpen: true,
    });

    const firstReg = createRegistration(capSlug, {
      fullName: "First Seat",
      email: `test.cap1.${Date.now()}@vcet.edu.in`,
      phone: "+91 98765 00003",
      track: "General Admission",
      agreedToCoc: true,
    });
    expect(firstReg.success).toBe(true);

    const secondReg = createRegistration(capSlug, {
      fullName: "Overflow Seat",
      email: `test.cap2.${Date.now()}@vcet.edu.in`,
      phone: "+91 98765 00004",
      track: "General Admission",
      agreedToCoc: true,
    });
    expect(secondReg.success).toBe(false);
    if (!secondReg.success) {
      expect(secondReg.error).toBe("CAPACITY_FULL");
      expect(secondReg.message).toContain("1/1");
    }
  });

  it("rejects malformed email, invalid phone, and non-http(s) portfolioUrl", () => {
    const badEmail = createRegistration("devcraft-2025", {
      fullName: "Bad Email",
      email: "not-an-email",
      phone: "+91 98765 00010",
      track: "Track A: Modern Web & Gemini AI",
      agreedToCoc: true,
    });
    expect(badEmail.success).toBe(false);
    if (!badEmail.success) expect(badEmail.error).toBe("INVALID_INPUT");

    const badPhone = createRegistration("devcraft-2025", {
      fullName: "Bad Phone",
      email: `test.badphone.${Date.now()}@vcet.edu.in`,
      phone: "123",
      track: "Track A: Modern Web & Gemini AI",
      agreedToCoc: true,
    });
    expect(badPhone.success).toBe(false);
    if (!badPhone.success) expect(badPhone.error).toBe("INVALID_INPUT");

    const xssUrl = createRegistration("devcraft-2025", {
      fullName: "Bad URL",
      email: `test.badurl.${Date.now()}@vcet.edu.in`,
      phone: "+91 98765 00011",
      track: "Track A: Modern Web & Gemini AI",
      portfolioUrl: "javascript:alert(1)",
      agreedToCoc: true,
    });
    expect(xssUrl.success).toBe(false);
    if (!xssUrl.success) expect(xssUrl.error).toBe("INVALID_INPUT");
  });

  it("generates distinct, event-scoped reference IDs across multiple custom events without collision", () => {
    expect(buildEventReferenceId("devcraft-2025", 1)).toBe("GDG-VCET-2026-0001");
    expect(buildEventReferenceId("custom-alpha-2026", 1)).toMatch(/^GDG-[A-Z0-9]{6}-2026-0001$/);

    const ts = Date.now();
    const slugA = `test-alpha-${ts}`;
    const slugB = `test-beta-${ts}`;

    expect(
      createEvent({
        title: "Alpha Event",
        slug: slugA,
        startsAt: "2026-12-22T10:00:00+05:30",
        capacity: 50,
        isRegistrationOpen: true,
      }).success
    ).toBe(true);

    expect(
      createEvent({
        title: "Beta Event",
        slug: slugB,
        startsAt: "2026-12-23T10:00:00+05:30",
        capacity: 50,
        isRegistrationOpen: true,
      }).success
    ).toBe(true);

    const regA = createRegistration(slugA, {
      fullName: "First Attendee Alpha",
      email: `test.alpha.${ts}@vcet.edu.in`,
      phone: "+91 98765 10001",
      track: "General Admission",
      agreedToCoc: true,
    });

    const regB = createRegistration(slugB, {
      fullName: "First Attendee Beta",
      email: `test.beta.${ts}@vcet.edu.in`,
      phone: "+91 98765 10002",
      track: "General Admission",
      agreedToCoc: true,
    });

    expect(regA.success).toBe(true);
    expect(regB.success).toBe(true);
    if (regA.success && regB.success) {
      expect(regA.registration.referenceId).toMatch(/^GDG-[A-Z0-9]{6}-2026-0001$/);
      expect(regB.registration.referenceId).toMatch(/^GDG-[A-Z0-9]{6}-2026-0001$/);
      expect(regA.registration.referenceId).not.toBe(regB.registration.referenceId);
    }
  });

  it("updates registration open status and capacity via updateEvent and updateEventAsync", async () => {
    const ts = Date.now();
    const slug = `test-update-${ts}`;

    createEvent({
      title: "Updatable Workshop",
      slug,
      startsAt: "2026-12-24T10:00:00+05:30",
      capacity: 1,
      isRegistrationOpen: true,
    });

    // Close registration synchronously
    const closeResult = updateEvent(slug, { isRegistrationOpen: false });
    expect(closeResult.success).toBe(true);
    expect(getEventStats(slug).isRegistrationOpen).toBe(false);
    expect(getEventStats(slug).isOpen).toBe(false);

    const closedReg = createRegistration(slug, {
      fullName: "Closed Attempt",
      email: `test.upd.closed.${ts}@vcet.edu.in`,
      phone: "+91 98765 20001",
      track: "General Admission",
      agreedToCoc: true,
    });
    expect(closedReg.success).toBe(false);
    if (!closedReg.success) {
      expect(closedReg.error).toBe("REGISTRATION_CLOSED");
    }

    // Reopen registration asynchronously and verify first seat succeeds
    const reopenResult = await updateEventAsync(slug, { isRegistrationOpen: true });
    expect(reopenResult.success).toBe(true);
    expect(getEventStats(slug).isRegistrationOpen).toBe(true);
    expect(getEventStats(slug).isOpen).toBe(true);

    const seat1 = createRegistration(slug, {
      fullName: "Seat One",
      email: `test.upd.seat1.${ts}@vcet.edu.in`,
      phone: "+91 98765 20002",
      track: "General Admission",
      agreedToCoc: true,
    });
    expect(seat1.success).toBe(true);

    // Capacity is 1, so second seat fails with CAPACITY_FULL while isRegistrationOpen remains true
    const fullStats = getEventStats(slug);
    expect(fullStats.isRegistrationOpen).toBe(true);
    expect(fullStats.isOpen).toBe(false);

    const seat2Blocked = createRegistration(slug, {
      fullName: "Seat Two Blocked",
      email: `test.upd.seat2.${ts}@vcet.edu.in`,
      phone: "+91 98765 20003",
      track: "General Admission",
      agreedToCoc: true,
    });
    expect(seat2Blocked.success).toBe(false);
    if (!seat2Blocked.success) {
      expect(seat2Blocked.error).toBe("CAPACITY_FULL");
    }

    // Increase capacity to 2 via updateEventAsync and retry registration
    const capUpdate = await updateEventAsync(slug, { capacity: 2 });
    expect(capUpdate.success).toBe(true);
    expect(getEventStats(slug).capacity).toBe(2);
    expect(getEventStats(slug).isOpen).toBe(true);

    const seat2Allowed = createRegistration(slug, {
      fullName: "Seat Two Allowed",
      email: `test.upd.seat2.${ts}@vcet.edu.in`,
      phone: "+91 98765 20003",
      track: "General Admission",
      agreedToCoc: true,
    });
    expect(seat2Allowed.success).toBe(true);

    // Non-existent event returns EVENT_NOT_FOUND
    const missing = await updateEventAsync(`test-missing-${ts}`, { capacity: 10 });
    expect(missing.success).toBe(false);
    expect(missing.error).toBe("EVENT_NOT_FOUND");
  });

  it("uses os.tmpdir() for SQLite on read-only Vercel serverless environments", () => {
    vi.stubEnv("VERCEL", "1");
    try {
      const dbPath = resolveWritableDbPath();
      expect(dbPath.startsWith(path.join(os.tmpdir(), "gdg-data"))).toBe(true);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
