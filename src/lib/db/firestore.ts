import crypto from "node:crypto";
import { getAdminDb } from "@/lib/firebase/admin";
import { events as defaultEvents } from "@/content/events";
import { validateAndNormalizeRegistrationInput } from "@/lib/registration-validation";
import type {
  ChapterEvent,
  EventInput,
  EventUpdateInput,
  RegistrationInput,
  RegistrationRecord,
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

  if (eventSlug === "devcraft-2025") {
    return `GDG-VCET-2025-${numericPart}`;
  }

  const alnum = eventSlug.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const slugPrefix = (alnum + "EVNT").slice(0, 4);
  const hashNum = parseInt(
    crypto.createHash("sha256").update(eventSlug).digest("hex").slice(0, 6),
    16
  );
  const hashSuffix = (hashNum % 1296).toString(36).padStart(2, "0").toUpperCase();
  const eventCode = `${slugPrefix}${hashSuffix}`;

  return `GDG-${eventCode}-${numericPart}`;
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
      registrationUrl: `/events/${slug}/register`,
    };

    const docPayload = {
      ...eventRecord,
      capacity: input.capacity ?? 150,
      isRegistrationOpen: input.isRegistrationOpen ?? true,
      registeredCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    await docRef.set(docPayload);

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
    if (input.capacity !== undefined) updates.capacity = Math.floor(input.capacity);
    if (input.isRegistrationOpen !== undefined) {
      updates.isRegistrationOpen = Boolean(input.isRegistrationOpen);
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
        capacity: defaultMatch.workshop?.capacity ?? 150,
        isRegistrationOpen: defaultMatch.workshop?.registrationConfig?.isOpen ?? true,
        createdAt: now,
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

    const updatedEvent = await getFirestoreEvent(slug);
    if (updatedEvent && defaultMatch?.workshop && !updatedEvent.workshop) {
      updatedEvent.workshop = defaultMatch.workshop;
    }

    return updatedEvent
      ? { success: true, event: updatedEvent }
      : { success: false, error: "EVENT_NOT_FOUND" };
  } catch (err) {
    console.warn("Firestore updateEvent failed:", (err as Error).message);
    return { success: false, error: (err as Error).message };
  }
}

export async function getFirestoreEvents(): Promise<ChapterEvent[] | null> {
  const db = getAdminDb();
  if (!db) return null;

  try {
    const snapshot = await db.collection("events").get();
    if (snapshot.empty) return [];

    const list: ChapterEvent[] = [];
    snapshot.forEach((doc) => {
      const d = doc.data();
      list.push({
        id: d.id || doc.id,
        slug: d.slug || doc.id,
        title: d.title,
        startsAt: d.startsAt,
        endsAt: d.endsAt || undefined,
        timezone: d.timezone || "Asia/Kolkata",
        format: d.format || "in-person",
        location: d.location,
        topics: d.topics || ["general"],
        summary: d.summary || undefined,
        registrationUrl: d.registrationUrl || `/events/${d.slug || doc.id}/register`,
        workshop: d.workshop || undefined,
      });
    });

    return list;
  } catch (err) {
    console.warn("Firestore getEvents failed:", (err as Error).message);
    return null;
  }
}

export async function getFirestoreEvent(slug: string): Promise<ChapterEvent | null> {
  const db = getAdminDb();
  if (!db) return null;

  try {
    const doc = await db.collection("events").doc(slug).get();
    if (!doc.exists) return null;

    const d = doc.data();
    if (!d) return null;

    return {
      id: d.id || doc.id,
      slug: d.slug || doc.id,
      title: d.title,
      startsAt: d.startsAt,
      endsAt: d.endsAt || undefined,
      timezone: d.timezone || "Asia/Kolkata",
      format: d.format || "in-person",
      location: d.location,
      topics: d.topics || ["general"],
      summary: d.summary || undefined,
      registrationUrl: d.registrationUrl || `/events/${d.slug || doc.id}/register`,
      workshop: d.workshop || undefined,
    };
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
        isRegistrationOpen: event.workshop?.registrationConfig?.isOpen ?? false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    await batch.commit();
  } catch (err) {
    console.warn("Firestore seedInitialEvents failed:", (err as Error).message);
  }
}

export async function getFirestoreEventStats(slug: string): Promise<EventStats | null> {
  const db = getAdminDb();
  if (!db) return null;

  try {
    const eventDoc = await db.collection("events").doc(slug).get();
    const eventData = eventDoc.data();
    const defaultMatch = defaultEvents.find((e) => e.slug === slug);
    const capacity = eventData?.capacity ?? defaultMatch?.workshop?.capacity ?? 150;
    const isRegistrationOpen =
      eventData?.isRegistrationOpen ??
      eventData?.is_registration_open ??
      defaultMatch?.workshop?.registrationConfig?.isOpen ??
      true;

    const regsSnapshot = await db
      .collection("registrations")
      .where("eventSlug", "==", slug)
      .get();

    let totalRegistered = 0;
    let checkedInCount = 0;
    const trackCounts: Record<string, number> = {};
    const yearCounts: Record<string, number> = {};
    const departmentCounts: Record<string, number> = {};

    regsSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.status === "cancelled") return;
      totalRegistered++;
      if (data.checkedIn) checkedInCount++;

      if (data.track) {
        trackCounts[data.track] = (trackCounts[data.track] || 0) + 1;
      }
      if (data.yearOfStudy) {
        yearCounts[data.yearOfStudy] = (yearCounts[data.yearOfStudy] || 0) + 1;
      }
      if (data.department) {
        departmentCounts[data.department] = (departmentCounts[data.department] || 0) + 1;
      }
    });

    const remaining = Math.max(0, capacity - totalRegistered);
    const percentFilled =
      capacity > 0 ? Math.min(100, Math.round((totalRegistered / capacity) * 100)) : 100;

    return {
      totalRegistered,
      capacity,
      remaining,
      percentFilled,
      isOpen: Boolean(isRegistrationOpen) && remaining > 0,
      isRegistrationOpen: Boolean(isRegistrationOpen),
      checkedInCount,
      trackCounts,
      yearCounts,
      departmentCounts,
    };
  } catch (err) {
    console.warn("Firestore getEventStats failed:", (err as Error).message);
    return null;
  }
}

export async function getFirestoreRegistrations(
  eventSlug: string,
  options?: { search?: string; track?: string; status?: string; checkedIn?: string }
): Promise<RegistrationRecord[] | null> {
  const db = getAdminDb();
  if (!db) return null;

  try {
    let query = db.collection("registrations").where("eventSlug", "==", eventSlug);

    if (options?.track && options.track !== "all") {
      query = query.where("track", "==", options.track);
    }

    if (options?.status && options.status !== "all") {
      query = query.where("status", "==", options.status);
    }

    const snapshot = await query.get();
    let records: RegistrationRecord[] = [];

    snapshot.forEach((doc) => {
      const d = doc.data();
      records.push({
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
        createdAt: d.createdAt || new Date().toISOString(),
      });
    });

    // Client-side filtering for search & checkedIn filter
    if (options?.checkedIn !== undefined && options.checkedIn !== "all") {
      const isChecked = options.checkedIn === "true" || options.checkedIn === "1";
      records = records.filter((r) => r.checkedIn === isChecked);
    }

    if (options?.search) {
      const term = options.search.toLowerCase();
      records = records.filter(
        (r) =>
          r.fullName.toLowerCase().includes(term) ||
          r.email.toLowerCase().includes(term) ||
          r.referenceId.toLowerCase().includes(term) ||
          r.college.toLowerCase().includes(term)
      );
    }

    // Sort by createdAt desc
    records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return records;
  } catch (err) {
    console.warn("Firestore getRegistrations failed:", (err as Error).message);
    return null;
  }
}

export async function createFirestoreRegistration(
  eventSlug: string,
  input: RegistrationInput
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
    return await db.runTransaction(async (transaction) => {
      // 1. Read events/{eventSlug} (1 read)
      const eventDocRef = db.collection("events").doc(eventSlug);
      const eventDoc = await transaction.get(eventDocRef);
      const defaultMatch = defaultEvents.find((e) => e.slug === eventSlug);

      if (!eventDoc.exists && !defaultMatch) {
        return {
          success: false,
          error: "EVENT_NOT_FOUND",
          message: `Event "${eventSlug}" was not found.`,
        };
      }

      const eventData = eventDoc.data();
      const capacity = eventData?.capacity ?? defaultMatch?.workshop?.capacity ?? 150;
      const isRegistrationOpen = Boolean(
        eventData?.isRegistrationOpen ??
          eventData?.is_registration_open ??
          defaultMatch?.workshop?.registrationConfig?.isOpen ??
          true
      );

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
        if (existingData?.status !== "cancelled") {
          return {
            success: false,
            error: "DUPLICATE_EMAIL",
            message: `The email ${emailNormalized} is already registered under pass reference #${existingData?.referenceId}.`,
          };
        }
      }

      // 3. Determine currentCount: O(1) from eventData.registeredCount, else bootstrap once
      let currentCount: number;
      if (typeof eventData?.registeredCount === "number") {
        currentCount = eventData.registeredCount;
      } else {
        const regsSnap = await transaction.get(
          db.collection("registrations").where("eventSlug", "==", eventSlug)
        );
        currentCount = regsSnap.docs.filter((d) => d.data().status !== "cancelled").length;
      }

      if (currentCount >= capacity) {
        return {
          success: false,
          error: "CAPACITY_FULL",
          message: `Workshop capacity has been reached (${currentCount}/${capacity} seats reserved).`,
        };
      }

      // 4. Generate referenceId and run 1 indexed uniqueness check before any writes
      let referenceId = buildEventReferenceId(eventSlug, currentCount + 1);
      const refCheckSnap = await transaction.get(
        db.collection("registrations").where("referenceId", "==", referenceId).limit(1)
      );
      if (!refCheckSnap.empty) {
        referenceId = buildEventReferenceId(eventSlug, currentCount + 1, true);
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
        status: "confirmed",
        checkedIn: false,
        createdAt,
      };

      transaction.set(regDocRef, newRegistration);

      if (eventDoc.exists) {
        transaction.update(eventDocRef, {
          registeredCount: currentCount + 1,
          updatedAt: createdAt,
        });
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
          capacity,
          isRegistrationOpen,
          registeredCount: currentCount + 1,
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
  } catch (err) {
    console.warn("Firestore createRegistration failed:", (err as Error).message);
    return null;
  }
}

export async function checkInFirestoreAttendee(
  eventSlug: string,
  referenceId: string
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
      return { success: false, message: `Pass reference "${ref}" was not found for this event.` };
    }

    const doc = snap.docs[0];
    const data = doc.data() as RegistrationRecord;

    if (data.checkedIn) {
      return {
        success: false,
        message: `${data.fullName} (#${ref}) was ALREADY checked in at ${data.checkedInAt}.`,
        registration: data,
      };
    }

    const now = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    await doc.ref.update({
      checkedIn: true,
      checkedInAt: now,
    });

    const updated: RegistrationRecord = {
      ...data,
      checkedIn: true,
      checkedInAt: now,
    };

    return {
      success: true,
      message: `Successfully checked in ${data.fullName} (#${ref}) for ${data.track}!`,
      registration: updated,
    };
  } catch (err) {
    console.warn("Firestore checkInAttendee failed:", (err as Error).message);
    return null;
  }
}
