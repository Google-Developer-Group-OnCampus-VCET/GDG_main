import crypto from "node:crypto";
import { getAdminDb } from "@/lib/firebase/admin";
import { events as defaultEvents } from "@/content/events";
import { validateAndNormalizeRegistrationInput } from "@/lib/registration-validation";
import { getCached, setCached, invalidateCache, revalidateEventCaches, revalidateSiteCaches } from "./cache";
import { DEFAULT_CHAPTER_SETTINGS } from "@/lib/site-defaults";
import type {
  AuditLogEntry,
  ChapterEvent,
  ChapterSettings,
  ConfirmedAttendeeRecord,
  EmailLog,
  EventInput,
  EventUpdateInput,
  RegistrationInput,
  RegistrationRecord,
  RegistrationStatus,
  RegistrationUpdateInput,
} from "@/types";
import type { CreateRegistrationResult, EventStats } from "./index";

/**
 * Cloud Firestore Database Adapter for GDG on Campus VCET
 */

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildEventReferenceId(
  eventSlug: string,
  seq: number,
  randomOverride = false
): string {
  const numericPart = randomOverride
    ? String(Math.floor(1000 + Math.random() * 9000))
    : String(seq).padStart(4, "0");

  if (eventSlug === "dev-to-cloud" || eventSlug === "devcraft-2025") {
    return `GDG-VCET-2026-${numericPart}`;
  }

  const alnum = eventSlug.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const slugPrefix = (alnum + "EVNT").slice(0, 4);
  const hashNum = parseInt(
    crypto.createHash("sha256").update(eventSlug).digest("hex").slice(0, 6),
    16
  );
  const hashSuffix = (hashNum % 1296).toString(36).padStart(2, "0").toUpperCase();
  const eventCode = `${slugPrefix}${hashSuffix}`;

  return `GDG-${eventCode}-2026-${numericPart}`;
}

export async function createFirestoreEvent(
  input: EventInput
): Promise<{ success: boolean; event?: ChapterEvent; error?: string }> {
  const db = getAdminDb();
  if (!db) return { success: false, error: "FIRESTORE_UNAVAILABLE" };

  if (!input.title?.trim() || !input.startsAt?.trim()) {
    return { success: false, error: "Title and start date are required." };
  }

  const slug = (input.slug?.trim() || slugify(input.title));
  if (!slug) {
    return { success: false, error: "Invalid title or slug." };
  }

  try {
    const docRef = db.collection("events").doc(slug);
    const existing = await docRef.get();
    if (existing.exists) {
      return { success: false, error: `An event with slug "${slug}" already exists.` };
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const eventRecord: ChapterEvent = {
      id,
      slug,
      title: input.title.trim(),
      startsAt: input.startsAt.trim(),
      endsAt: input.endsAt?.trim() || undefined,
      timezone: input.timezone?.trim() || "Asia/Kolkata",
      format: input.format || "in-person",
      location: input.location?.trim() || "Vidyavardhini's College of Engineering and Technology, Vasai",
      topics: input.topics && input.topics.length > 0 ? input.topics : ["general"],
      summary: input.summary?.trim() || undefined,
      ...(input.image?.trim() ? { image: input.image.trim() } : {}),
      ...(input.url?.trim() ? { url: input.url.trim() } : {}),
      ...(input.cancelled !== undefined ? { cancelled: Boolean(input.cancelled) } : {}),
      capacity: input.capacity ?? 120,
      priceNote: input.priceNote?.trim() || undefined,
      isRegistrationOpen: input.isRegistrationOpen ?? true,
      ...(input.requireApproval !== undefined
        ? { requireApproval: Boolean(input.requireApproval) }
        : input.workshop?.registrationConfig?.requireApproval !== undefined
          ? { requireApproval: Boolean(input.workshop.registrationConfig.requireApproval) }
          : {}),
      registeredCount: 0,
      registrationUrl: `/events/${slug}/register`,
      ...(input.workshop ? { workshop: input.workshop } : {}),
    };

    const docPayload: Record<string, unknown> = {
      ...eventRecord,
      createdAt: now,
      updatedAt: now,
    };
    Object.keys(docPayload).forEach((k) => {
      if (docPayload[k] === undefined) delete docPayload[k];
    });

    await docRef.set(docPayload);

    invalidateCache("fs:");
    revalidateEventCaches(slug);
    return { success: true, event: eventRecord };
  } catch (err) {
    console.warn("Firestore createEvent failed:", (err as Error).message);
    return { success: false, error: (err as Error).message };
  }
}

export async function updateFirestoreEvent(
  slug: string,
  input: EventUpdateInput
): Promise<{ success: boolean; event?: ChapterEvent; error?: string } | null> {
  const db = getAdminDb();
  if (!db) return null;

  if (input.title !== undefined && !input.title.trim()) {
    return { success: false, error: "Title cannot be empty." };
  }
  if (input.startsAt !== undefined && !input.startsAt.trim()) {
    return { success: false, error: "Start date cannot be empty." };
  }
  if (
    input.capacity !== undefined &&
    (typeof input.capacity !== "number" || !Number.isFinite(input.capacity) || input.capacity < 1)
  ) {
    return { success: false, error: "Capacity must be at least 1." };
  }

  try {
    const docRef = db.collection("events").doc(slug);
    const existingDoc = await docRef.get();
    const defaultMatch = defaultEvents.find((e) => e.slug === slug);

    if (!existingDoc.exists && !defaultMatch) {
      return { success: false, error: "EVENT_NOT_FOUND" };
    }

    const existingData = existingDoc.data();
    if (existingData?.deleted === true) {
      return { success: false, error: "EVENT_NOT_FOUND" };
    }

    const now = new Date().toISOString();
    const updates: Record<string, unknown> = {
      updatedAt: now,
    };

    if (input.title !== undefined) updates.title = input.title.trim();
    if (input.startsAt !== undefined) updates.startsAt = input.startsAt.trim();
    if (input.endsAt !== undefined) updates.endsAt = input.endsAt.trim() || null;
    if (input.timezone !== undefined) updates.timezone = input.timezone.trim() || "Asia/Kolkata";
    if (input.format !== undefined) updates.format = input.format;
    if (input.location !== undefined) updates.location = input.location.trim();
    if (input.topics !== undefined) {
      updates.topics = input.topics.length > 0 ? input.topics : ["general"];
    }
    if (input.summary !== undefined) updates.summary = input.summary.trim() || null;
    if (input.image !== undefined) updates.image = input.image.trim() || null;
    if (input.url !== undefined) updates.url = input.url.trim() || null;
    if (input.cancelled !== undefined) updates.cancelled = Boolean(input.cancelled);
    if (input.priceNote !== undefined) updates.priceNote = input.priceNote.trim() || null;
    if (input.workshop !== undefined) {
      updates.workshop = input.workshop;
    }
    if (input.capacity !== undefined) {
      const cap = Math.floor(input.capacity);
      updates.capacity = cap;
      // Only update nested workshop.capacity when a full workshop doc already exists (prevents creating a partial stub that blocks static workshop merge)
      if (input.workshop) {
        updates.workshop = {
          ...input.workshop,
          capacity: cap,
          seatsText: `Limited to ${cap} Seats`,
        };
      } else if (existingData?.workshop && typeof existingData.workshop.headline === "string") {
        updates["workshop.capacity"] = cap;
        updates["workshop.seatsText"] = `Limited to ${cap} Seats`;
      }
    }
    if (input.isRegistrationOpen !== undefined) {
      updates.isRegistrationOpen = Boolean(input.isRegistrationOpen);
    }
    if (input.requireApproval !== undefined) {
      updates.requireApproval = Boolean(input.requireApproval);
      if (!input.workshop && existingData?.workshop && typeof existingData.workshop.headline === "string") {
        updates["workshop.registrationConfig.requireApproval"] = Boolean(input.requireApproval);
      }
    } else if (input.workshop?.registrationConfig?.requireApproval !== undefined) {
      updates.requireApproval = Boolean(input.workshop.registrationConfig.requireApproval);
    }

    if (!existingDoc.exists && defaultMatch) {
      const basePayload: Record<string, unknown> = {
        id: defaultMatch.id,
        slug: defaultMatch.slug,
        title: defaultMatch.title,
        startsAt: defaultMatch.startsAt,
        timezone: defaultMatch.timezone || "Asia/Kolkata",
        format: defaultMatch.format || "in-person",
        location:
          defaultMatch.location ||
          "Vidyavardhini's College of Engineering and Technology, Vasai",
        topics: defaultMatch.topics || ["general"],
        registrationUrl: defaultMatch.registrationUrl || `/events/${defaultMatch.slug}/register`,
        capacity: defaultMatch.capacity ?? defaultMatch.workshop?.capacity ?? 150,
        isRegistrationOpen: defaultMatch.workshop?.registrationConfig?.isOpen ?? true,
        createdAt: now,
        ...(defaultMatch.image ? { image: defaultMatch.image } : {}),
        ...(defaultMatch.url ? { url: defaultMatch.url } : {}),
        ...(defaultMatch.priceNote ? { priceNote: defaultMatch.priceNote } : {}),
        ...updates,
      };
      if (defaultMatch.endsAt && updates.endsAt === undefined) {
        basePayload.endsAt = defaultMatch.endsAt;
      }
      if (defaultMatch.summary && updates.summary === undefined) {
        basePayload.summary = defaultMatch.summary;
      }
      await docRef.set(basePayload);
    } else {
      await docRef.update(updates);
    }

    invalidateCache("fs:");
    revalidateEventCaches(slug);
    const updatedEvent = await getFirestoreEvent(slug);
    if (updatedEvent && defaultMatch?.workshop && !updatedEvent.workshop) {
      const cap = updatedEvent.capacity ?? defaultMatch.capacity ?? defaultMatch.workshop.capacity;
      updatedEvent.workshop = {
        ...defaultMatch.workshop,
        capacity: cap,
        seatsText: `Limited to ${cap} Seats`,
        venueText: updatedEvent.location || defaultMatch.workshop.venueText,
        registrationConfig: {
          ...defaultMatch.workshop.registrationConfig,
          ...(typeof updatedEvent.isRegistrationOpen === "boolean"
            ? { isOpen: updatedEvent.isRegistrationOpen }
            : {}),
        },
      };
    }

    return updatedEvent
      ? { success: true, event: updatedEvent }
      : { success: false, error: "EVENT_NOT_FOUND" };
  } catch (err) {
    console.warn("Firestore updateEvent failed:", (err as Error).message);
    return { success: false, error: (err as Error).message };
  }
}

export async function deleteFirestoreEvent(
  slug: string
): Promise<{ success: boolean; error?: string } | null> {
  const db = getAdminDb();
  if (!db) return null;

  try {
    const docRef = db.collection("events").doc(slug);
    const existingDoc = await docRef.get();
    const defaultMatch = defaultEvents.find((e) => e.slug === slug);

    if (!existingDoc.exists && !defaultMatch) {
      return { success: false, error: "EVENT_NOT_FOUND" };
    }

    if (defaultMatch) {
      // Soft-delete built-in default events so defaultEvents merger does not resurrect them
      await docRef.set(
        {
          slug,
          deleted: true,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } else {
      await docRef.delete();
    }

    invalidateCache("fs:");
    revalidateEventCaches(slug);
    return { success: true };
  } catch (err) {
    console.warn("Firestore deleteEvent failed:", (err as Error).message);
    return { success: false, error: (err as Error).message };
  }
}

function mapFirestoreEventDoc(docId: string, d: FirebaseFirestore.DocumentData): ChapterEvent {
  const capacity =
    typeof d.capacity === "number"
      ? d.capacity
      : typeof d.workshop?.capacity === "number"
        ? d.workshop.capacity
        : undefined;

  const hasFullWorkshop = Boolean(d.workshop && typeof d.workshop.headline === "string");
  const requireApproval =
    typeof d.requireApproval === "boolean"
      ? d.requireApproval
      : typeof d.workshop?.registrationConfig?.requireApproval === "boolean"
        ? d.workshop.registrationConfig.requireApproval
        : undefined;

  const workshop = hasFullWorkshop
    ? {
        ...d.workshop,
        ...(capacity !== undefined
          ? {
              capacity,
              seatsText: `Limited to ${capacity} Seats`,
            }
          : {}),
        ...(d.location ? { venueText: d.location } : {}),
        ...(typeof d.registeredCount === "number"
          ? { initialRegisteredCount: d.registeredCount }
          : {}),
        registrationConfig: {
          ...(d.workshop.registrationConfig || {}),
          ...(typeof d.isRegistrationOpen === "boolean"
            ? { isOpen: d.isRegistrationOpen }
            : {}),
          ...(typeof requireApproval === "boolean" ? { requireApproval } : {}),
        },
      }
    : undefined;

  return {
    id: d.id || docId,
    slug: d.slug || docId,
    title: d.title,
    startsAt: d.startsAt,
    endsAt: d.endsAt || undefined,
    timezone: d.timezone || "Asia/Kolkata",
    format: d.format || "in-person",
    location: d.location,
    topics: d.topics || ["general"],
    summary: d.summary || undefined,
    image: d.image || undefined,
    url: d.url || undefined,
    cancelled: typeof d.cancelled === "boolean" ? d.cancelled : undefined,
    capacity,
    priceNote: d.priceNote || undefined,
    isRegistrationOpen: typeof d.isRegistrationOpen === "boolean" ? d.isRegistrationOpen : undefined,
    ...(typeof requireApproval === "boolean" ? { requireApproval } : {}),
    registeredCount: typeof d.registeredCount === "number" ? d.registeredCount : undefined,
    registrationUrl: d.registrationUrl || `/events/${d.slug || docId}/register`,
    workshop,
  };
}

function resolveEffectiveCapacity(
  slug: string,
  rawCapacity: number,
  totalRegistered: number
): number {
  return slug === "dev-to-cloud"
    ? Math.max(135, rawCapacity)
    : rawCapacity === 120 && totalRegistered >= rawCapacity
      ? Math.max(rawCapacity, 135)
      : rawCapacity;
}

function buildPublicStatsObject(
  slug: string,
  rawCapacity: number,
  isRegistrationOpen: boolean,
  totalRegistered: number,
  pendingCount = 0,
  waitlistedCount = 0
): EventStats {
  const capacity = resolveEffectiveCapacity(slug, rawCapacity, totalRegistered);
  const remaining = Math.max(0, capacity - totalRegistered);
  const percentFilled =
    capacity > 0 ? Math.min(100, Math.round((totalRegistered / capacity) * 100)) : 100;

  return {
    totalRegistered,
    pendingCount,
    waitlistedCount,
    capacity,
    remaining,
    percentFilled,
    isOpen: Boolean(isRegistrationOpen) && remaining > 0,
    isRegistrationOpen: Boolean(isRegistrationOpen),
    checkedInCount: 0,
    trackCounts: {},
    yearCounts: {},
    departmentCounts: {},
  };
}

function buildEventStatsFromRegistrations(
  slug: string,
  rawCapacity: number,
  isRegistrationOpen: boolean,
  regs: RegistrationRecord[]
): EventStats {
  let totalRegistered = 0;
  let pendingCount = 0;
  let waitlistedCount = 0;
  let checkedInCount = 0;
  const dailyCheckedInCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  let multiDayCompletionCount = 0;
  const trackCounts: Record<string, number> = {};
  const yearCounts: Record<string, number> = {};
  const departmentCounts: Record<string, number> = {};
  const experienceCounts: Record<string, number> = {};
  const collegeFrequencies: Record<string, number> = {};
  const registrationDates: Record<string, number> = {};
  let vcetCount = 0;
  let otherCount = 0;

  for (const data of regs) {
    if (data.status === "pending") {
      pendingCount++;
      continue;
    }
    if (data.status === "waitlisted") {
      waitlistedCount++;
      continue;
    }
    if (data.status === "cancelled" || data.status === "declined") continue;
    totalRegistered++;
    if (data.checkedIn) checkedInCount++;

    const days: number[] = Array.isArray(data.checkedInDays)
      ? data.checkedInDays
      : data.checkedIn
        ? [1]
        : [];
    days.forEach((d) => {
      dailyCheckedInCounts[d] = (dailyCheckedInCounts[d] || 0) + 1;
    });
    if (days.length >= 4) {
      multiDayCompletionCount++;
    }

    if (data.track) {
      trackCounts[data.track] = (trackCounts[data.track] || 0) + 1;
    }
    if (data.yearOfStudy) {
      yearCounts[data.yearOfStudy] = (yearCounts[data.yearOfStudy] || 0) + 1;
    }
    if (data.department) {
      departmentCounts[data.department] = (departmentCounts[data.department] || 0) + 1;
    }
    if (data.experienceLevel) {
      experienceCounts[data.experienceLevel] =
        (experienceCounts[data.experienceLevel] || 0) + 1;
    }
    if (data.college) {
      const col = String(data.college).trim();
      const isVcet =
        col.toLowerCase().includes("vcet") ||
        col.toLowerCase().includes("vidyavardhini");
      if (isVcet) {
        vcetCount++;
      } else {
        otherCount++;
        collegeFrequencies[col] = (collegeFrequencies[col] || 0) + 1;
      }
    }
    if (data.createdAt) {
      const dateStr = String(data.createdAt).slice(0, 10);
      registrationDates[dateStr] = (registrationDates[dateStr] || 0) + 1;
    }
  }

  const topColleges = Object.entries(collegeFrequencies)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([college, count]) => ({ college, count }));
  const vcetPercent =
    totalRegistered > 0 ? Math.round((vcetCount / totalRegistered) * 100) : 0;

  const base = buildPublicStatsObject(
    slug,
    rawCapacity,
    isRegistrationOpen,
    totalRegistered,
    pendingCount,
    waitlistedCount
  );

  return {
    ...base,
    checkedInCount,
    dailyCheckedInCounts,
    multiDayCompletionCount,
    trackCounts,
    yearCounts,
    departmentCounts,
    experienceCounts,
    collegeStats: {
      vcetCount,
      otherCount,
      vcetPercent,
      topColleges,
    },
    registrationDates,
  };
}

async function getAllEventRegistrationsFromFirestore(
  eventSlug: string
): Promise<RegistrationRecord[] | null> {
  const cacheKey = `fs:regs:${eventSlug}`;
  const cached = getCached<RegistrationRecord[]>(cacheKey);
  if (cached) return cached;

  const db = getAdminDb();
  if (!db) return null;

  try {
    const snapshot = await db
      .collection("registrations")
      .where("eventSlug", "==", eventSlug)
      .get();

    const list: RegistrationRecord[] = [];
    snapshot.forEach((doc) => {
      const d = doc.data();
      list.push({
        id: doc.id,
        eventSlug: d.eventSlug,
        referenceId: d.referenceId,
        fullName: d.fullName,
        email: d.email,
        phone: d.phone,
        college: d.college,
        department: d.department,
        yearOfStudy: d.yearOfStudy,
        track: d.track,
        experienceLevel: d.experienceLevel,
        portfolioUrl: d.portfolioUrl || undefined,
        notes: d.notes || undefined,
        status: d.status || "confirmed",
        checkedIn: Boolean(d.checkedIn),
        checkedInAt: d.checkedInAt || undefined,
        checkedInDays: Array.isArray(d.checkedInDays)
          ? d.checkedInDays
          : d.checkedIn
            ? [1]
            : [],
        checkIns:
          typeof d.checkIns === "object" && d.checkIns !== null
            ? d.checkIns
            : d.checkedIn && d.checkedInAt
              ? { 1: d.checkedInAt }
              : {},
        createdAt: d.createdAt || new Date().toISOString(),
      });
    });

    setCached(cacheKey, list, 30 * 1000);
    return list;
  } catch (err) {
    console.warn("Firestore getRegistrations failed:", (err as Error).message);
    return null;
  }
}

export async function getFirestoreDeletedEventSlugs(): Promise<string[]> {
  return getCached<string[]>("fs:deleted-events") ?? [];
}

export async function getFirestoreEvents(): Promise<ChapterEvent[] | null> {
  const cacheKey = "fs:events";
  const cached = getCached<ChapterEvent[]>(cacheKey);
  if (cached) return cached;

  const db = getAdminDb();
  if (!db) return null;

  try {
    const snapshot = await db.collection("events").get();
    if (snapshot.empty) {
      setCached("fs:deleted-events", [], 60 * 1000);
      return [];
    }

    const list: ChapterEvent[] = [];
    const deletedSlugs: string[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data?.deleted === true) {
        deletedSlugs.push(data.slug || doc.id);
        return;
      }
      const event = mapFirestoreEventDoc(doc.id, data);
      list.push(event);
      setCached(`fs:event:${event.slug}`, event, 60 * 1000);
    });

    setCached("fs:deleted-events", deletedSlugs, 60 * 1000);
    setCached(cacheKey, list, 60 * 1000);
    return list;
  } catch (err) {
    console.warn("Firestore getEvents failed:", (err as Error).message);
    return null;
  }
}

export async function getFirestoreEvent(slug: string): Promise<ChapterEvent | null> {
  const cacheKey = `fs:event:${slug}`;
  const cached = getCached<ChapterEvent>(cacheKey);
  if (cached) return cached;

  const db = getAdminDb();
  if (!db) return null;

  try {
    const doc = await db.collection("events").doc(slug).get();
    if (!doc.exists) return null;

    const d = doc.data();
    if (!d || d.deleted === true) return null;

    const eventResult = mapFirestoreEventDoc(doc.id, d);
    setCached(cacheKey, eventResult, 60 * 1000);
    return eventResult;
  } catch (err) {
    console.warn("Firestore getEvent failed:", (err as Error).message);
    return null;
  }
}

export async function seedFirestoreInitialEvents(initialEvents: ChapterEvent[]): Promise<void> {
  const db = getAdminDb();
  if (!db) return;

  try {
    const snapshot = await db.collection("events").limit(1).get();
    if (!snapshot.empty) return; // Already seeded

    const batch = db.batch();
    for (const event of initialEvents) {
      const docRef = db.collection("events").doc(event.slug);
      batch.set(docRef, {
        id: event.id,
        slug: event.slug,
        title: event.title,
        startsAt: event.startsAt,
        endsAt: event.endsAt || null,
        timezone: event.timezone || "Asia/Kolkata",
        format: event.format || "in-person",
        location: event.location || "Vidyavardhini's College of Engineering and Technology, Vasai",
        topics: event.topics || ["general"],
        summary: event.summary || "",
        capacity: event.workshop?.capacity ?? 150,
        registeredCount: event.workshop?.initialRegisteredCount ?? 0,
        isRegistrationOpen: event.workshop?.registrationConfig?.isOpen ?? false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    await batch.commit();
    invalidateCache("fs:event");
  } catch (err) {
    console.warn("Firestore seedInitialEvents failed:", (err as Error).message);
  }
}

/**
 * Lightweight stats reader for public pages: uses the single `events/{slug}` document's
 * denormalized `registeredCount` (0 extra Firestore reads if `preloadedEvent` is passed,
 * or 1 doc read otherwise) instead of scanning all registration documents.
 */
export async function getFirestorePublicEventStats(
  slug: string,
  preloadedEvent?: ChapterEvent | null
): Promise<EventStats | null> {
  const cacheKey = `fs:public-stats:${slug}`;
  const cached = getCached<EventStats>(cacheKey);
  if (cached) return cached;

  const db = getAdminDb();
  if (!db) return null;

  try {
    const fsEvent = preloadedEvent ?? (await getFirestoreEvent(slug));
    const defaultMatch = defaultEvents.find((e) => e.slug === slug);
    const rawCapacity =
      fsEvent?.capacity ??
      fsEvent?.workshop?.capacity ??
      defaultMatch?.capacity ??
      defaultMatch?.workshop?.capacity ??
      120;
    const isRegistrationOpen =
      fsEvent?.isRegistrationOpen ??
      defaultMatch?.workshop?.registrationConfig?.isOpen ??
      true;

    if (fsEvent && typeof fsEvent.registeredCount === "number") {
      const statsResult = buildPublicStatsObject(
        slug,
        rawCapacity,
        Boolean(isRegistrationOpen),
        fsEvent.registeredCount
      );
      setCached(cacheKey, statsResult, 30 * 1000);
      return statsResult;
    }

    // Backfill path: only when `events/{slug}` has no `registeredCount` yet.
    const fullStats = await getFirestoreEventStats(slug);
    if (fullStats) {
      setCached(cacheKey, fullStats, 30 * 1000);
      return fullStats;
    }
    return null;
  } catch (err) {
    console.warn("Firestore getPublicEventStats failed:", (err as Error).message);
    return null;
  }
}

export async function getFirestoreEventStats(slug: string): Promise<EventStats | null> {
  const cacheKey = `fs:stats:${slug}`;
  const cached = getCached<EventStats>(cacheKey);
  if (cached) return cached;

  const db = getAdminDb();
  if (!db) return null;

  try {
    const [fsEvent, regs] = await Promise.all([
      getFirestoreEvent(slug),
      getAllEventRegistrationsFromFirestore(slug),
    ]);
    if (regs === null) return null;

    const defaultMatch = defaultEvents.find((e) => e.slug === slug);
    const rawCapacity =
      fsEvent?.capacity ??
      fsEvent?.workshop?.capacity ??
      defaultMatch?.capacity ??
      defaultMatch?.workshop?.capacity ??
      120;
    const isRegistrationOpen =
      fsEvent?.isRegistrationOpen ??
      defaultMatch?.workshop?.registrationConfig?.isOpen ??
      true;

    const statsResult = buildEventStatsFromRegistrations(
      slug,
      rawCapacity,
      Boolean(isRegistrationOpen),
      regs
    );

    // Opportunistically heal missing/drifted `registeredCount` on the event doc so public 1-doc reads stay exact
    if (fsEvent && fsEvent.registeredCount !== statsResult.totalRegistered) {
      db.collection("events")
        .doc(slug)
        .set(
          {
            registeredCount: statsResult.totalRegistered,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        )
        .then(() => {
          invalidateCache("fs:event");
        })
        .catch(() => {});
    }

    setCached(cacheKey, statsResult, 30 * 1000);
    setCached(`fs:public-stats:${slug}`, statsResult, 30 * 1000);
    return statsResult;
  } catch (err) {
    console.warn("Firestore getEventStats failed:", (err as Error).message);
    return null;
  }
}

export async function getFirestoreRegistrations(
  eventSlug: string,
  options?: { search?: string; track?: string; status?: string; checkedIn?: string }
): Promise<RegistrationRecord[] | null> {
  const records = await getAllEventRegistrationsFromFirestore(eventSlug);
  if (records === null) return null;

  let filtered = [...records];

  if (options?.track && options.track !== "all") {
    filtered = filtered.filter((r) => r.track === options.track);
  }

  if (options?.status && options.status !== "all") {
    filtered = filtered.filter((r) => r.status === options.status);
  }

  // Client-side filtering for search & checkedIn filter
  if (options?.checkedIn !== undefined && options.checkedIn !== "all") {
    if (options.checkedIn.startsWith("day-")) {
      const targetDay = Number(options.checkedIn.replace("day-", ""));
      filtered = filtered.filter((r) => r.checkedInDays?.includes(targetDay));
    } else if (options.checkedIn === "all-days") {
      filtered = filtered.filter((r) => (r.checkedInDays?.length ?? 0) >= 4);
    } else if (
      options.checkedIn === "absent" ||
      options.checkedIn === "not-checked-in" ||
      options.checkedIn === "false" ||
      options.checkedIn === "0"
    ) {
      filtered = filtered.filter((r) => !r.checkedIn || (r.checkedInDays?.length ?? 0) === 0);
    } else {
      const isChecked =
        options.checkedIn === "true" ||
        options.checkedIn === "1" ||
        options.checkedIn === "checked-in";
      filtered = filtered.filter((r) => r.checkedIn === isChecked);
    }
  }

  if (options?.search) {
    const term = options.search.toLowerCase();
    filtered = filtered.filter(
      (r) =>
        r.fullName.toLowerCase().includes(term) ||
        r.email.toLowerCase().includes(term) ||
        r.referenceId.toLowerCase().includes(term) ||
        r.college.toLowerCase().includes(term)
    );
  }

  // Sort by createdAt desc
  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return filtered;
}

export interface PaginatedRegistrationsResult {
  registrations: RegistrationRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  counts: {
    confirmed: number;
    pending: number;
    waitlisted: number;
    removed: number;
    all: number;
  };
}

/**
 * Paginated registrations query — fetches only the slice needed for the current
 * admin table page, minimising Firestore document reads to pageSize per request.
 *
 * Search is done in-memory across the already-cached full list (search terms
 * cannot be efficiently indexed in Firestore without a 3rd-party search engine).
 * Status / track filters are applied before pagination so counts are accurate.
 */
export async function getFirestoreRegistrationsPaginated(
  eventSlug: string,
  options: {
    page?: number;
    pageSize?: number;
    status?: string;
    track?: string;
    checkedIn?: string;
    search?: string;
    department?: string;
    yearOfStudy?: string;
  } = {}
): Promise<PaginatedRegistrationsResult | null> {
  // We still use the in-memory cached list as the base so we don't hammer Firestore
  // on every keystroke. The cache TTL is 30 s — fresh enough for admin use.
  const records = await getAllEventRegistrationsFromFirestore(eventSlug);
  if (records === null) return null;

  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(2000, Math.max(1, options.pageSize ?? 50));

  // ── Apply all filters ──────────────────────────────────────────────────────

  let filtered = [...records];

  // Status
  if (options.status && options.status !== "all") {
    if (options.status === "confirmed") {
      filtered = filtered.filter((r) => !r.status || r.status === "confirmed");
    } else if (options.status === "removed") {
      filtered = filtered.filter((r) => r.status === "cancelled" || r.status === "declined");
    } else {
      filtered = filtered.filter((r) => r.status === options.status);
    }
  }

  // Track
  if (options.track && options.track !== "all") {
    filtered = filtered.filter((r) => r.track === options.track);
  }

  // Department
  if (options.department && options.department !== "all") {
    filtered = filtered.filter((r) =>
      r.department?.toLowerCase() === options.department!.toLowerCase()
    );
  }

  // Year of study
  if (options.yearOfStudy && options.yearOfStudy !== "all") {
    filtered = filtered.filter((r) =>
      r.yearOfStudy?.toLowerCase() === options.yearOfStudy!.toLowerCase()
    );
  }

  // Check-in filter
  if (options.checkedIn && options.checkedIn !== "all") {
    if (options.checkedIn.startsWith("day-")) {
      const d = Number(options.checkedIn.replace("day-", ""));
      filtered = filtered.filter((r) => r.checkedInDays?.includes(d) || (d === 1 && r.checkedIn));
    } else if (options.checkedIn === "all-days") {
      filtered = filtered.filter((r) =>
        [1, 2, 3, 4].every((d) => r.checkedInDays?.includes(d))
      );
    } else if (options.checkedIn === "checked-in") {
      filtered = filtered.filter((r) => r.checkedIn || (r.checkedInDays?.length ?? 0) > 0);
    } else if (options.checkedIn === "absent" || options.checkedIn === "not-checked-in") {
      filtered = filtered.filter((r) => !r.checkedIn && (r.checkedInDays?.length ?? 0) === 0);
    }
  }

  // Full-text search
  if (options.search?.trim()) {
    const term = options.search.trim().toLowerCase();
    filtered = filtered.filter(
      (r) =>
        r.fullName.toLowerCase().includes(term) ||
        r.email.toLowerCase().includes(term) ||
        r.referenceId.toLowerCase().includes(term) ||
        r.college.toLowerCase().includes(term) ||
        r.department?.toLowerCase().includes(term) ||
        r.phone?.includes(term)
    );
  }

  // Sort newest first
  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // ── Counts for tab badges (across all statuses on the base filtered set before status filter) ─
  const all = [...records];
  const applyNonStatusFilters = (arr: RegistrationRecord[]) => {
    let r = arr;
    if (options.track && options.track !== "all") r = r.filter((x) => x.track === options.track);
    if (options.department && options.department !== "all") r = r.filter((x) => x.department?.toLowerCase() === options.department!.toLowerCase());
    if (options.yearOfStudy && options.yearOfStudy !== "all") r = r.filter((x) => x.yearOfStudy?.toLowerCase() === options.yearOfStudy!.toLowerCase());
    if (options.search?.trim()) {
      const term = options.search.trim().toLowerCase();
      r = r.filter((x) => x.fullName.toLowerCase().includes(term) || x.email.toLowerCase().includes(term) || x.referenceId.toLowerCase().includes(term) || x.college.toLowerCase().includes(term));
    }
    return r;
  };
  const base = applyNonStatusFilters(all);
  const counts = {
    confirmed: base.filter((r) => !r.status || r.status === "confirmed").length,
    pending: base.filter((r) => r.status === "pending").length,
    waitlisted: base.filter((r) => r.status === "waitlisted").length,
    removed: base.filter((r) => r.status === "cancelled" || r.status === "declined").length,
    all: base.length,
  };

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const slice = filtered.slice((page - 1) * pageSize, page * pageSize);

  return { registrations: slice, total, page, pageSize, totalPages, counts };
}

export async function createFirestoreRegistration(
  eventSlug: string,
  input: RegistrationInput,
  options?: { forceConfirmed?: boolean }
): Promise<CreateRegistrationResult | null> {
  const validated = validateAndNormalizeRegistrationInput(input);
  if (!validated.valid) {
    return { success: false, error: "INVALID_INPUT", message: validated.message };
  }

  const {
    fullName,
    email: emailNormalized,
    phone,
    college,
    department,
    yearOfStudy,
    track,
    experienceLevel,
    portfolioUrl,
    notes,
  } = validated.data;

  const db = getAdminDb();
  if (!db) return null;

  const regDocId = crypto
    .createHash("sha256")
    .update(`${eventSlug}::${emailNormalized}`)
    .digest("hex");

  try {
    const txResult = await db.runTransaction<CreateRegistrationResult>(async (transaction) => {
      // 1. Read events/{eventSlug} (1 read)
      const eventDocRef = db.collection("events").doc(eventSlug);
      const eventDoc = await transaction.get(eventDocRef);
      const defaultMatch = defaultEvents.find((e) => e.slug === eventSlug);

      if (!eventDoc.exists && !defaultMatch) {
        return {
          success: false,
          error: "EVENT_NOT_FOUND",
          message: "Event not found.",
        };
      }

      const eventData = eventDoc.data();
      const rawCapacity =
        typeof eventData?.capacity === "number"
          ? eventData.capacity
          : typeof eventData?.workshop?.capacity === "number"
            ? eventData.workshop.capacity
            : defaultMatch?.capacity ?? defaultMatch?.workshop?.capacity ?? 120;
      const isRegistrationOpen = Boolean(
        eventData?.isRegistrationOpen ??
        eventData?.is_registration_open ??
        defaultMatch?.workshop?.registrationConfig?.isOpen ??
        true
      );

      const requireApproval = Boolean(
        eventData?.requireApproval ??
        eventData?.workshop?.registrationConfig?.requireApproval ??
        defaultMatch?.requireApproval ??
        defaultMatch?.workshop?.registrationConfig?.requireApproval ??
        false
      );
      const isPending = requireApproval && !options?.forceConfirmed;

      if (!isRegistrationOpen) {
        return {
          success: false,
          error: "REGISTRATION_CLOSED",
          message: "Registration for this event is currently closed.",
        };
      }

      // 2. Read registrations/{regDocId} (1 read) for O(1) duplicate email check
      const regDocRef = db.collection("registrations").doc(regDocId);
      const existingRegDoc = await transaction.get(regDocRef);
      if (existingRegDoc.exists) {
        const existingData = existingRegDoc.data();
        if (existingData?.status !== "cancelled" && existingData?.status !== "declined") {
          return {
            success: false,
            error: "DUPLICATE_EMAIL",
            message:
              existingData?.status === "pending"
                ? "An application with this email is already pending host review."
                : "This email is already registered for this event.",
          };
        }
      }

      // 3. Determine currentCount using denormalized registeredCount (0 extra reads); scan only to bootstrap uninitialized events
      let currentCount: number;
      if (eventDoc.exists && typeof eventData?.registeredCount === "number") {
        currentCount = eventData.registeredCount;
      } else {
        const regsSnap = await transaction.get(
          db.collection("registrations").where("eventSlug", "==", eventSlug)
        );
        currentCount = regsSnap.docs.filter((d) => {
          const st = d.data().status;
          return !st || st === "confirmed";
        }).length;
      }

      // Peak capacity: dev-to-cloud is fixed at 135 peak capacity. Other events auto-expand if initial 120 is reached.
      const effectiveCapacity =
        eventSlug === "dev-to-cloud"
          ? Math.max(135, rawCapacity)
          : rawCapacity === 120 && currentCount >= rawCapacity
            ? Math.max(rawCapacity, 135)
            : rawCapacity;

      if (!isPending && currentCount >= effectiveCapacity) {
        return {
          success: false,
          error: "CAPACITY_FULL",
          message: `Workshop capacity has been reached (${currentCount}/${effectiveCapacity} seats reserved).`,
        };
      }

      // 4. Generate referenceId and run 1 indexed uniqueness check before any writes
      const pendingBase =
        typeof eventData?.pendingCount === "number" ? eventData.pendingCount : 0;
      const refSeed = isPending ? currentCount + pendingBase + 1 : currentCount + 1;
      let referenceId = buildEventReferenceId(eventSlug, refSeed, isPending);
      const refCheckSnap = await transaction.get(
        db.collection("registrations").where("referenceId", "==", referenceId).limit(1)
      );
      if (!refCheckSnap.empty) {
        referenceId = buildEventReferenceId(eventSlug, refSeed, true);
      }

      // 5. All reads complete — perform writes
      const createdAt = new Date().toISOString();

      const newRegistration: RegistrationRecord = {
        id: regDocRef.id,
        eventSlug,
        referenceId,
        fullName,
        email: emailNormalized,
        phone,
        college,
        department,
        yearOfStudy,
        track,
        experienceLevel,
        ...(portfolioUrl ? { portfolioUrl } : {}),
        ...(notes ? { notes } : {}),
        status: isPending ? "pending" : "confirmed",
        checkedIn: false,
        createdAt,
      };

      transaction.set(regDocRef, newRegistration);

      if (eventDoc.exists) {
        const eventUpdates: Record<string, unknown> = isPending
          ? {
              pendingCount: pendingBase + 1,
              updatedAt: createdAt,
            }
          : {
              registeredCount: currentCount + 1,
              updatedAt: createdAt,
            };
        if (!isPending && (eventSlug === "dev-to-cloud" || rawCapacity === 120) && currentCount + 1 >= 120) {
          eventUpdates.capacity = 135;
          eventUpdates["workshop.capacity"] = 135;
        }
        transaction.update(eventDocRef, eventUpdates);
      } else if (defaultMatch) {
        const eventDocPayload: Record<string, unknown> = {
          id: defaultMatch.id,
          slug: defaultMatch.slug,
          title: defaultMatch.title,
          startsAt: defaultMatch.startsAt,
          timezone: defaultMatch.timezone || "Asia/Kolkata",
          format: defaultMatch.format || "in-person",
          location:
            defaultMatch.location ||
            "Vidyavardhini's College of Engineering and Technology, Vasai",
          topics: defaultMatch.topics || ["general"],
          registrationUrl: defaultMatch.registrationUrl || `/events/${defaultMatch.slug}/register`,
          capacity:
            !isPending && (eventSlug === "dev-to-cloud" || rawCapacity === 120) && currentCount + 1 >= 120
              ? 135
              : rawCapacity,
          isRegistrationOpen,
          requireApproval,
          registeredCount: isPending ? currentCount : currentCount + 1,
          pendingCount: isPending ? pendingBase + 1 : pendingBase,
          createdAt,
          updatedAt: createdAt,
        };
        if (defaultMatch.endsAt) eventDocPayload.endsAt = defaultMatch.endsAt;
        if (defaultMatch.summary) eventDocPayload.summary = defaultMatch.summary;
        transaction.set(eventDocRef, eventDocPayload);
      }

      return {
        success: true,
        registration: newRegistration,
      };
    });

    if (txResult && txResult.success) {
      invalidateCache("fs:");
      revalidateEventCaches(eventSlug);
    }
    return txResult;
  } catch (err) {
    console.warn("Firestore createRegistration failed:", (err as Error).message);
    return null;
  }
}

export async function cancelFirestoreRegistration(
  referenceId: string
): Promise<boolean> {
  const db = getAdminDb();
  if (!db) return false;

  const ref = referenceId.trim().toUpperCase();
  try {
    const txResult = await db.runTransaction<{ ok: boolean; eventSlug?: string }>(
      async (transaction) => {
        const snap = await transaction.get(
          db.collection("registrations").where("referenceId", "==", ref).limit(1)
        );
        if (snap.empty) return { ok: false };

        const docRef = snap.docs[0].ref;
        const regData = snap.docs[0].data();
        const eventSlug = typeof regData.eventSlug === "string" ? regData.eventSlug : undefined;

        if (regData.status === "cancelled") {
          return { ok: true, eventSlug };
        }

        const wasConfirmed = !regData.status || regData.status === "confirmed";
        const now = new Date().toISOString();
        let nextCount: number | undefined;
        let eventDocRef: FirebaseFirestore.DocumentReference | undefined;

        if (eventSlug && wasConfirmed) {
          eventDocRef = db.collection("events").doc(eventSlug);
          const eventDoc = await transaction.get(eventDocRef);
          const eventData = eventDoc.data();
          if (eventDoc.exists && typeof eventData?.registeredCount === "number") {
            nextCount = Math.max(0, eventData.registeredCount - 1);
          } else {
            const regsSnap = await transaction.get(
              db.collection("registrations").where("eventSlug", "==", eventSlug)
            );
            nextCount = regsSnap.docs.filter(
              (d) => d.id !== docRef.id && (!d.data().status || d.data().status === "confirmed")
            ).length;
          }
        }

        transaction.update(docRef, {
          status: "cancelled",
          cancelledAt: now,
        });

        if (eventDocRef && nextCount !== undefined) {
          transaction.set(
            eventDocRef,
            {
              registeredCount: nextCount,
              updatedAt: now,
            },
            { merge: true }
          );
        }

        return { ok: true, eventSlug };
      }
    );

    if (!txResult.ok) return false;
    invalidateCache("fs:");
    revalidateEventCaches(txResult.eventSlug);
    return true;
  } catch (err) {
    console.warn("Firestore cancel error:", (err as Error).message);
    return false;
  }
}

export async function deleteFirestoreRegistration(
  referenceId: string
): Promise<boolean> {
  const db = getAdminDb();
  if (!db) return false;

  const ref = referenceId.trim().toUpperCase();
  try {
    const txResult = await db.runTransaction<{ ok: boolean; eventSlug?: string }>(
      async (transaction) => {
        const snap = await transaction.get(
          db.collection("registrations").where("referenceId", "==", ref).limit(1)
        );
        if (snap.empty) return { ok: false };

        const docRef = snap.docs[0].ref;
        const regData = snap.docs[0].data();
        const eventSlug = typeof regData.eventSlug === "string" ? regData.eventSlug : undefined;
        const wasActive = !regData.status || regData.status === "confirmed";

        const now = new Date().toISOString();
        let nextCount: number | undefined;
        let eventDocRef: FirebaseFirestore.DocumentReference | undefined;

        if (eventSlug && wasActive) {
          eventDocRef = db.collection("events").doc(eventSlug);
          const eventDoc = await transaction.get(eventDocRef);
          const eventData = eventDoc.data();
          if (eventDoc.exists && typeof eventData?.registeredCount === "number") {
            nextCount = Math.max(0, eventData.registeredCount - 1);
          } else {
            const regsSnap = await transaction.get(
              db.collection("registrations").where("eventSlug", "==", eventSlug)
            );
            nextCount = regsSnap.docs.filter(
              (d) => d.id !== docRef.id && d.data().status !== "cancelled"
            ).length;
          }
        }

        transaction.delete(docRef);

        if (eventDocRef && nextCount !== undefined) {
          transaction.set(
            eventDocRef,
            {
              registeredCount: nextCount,
              updatedAt: now,
            },
            { merge: true }
          );
        }

        return { ok: true, eventSlug };
      }
    );

    if (!txResult.ok) return false;
    invalidateCache("fs:");
    revalidateEventCaches(txResult.eventSlug);
    return true;
  } catch (err) {
    console.warn("Firestore delete error:", (err as Error).message);
    return false;
  }
}

export async function checkInFirestoreAttendee(
  eventSlug: string,
  referenceId: string,
  day?: number
): Promise<{ success: boolean; message: string; registration?: RegistrationRecord } | null> {
  const db = getAdminDb();
  if (!db) return null;

  const ref = referenceId.trim().toUpperCase();

  try {
    const query = db
      .collection("registrations")
      .where("eventSlug", "==", eventSlug)
      .where("referenceId", "==", ref)
      .limit(1);

    const snap = await query.get();
    if (snap.empty) {
      return { success: false, message: "Pass reference was not found for this event." };
    }

    const doc = snap.docs[0];
    const data = doc.data() as RegistrationRecord;

    if (data.status && data.status !== "confirmed") {
      const reason =
        data.status === "pending"
          ? "is PENDING HOST APPROVAL and cannot be checked in yet."
          : data.status === "waitlisted"
            ? "is on the WAITLIST and has not been approved yet."
            : `is ${data.status.toUpperCase()} and is not valid for entry.`;
      return {
        success: false,
        message: `${data.fullName}'s registration ${reason}`,
        registration: data,
      };
    }

    const existingDays: number[] = Array.isArray(data.checkedInDays)
      ? data.checkedInDays
      : data.checkedIn
        ? [1]
        : [];
    const existingCheckIns: Record<number, string> =
      typeof data.checkIns === "object" && data.checkIns !== null
        ? data.checkIns
        : data.checkedIn && data.checkedInAt
          ? { 1: data.checkedInAt }
          : {};

    const targetDay = day !== undefined && day >= 1 ? day : 1;

    if (day !== undefined) {
      if (existingDays.includes(targetDay)) {
        return {
          success: false,
          message: `${data.fullName} is ALREADY checked in for Day ${targetDay} at ${existingCheckIns[targetDay] || data.checkedInAt}.`,
          registration: {
            ...data,
            checkedInDays: existingDays,
            checkIns: existingCheckIns,
          },
        };
      }
    } else {
      if (data.checkedIn) {
        return {
          success: false,
          message: `${data.fullName} was ALREADY checked in at ${data.checkedInAt}.`,
          registration: {
            ...data,
            checkedInDays: existingDays,
            checkIns: existingCheckIns,
          },
        };
      }
    }

    const now = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    const updatedDays = Array.from(new Set([...existingDays, targetDay])).sort((a, b) => a - b);
    const updatedCheckIns = { ...existingCheckIns, [targetDay]: now };

    await doc.ref.update({
      checkedIn: true,
      checkedInAt: now,
      checkedInDays: updatedDays,
      checkIns: updatedCheckIns,
    });

    const updated: RegistrationRecord = {
      ...data,
      checkedIn: true,
      checkedInAt: now,
      checkedInDays: updatedDays,
      checkIns: updatedCheckIns,
    };

    const dayText = day !== undefined ? ` for Day ${targetDay}` : "";
    const progressText = updatedDays.length > 1 ? ` (${updatedDays.length}/4 Days Attended)` : "";

    invalidateCache("fs:");
    return {
      success: true,
      message: `Successfully checked in ${data.fullName}${dayText}!${progressText}`,
      registration: updated,
    };
  } catch (err) {
    console.warn("Firestore checkInAttendee failed:", (err as Error).message);
    return null;
  }
}

export async function logFirestoreEmail(log: EmailLog): Promise<boolean> {
  const db = getAdminDb();
  if (!db) return false;
  try {
    await db.collection("email_logs").doc(log.id).set({
      ...log,
      createdAt: log.sentAt || new Date().toISOString(),
    });
    invalidateCache("fs:email-logs");
    return true;
  } catch (err) {
    console.warn("Failed to write email log to Firestore:", (err as Error).message);
    return false;
  }
}

export async function getFirestoreEmailLogs(eventSlug: string): Promise<EmailLog[] | null> {
  const cacheKey = `fs:email-logs:${eventSlug}`;
  const cached = getCached<EmailLog[]>(cacheKey);
  if (cached) return cached;

  const db = getAdminDb();
  if (!db) return null;
  try {
    const snap = await db
      .collection("email_logs")
      .where("eventSlug", "==", eventSlug)
      .limit(50)
      .get();

    const logs: EmailLog[] = [];
    snap.forEach((doc) => {
      const d = doc.data() as EmailLog;
      logs.push(d);
    });
    logs.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
    setCached(cacheKey, logs, 30 * 1000);
    return logs;
  } catch (err) {
    console.warn("Failed to fetch email logs from Firestore:", (err as Error).message);
    return null;
  }
}

export async function logFirestoreAudit(entry: AuditLogEntry): Promise<boolean> {
  const db = getAdminDb();
  if (!db) return false;
  try {
    await db.collection("audit_logs").doc(entry.id).set({
      ...entry,
      createdAt: entry.timestamp || new Date().toISOString(),
    });
    invalidateCache("fs:audit-logs");
    return true;
  } catch (err) {
    console.warn("Failed to write audit log to Firestore:", (err as Error).message);
    return false;
  }
}

export async function getFirestoreAuditLogs(options?: {
  eventSlug?: string;
  action?: string;
  limit?: number;
}): Promise<AuditLogEntry[] | null> {
  const maxLimit = Math.min(options?.limit ?? 100, 200);
  const cacheKey = `fs:audit-logs:${options?.eventSlug || "all"}:${options?.action || "all"}:${maxLimit}`;
  const cached = getCached<AuditLogEntry[]>(cacheKey);
  if (cached) return cached;

  const db = getAdminDb();
  if (!db) return null;
  try {
    let query: FirebaseFirestore.Query = db.collection("audit_logs");

    if (options?.eventSlug && options.eventSlug !== "all") {
      query = query.where("eventSlug", "==", options.eventSlug);
    }
    if (options?.action && options.action !== "all") {
      query = query.where("action", "==", options.action);
    }

    const snap = await query.limit(maxLimit).get();
    const logs: AuditLogEntry[] = [];
    snap.forEach((doc) => {
      const d = doc.data() as AuditLogEntry;
      logs.push(d);
    });

    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setCached(cacheKey, logs, 30 * 1000);
    return logs;
  } catch (err) {
    console.warn("Failed to fetch audit logs from Firestore:", (err as Error).message);
    return null;
  }
}

export async function updateFirestoreRegistration(
  eventSlug: string,
  referenceId: string,
  updates: RegistrationUpdateInput
): Promise<{ success: boolean; message: string; registration?: RegistrationRecord } | null> {
  const db = getAdminDb();
  if (!db) return null;

  const ref = referenceId.trim().toUpperCase();
  try {
    const txResult = await db.runTransaction<{
      success: boolean;
      message: string;
      registration?: RegistrationRecord;
    }>(async (transaction) => {
      const snap = await transaction.get(
        db
          .collection("registrations")
          .where("eventSlug", "==", eventSlug)
          .where("referenceId", "==", ref)
          .limit(1)
      );
      if (snap.empty) {
        return { success: false, message: "Pass reference was not found for this event." };
      }

      const docRef = snap.docs[0].ref;
      const existing = snap.docs[0].data() as RegistrationRecord;

      const patch: Record<string, unknown> = {};
      if (updates.fullName !== undefined && updates.fullName.trim()) {
        patch.fullName = updates.fullName.trim();
      }
      if (updates.email !== undefined && updates.email.trim()) {
        patch.email = updates.email.trim().toLowerCase();
      }
      if (updates.phone !== undefined && updates.phone.trim()) {
        patch.phone = updates.phone.trim();
      }
      if (updates.college !== undefined && updates.college.trim()) {
        patch.college = updates.college.trim();
      }
      if (updates.department !== undefined && updates.department.trim()) {
        patch.department = updates.department.trim();
      }
      if (updates.yearOfStudy !== undefined && updates.yearOfStudy.trim()) {
        patch.yearOfStudy = updates.yearOfStudy.trim();
      }
      if (updates.track !== undefined) {
        patch.track = updates.track.trim() || "General Admission";
      }
      if (updates.experienceLevel !== undefined && updates.experienceLevel.trim()) {
        patch.experienceLevel = updates.experienceLevel.trim();
      }
      if (updates.portfolioUrl !== undefined) {
        patch.portfolioUrl = updates.portfolioUrl.trim() || null;
      }
      if (updates.notes !== undefined) {
        patch.notes = updates.notes.trim() || null;
      }

      const oldActive = !existing.status || existing.status === "confirmed";
      const nextStatus = updates.status ?? existing.status;
      const newActive = nextStatus === "confirmed";
      if (updates.status !== undefined) {
        patch.status = nextStatus;
      }

      let eventDocRef: FirebaseFirestore.DocumentReference | undefined;
      let nextEventCount: number | undefined;
      if (oldActive !== newActive) {
        eventDocRef = db.collection("events").doc(eventSlug);
        const eventDoc = await transaction.get(eventDocRef);
        const eventData = eventDoc.data();
        if (eventDoc.exists && typeof eventData?.registeredCount === "number") {
          nextEventCount = Math.max(0, eventData.registeredCount + (newActive ? 1 : -1));
        }
      }

      transaction.update(docRef, patch);
      if (eventDocRef && nextEventCount !== undefined) {
        transaction.set(
          eventDocRef,
          { registeredCount: nextEventCount, updatedAt: new Date().toISOString() },
          { merge: true }
        );
      }

      const updatedReg: RegistrationRecord = {
        ...existing,
        ...patch,
        portfolioUrl:
          patch.portfolioUrl === null
            ? undefined
            : ((patch.portfolioUrl as string | undefined) ?? existing.portfolioUrl),
        notes:
          patch.notes === null
            ? undefined
            : ((patch.notes as string | undefined) ?? existing.notes),
      };

      return {
        success: true,
        message: `Updated registration for ${updatedReg.fullName}.`,
        registration: updatedReg,
      };
    });

    if (txResult.success) {
      invalidateCache("fs:");
      revalidateEventCaches(eventSlug);
    }
    return txResult;
  } catch (err) {
    console.warn("Firestore updateRegistration failed:", (err as Error).message);
    return null;
  }
}

export async function reviewFirestoreRegistration(
  eventSlug: string,
  referenceId: string,
  decision: "approve" | "decline" | "waitlist",
  options?: { force?: boolean }
): Promise<{
  success: boolean;
  code?: "NOT_FOUND" | "CAPACITY_FULL";
  message: string;
  registration?: RegistrationRecord;
  previousStatus?: RegistrationStatus;
} | null> {
  const db = getAdminDb();
  if (!db) return null;

  const ref = referenceId.trim().toUpperCase();
  const nextStatus: RegistrationStatus =
    decision === "approve" ? "confirmed" : decision === "decline" ? "declined" : "waitlisted";

  try {
    const txResult = await db.runTransaction<{
      success: boolean;
      code?: "NOT_FOUND" | "CAPACITY_FULL";
      message: string;
      registration?: RegistrationRecord;
      previousStatus?: RegistrationStatus;
    }>(async (transaction) => {
      const snap = await transaction.get(
        db
          .collection("registrations")
          .where("eventSlug", "==", eventSlug)
          .where("referenceId", "==", ref)
          .limit(1)
      );
      if (snap.empty) {
        return {
          success: false,
          code: "NOT_FOUND",
          message: "Registration reference was not found for this event.",
        };
      }

      const docRef = snap.docs[0].ref;
      const existing = snap.docs[0].data() as RegistrationRecord;
      const previousStatus: RegistrationStatus = existing.status || "confirmed";

      if (previousStatus === nextStatus) {
        return {
          success: true,
          message: `${existing.fullName} is already ${nextStatus}.`,
          registration: existing,
          previousStatus,
        };
      }

      const eventDocRef = db.collection("events").doc(eventSlug);
      const eventDoc = await transaction.get(eventDocRef);
      const eventData = eventDoc.data();
      const defaultMatch = defaultEvents.find((e) => e.slug === eventSlug);

      const rawCapacity =
        typeof eventData?.capacity === "number"
          ? eventData.capacity
          : typeof eventData?.workshop?.capacity === "number"
            ? eventData.workshop.capacity
            : defaultMatch?.capacity ?? defaultMatch?.workshop?.capacity ?? 120;

      let currentConfirmed =
        eventDoc.exists && typeof eventData?.registeredCount === "number"
          ? eventData.registeredCount
          : 0;
      if (!eventDoc.exists || typeof eventData?.registeredCount !== "number") {
        const regsSnap = await transaction.get(
          db.collection("registrations").where("eventSlug", "==", eventSlug)
        );
        currentConfirmed = regsSnap.docs.filter((d) => {
          const st = d.data().status;
          return !st || st === "confirmed";
        }).length;
      }

      const effectiveCapacity = resolveEffectiveCapacity(
        eventSlug,
        rawCapacity,
        currentConfirmed
      );

      if (nextStatus === "confirmed" && previousStatus !== "confirmed" && !options?.force) {
        if (currentConfirmed >= effectiveCapacity) {
          return {
            success: false,
            code: "CAPACITY_FULL",
            message: `Event capacity reached (${currentConfirmed}/${effectiveCapacity} confirmed seats). Increase capacity before approving more applicants.`,
          };
        }
      }

      const now = new Date().toISOString();
      const deltaConfirmed =
        nextStatus === "confirmed" && previousStatus !== "confirmed"
          ? 1
          : previousStatus === "confirmed" && nextStatus !== "confirmed"
            ? -1
            : 0;

      const existingPending =
        typeof eventData?.pendingCount === "number" ? eventData.pendingCount : 0;
      const deltaPending = previousStatus === "pending" ? -1 : 0;

      transaction.update(docRef, {
        status: nextStatus,
        reviewedAt: now,
      });

      if (eventDoc.exists) {
        transaction.set(
          eventDocRef,
          {
            registeredCount: Math.max(0, currentConfirmed + deltaConfirmed),
            pendingCount: Math.max(0, existingPending + deltaPending),
            updatedAt: now,
          },
          { merge: true }
        );
      }

      const updated: RegistrationRecord = {
        ...existing,
        status: nextStatus,
        reviewedAt: now,
      };

      const verb =
        nextStatus === "confirmed"
          ? "Approved"
          : nextStatus === "declined"
            ? "Declined"
            : "Moved to Waitlist";

      return {
        success: true,
        message: `${verb}: ${existing.fullName}`,
        registration: updated,
        previousStatus,
      };
    });

    if (txResult.success) {
      invalidateCache("fs:");
      revalidateEventCaches(eventSlug);
    }
    return txResult;
  } catch (err) {
    console.warn("Firestore reviewRegistration failed:", (err as Error).message);
    return null;
  }
}

export async function revokeCheckInFirestoreAttendee(
  eventSlug: string,
  referenceId: string,
  day: number
): Promise<{ success: boolean; message: string; registration?: RegistrationRecord } | null> {
  const db = getAdminDb();
  if (!db) return null;

  const ref = referenceId.trim().toUpperCase();
  try {
    const snap = await db
      .collection("registrations")
      .where("eventSlug", "==", eventSlug)
      .where("referenceId", "==", ref)
      .limit(1)
      .get();

    if (snap.empty) {
      return { success: false, message: "Pass reference was not found for this event." };
    }

    const doc = snap.docs[0];
    const data = doc.data() as RegistrationRecord;

    if (data.status && data.status !== "confirmed") {
      const reason =
        data.status === "pending"
          ? "is PENDING HOST APPROVAL and cannot be checked in yet."
          : data.status === "waitlisted"
            ? "is on the WAITLIST and has not been approved yet."
            : `is ${data.status.toUpperCase()} and is not valid for entry.`;
      return {
        success: false,
        message: `${data.fullName}'s registration ${reason}`,
        registration: data,
      };
    }

    const existingDays: number[] = Array.isArray(data.checkedInDays)
      ? data.checkedInDays
      : data.checkedIn
        ? [1]
        : [];
    const existingCheckIns: Record<number, string> =
      typeof data.checkIns === "object" && data.checkIns !== null
        ? { ...data.checkIns }
        : data.checkedIn && data.checkedInAt
          ? { 1: data.checkedInAt }
          : {};

    if (!existingDays.includes(day)) {
      return {
        success: false,
        message: `${data.fullName} is not checked in for Day ${day}.`,
        registration: { ...data, checkedInDays: existingDays, checkIns: existingCheckIns },
      };
    }

    const updatedDays = existingDays.filter((d) => d !== day);
    delete existingCheckIns[day];
    const stillCheckedIn = updatedDays.length > 0;
    const latestTime = stillCheckedIn
      ? existingCheckIns[updatedDays[updatedDays.length - 1]] || data.checkedInAt || ""
      : "";

    await doc.ref.update({
      checkedIn: stillCheckedIn,
      checkedInAt: stillCheckedIn ? latestTime : null,
      checkedInDays: updatedDays,
      checkIns: existingCheckIns,
    });

    const updated: RegistrationRecord = {
      ...data,
      checkedIn: stillCheckedIn,
      checkedInAt: stillCheckedIn ? latestTime : undefined,
      checkedInDays: updatedDays,
      checkIns: existingCheckIns,
    };

    invalidateCache("fs:");
    return {
      success: true,
      message: `Removed Day ${day} check-in for ${data.fullName}.`,
      registration: updated,
    };
  } catch (err) {
    console.warn("Firestore revokeCheckIn failed:", (err as Error).message);
    return null;
  }
}

export async function getFirestoreSiteSettings(): Promise<ChapterSettings | null> {
  const cacheKey = "fs:site-settings";
  const cached = getCached<ChapterSettings>(cacheKey);
  if (cached) return cached;

  const db = getAdminDb();
  if (!db) return null;

  try {
    const doc = await db.collection("site_content").doc("main").get();
    if (!doc.exists) return null;

    const data = doc.data() as Partial<ChapterSettings> | undefined;
    if (!data) return null;

    const merged: ChapterSettings = {
      ...DEFAULT_CHAPTER_SETTINGS,
      ...data,
      chapter: {
        ...DEFAULT_CHAPTER_SETTINGS.chapter,
        ...(data.chapter || {}),
      },
      team: Array.isArray(data.team) ? data.team : DEFAULT_CHAPTER_SETTINGS.team,
      learningAreas: Array.isArray(data.learningAreas)
        ? data.learningAreas
        : DEFAULT_CHAPTER_SETTINGS.learningAreas,
      homeFaq: Array.isArray(data.homeFaq) ? data.homeFaq : DEFAULT_CHAPTER_SETTINGS.homeFaq,
      joinFaq: Array.isArray(data.joinFaq) ? data.joinFaq : DEFAULT_CHAPTER_SETTINGS.joinFaq,
      aboutCards: Array.isArray(data.aboutCards)
        ? data.aboutCards
        : DEFAULT_CHAPTER_SETTINGS.aboutCards,
    };

    setCached(cacheKey, merged, 300 * 1000);
    return merged;
  } catch (err) {
    console.warn("Firestore getSiteSettings failed:", (err as Error).message);
    return null;
  }
}

export async function updateFirestoreSiteSettings(
  settings: ChapterSettings
): Promise<ChapterSettings | null> {
  const db = getAdminDb();
  if (!db) return null;

  try {
    const payload: ChapterSettings = {
      ...settings,
      updatedAt: new Date().toISOString(),
    };
    await db.collection("site_content").doc("main").set(payload, { merge: true });
    invalidateCache("fs:site-settings");
    revalidateSiteCaches();
    return payload;
  } catch (err) {
    console.warn("Firestore updateSiteSettings failed:", (err as Error).message);
    return null;
  }
}

export interface ConfirmedAttendeesMeta {
  version: number;
  checkedInCount: number;
  dailyCheckedInCounts: Record<number, number>;
  updatedAt: string;
}

export async function getFirestoreConfirmedAttendeesMeta(
  eventSlug: string
): Promise<ConfirmedAttendeesMeta | null> {
  const cacheKey = `fs:confirmed-meta:${eventSlug}`;
  const cached = getCached<ConfirmedAttendeesMeta>(cacheKey);
  if (cached) return cached;

  const db = getAdminDb();
  if (!db) return null;

  try {
    const snap = await db.collection("confirmed_attendees_meta").doc(eventSlug).get();
    if (!snap.exists) return null;
    const d = snap.data() || {};
    const meta: ConfirmedAttendeesMeta = {
      version: Number(d.version || 1),
      checkedInCount: Number(d.checkedInCount || 0),
      dailyCheckedInCounts: (d.dailyCheckedInCounts as Record<number, number>) || {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
      },
      updatedAt: String(d.updatedAt || ""),
    };
    setCached(cacheKey, meta, 30_000);
    return meta;
  } catch (err) {
    console.warn("Firestore getConfirmedAttendeesMeta failed:", (err as Error).message);
    return null;
  }
}

export async function syncFirestoreConfirmedAttendeesMeta(
  eventSlug: string,
  attendees?: ConfirmedAttendeeRecord[]
): Promise<number> {
  const db = getAdminDb();
  if (!db) return 1;

  const list = attendees ?? (await getFirestoreConfirmedAttendees(eventSlug)) ?? [];
  const active = list.filter((a) => (a.status || "confirmed") !== "cancelled");
  let checkedInCount = 0;
  const dailyCheckedInCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };

  for (const a of active) {
    const days = a.checkedInDays || (a.checkedIn ? [1] : []);
    if (days.length > 0 || a.checkedIn) checkedInCount += 1;
    for (const d of days) {
      if (d >= 1 && d <= 4) {
        dailyCheckedInCounts[d] = (dailyCheckedInCounts[d] || 0) + 1;
      }
    }
  }

  const nextVersion = Date.now();
  const meta: ConfirmedAttendeesMeta = {
    version: nextVersion,
    checkedInCount,
    dailyCheckedInCounts,
    updatedAt: new Date().toISOString(),
  };

  await db
    .collection("confirmed_attendees_meta")
    .doc(eventSlug)
    .set(meta, { merge: true });

  setCached(`fs:confirmed-meta:${eventSlug}`, meta, 30_000);
  return nextVersion;
}

function updateCachedConfirmedAttendee(
  eventSlug: string,
  attendee: ConfirmedAttendeeRecord
): void {
  const cacheKey = `fs:confirmed-attendees:${eventSlug}`;
  const list = getCached<ConfirmedAttendeeRecord[]>(cacheKey);
  if (!list) {
    setCached(cacheKey, [attendee], 60_000);
    return;
  }
  const index = list.findIndex(
    (a) => a.registrationId === attendee.registrationId || a.id === attendee.id
  );
  if (index >= 0) {
    list[index] = attendee;
  } else {
    list.push(attendee);
    list.sort((a, b) => a.srNo - b.srNo);
  }
  setCached(cacheKey, list, 60_000);
}

function removeCachedConfirmedAttendee(
  eventSlug: string,
  registrationId: string
): void {
  const cacheKey = `fs:confirmed-attendees:${eventSlug}`;
  const list = getCached<ConfirmedAttendeeRecord[]>(cacheKey);
  if (!list) return;
  const next = list.filter(
    (a) =>
      a.registrationId !== registrationId &&
      a.id !== `${eventSlug}__${registrationId}`
  );
  setCached(cacheKey, next, 60_000);
}

export async function getFirestoreConfirmedAttendees(
  eventSlug: string
): Promise<ConfirmedAttendeeRecord[] | null> {
  const cacheKey = `fs:confirmed-attendees:${eventSlug}`;
  const cached = getCached<ConfirmedAttendeeRecord[]>(cacheKey);
  if (cached) return cached;

  const db = getAdminDb();
  if (!db) return null;

  try {
    const snap = await db
      .collection("confirmed_attendees")
      .where("eventSlug", "==", eventSlug)
      .get();

    const list: ConfirmedAttendeeRecord[] = snap.docs
      .map((doc) => {
        const d = doc.data();
        const checkedInDays = Array.isArray(d.checkedInDays)
          ? d.checkedInDays.map(Number).filter((n) => n >= 1 && n <= 4)
          : d.checkedIn
            ? [1]
            : [];
        return {
          id: doc.id,
          srNo: Number(d.srNo || 0),
          eventSlug: String(d.eventSlug || eventSlug),
          registrationId: String(d.registrationId || ""),
          fullName: String(d.fullName || ""),
          email: String(d.email || ""),
          phone: String(d.phone || ""),
          college: String(d.college || ""),
          department: String(d.department || ""),
          yearOfStudy: String(d.yearOfStudy || ""),
          track: String(d.track || ""),
          experienceLevel: String(d.experienceLevel || ""),
          portfolioUrl: d.portfolioUrl ? String(d.portfolioUrl) : undefined,
          confirmationSource: String(d.confirmationSource || ""),
          registrationSource: String(d.registrationSource || ""),
          confirmationDate: String(d.confirmationDate || ""),
          notes: d.notes ? String(d.notes) : undefined,
          status: (d.status === "cancelled" ? "cancelled" : "confirmed") as "confirmed" | "cancelled",
          checkedIn: Boolean(d.checkedIn) || checkedInDays.length > 0,
          checkedInAt: d.checkedInAt ? String(d.checkedInAt) : undefined,
          checkedInDays,
          checkIns: (d.checkIns as Record<number, string>) || undefined,
          createdAt: String(d.createdAt || ""),
        };
      })
      .sort((a, b) => a.srNo - b.srNo);

    setCached(cacheKey, list, 60_000);
    return list;
  } catch (err) {
    console.warn("Firestore getConfirmedAttendees failed:", (err as Error).message);
    return null;
  }
}

export async function getFirestoreConfirmedAttendeeByRef(
  eventSlug: string,
  refId: string
): Promise<ConfirmedAttendeeRecord | null> {
  const normalized = refId.trim().toUpperCase();
  if (!normalized) return null;

  // 1. Check in-memory cached roster first (0 Firestore reads)
  const cachedList = getCached<ConfirmedAttendeeRecord[]>(`fs:confirmed-attendees:${eventSlug}`);
  if (cachedList) {
    const match = cachedList.find(
      (a) =>
        a.registrationId.toUpperCase() === normalized ||
        a.id.toUpperCase() === `${eventSlug.toUpperCase()}__${normalized}` ||
        a.id.toUpperCase() === normalized
    );
    if (match) return match;
  }

  const db = getAdminDb();
  if (!db) return null;

  try {
    // 2. Direct document ID lookup (1 Firestore read)
    const docId = `${eventSlug}__${normalized}`;
    const snap = await db.collection("confirmed_attendees").doc(docId).get();
    if (snap.exists) {
      const d = snap.data() || {};
      const checkedInDays = Array.isArray(d.checkedInDays)
        ? d.checkedInDays.map(Number).filter((n) => n >= 1 && n <= 4)
        : d.checkedIn
          ? [1]
          : [];
      return {
        id: snap.id,
        srNo: Number(d.srNo || 0),
        eventSlug: String(d.eventSlug || eventSlug),
        registrationId: String(d.registrationId || normalized),
        fullName: String(d.fullName || ""),
        email: String(d.email || ""),
        phone: String(d.phone || ""),
        college: String(d.college || ""),
        department: String(d.department || ""),
        yearOfStudy: String(d.yearOfStudy || ""),
        track: String(d.track || ""),
        experienceLevel: String(d.experienceLevel || ""),
        portfolioUrl: d.portfolioUrl ? String(d.portfolioUrl) : undefined,
        confirmationSource: String(d.confirmationSource || ""),
        registrationSource: String(d.registrationSource || ""),
        confirmationDate: String(d.confirmationDate || ""),
        notes: d.notes ? String(d.notes) : undefined,
        status: (d.status === "cancelled" ? "cancelled" : "confirmed") as "confirmed" | "cancelled",
        checkedIn: Boolean(d.checkedIn) || checkedInDays.length > 0,
        checkedInAt: d.checkedInAt ? String(d.checkedInAt) : undefined,
        checkedInDays,
        checkIns: (d.checkIns as Record<number, string>) || undefined,
        createdAt: String(d.createdAt || ""),
      };
    }

    // 3. Fallback: query by registrationId field if docId casing differed (1 Firestore read)
    const qSnap = await db
      .collection("confirmed_attendees")
      .where("eventSlug", "==", eventSlug)
      .where("registrationId", "==", normalized)
      .limit(1)
      .get();

    if (!qSnap.empty) {
      const doc = qSnap.docs[0];
      const d = doc.data();
      const checkedInDays = Array.isArray(d.checkedInDays)
        ? d.checkedInDays.map(Number).filter((n) => n >= 1 && n <= 4)
        : d.checkedIn
          ? [1]
          : [];
      return {
        id: doc.id,
        srNo: Number(d.srNo || 0),
        eventSlug: String(d.eventSlug || eventSlug),
        registrationId: String(d.registrationId || normalized),
        fullName: String(d.fullName || ""),
        email: String(d.email || ""),
        phone: String(d.phone || ""),
        college: String(d.college || ""),
        department: String(d.department || ""),
        yearOfStudy: String(d.yearOfStudy || ""),
        track: String(d.track || ""),
        experienceLevel: String(d.experienceLevel || ""),
        portfolioUrl: d.portfolioUrl ? String(d.portfolioUrl) : undefined,
        confirmationSource: String(d.confirmationSource || ""),
        registrationSource: String(d.registrationSource || ""),
        confirmationDate: String(d.confirmationDate || ""),
        notes: d.notes ? String(d.notes) : undefined,
        status: (d.status === "cancelled" ? "cancelled" : "confirmed") as "confirmed" | "cancelled",
        checkedIn: Boolean(d.checkedIn) || checkedInDays.length > 0,
        checkedInAt: d.checkedInAt ? String(d.checkedInAt) : undefined,
        checkedInDays,
        checkIns: (d.checkIns as Record<number, string>) || undefined,
        createdAt: String(d.createdAt || ""),
      };
    }

    return null;
  } catch (err) {
    console.warn("Firestore getConfirmedAttendeeByRef failed:", (err as Error).message);
    return null;
  }
}

export async function upsertFirestoreConfirmedAttendees(
  records: ConfirmedAttendeeRecord[]
): Promise<number> {
  const db = getAdminDb();
  if (!db || records.length === 0) return 0;

  let written = 0;
  const BATCH_LIMIT = 450;
  const slugs = new Set<string>();

  for (let i = 0; i < records.length; i += BATCH_LIMIT) {
    const chunk = records.slice(i, i + BATCH_LIMIT);
    const batch = db.batch();
    for (const rec of chunk) {
      slugs.add(rec.eventSlug);
      const ref = db.collection("confirmed_attendees").doc(rec.id);
      const cleanPayload = Object.fromEntries(
        Object.entries(rec).filter(([, v]) => v !== undefined)
      );
      batch.set(ref, cleanPayload, { merge: true });
    }
    await batch.commit();
    written += chunk.length;
  }

  for (const slug of slugs) {
    invalidateCache(`fs:confirmed-attendees:${slug}`);
  }
  return written;
}

export async function checkInFirestoreConfirmedAttendee(
  eventSlug: string,
  registrationId: string,
  day: number
): Promise<ConfirmedAttendeeRecord | null> {
  const db = getAdminDb();
  if (!db) return null;

  const docId = `${eventSlug}__${registrationId}`;
  const ref = db.collection("confirmed_attendees").doc(docId);
  const snap = await ref.get();
  if (!snap.exists) return null;

  const d = snap.data() || {};
  const existingDays = Array.isArray(d.checkedInDays)
    ? d.checkedInDays.map(Number).filter((n) => n >= 1 && n <= 4)
    : d.checkedIn
      ? [1]
      : [];
  const nextDays = Array.from(new Set([...existingDays, day])).sort((a, b) => a - b);
  const nowStr = new Date().toISOString();
  const nextCheckIns = { ...(d.checkIns || {}), [day]: nowStr };

  await ref.set(
    {
      checkedIn: true,
      checkedInAt: d.checkedInAt || nowStr,
      checkedInDays: nextDays,
      checkIns: nextCheckIns,
    },
    { merge: true }
  );

  const updatedAttendee: ConfirmedAttendeeRecord = {
    id: snap.id,
    srNo: Number(d.srNo || 0),
    eventSlug: String(d.eventSlug || eventSlug),
    registrationId: String(d.registrationId || registrationId),
    fullName: String(d.fullName || ""),
    email: String(d.email || ""),
    phone: String(d.phone || ""),
    college: String(d.college || ""),
    department: String(d.department || ""),
    yearOfStudy: String(d.yearOfStudy || ""),
    track: String(d.track || ""),
    experienceLevel: String(d.experienceLevel || ""),
    portfolioUrl: d.portfolioUrl ? String(d.portfolioUrl) : undefined,
    confirmationSource: String(d.confirmationSource || ""),
    registrationSource: String(d.registrationSource || ""),
    confirmationDate: String(d.confirmationDate || ""),
    notes: d.notes ? String(d.notes) : undefined,
    status: (d.status === "cancelled" ? "cancelled" : "confirmed") as "confirmed" | "cancelled",
    checkedIn: true,
    checkedInAt: d.checkedInAt || nowStr,
    checkedInDays: nextDays,
    checkIns: nextCheckIns,
    createdAt: String(d.createdAt || ""),
  };

  updateCachedConfirmedAttendee(eventSlug, updatedAttendee);

  const cachedList = getCached<ConfirmedAttendeeRecord[]>(`fs:confirmed-attendees:${eventSlug}`);
  if (cachedList) {
    await syncFirestoreConfirmedAttendeesMeta(eventSlug, cachedList);
  } else {
    const currentMeta = await getFirestoreConfirmedAttendeesMeta(eventSlug);
    const wasAlreadyCheckedIn = existingDays.length > 0 || Boolean(d.checkedIn);
    const nextCheckedInCount = wasAlreadyCheckedIn
      ? (currentMeta?.checkedInCount ?? 1)
      : (currentMeta?.checkedInCount ?? 0) + 1;
    const nextDailyCounts = { ...(currentMeta?.dailyCheckedInCounts || { 1: 0, 2: 0, 3: 0, 4: 0 }) };
    if (!existingDays.includes(day)) {
      nextDailyCounts[day] = (nextDailyCounts[day] || 0) + 1;
    }
    const nextVersion = Date.now();
    const meta: ConfirmedAttendeesMeta = {
      version: nextVersion,
      checkedInCount: nextCheckedInCount,
      dailyCheckedInCounts: nextDailyCounts,
      updatedAt: nowStr,
    };
    await db.collection("confirmed_attendees_meta").doc(eventSlug).set(meta, { merge: true });
    setCached(`fs:confirmed-meta:${eventSlug}`, meta, 30_000);
  }

  return updatedAttendee;
}

export async function revokeCheckInFirestoreConfirmedAttendee(
  eventSlug: string,
  registrationId: string,
  day: number
): Promise<ConfirmedAttendeeRecord | null> {
  const db = getAdminDb();
  if (!db) return null;

  const docId = `${eventSlug}__${registrationId}`;
  const ref = db.collection("confirmed_attendees").doc(docId);
  const snap = await ref.get();
  if (!snap.exists) return null;

  const d = snap.data() || {};
  const existingDays = Array.isArray(d.checkedInDays)
    ? d.checkedInDays.map(Number).filter((n) => n >= 1 && n <= 4)
    : d.checkedIn
      ? [1]
      : [];
  const nextDays = existingDays.filter((n) => n !== day);
  const nextCheckIns = { ...(d.checkIns || {}) };
  delete nextCheckIns[day];

  await ref.set(
    {
      checkedIn: nextDays.length > 0,
      checkedInAt: nextDays.length > 0 ? d.checkedInAt || null : null,
      checkedInDays: nextDays,
      checkIns: nextCheckIns,
    },
    { merge: true }
  );

  const updatedAttendee: ConfirmedAttendeeRecord = {
    id: snap.id,
    srNo: Number(d.srNo || 0),
    eventSlug: String(d.eventSlug || eventSlug),
    registrationId: String(d.registrationId || registrationId),
    fullName: String(d.fullName || ""),
    email: String(d.email || ""),
    phone: String(d.phone || ""),
    college: String(d.college || ""),
    department: String(d.department || ""),
    yearOfStudy: String(d.yearOfStudy || ""),
    track: String(d.track || ""),
    experienceLevel: String(d.experienceLevel || ""),
    portfolioUrl: d.portfolioUrl ? String(d.portfolioUrl) : undefined,
    confirmationSource: String(d.confirmationSource || ""),
    registrationSource: String(d.registrationSource || ""),
    confirmationDate: String(d.confirmationDate || ""),
    notes: d.notes ? String(d.notes) : undefined,
    status: (d.status === "cancelled" ? "cancelled" : "confirmed") as "confirmed" | "cancelled",
    checkedIn: nextDays.length > 0,
    checkedInAt: nextDays.length > 0 ? d.checkedInAt || undefined : undefined,
    checkedInDays: nextDays,
    checkIns: nextCheckIns,
    createdAt: String(d.createdAt || ""),
  };

  updateCachedConfirmedAttendee(eventSlug, updatedAttendee);

  const cachedList = getCached<ConfirmedAttendeeRecord[]>(`fs:confirmed-attendees:${eventSlug}`);
  if (cachedList) {
    await syncFirestoreConfirmedAttendeesMeta(eventSlug, cachedList);
  } else {
    const currentMeta = await getFirestoreConfirmedAttendeesMeta(eventSlug);
    const wasCheckedInBefore = existingDays.length > 0 || Boolean(d.checkedIn);
    const isCheckedInNow = nextDays.length > 0;
    const nextCheckedInCount =
      wasCheckedInBefore && !isCheckedInNow
        ? Math.max(0, (currentMeta?.checkedInCount ?? 1) - 1)
        : currentMeta?.checkedInCount ?? 0;
    const nextDailyCounts = { ...(currentMeta?.dailyCheckedInCounts || { 1: 0, 2: 0, 3: 0, 4: 0 }) };
    if (existingDays.includes(day)) {
      nextDailyCounts[day] = Math.max(0, (nextDailyCounts[day] || 1) - 1);
    }
    const nextVersion = Date.now();
    const meta: ConfirmedAttendeesMeta = {
      version: nextVersion,
      checkedInCount: nextCheckedInCount,
      dailyCheckedInCounts: nextDailyCounts,
      updatedAt: new Date().toISOString(),
    };
    await db.collection("confirmed_attendees_meta").doc(eventSlug).set(meta, { merge: true });
    setCached(`fs:confirmed-meta:${eventSlug}`, meta, 30_000);
  }

  return updatedAttendee;
}

export async function updateFirestoreConfirmedAttendee(
  eventSlug: string,
  registrationId: string,
  updates: Partial<Pick<ConfirmedAttendeeRecord, "fullName" | "email" | "phone" | "college" | "department" | "yearOfStudy" | "track" | "status" | "notes" | "checkedInDays">>
): Promise<ConfirmedAttendeeRecord | null> {
  const db = getAdminDb();
  if (!db) return null;

  const docId = `${eventSlug}__${registrationId}`;
  const ref = db.collection("confirmed_attendees").doc(docId);
  const snap = await ref.get();
  if (!snap.exists) return null;

  const existing = snap.data() || {};
  const cleanUpdates: Record<string, unknown> = Object.fromEntries(
    Object.entries(updates).filter(([k, v]) => k !== "checkedInDays" && v !== undefined)
  );

  let nextDays = Array.isArray(existing.checkedInDays)
    ? existing.checkedInDays.map(Number).filter((n: number) => n >= 1 && n <= 4)
    : existing.checkedIn
      ? [1]
      : [];
  let nextCheckIns = (existing.checkIns as Record<number, string>) || {};

  if (Array.isArray(updates.checkedInDays)) {
    nextDays = Array.from(
      new Set(updates.checkedInDays.map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= 4))
    ).sort((a, b) => a - b);
    const nowStr = new Date().toISOString();
    const prevCheckIns = (existing.checkIns as Record<number, string>) || {};
    nextCheckIns = {};
    for (const d of nextDays) {
      nextCheckIns[d] = prevCheckIns[d] || nowStr;
    }
    cleanUpdates.checkedInDays = nextDays;
    cleanUpdates.checkedIn = nextDays.length > 0;
    cleanUpdates.checkedInAt = nextDays.length > 0 ? existing.checkedInAt || nowStr : null;
    cleanUpdates.checkIns = nextCheckIns;
  }

  await ref.set(cleanUpdates, { merge: true });

  const updatedAttendee: ConfirmedAttendeeRecord = {
    id: snap.id,
    srNo: Number(existing.srNo || 0),
    eventSlug: String(existing.eventSlug || eventSlug),
    registrationId: String(existing.registrationId || registrationId),
    fullName: String(cleanUpdates.fullName ?? existing.fullName ?? ""),
    email: String(cleanUpdates.email ?? existing.email ?? ""),
    phone: String(cleanUpdates.phone ?? existing.phone ?? ""),
    college: String(cleanUpdates.college ?? existing.college ?? ""),
    department: String(cleanUpdates.department ?? existing.department ?? ""),
    yearOfStudy: String(cleanUpdates.yearOfStudy ?? existing.yearOfStudy ?? ""),
    track: String(cleanUpdates.track ?? existing.track ?? ""),
    experienceLevel: String(cleanUpdates.experienceLevel ?? existing.experienceLevel ?? ""),
    portfolioUrl:
      cleanUpdates.portfolioUrl !== undefined
        ? cleanUpdates.portfolioUrl
          ? String(cleanUpdates.portfolioUrl)
          : undefined
        : existing.portfolioUrl
          ? String(existing.portfolioUrl)
          : undefined,
    confirmationSource: String(existing.confirmationSource || ""),
    registrationSource: String(existing.registrationSource || ""),
    confirmationDate: String(existing.confirmationDate || ""),
    notes:
      cleanUpdates.notes !== undefined
        ? cleanUpdates.notes
          ? String(cleanUpdates.notes)
          : undefined
        : existing.notes
          ? String(existing.notes)
          : undefined,
    status: (cleanUpdates.status ?? existing.status ?? "confirmed") as "confirmed" | "cancelled",
    checkedIn:
      cleanUpdates.checkedIn !== undefined
        ? Boolean(cleanUpdates.checkedIn)
        : Boolean(existing.checkedIn),
    checkedInAt:
      cleanUpdates.checkedInAt !== undefined
        ? cleanUpdates.checkedInAt
          ? String(cleanUpdates.checkedInAt)
          : undefined
        : existing.checkedInAt
          ? String(existing.checkedInAt)
          : undefined,
    checkedInDays: nextDays,
    checkIns: nextCheckIns,
    createdAt: String(existing.createdAt || ""),
  };

  updateCachedConfirmedAttendee(eventSlug, updatedAttendee);

  const cachedList = getCached<ConfirmedAttendeeRecord[]>(`fs:confirmed-attendees:${eventSlug}`);
  if (cachedList) {
    await syncFirestoreConfirmedAttendeesMeta(eventSlug, cachedList);
  }

  return updatedAttendee;
}

export async function deleteFirestoreConfirmedAttendee(
  eventSlug: string,
  registrationId: string
): Promise<boolean> {
  const db = getAdminDb();
  if (!db) return false;

  const docId = `${eventSlug}__${registrationId}`;
  const ref = db.collection("confirmed_attendees").doc(docId);
  const snap = await ref.get();
  if (!snap.exists) return false;

  await ref.delete();
  removeCachedConfirmedAttendee(eventSlug, registrationId);

  const cachedList = getCached<ConfirmedAttendeeRecord[]>(`fs:confirmed-attendees:${eventSlug}`);
  if (cachedList) {
    await syncFirestoreConfirmedAttendeesMeta(eventSlug, cachedList);
  }
  return true;
}

export interface CreateConfirmedAttendeeInput {
  fullName: string;
  email: string;
  phone?: string;
  college?: string;
  department?: string;
  yearOfStudy?: string;
  track?: string;
  experienceLevel?: string;
  portfolioUrl?: string;
  confirmationSource?: string;
  registrationSource?: string;
  notes?: string;
  checkedInDays?: number[];
  checkedIn?: boolean;
  registrationId?: string;
  srNo?: number;
}

export async function createFirestoreConfirmedAttendee(
  eventSlug: string,
  input: CreateConfirmedAttendeeInput
): Promise<ConfirmedAttendeeRecord | null> {
  const db = getAdminDb();
  if (!db) return null;

  const cacheKey = `fs:confirmed-attendees:${eventSlug}`;
  let list = getCached<ConfirmedAttendeeRecord[]>(cacheKey);
  if (!list) {
    list = (await getFirestoreConfirmedAttendees(eventSlug)) || [];
  }

  const maxSrNo = list.reduce((m, a) => Math.max(m, a.srNo || 0), 0);
  const nextSrNo = input.srNo || (maxSrNo > 0 ? maxSrNo + 1 : 127);

  const registrationId =
    (input.registrationId || "").trim().toUpperCase() ||
    (eventSlug === "dev-to-cloud"
      ? `G-2026-ZTH-${String(nextSrNo).padStart(3, "0")}`
      : `ATT-${String(nextSrNo).padStart(3, "0")}`);

  const docId = `${eventSlug}__${registrationId}`;

  const checkedInDays = Array.isArray(input.checkedInDays)
    ? Array.from(
        new Set(input.checkedInDays.map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= 4))
      ).sort((a, b) => a - b)
    : input.checkedIn
      ? [1]
      : [];

  const nowIso = new Date().toISOString();
  const checkIns: Record<number, string> = {};
  for (const d of checkedInDays) {
    checkIns[d] = nowIso;
  }

  const attendee: ConfirmedAttendeeRecord = {
    id: docId,
    srNo: nextSrNo,
    eventSlug,
    registrationId,
    fullName: input.fullName.trim(),
    email: input.email.trim().toLowerCase(),
    phone: (input.phone || "").trim(),
    college: (input.college || "Vidyavardhini's College of Engineering and Technology").trim(),
    department: (input.department || "").trim(),
    yearOfStudy: (input.yearOfStudy || "").trim(),
    track: (input.track || "4-Day All-Access").trim(),
    experienceLevel: (input.experienceLevel || "Beginner").trim(),
    portfolioUrl: input.portfolioUrl?.trim() || undefined,
    confirmationSource: (input.confirmationSource || "Walk-in Desk").trim(),
    registrationSource: (input.registrationSource || "Desk Registration").trim(),
    confirmationDate: nowIso.split("T")[0],
    notes: input.notes?.trim() || undefined,
    status: "confirmed",
    checkedIn: checkedInDays.length > 0,
    checkedInAt: checkedInDays.length > 0 ? nowIso : undefined,
    checkedInDays,
    checkIns: Object.keys(checkIns).length > 0 ? checkIns : undefined,
    createdAt: nowIso,
  };

  const cleanPayload = Object.fromEntries(
    Object.entries(attendee).filter(([, v]) => v !== undefined)
  );

  await db.collection("confirmed_attendees").doc(docId).set(cleanPayload);
  updateCachedConfirmedAttendee(eventSlug, attendee);

  const cachedList = getCached<ConfirmedAttendeeRecord[]>(cacheKey) || [attendee];
  await syncFirestoreConfirmedAttendeesMeta(eventSlug, cachedList);

  return attendee;
}


