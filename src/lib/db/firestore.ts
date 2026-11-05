import { getAdminDb } from "@/lib/firebase/admin";
import type { RegistrationInput, RegistrationRecord } from "@/types";
import type { CreateRegistrationResult, EventStats } from "./index";

/**
 * Cloud Firestore Database Adapter for GDG on Campus VCET
 */

export async function getFirestoreEventStats(slug: string): Promise<EventStats | null> {
  const db = getAdminDb();
  if (!db) return null;

  try {
    const eventDoc = await db.collection("events").doc(slug).get();
    const eventData = eventDoc.data();
    const capacity = eventData?.capacity ?? 150;
    const isRegistrationOpen = eventData?.is_registration_open ?? true;

    const regsSnapshot = await db
      .collection("registrations")
      .where("eventSlug", "==", slug)
      .where("status", "!=", "cancelled")
      .get();

    const totalRegistered = regsSnapshot.size;
    let checkedInCount = 0;
    const trackCounts: Record<string, number> = {};
    const yearCounts: Record<string, number> = {};
    const departmentCounts: Record<string, number> = {};

    regsSnapshot.forEach((doc) => {
      const data = doc.data();
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
    const percentFilled = Math.min(100, Math.round((totalRegistered / capacity) * 100));

    return {
      totalRegistered,
      capacity,
      remaining,
      percentFilled,
      isOpen: isRegistrationOpen && remaining > 0,
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
  // Validate required fields: fullName, email, phone, college, track
  if (
    !input.fullName?.trim() ||
    !input.email?.trim() ||
    !input.phone?.trim() ||
    !input.college?.trim() ||
    !input.track?.trim()
  ) {
    return { success: false, error: "INVALID_INPUT", message: "All required fields must be provided." };
  }

  if (!input.agreedToCoc) {
    return { success: false, error: "INVALID_INPUT", message: "You must agree to the Code of Conduct and guidelines." };
  }

  const department = input.department?.trim() || "Computer Engg";
  const yearOfStudy = input.yearOfStudy?.trim() || "3rd Year";
  const experienceLevel = input.experienceLevel?.trim() || "Intermediate";

  const db = getAdminDb();
  if (!db) return null;

  const emailNormalized = input.email.trim().toLowerCase();

  try {
    return await db.runTransaction(async (transaction) => {
      // 1. Check duplicate email in event
      const duplicateQuery = db
        .collection("registrations")
        .where("eventSlug", "==", eventSlug)
        .where("email", "==", emailNormalized)
        .limit(1);

      const duplicateSnap = await transaction.get(duplicateQuery);
      if (!duplicateSnap.empty) {
        const existingData = duplicateSnap.docs[0].data();
        return {
          success: false,
          error: "DUPLICATE_EMAIL",
          message: `The email ${emailNormalized} is already registered under pass reference #${existingData.referenceId}.`,
        };
      }

      // 2. Count existing registrations
      const countQuery = db
        .collection("registrations")
        .where("eventSlug", "==", eventSlug)
        .where("status", "!=", "cancelled");
      const countSnap = await transaction.get(countQuery);
      const currentCount = countSnap.size;

      const capacity = 150;
      if (currentCount >= capacity) {
        return {
          success: false,
          error: "CAPACITY_FULL",
          message: "Workshop capacity has been reached (150/150 seats reserved).",
        };
      }

      // 3. Generate Reference ID
      const referenceId = `GDG-VCET-2025-${String(currentCount + 1).padStart(4, "0")}`;
      const docRef = db.collection("registrations").doc();
      const createdAt = new Date().toISOString();

      const newRegistration: RegistrationRecord = {
        id: docRef.id,
        eventSlug,
        referenceId,
        fullName: input.fullName.trim(),
        email: emailNormalized,
        phone: input.phone.trim(),
        college: input.college.trim(),
        department,
        yearOfStudy,
        track: input.track.trim(),
        experienceLevel,
        portfolioUrl: input.portfolioUrl?.trim() || undefined,
        notes: input.notes?.trim() || undefined,
        status: "confirmed",
        checkedIn: false,
        createdAt,
      };

      transaction.set(docRef, newRegistration);

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
