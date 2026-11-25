import { beforeEach, describe, expect, it, vi } from "vitest";
import { invalidateCache } from "./cache";

const { mockGetAdminDb } = vi.hoisted(() => ({
  mockGetAdminDb: vi.fn(),
}));

vi.mock("@/lib/firebase/admin", () => ({
  getAdminDb: mockGetAdminDb,
}));

import {
  cancelFirestoreRegistration,
  createFirestoreRegistration,
  getFirestoreEventStats,
  getFirestorePublicEventStats,
  getFirestoreRegistrations,
  getFirestoreSiteSettings,
  reviewFirestoreRegistration,
  updateFirestoreEvent,
} from "./firestore";

describe("Firestore Read Reduction & Shared Caching", () => {
  beforeEach(() => {
    invalidateCache();
    vi.clearAllMocks();
  });

  it("uses 0 extra Firestore reads for public stats when preloadedEvent already has registeredCount", async () => {
    const registrationsGetSpy = vi.fn();
    const eventsDocGetSpy = vi.fn();

    mockGetAdminDb.mockReturnValue({
      collection: (name: string) => {
        if (name === "registrations") {
          return {
            where: () => ({ get: registrationsGetSpy }),
          };
        }
        return {
          doc: () => ({ get: eventsDocGetSpy }),
        };
      },
    });

    const stats = await getFirestorePublicEventStats("dev-to-cloud", {
      id: "evt-1",
      slug: "dev-to-cloud",
      title: "Dev to Cloud",
      startsAt: "2026-12-01T09:00:00+05:30",
      topics: ["cloud"],
      capacity: 135,
      registeredCount: 129,
      isRegistrationOpen: true,
    });

    expect(stats).not.toBeNull();
    expect(stats?.totalRegistered).toBe(129);
    expect(stats?.capacity).toBe(135);
    expect(stats?.remaining).toBe(6);
    expect(stats?.isOpen).toBe(true);
    expect(registrationsGetSpy).not.toHaveBeenCalled();
    expect(eventsDocGetSpy).not.toHaveBeenCalled();
  });

  it("shares a single registrations scan between getFirestoreRegistrations and getFirestoreEventStats", async () => {
    const mockRegs = [
      {
        id: "r1",
        data: () => ({
          eventSlug: "dev-to-cloud",
          referenceId: "GDG-VCET-2026-0001",
          fullName: "Alice",
          email: "alice@vcet.edu.in",
          phone: "+91 90000 00001",
          college: "VCET",
          department: "Computer Engg",
          yearOfStudy: "3rd Year",
          track: "4-Day All-Access",
          experienceLevel: "Intermediate",
          status: "confirmed",
          checkedIn: true,
          checkedInDays: [1],
          createdAt: "2026-11-20T10:00:00.000Z",
        }),
      },
      {
        id: "r2",
        data: () => ({
          eventSlug: "dev-to-cloud",
          referenceId: "GDG-VCET-2026-0002",
          fullName: "Bob",
          email: "bob@vcet.edu.in",
          phone: "+91 90000 00002",
          college: "VCET",
          department: "Information Tech",
          yearOfStudy: "1st Year",
          track: "4-Day All-Access",
          experienceLevel: "Beginner",
          status: "cancelled",
          checkedIn: false,
          createdAt: "2026-11-20T11:00:00.000Z",
        }),
      },
    ];

    const registrationsGetSpy = vi.fn().mockResolvedValue({
      forEach: (cb: (doc: (typeof mockRegs)[number]) => void) => mockRegs.forEach(cb),
    });

    mockGetAdminDb.mockReturnValue({
      collection: (name: string) => {
        if (name === "registrations") {
          return {
            where: () => ({ get: registrationsGetSpy }),
          };
        }
        return {
          doc: () => ({
            get: vi.fn().mockResolvedValue({
              exists: true,
              id: "dev-to-cloud",
              data: () => ({
                slug: "dev-to-cloud",
                title: "Dev to Cloud",
                startsAt: "2026-12-01",
                capacity: 135,
                registeredCount: 1,
                isRegistrationOpen: true,
              }),
            }),
          }),
        };
      },
    });

    const regs = await getFirestoreRegistrations("dev-to-cloud");
    const stats = await getFirestoreEventStats("dev-to-cloud");

    expect(regs?.length).toBe(2);
    expect(stats?.totalRegistered).toBe(1);
    expect(stats?.checkedInCount).toBe(1);
    // Single registrations collection scan shared across both calls
    expect(registrationsGetSpy).toHaveBeenCalledTimes(1);
  });

  it("uses denormalized registeredCount inside createFirestoreRegistration without scanning registrations collection", async () => {
    const scanAllRegsSpy = vi.fn();
    const txUpdateSpy = vi.fn();
    const txSetSpy = vi.fn();

    mockGetAdminDb.mockReturnValue({
      collection: (name: string) => {
        if (name === "events") {
          return {
            doc: (slug: string) => ({ kind: "event", slug }),
          };
        }
        return {
          doc: (id: string) => ({ kind: "reg", id }),
          where: (field: string) => ({
            field,
            limit: (n: number) => ({ kind: "refCheck", field, limit: n }),
          }),
        };
      },
      runTransaction: async <T>(fn: (tx: unknown) => Promise<T>) => {
        const tx = {
          get: async (target: { kind?: string; field?: string }) => {
            if (target.kind === "event") {
              return {
                exists: true,
                data: () => ({
                  capacity: 135,
                  registeredCount: 129,
                  isRegistrationOpen: true,
                }),
              };
            }
            if (target.kind === "reg") {
              return { exists: false, data: () => undefined };
            }
            if (target.kind === "refCheck") {
              return { empty: true };
            }
            scanAllRegsSpy();
            return { docs: [] };
          },
          set: txSetSpy,
          update: txUpdateSpy,
        };
        return fn(tx);
      },
    });

    const res = await createFirestoreRegistration("dev-to-cloud", {
      fullName: "Priya Sharma",
      email: "priya.sharma@vcet.edu.in",
      phone: "+91 98200 11223",
      college: "VCET",
      department: "Computer Engg",
      yearOfStudy: "3rd Year",
      track: "4-Day All-Access",
      experienceLevel: "Intermediate",
      agreedToCoc: true,
    });

    expect(res?.success).toBe(true);
    expect(scanAllRegsSpy).not.toHaveBeenCalled();
    expect(txUpdateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "event" }),
      expect.objectContaining({ registeredCount: 130 })
    );
  });

  it("decrements registeredCount inside cancelFirestoreRegistration transaction without full collection scan", async () => {
    const scanAllRegsSpy = vi.fn();
    const txUpdateSpy = vi.fn();
    const txSetSpy = vi.fn();

    mockGetAdminDb.mockReturnValue({
      collection: (name: string) => {
        if (name === "events") {
          return {
            doc: (slug: string) => ({ kind: "event", slug }),
          };
        }
        return {
          where: () => ({
            limit: () => ({ kind: "regByRef" }),
          }),
        };
      },
      runTransaction: async <T>(fn: (tx: unknown) => Promise<T>) => {
        const tx = {
          get: async (target: { kind?: string }) => {
            if (target.kind === "regByRef") {
              return {
                empty: false,
                docs: [
                  {
                    ref: { id: "reg-doc-1" },
                    data: () => ({
                      eventSlug: "dev-to-cloud",
                      status: "confirmed",
                    }),
                  },
                ],
              };
            }
            if (target.kind === "event") {
              return {
                exists: true,
                data: () => ({ registeredCount: 130 }),
              };
            }
            scanAllRegsSpy();
            return { docs: [] };
          },
          update: txUpdateSpy,
          set: txSetSpy,
        };
        return fn(tx);
      },
    });

    const cancelled = await cancelFirestoreRegistration("GDG-VCET-2026-0130");

    expect(cancelled).toBe(true);
    expect(scanAllRegsSpy).not.toHaveBeenCalled();
    expect(txUpdateSpy).toHaveBeenCalledWith(
      { id: "reg-doc-1" },
      expect.objectContaining({ status: "cancelled" })
    );
    expect(txSetSpy).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "event", slug: "dev-to-cloud" }),
      expect.objectContaining({ registeredCount: 129 }),
      { merge: true }
    );
  });

  it("updates workshop.capacity using dot-notation when workshop doc already exists (no partial overwrite)", async () => {
    const updateSpy = vi.fn().mockResolvedValue(undefined);
    const getSpy = vi.fn().mockResolvedValue({
      exists: true,
      data: () => ({
        id: "dev-to-cloud",
        slug: "dev-to-cloud",
        title: "Dev to Cloud",
        startsAt: "2026-11-19T09:00:00+05:30",
        topics: ["cloud"],
        capacity: 135,
        workshop: {
          headline: "Dev to Cloud",
          subheading: "4-Day Workshop",
          capacity: 135,
          agenda: [],
          speakers: [],
          sponsors: [],
          faq: [],
          registrationConfig: { isOpen: true, price: 0, currency: "INR" },
        },
      }),
    });

    mockGetAdminDb.mockReturnValue({
      collection: () => ({
        doc: () => ({
          get: getSpy,
          update: updateSpy,
        }),
      }),
    });

    await updateFirestoreEvent("dev-to-cloud", { capacity: 150 });

    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        capacity: 150,
        "workshop.capacity": 150,
        "workshop.seatsText": "Limited to 150 Seats",
      })
    );
  });

  it("caches site settings reads after first Firestore document fetch", async () => {
    const siteDocGetSpy = vi.fn().mockResolvedValue({
      exists: true,
      data: () => ({
        chapter: { name: "GDG VCET Test", shortName: "GDG VCET", tagline: "Build", description: "Desc", institution: "VCET", joinUrl: "/", chapterPageUrl: "/", socials: [], nav: [], sourceUrl: "", lastVerifiedAt: "" },
        team: [],
        learningAreas: [],
        homeFaq: [],
        joinFaq: [],
        joinDescription: "Join",
        aboutDescription: "About",
        aboutCards: [],
      }),
    });

    mockGetAdminDb.mockReturnValue({
      collection: () => ({
        doc: () => ({ get: siteDocGetSpy }),
      }),
    });

    const first = await getFirestoreSiteSettings();
    const second = await getFirestoreSiteSettings();

    expect(first?.chapter.name).toBe("GDG VCET Test");
    expect(second?.chapter.name).toBe("GDG VCET Test");
    expect(siteDocGetSpy).toHaveBeenCalledTimes(1);
  });

  it("submits as pending into approval queue and transitions counts cleanly on approval", async () => {
    const txSetSpy = vi.fn();
    const txUpdateSpy = vi.fn();

    mockGetAdminDb.mockReturnValue({
      collection: (name: string) => {
        if (name === "events") {
          return { doc: (slug: string) => ({ kind: "event", slug }) };
        }
        return {
          doc: (id: string) => ({ kind: "reg", id }),
          where: () => ({
            limit: () => ({ kind: "refCheck" }),
            where: () => ({ limit: () => ({ kind: "regBySlugAndRef" }) }),
          }),
        };
      },
      runTransaction: async <T>(fn: (tx: unknown) => Promise<T>) => {
        const tx = {
          get: async (target: { kind?: string }) => {
            if (target.kind === "event") {
              return {
                exists: true,
                data: () => ({
                  slug: "queue-event",
                  capacity: 50,
                  registeredCount: 10,
                  pendingCount: 2,
                  isRegistrationOpen: true,
                  requireApproval: true,
                }),
              };
            }
            if (target.kind === "reg") {
              return { exists: false };
            }
            if (target.kind === "refCheck") {
              return { empty: true, docs: [] };
            }
            return {
              empty: false,
              docs: [
                {
                  ref: { id: "reg-pending-1" },
                  data: () => ({
                    eventSlug: "queue-event",
                    referenceId: "GDG-QUEU-2026-0001",
                    fullName: "Pending Student",
                    email: "pending@vcet.edu.in",
                    status: "pending",
                    checkedIn: false,
                  }),
                },
              ],
            };
          },
          set: txSetSpy,
          update: txUpdateSpy,
        };
        return fn(tx);
      },
    });

    const created = await createFirestoreRegistration("queue-event", {
      fullName: "Pending Student",
      email: "pending@vcet.edu.in",
      phone: "+91 91234 56789",
      agreedToCoc: true,
    });

    expect(created?.success).toBe(true);
    if (created?.success) {
      expect(created.registration.status).toBe("pending");
    }
    expect(txUpdateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "event", slug: "queue-event" }),
      expect.objectContaining({ pendingCount: 3 })
    );

    txSetSpy.mockClear();
    txUpdateSpy.mockClear();

    const approved = await reviewFirestoreRegistration(
      "queue-event",
      "GDG-QUEU-2026-0001",
      "approve"
    );

    expect(approved?.success).toBe(true);
    expect(approved?.registration?.status).toBe("confirmed");
    expect(txUpdateSpy).toHaveBeenCalledWith(
      { id: "reg-pending-1" },
      expect.objectContaining({ status: "confirmed" })
    );
    expect(txSetSpy).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "event", slug: "queue-event" }),
      expect.objectContaining({ registeredCount: 11, pendingCount: 1 }),
      { merge: true }
    );
  });
});
