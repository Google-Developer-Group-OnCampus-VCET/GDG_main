import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type {
  ChapterEvent,
  EventFormat,
  EventInput,
  EventTopic,
  RegistrationInput,
  RegistrationRecord,
} from "@/types";
import { events as defaultEvents } from "@/content/events";
import {
  getFirestoreEventStats,
  getFirestoreRegistrations,
  createFirestoreRegistration,
  checkInFirestoreAttendee,
  createFirestoreEvent,
  getFirestoreEvents,
  getFirestoreEvent,
  seedFirestoreInitialEvents,
  slugify,
} from "./firestore";

// Ensure data directory exists
const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, "gdg.db");

let _db: DatabaseSync | null = null;

export function getDatabase(): DatabaseSync {
  if (_db) return _db;

  _db = new DatabaseSync(DB_PATH);

  // Enable WAL mode and busy timeout for high-concurrency read/write
  _db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
  `);

  // Initialize Schema
  _db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      starts_at TEXT NOT NULL,
      ends_at TEXT,
      timezone TEXT DEFAULT 'Asia/Kolkata',
      format TEXT DEFAULT 'in-person',
      location TEXT,
      capacity INTEGER DEFAULT 150,
      is_registration_open INTEGER DEFAULT 1,
      summary TEXT,
      topics TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  try {
    _db.exec("ALTER TABLE events ADD COLUMN summary TEXT;");
  } catch {
    // column already exists
  }

  try {
    _db.exec("ALTER TABLE events ADD COLUMN topics TEXT;");
  } catch {
    // column already exists
  }

  _db.exec(`
    CREATE TABLE IF NOT EXISTS registrations (
      id TEXT PRIMARY KEY,
      event_slug TEXT NOT NULL,
      reference_id TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      college TEXT NOT NULL,
      department TEXT NOT NULL,
      year_of_study TEXT NOT NULL,
      track TEXT NOT NULL,
      experience_level TEXT NOT NULL,
      portfolio_url TEXT,
      notes TEXT,
      status TEXT DEFAULT 'confirmed',
      checked_in INTEGER DEFAULT 0,
      checked_in_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (event_slug) REFERENCES events(slug) ON DELETE CASCADE,
      UNIQUE(event_slug, email)
    );

    CREATE INDEX IF NOT EXISTS idx_registrations_slug ON registrations(event_slug);
    CREATE INDEX IF NOT EXISTS idx_registrations_ref ON registrations(reference_id);
  `);

  // Seed default DevCraft 2025 event if not existing
  const eventCheck = _db.prepare("SELECT slug FROM events WHERE slug = ?").get("devcraft-2025");
  if (!eventCheck) {
    _db.prepare(`
      INSERT INTO events (id, slug, title, starts_at, ends_at, timezone, format, location, capacity, is_registration_open)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      "devcraft-2025",
      "devcraft-2025",
      "DevCraft 2025",
      "2026-11-20T09:00:00+05:30",
      "2026-11-21T17:30:00+05:30",
      "Asia/Kolkata",
      "in-person",
      "Vidyavardhini's College of Engineering and Technology, Vasai (Auditorium & Labs 402)",
      150,
      1
    );

    // Seed realistic baseline cohort registrations (matching Stitch design 124 initial registered, 26 seats left)
    const seedAttendees: Omit<RegistrationRecord, "id" | "createdAt">[] = [
      {
        eventSlug: "devcraft-2025",
        referenceId: "GDG-VCET-2025-0842",
        fullName: "Atharva Joshi",
        email: "atharva.joshi@vcet.edu.in",
        phone: "+91 98765 43210",
        college: "Vidyavardhini's College of Engineering and Technology",
        department: "Computer Engg",
        yearOfStudy: "3rd Year",
        track: "Track A: Modern Web & Gemini AI",
        experienceLevel: "Intermediate",
        portfolioUrl: "https://github.com/atharva-joshi",
        notes: "Excited for Gemini multimodal tool calling labs!",
        status: "confirmed",
        checkedIn: false,
      },
      {
        eventSlug: "devcraft-2025",
        referenceId: "GDG-VCET-2025-0843",
        fullName: "Pooja Sharma",
        email: "pooja.sharma@vcet.edu.in",
        phone: "+91 98765 43211",
        college: "Vidyavardhini's College of Engineering and Technology",
        department: "Information Tech",
        yearOfStudy: "4th Year",
        track: "Track B: Cloud Architecture & GCP",
        experienceLevel: "Advanced",
        portfolioUrl: "https://github.com/pooja-sharma",
        notes: "Interested in Cloud Run and CI/CD pipelines.",
        status: "confirmed",
        checkedIn: true,
        checkedInAt: "2026-11-20 09:12:44",
      },
      {
        eventSlug: "devcraft-2025",
        referenceId: "GDG-VCET-2025-0844",
        fullName: "Rahul Tiwari",
        email: "rahul.tiwari@vcet.edu.in",
        phone: "+91 98765 43212",
        college: "Vidyavardhini's College of Engineering and Technology",
        department: "AI & Data Science",
        yearOfStudy: "2nd Year",
        track: "Track A: Modern Web & Gemini AI",
        experienceLevel: "Beginner",
        notes: "First time attending GDG VCET workshop.",
        status: "confirmed",
        checkedIn: false,
      },
      {
        eventSlug: "devcraft-2025",
        referenceId: "GDG-VCET-2025-0845",
        fullName: "Aniket Kulkarni",
        email: "aniket.kulkarni@vcet.edu.in",
        phone: "+91 98765 43213",
        college: "Vidyavardhini's College of Engineering and Technology",
        department: "Electronics & Telecomm",
        yearOfStudy: "3rd Year",
        track: "Track B: Cloud Architecture & GCP",
        experienceLevel: "Intermediate",
        status: "confirmed",
        checkedIn: false,
      },
    ];

    const insertAttendee = _db.prepare(`
      INSERT INTO registrations (
        id, event_slug, reference_id, full_name, email, phone, college,
        department, year_of_study, track, experience_level, portfolio_url,
        notes, status, checked_in, checked_in_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const a of seedAttendees) {
      insertAttendee.run(
        crypto.randomUUID(),
        a.eventSlug,
        a.referenceId,
        a.fullName,
        a.email,
        a.phone,
        a.college,
        a.department,
        a.yearOfStudy,
        a.track,
        a.experienceLevel,
        a.portfolioUrl ?? null,
        a.notes ?? null,
        a.status,
        a.checkedIn ? 1 : 0,
        a.checkedInAt ?? null
      );
    }

    // Insert baseline mock entries up to 124 to mirror the Stitch approved design
    const deptList = [
      "Computer Engg",
      "Information Tech",
      "AI & Data Science",
      "Electronics & Telecomm",
      "Other Engineering",
    ];
    const yearList = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
    const expList = ["Beginner", "Intermediate", "Advanced"];

    for (let i = 5; i <= 124; i++) {
      const padded = String(i).padStart(4, "0");
      const ref = `GDG-VCET-2025-${padded}`;
      const trk = i % 2 === 0 ? "Track A: Modern Web & Gemini AI" : "Track B: Cloud Architecture & GCP";
      const dept = deptList[i % deptList.length];
      const yr = yearList[i % yearList.length];
      const exp = expList[i % expList.length];

      insertAttendee.run(
        crypto.randomUUID(),
        "devcraft-2025",
        ref,
        `Student Developer #${i}`,
        `student${i}@vcet.edu.in`,
        `+91 98765 ${String(10000 + i).slice(-5)}`,
        i % 7 === 0 ? "Thakur College of Engineering" : "Vidyavardhini's College of Engineering and Technology",
        dept,
        yr,
        trk,
        exp,
        null,
        null,
        "confirmed",
        i <= 18 ? 1 : 0,
        i <= 18 ? "2026-11-20 09:20:00" : null
      );
    }
  }

  return _db;
}

export interface EventStats {
  totalRegistered: number;
  capacity: number;
  remaining: number;
  percentFilled: number;
  isOpen: boolean;
  checkedInCount: number;
  trackCounts: Record<string, number>;
  yearCounts: Record<string, number>;
  departmentCounts: Record<string, number>;
}

export function getEventStats(slug: string): EventStats {
  const db = getDatabase();

  const eventRow = db
    .prepare("SELECT capacity, is_registration_open FROM events WHERE slug = ?")
    .get(slug) as { capacity: number; is_registration_open: number } | undefined;

  const capacity = eventRow?.capacity ?? 150;
  const isOpen = (eventRow?.is_registration_open ?? 1) === 1;

  const totalRow = db
    .prepare("SELECT COUNT(*) as count FROM registrations WHERE event_slug = ? AND status != 'cancelled'")
    .get(slug) as { count: number };
  const totalRegistered = totalRow?.count ?? 0;

  const checkedInRow = db
    .prepare("SELECT COUNT(*) as count FROM registrations WHERE event_slug = ? AND checked_in = 1")
    .get(slug) as { count: number };
  const checkedInCount = checkedInRow?.count ?? 0;

  const trackRows = db
    .prepare("SELECT track, COUNT(*) as count FROM registrations WHERE event_slug = ? AND status != 'cancelled' GROUP BY track")
    .all(slug) as { track: string; count: number }[];
  const trackCounts: Record<string, number> = {};
  for (const r of trackRows) {
    trackCounts[r.track] = r.count;
  }

  const yearRows = db
    .prepare("SELECT year_of_study, COUNT(*) as count FROM registrations WHERE event_slug = ? AND status != 'cancelled' GROUP BY year_of_study")
    .all(slug) as { year_of_study: string; count: number }[];
  const yearCounts: Record<string, number> = {};
  for (const r of yearRows) {
    yearCounts[r.year_of_study] = r.count;
  }

  const deptRows = db
    .prepare("SELECT department, COUNT(*) as count FROM registrations WHERE event_slug = ? AND status != 'cancelled' GROUP BY department")
    .all(slug) as { department: string; count: number }[];
  const departmentCounts: Record<string, number> = {};
  for (const r of deptRows) {
    departmentCounts[r.department] = r.count;
  }

  const remaining = Math.max(0, capacity - totalRegistered);
  const percentFilled = Math.min(100, Math.round((totalRegistered / capacity) * 100));

  return {
    totalRegistered,
    capacity,
    remaining,
    percentFilled,
    isOpen: isOpen && remaining > 0,
    checkedInCount,
    trackCounts,
    yearCounts,
    departmentCounts,
  };
}

export function createEvent(input: EventInput): { success: boolean; event?: ChapterEvent; error?: string } {
  const db = getDatabase();

  if (!input.title?.trim() || !input.startsAt?.trim()) {
    return { success: false, error: "Title and start date are required." };
  }

  const slug = (input.slug?.trim() || slugify(input.title));
  if (!slug) {
    return { success: false, error: "Invalid title or slug." };
  }

  const existing = db.prepare("SELECT slug FROM events WHERE slug = ?").get(slug);
  if (existing) {
    return { success: false, error: `An event with slug "${slug}" already exists.` };
  }

  const id = crypto.randomUUID();
  const format = input.format || "in-person";
  const location = input.location?.trim() || "Vidyavardhini's College of Engineering and Technology, Vasai";
  const capacity = input.capacity ?? 150;
  const isOpen = input.isRegistrationOpen !== false ? 1 : 0;
  const timezone = input.timezone || "Asia/Kolkata";
  const summary = input.summary?.trim() || "";
  const topics: EventTopic[] = input.topics && input.topics.length > 0 ? input.topics : ["general"];
  const topicsJson = JSON.stringify(topics);

  db.prepare(`
    INSERT INTO events (
      id, slug, title, starts_at, ends_at, timezone, format, location, capacity, is_registration_open, summary, topics
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    slug,
    input.title.trim(),
    input.startsAt.trim(),
    input.endsAt?.trim() || null,
    timezone,
    format,
    location,
    capacity,
    isOpen,
    summary,
    topicsJson
  );

  const event: ChapterEvent = {
    id,
    slug,
    title: input.title.trim(),
    startsAt: input.startsAt.trim(),
    endsAt: input.endsAt?.trim() || undefined,
    timezone,
    format,
    location,
    topics,
    summary: summary || undefined,
    registrationUrl: `/events/${slug}/register`,
  };

  return { success: true, event };
}

export function getAllEvents(): ChapterEvent[] {
  const db = getDatabase();
  const rows = db.prepare("SELECT * FROM events ORDER BY starts_at DESC").all() as Record<string, unknown>[];

  const dbEvents: ChapterEvent[] = rows.map((r) => {
    let topics: EventTopic[] = ["general"];
    if (typeof r.topics === "string") {
      try {
        topics = JSON.parse(r.topics);
      } catch {
        topics = ["general"];
      }
    }

    const slug = r.slug as string;
    const defaultMatch = defaultEvents.find((e) => e.slug === slug);

    return {
      id: (r.id as string) || slug,
      slug,
      title: r.title as string,
      startsAt: r.starts_at as string,
      endsAt: (r.ends_at as string) || undefined,
      timezone: (r.timezone as string) || "Asia/Kolkata",
      format: (r.format as EventFormat) || "in-person",
      location: (r.location as string) || "Vidyavardhini's College of Engineering and Technology, Vasai",
      topics,
      summary: (r.summary as string) || defaultMatch?.summary,
      registrationUrl: `/events/${slug}/register`,
      workshop: defaultMatch?.workshop,
    };
  });

  const merged = [...dbEvents];
  for (const def of defaultEvents) {
    if (!merged.some((e) => e.slug === def.slug)) {
      merged.push(def);
    }
  }

  return merged;
}

export function getRegistrations(
  eventSlug: string,
  options?: { search?: string; track?: string; status?: string; checkedIn?: string }
): RegistrationRecord[] {
  const db = getDatabase();

  let query = "SELECT * FROM registrations WHERE event_slug = ?";
  const params: unknown[] = [eventSlug];

  if (options?.search) {
    query += " AND (full_name LIKE ? OR email LIKE ? OR reference_id LIKE ? OR college LIKE ?)";
    const term = `%${options.search}%`;
    params.push(term, term, term, term);
  }

  if (options?.track && options.track !== "all") {
    query += " AND track = ?";
    params.push(options.track);
  }

  if (options?.status && options.status !== "all") {
    query += " AND status = ?";
    params.push(options.status);
  }

  if (options?.checkedIn !== undefined && options.checkedIn !== "all") {
    query += " AND checked_in = ?";
    params.push(options.checkedIn === "true" || options.checkedIn === "1" ? 1 : 0);
  }

  query += " ORDER BY created_at DESC";

  const rows = db.prepare(query).all(...params) as Record<string, unknown>[];

  return rows.map((r) => ({
    id: r.id as string,
    eventSlug: r.event_slug as string,
    referenceId: r.reference_id as string,
    fullName: r.full_name as string,
    email: r.email as string,
    phone: r.phone as string,
    college: r.college as string,
    department: r.department as string,
    yearOfStudy: r.year_of_study as string,
    track: r.track as string,
    experienceLevel: r.experience_level as string,
    portfolioUrl: (r.portfolio_url as string) || undefined,
    notes: (r.notes as string) || undefined,
    status: r.status as "confirmed" | "waitlisted" | "cancelled",
    checkedIn: (r.checked_in as number) === 1,
    checkedInAt: (r.checked_in_at as string) || undefined,
    createdAt: r.created_at as string,
  }));
}

export function getRegistrationByReference(referenceId: string): RegistrationRecord | null {
  const db = getDatabase();
  const row = db
    .prepare("SELECT * FROM registrations WHERE reference_id = ?")
    .get(referenceId) as Record<string, unknown> | undefined;

  if (!row) return null;

  return {
    id: row.id as string,
    eventSlug: row.event_slug as string,
    referenceId: row.reference_id as string,
    fullName: row.full_name as string,
    email: row.email as string,
    phone: row.phone as string,
    college: row.college as string,
    department: row.department as string,
    yearOfStudy: row.year_of_study as string,
    track: row.track as string,
    experienceLevel: row.experience_level as string,
    portfolioUrl: (row.portfolio_url as string) || undefined,
    notes: (row.notes as string) || undefined,
    status: row.status as "confirmed" | "waitlisted" | "cancelled",
    checkedIn: (row.checked_in as number) === 1,
    checkedInAt: (row.checked_in_at as string) || undefined,
    createdAt: row.created_at as string,
  };
}

export type CreateRegistrationResult =
  | { success: true; registration: RegistrationRecord }
  | { success: false; error: "DUPLICATE_EMAIL" | "CAPACITY_FULL" | "REGISTRATION_CLOSED" | "INVALID_INPUT"; message: string };

export function createRegistration(
  eventSlug: string,
  input: RegistrationInput
): CreateRegistrationResult {
  const db = getDatabase();

  // Required fields: fullName, email, phone, track
  if (
    !input.fullName?.trim() ||
    !input.email?.trim() ||
    !input.phone?.trim() ||
    !input.track?.trim()
  ) {
    return { success: false, error: "INVALID_INPUT", message: "All required fields must be provided." };
  }

  if (!input.agreedToCoc) {
    return { success: false, error: "INVALID_INPUT", message: "You must agree to the Code of Conduct and guidelines." };
  }

  const college = input.college?.trim() || "Vidyavardhini's College of Engineering & Technology (VCET)";
  const department = input.department?.trim() || "Computer Engg";
  const yearOfStudy = input.yearOfStudy?.trim() || "3rd Year";
  const experienceLevel = input.experienceLevel?.trim() || "Intermediate";

  const emailNormalized = input.email.trim().toLowerCase();

  // Check duplicate
  const existing = db
    .prepare("SELECT id, reference_id FROM registrations WHERE event_slug = ? AND LOWER(email) = ? AND status != 'cancelled'")
    .get(eventSlug, emailNormalized) as { id: string; reference_id: string } | undefined;

  if (existing) {
    return {
      success: false,
      error: "DUPLICATE_EMAIL",
      message: `The email ${emailNormalized} is already registered under pass reference #${existing.reference_id}.`,
    };
  }

  // Check capacity & open status
  const stats = getEventStats(eventSlug);
  if (!stats.isOpen) {
    return { success: false, error: "REGISTRATION_CLOSED", message: "Registration for this event is currently closed." };
  }

  if (stats.remaining <= 0) {
    return { success: false, error: "CAPACITY_FULL", message: "Workshop capacity has been reached (150/150 seats reserved)." };
  }

  // Generate Reference ID: GDG-VCET-2025-XXXX (guaranteed collision-free)
  const nextNum = stats.totalRegistered + 1;
  let referenceId = `GDG-VCET-2025-${String(nextNum).padStart(4, "0")}`;
  while (db.prepare("SELECT id FROM registrations WHERE reference_id = ?").get(referenceId)) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    referenceId = `GDG-VCET-2025-${randomSuffix}`;
  }
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  db.prepare(`
    INSERT INTO registrations (
      id, event_slug, reference_id, full_name, email, phone, college,
      department, year_of_study, track, experience_level, portfolio_url,
      notes, status, checked_in, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    eventSlug,
    referenceId,
    input.fullName.trim(),
    emailNormalized,
    input.phone.trim(),
    college,
    department,
    yearOfStudy,
    input.track.trim(),
    experienceLevel,
    input.portfolioUrl?.trim() || null,
    input.notes?.trim() || null,
    "confirmed",
    0,
    createdAt
  );

  return {
    success: true,
    registration: {
      id,
      eventSlug,
      referenceId,
      fullName: input.fullName.trim(),
      email: emailNormalized,
      phone: input.phone.trim(),
      college,
      department,
      yearOfStudy,
      track: input.track.trim(),
      experienceLevel,
      portfolioUrl: input.portfolioUrl?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
      status: "confirmed",
      checkedIn: false,
      createdAt,
    },
  };
}

export function checkInAttendee(
  eventSlug: string,
  referenceId: string
): { success: boolean; message: string; registration?: RegistrationRecord } {
  const db = getDatabase();

  const ref = referenceId.trim().toUpperCase();
  const reg = getRegistrationByReference(ref);

  if (!reg || reg.eventSlug !== eventSlug) {
    return { success: false, message: `Pass reference "${ref}" was not found for this event.` };
  }

  if (reg.checkedIn) {
    return {
      success: false,
      message: `${reg.fullName} (#${ref}) was ALREADY checked in at ${reg.checkedInAt}.`,
      registration: reg,
    };
  }

  const now = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  db.prepare("UPDATE registrations SET checked_in = 1, checked_in_at = ? WHERE reference_id = ?").run(
    now,
    ref
  );

  const updatedReg = getRegistrationByReference(ref)!;

  return {
    success: true,
    message: `Successfully checked in ${reg.fullName} (#${ref}) for ${reg.track}!`,
    registration: updatedReg,
  };
}

export function cleanupTestRegistrations(): void {
  const db = getDatabase();
  db.prepare(`
    DELETE FROM registrations
    WHERE email LIKE '%test%'
       OR email LIKE '%attendee%'
       OR email LIKE '%checkin%'
       OR email LIKE '%duplicate%'
       OR email LIKE '%noconsent%'
  `).run();
}

/**
 * Cloud Firestore primary with seamless SQLite local fallback.
 */
export async function getEventStatsAsync(slug: string): Promise<EventStats> {
  try {
    const firestoreStats = await getFirestoreEventStats(slug);
    if (firestoreStats) return firestoreStats;
  } catch (err) {
    console.warn("Firestore stats query failed, falling back to local SQLite:", (err as Error).message);
  }
  return getEventStats(slug);
}

export async function getRegistrationsAsync(
  eventSlug: string,
  options?: { search?: string; track?: string; status?: string; checkedIn?: string }
): Promise<RegistrationRecord[]> {
  try {
    const firestoreRegs = await getFirestoreRegistrations(eventSlug, options);
    if (firestoreRegs && firestoreRegs.length > 0) return firestoreRegs;
  } catch (err) {
    console.warn("Firestore registrations query failed, falling back to local SQLite:", (err as Error).message);
  }
  return getRegistrations(eventSlug, options);
}

export async function createRegistrationAsync(
  eventSlug: string,
  input: RegistrationInput
): Promise<CreateRegistrationResult> {
  try {
    const firestoreResult = await createFirestoreRegistration(eventSlug, input);
    if (firestoreResult) {
      if (firestoreResult.success) {
        try {
          const db = getDatabase();
          const r = firestoreResult.registration;
          db.prepare(`
            INSERT OR REPLACE INTO registrations (
              id, event_slug, reference_id, full_name, email, phone, college,
              department, year_of_study, track, experience_level, portfolio_url,
              notes, status, checked_in, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            r.id,
            r.eventSlug,
            r.referenceId,
            r.fullName,
            r.email,
            r.phone,
            r.college,
            r.department,
            r.yearOfStudy,
            r.track,
            r.experienceLevel,
            r.portfolioUrl ?? null,
            r.notes ?? null,
            r.status,
            r.checkedIn ? 1 : 0,
            r.createdAt
          );
        } catch {
          // ignore local SQLite mirroring error
        }
      }
      return firestoreResult;
    }
  } catch (err) {
    console.warn("Firestore registration failed, falling back to local SQLite:", (err as Error).message);
  }
  return createRegistration(eventSlug, input);
}

export async function checkInAttendeeAsync(
  eventSlug: string,
  referenceId: string
): Promise<{ success: boolean; message: string; registration?: RegistrationRecord }> {
  try {
    const firestoreResult = await checkInFirestoreAttendee(eventSlug, referenceId);
    if (firestoreResult) {
      if (firestoreResult.success && firestoreResult.registration) {
        try {
          const db = getDatabase();
          db.prepare("UPDATE registrations SET checked_in = 1, checked_in_at = ? WHERE reference_id = ?").run(
            firestoreResult.registration.checkedInAt ?? new Date().toISOString(),
            referenceId.trim().toUpperCase()
          );
        } catch {
          // ignore local SQLite mirroring error
        }
      }
      return firestoreResult;
    }
  } catch (err) {
    console.warn("Firestore check-in failed, falling back to local SQLite:", (err as Error).message);
  }
  return checkInAttendee(eventSlug, referenceId);
}

export async function createEventAsync(
  input: EventInput
): Promise<{ success: boolean; event?: ChapterEvent; error?: string }> {
  try {
    const firestoreResult = await createFirestoreEvent(input);
    if (firestoreResult.success && firestoreResult.event) {
      try {
        createEvent({ ...input, slug: firestoreResult.event.slug });
      } catch {
        // ignore duplicate in local SQLite mirroring
      }
      return firestoreResult;
    } else if (firestoreResult.error && firestoreResult.error.includes("already exists")) {
      return firestoreResult;
    }
  } catch (err) {
    console.warn("Firestore createEvent failed, falling back to local SQLite:", (err as Error).message);
  }

  return createEvent(input);
}

export async function getAllEventsAsync(): Promise<ChapterEvent[]> {
  try {
    await seedFirestoreInitialEvents(defaultEvents);

    const firestoreEvents = await getFirestoreEvents();
    if (firestoreEvents && firestoreEvents.length > 0) {
      const merged = [...firestoreEvents];
      for (const def of defaultEvents) {
        const existingIdx = merged.findIndex((e) => e.slug === def.slug);
        if (existingIdx >= 0) {
          if (def.workshop && !merged[existingIdx].workshop) {
            merged[existingIdx].workshop = def.workshop;
          }
        } else {
          merged.push(def);
        }
      }
      return merged;
    }
  } catch (err) {
    console.warn("Firestore getAllEvents failed, falling back to local SQLite:", (err as Error).message);
  }

  return getAllEvents();
}

export async function getEventBySlugAsync(slug: string): Promise<ChapterEvent | null> {
  try {
    const firestoreEvent = await getFirestoreEvent(slug);
    if (firestoreEvent) {
      const defMatch = defaultEvents.find((e) => e.slug === slug);
      if (defMatch?.workshop && !firestoreEvent.workshop) {
        firestoreEvent.workshop = defMatch.workshop;
      }
      return firestoreEvent;
    }
  } catch (err) {
    console.warn("Firestore getEvent failed, falling back to local SQLite:", (err as Error).message);
  }

  const all = getAllEvents();
  return all.find((e) => e.slug === slug) ?? null;
}



