import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  checkInAttendee,
  cleanupTestRegistrations,
  createEvent,
  createRegistration,
  deleteEvent,
  getAllEvents,
  getDatabase,
  getEventStats,
  getSiteSettings,
  reviewRegistration,
  revokeCheckInAttendee,
  updateEvent,
  updateRegistration,
  updateSiteSettings,
} from "@/lib/db";
import { createStarterWorkshopDetails, DEFAULT_CHAPTER_SETTINGS } from "@/lib/site-defaults";

describe("Full CMS Database Persistence (Site Settings, Events & Roster CRUD)", () => {
  const cmsSlug = `test-cms-workshop-${Date.now()}`;
  let previousSettings = getSiteSettings();

  beforeAll(() => {
    previousSettings = getSiteSettings();
    cleanupTestRegistrations();
    getDatabase().prepare("DELETE FROM events WHERE slug LIKE 'test-cms-%'").run();
  });

  afterAll(() => {
    cleanupTestRegistrations();
    getDatabase().prepare("DELETE FROM events WHERE slug LIKE 'test-cms-%'").run();
    updateSiteSettings(previousSettings);
  });

  it("persists and retrieves updated Chapter Settings, Team Roster, Learning Areas & FAQs", () => {
    const customSettings = {
      ...DEFAULT_CHAPTER_SETTINGS,
      chapter: {
        ...DEFAULT_CHAPTER_SETTINGS.chapter,
        tagline: "Build Bold on Campus — CMS Test",
      },
      team: [
        ...DEFAULT_CHAPTER_SETTINGS.team,
        {
          id: "test-member-cms",
          name: "Test CMS Organizer",
          role: "Cloud Co-Lead",
          academicYear: "2026-27",
        },
      ],
      homeFaq: [
        ...DEFAULT_CHAPTER_SETTINGS.homeFaq,
        { question: "Can we update FAQs live?", answer: "Yes, via Site & Team CMS." },
      ],
    };

    const saved = updateSiteSettings(customSettings);
    const loaded = getSiteSettings();

    expect(saved.chapter.tagline).toBe("Build Bold on Campus — CMS Test");
    expect(loaded.chapter.tagline).toBe("Build Bold on Campus — CMS Test");
    expect(loaded.team.some((m) => m.id === "test-member-cms")).toBe(true);
    expect(loaded.homeFaq.some((f) => f.question === "Can we update FAQs live?")).toBe(true);
  });

  it("creates, updates workshop agenda/speakers, marks cancelled, and deletes an event cleanly", () => {
    const workshop = createStarterWorkshopDetails({
      title: "CMS Workshop Test",
      capacity: 80,
      isOpen: true,
    });

    const created = createEvent({
      title: "CMS Workshop Test",
      slug: cmsSlug,
      startsAt: "2026-12-10T10:00:00+05:30",
      location: "VCET Auditorium",
      capacity: 80,
      image: "/images/events/test-cover.jpg",
      url: "https://gdg.community.dev/test-cms",
      cancelled: false,
      workshop,
    });

    expect(created.success).toBe(true);
    expect(created.event?.image).toBe("/images/events/test-cover.jpg");
    expect(created.event?.url).toBe("https://gdg.community.dev/test-cms");
    expect(created.event?.workshop?.headline).toBe("CMS Workshop Test");

    // Update agenda + speaker + cancelled flag + capacity without losing workshop structure
    const updatedWorkshop = {
      ...created.event!.workshop!,
      speakersTbd: false,
      speakers: [
        {
          id: "spk-cms-1",
          name: "Priya Sharma",
          role: "Cloud Architect",
          organization: "Google Cloud Partner",
          category: "keynote" as const,
          tags: ["Cloud"],
        },
      ],
    };

    const updated = updateEvent(cmsSlug, {
      capacity: 110,
      cancelled: true,
      workshop: updatedWorkshop,
    });

    expect(updated.success).toBe(true);
    expect(updated.event?.cancelled).toBe(true);
    expect(updated.event?.capacity).toBe(110);
    expect(updated.event?.workshop?.speakers).toHaveLength(1);

    // Delete removes it from getAllEvents
    const deleted = deleteEvent(cmsSlug);
    expect(deleted.success).toBe(true);
    expect(getAllEvents().some((e) => e.slug === cmsSlug)).toBe(false);
  });

  it("supports attendee detail editing and day check-in revocation in SQLite", () => {
    const res = createRegistration("dev-to-cloud", {
      fullName: "CMS Test Attendee",
      email: `test.cms.${Date.now()}@example.com`,
      phone: "+91 90000 12345",
      college: "VCET",
      department: "Computer Engg",
      yearOfStudy: "3rd Year",
      track: "4-Day All-Access",
      experienceLevel: "Beginner",
      agreedToCoc: true,
    });

    expect(res.success).toBe(true);
    if (!res.success) return;

    const refId = res.registration.referenceId;

    const editRes = updateRegistration("dev-to-cloud", refId, {
      fullName: "CMS Edited Attendee",
      department: "AI & Data Science",
    });
    expect(editRes.success).toBe(true);
    expect(editRes.registration?.fullName).toBe("CMS Edited Attendee");
    expect(editRes.registration?.department).toBe("AI & Data Science");

    const checkIn1 = checkInAttendee("dev-to-cloud", refId, 1);
    const checkIn2 = checkInAttendee("dev-to-cloud", refId, 2);
    expect(checkIn1.success).toBe(true);
    expect(checkIn2.success).toBe(true);

    const undoDay2 = revokeCheckInAttendee("dev-to-cloud", refId, 2);
    expect(undoDay2.success).toBe(true);
    expect(undoDay2.registration?.checkedInDays).toEqual([1]);
    expect(undoDay2.registration?.checkedIn).toBe(true);

    const undoDay1 = revokeCheckInAttendee("dev-to-cloud", refId, 1);
    expect(undoDay1.success).toBe(true);
    expect(undoDay1.registration?.checkedInDays).toEqual([]);
    expect(undoDay1.registration?.checkedIn).toBe(false);
  });

  it("enforces Luma-style Approval Queue workflow (pending -> approve/waitlist/decline, seat cap, and check-in guard)", () => {
    const queueSlug = `test-cms-queue-${Date.now()}`;
    const created = createEvent({
      title: "Approval Queue Event",
      slug: queueSlug,
      startsAt: "2026-12-15T10:00:00+05:30",
      capacity: 1,
      requireApproval: true,
      isRegistrationOpen: true,
    });
    expect(created.success).toBe(true);
    expect(created.event?.requireApproval).toBe(true);

    const app1 = createRegistration(queueSlug, {
      fullName: "Queue Applicant One",
      email: `test.q1.${Date.now()}@example.com`,
      phone: "+91 90000 11111",
      agreedToCoc: true,
    });
    const app2 = createRegistration(queueSlug, {
      fullName: "Queue Applicant Two",
      email: `test.q2.${Date.now()}@example.com`,
      phone: "+91 90000 22222",
      agreedToCoc: true,
    });

    expect(app1.success).toBe(true);
    expect(app2.success).toBe(true);
    if (!app1.success || !app2.success) return;

    expect(app1.registration.status).toBe("pending");
    expect(app2.registration.status).toBe("pending");

    // Pending registrations do NOT consume confirmed capacity yet
    const statsBefore = getEventStats(queueSlug);
    expect(statsBefore.totalRegistered).toBe(0);
    expect(statsBefore.pendingCount).toBe(2);

    // Gate check-in must block pending applicant
    const blockedCheckIn = checkInAttendee(queueSlug, app1.registration.referenceId, 1);
    expect(blockedCheckIn.success).toBe(false);
    expect(blockedCheckIn.message).toContain("PENDING HOST APPROVAL");

    // Approve first applicant -> occupies seat 1/1
    const approved1 = reviewRegistration(queueSlug, app1.registration.referenceId, "approve");
    expect(approved1.success).toBe(true);
    expect(approved1.registration?.status).toBe("confirmed");

    const statsAfterApprove = getEventStats(queueSlug);
    expect(statsAfterApprove.totalRegistered).toBe(1);
    expect(statsAfterApprove.pendingCount).toBe(1);

    // Check-in now succeeds for approved guest
    const okCheckIn = checkInAttendee(queueSlug, app1.registration.referenceId, 1);
    expect(okCheckIn.success).toBe(true);

    // Approving second applicant hits capacity 1/1
    const fullAttempt = reviewRegistration(queueSlug, app2.registration.referenceId, "approve");
    expect(fullAttempt.success).toBe(false);
    expect(fullAttempt.code).toBe("CAPACITY_FULL");

    // Waitlist then Decline works cleanly
    const waitlisted = reviewRegistration(queueSlug, app2.registration.referenceId, "waitlist");
    expect(waitlisted.success).toBe(true);
    expect(waitlisted.registration?.status).toBe("waitlisted");

    const declined = reviewRegistration(queueSlug, app2.registration.referenceId, "decline");
    expect(declined.success).toBe(true);
    expect(declined.registration?.status).toBe("declined");
  });
});
