import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type {
  AuditAction,
  AuditActorRole,
  AuditLogEntry,
  ChapterEvent,
  ChapterSettings,
  EmailLog,
  EventFormat,
  EventInput,
  EventTopic,
  EventUpdateInput,
  RegistrationInput,
  RegistrationRecord,
  RegistrationStatus,
  RegistrationUpdateInput,
  WorkshopDetails,
} from "@/types";
import { events as defaultEvents } from "@/content/events";
import { DEFAULT_CHAPTER_SETTINGS } from "@/lib/site-defaults";
import { validateAndNormalizeRegistrationInput } from "@/lib/registration-validation";
import {
  buildEventReferenceId,
  getFirestoreEventStats,
  getFirestorePublicEventStats,
  getFirestoreRegistrations,
  getFirestoreRegistrationsPaginated,
  type PaginatedRegistrationsResult,
  createFirestoreRegistration,
  updateFirestoreRegistration,
  reviewFirestoreRegistration,
  checkInFirestoreAttendee,
  revokeCheckInFirestoreAttendee,
  createFirestoreEvent,
  updateFirestoreEvent,
  deleteFirestoreEvent,
  getFirestoreEvents,
  getFirestoreDeletedEventSlugs,
  getFirestoreEvent,
  seedFirestoreInitialEvents,
  logFirestoreEmail,
  getFirestoreEmailLogs,
  cancelFirestoreRegistration,
  deleteFirestoreRegistration,
  logFirestoreAudit,
  getFirestoreAuditLogs,
  getFirestoreSiteSettings,
  updateFirestoreSiteSettings,
  slugify,
} from "./firestore";
import { revalidateEventCaches, revalidateSiteCaches } from "./cache";

export { buildEventReferenceId };
export type { PaginatedRegistrationsResult };

export function resolveWritableDbPath(): string {
  const isReadOnlyServerless =
    process.env.VERCEL === "1" || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);

  if (!isReadOnlyServerless) {
    const localDir = path.join(process.cwd(), "data");
    try {
      if (!fs.existsSync(localDir)) {
        fs.mkdirSync(localDir, { recursive: true });
      }
      fs.accessSync(localDir, fs.constants.W_OK);
      return path.join(localDir, "gdg.db");
    } catch {
      // Fall through to writable temp directory
    }
  }

  const tmpDir = path.join(os.tmpdir(), "gdg-data");
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }
  return path.join(tmpDir, "gdg.db");
}

let _db: DatabaseSync | null = null;

export function getDatabase(): DatabaseSync {
  if (_db) return _db;

  _db = new DatabaseSync(resolveWritableDbPath());

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

    CREATE TABLE IF NOT EXISTS email_logs (
      id TEXT PRIMARY KEY,
      event_slug TEXT NOT NULL,
      type TEXT NOT NULL,
      subject TEXT NOT NULL,
      recipient_count INTEGER NOT NULL,
      recipients TEXT NOT NULL,
      sent_at TEXT NOT NULL,
      status TEXT NOT NULL,
      sender TEXT,
      preview_text TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_email_logs_event ON email_logs(event_slug);

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      actor_identifier TEXT,
      ip_address TEXT,
      user_agent TEXT,
      event_slug TEXT,
      details TEXT,
      timestamp TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_audit_logs_event ON audit_logs(event_slug);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_time ON audit_logs(timestamp);

    CREATE TABLE IF NOT EXISTS site_settings (
      id TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  const alterColumns = [
    "ALTER TABLE registrations ADD COLUMN checked_in_days TEXT;",
    "ALTER TABLE registrations ADD COLUMN check_ins TEXT;",
    "ALTER TABLE events ADD COLUMN image TEXT;",
    "ALTER TABLE events ADD COLUMN url TEXT;",
    "ALTER TABLE events ADD COLUMN cancelled INTEGER DEFAULT 0;",
    "ALTER TABLE events ADD COLUMN price_note TEXT;",
    "ALTER TABLE events ADD COLUMN workshop_json TEXT;",
    "ALTER TABLE events ADD COLUMN deleted INTEGER DEFAULT 0;",
    "ALTER TABLE events ADD COLUMN require_approval INTEGER DEFAULT 0;",
    "ALTER TABLE registrations ADD COLUMN reviewed_at TEXT;",
  ];
  for (const sql of alterColumns) {
    try {
      _db.exec(sql);
    } catch {
      // Column already exists
    }
  }

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
  pendingCount?: number;
  waitlistedCount?: number;
  capacity: number;
  remaining: number;
  percentFilled: number;
  isOpen: boolean;
  isRegistrationOpen?: boolean;
  checkedInCount: number;
  dailyCheckedInCounts?: Record<number, number>;
  multiDayCompletionCount?: number;
  trackCounts: Record<string, number>;
  yearCounts: Record<string, number>;
  departmentCounts: Record<string, number>;
  experienceCounts?: Record<string, number>;
  collegeStats?: {
    vcetCount: number;
    otherCount: number;
    vcetPercent: number;
    topColleges: { college: string; count: number }[];
  };
  registrationDates?: Record<string, number>;
}

export function getEventStats(slug: string): EventStats {
  const db = getDatabase();

  const eventRow = db
    .prepare("SELECT capacity, is_registration_open FROM events WHERE slug = ?")
    .get(slug) as { capacity: number; is_registration_open: number } | undefined;

  const defaultMatch = defaultEvents.find((e) => e.slug === slug);
  const rawCapacity = eventRow?.capacity ?? defaultMatch?.capacity ?? defaultMatch?.workshop?.capacity ?? 150;
  const isRegistrationOpen =
    eventRow !== undefined
      ? eventRow.is_registration_open === 1
      : (defaultMatch?.workshop?.registrationConfig?.isOpen ?? true);

  const totalRow = db
    .prepare("SELECT COUNT(*) as count FROM registrations WHERE event_slug = ? AND status = 'confirmed'")
    .get(slug) as { count: number };
  const totalRegistered = totalRow?.count ?? 0;

  const statusCountsRow = db
    .prepare(
      `SELECT
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN status = 'waitlisted' THEN 1 ELSE 0 END) as waitlisted_count
       FROM registrations WHERE event_slug = ?`
    )
    .get(slug) as { pending_count?: number | null; waitlisted_count?: number | null } | undefined;
  const pendingCount = statusCountsRow?.pending_count ?? 0;
  const waitlistedCount = statusCountsRow?.waitlisted_count ?? 0;

  const checkedInRow = db
    .prepare("SELECT COUNT(*) as count FROM registrations WHERE event_slug = ? AND status = 'confirmed' AND checked_in = 1")
    .get(slug) as { count: number };
  const checkedInCount = checkedInRow?.count ?? 0;

  const regRows = db
    .prepare("SELECT checked_in, checked_in_days FROM registrations WHERE event_slug = ? AND status = 'confirmed'")
    .all(slug) as { checked_in: number; checked_in_days: string | null }[];

  const dailyCheckedInCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  let multiDayCompletionCount = 0;

  for (const r of regRows) {
    let days: number[] = [];
    if (r.checked_in_days) {
      try {
        const parsed = JSON.parse(r.checked_in_days);
        if (Array.isArray(parsed)) {
          days = parsed.map(Number).filter((d) => !isNaN(d));
        }
      } catch {
        // fallback
      }
    } else if (r.checked_in === 1) {
      days = [1];
    }

    days.forEach((day) => {
      dailyCheckedInCounts[day] = (dailyCheckedInCounts[day] || 0) + 1;
    });

    if (days.includes(1) && days.includes(2) && days.includes(3) && days.includes(4)) {
      multiDayCompletionCount++;
    }
  }

  const trackRows = db
    .prepare("SELECT track, COUNT(*) as count FROM registrations WHERE event_slug = ? AND status = 'confirmed' GROUP BY track")
    .all(slug) as { track: string; count: number }[];
  const trackCounts: Record<string, number> = {};
  for (const r of trackRows) {
    trackCounts[r.track] = r.count;
  }

  const yearRows = db
    .prepare("SELECT year_of_study, COUNT(*) as count FROM registrations WHERE event_slug = ? AND status = 'confirmed' GROUP BY year_of_study")
    .all(slug) as { year_of_study: string; count: number }[];
  const yearCounts: Record<string, number> = {};
  for (const r of yearRows) {
    yearCounts[r.year_of_study] = r.count;
  }

  const deptRows = db
    .prepare("SELECT department, COUNT(*) as count FROM registrations WHERE event_slug = ? AND status = 'confirmed' GROUP BY department")
    .all(slug) as { department: string; count: number }[];
  const departmentCounts: Record<string, number> = {};
  for (const r of deptRows) {
    departmentCounts[r.department] = r.count;
  }

  const expRows = db
    .prepare(
      "SELECT experience_level, COUNT(*) as count FROM registrations WHERE event_slug = ? AND status = 'confirmed' GROUP BY experience_level"
    )
    .all(slug) as { experience_level: string; count: number }[];
  const experienceCounts: Record<string, number> = {};
  for (const r of expRows) {
    if (r.experience_level) experienceCounts[r.experience_level] = r.count;
  }

  const collegeRows = db
    .prepare(
      "SELECT college, COUNT(*) as count FROM registrations WHERE event_slug = ? AND status = 'confirmed' GROUP BY college ORDER BY count DESC"
    )
    .all(slug) as { college: string; count: number }[];

  let vcetCount = 0;
  let otherCount = 0;
  const topColleges: { college: string; count: number }[] = [];

  for (const r of collegeRows) {
    const colName = r.college?.trim() || "Unknown";
    const isVcet =
      colName.toLowerCase().includes("vcet") ||
      colName.toLowerCase().includes("vidyavardhini");
    if (isVcet) {
      vcetCount += r.count;
    } else {
      otherCount += r.count;
      if (topColleges.length < 5) {
        topColleges.push({ college: colName, count: r.count });
      }
    }
  }

  const vcetPercent =
    totalRegistered > 0 ? Math.round((vcetCount / totalRegistered) * 100) : 0;

  const dateRows = db
    .prepare(
      "SELECT SUBSTR(created_at, 1, 10) as reg_date, COUNT(*) as count FROM registrations WHERE event_slug = ? AND status = 'confirmed' GROUP BY reg_date ORDER BY reg_date ASC"
    )
    .all(slug) as { reg_date: string; count: number }[];
  const registrationDates: Record<string, number> = {};
  for (const r of dateRows) {
    if (r.reg_date) registrationDates[r.reg_date] = r.count;
  }

  // Peak capacity: dev-to-cloud is fixed at 135 peak capacity. Other events auto-expand if initial 120 is reached.
  const capacity =
    slug === "dev-to-cloud"
      ? Math.max(135, rawCapacity)
      : rawCapacity === 120 && totalRegistered >= rawCapacity
      ? Math.max(rawCapacity, 135)
      : rawCapacity;

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
    isOpen: isRegistrationOpen && remaining > 0,
    isRegistrationOpen,
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
  const requireApproval = Boolean(
    input.requireApproval ?? input.workshop?.registrationConfig?.requireApproval ?? false
  );
  const timezone = input.timezone || "Asia/Kolkata";
  const summary = input.summary?.trim() || "";
  const topics: EventTopic[] = input.topics && input.topics.length > 0 ? input.topics : ["general"];
  const topicsJson = JSON.stringify(topics);
  const image = input.image?.trim() || null;
  const url = input.url?.trim() || null;
  const cancelled = input.cancelled ? 1 : 0;
  const priceNote = input.priceNote?.trim() || null;
  const workshopJson = input.workshop ? JSON.stringify(input.workshop) : null;

  db.prepare(`
    INSERT INTO events (
      id, slug, title, starts_at, ends_at, timezone, format, location, capacity, is_registration_open, require_approval, summary, topics, image, url, cancelled, price_note, workshop_json, deleted
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
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
    requireApproval ? 1 : 0,
    summary,
    topicsJson,
    image,
    url,
    cancelled,
    priceNote,
    workshopJson
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
    ...(image ? { image } : {}),
    ...(url ? { url } : {}),
    ...(input.cancelled !== undefined ? { cancelled: Boolean(input.cancelled) } : {}),
    capacity,
    ...(priceNote ? { priceNote } : {}),
    isRegistrationOpen: input.isRegistrationOpen !== false,
    requireApproval,
    registrationUrl: `/events/${slug}/register`,
    ...(input.workshop ? { workshop: input.workshop } : {}),
  };

  return { success: true, event };
}

function mapEventRowToChapterEvent(r: Record<string, unknown>): ChapterEvent {
  let topics: EventTopic[] = ["general"];
  if (typeof r.topics === "string") {
    try {
      topics = JSON.parse(r.topics);
    } catch {
      topics = ["general"];
    }
  }

  let storedWorkshop: WorkshopDetails | undefined;
  if (typeof r.workshop_json === "string" && r.workshop_json.trim()) {
    try {
      storedWorkshop = JSON.parse(r.workshop_json) as WorkshopDetails;
    } catch {
      storedWorkshop = undefined;
    }
  }

  const slug = r.slug as string;
  const defaultMatch = defaultEvents.find((e) => e.slug === slug);

  const capacity = typeof r.capacity === "number" ? r.capacity : defaultMatch?.capacity ?? defaultMatch?.workshop?.capacity;
  const isRegistrationOpen =
    typeof r.is_registration_open === "number" ? r.is_registration_open !== 0 : undefined;
  const requireApproval =
    typeof r.require_approval === "number"
      ? r.require_approval === 1
      : storedWorkshop?.registrationConfig?.requireApproval ??
        defaultMatch?.requireApproval ??
        defaultMatch?.workshop?.registrationConfig?.requireApproval;
  const location =
    (r.location as string) ||
    "Vidyavardhini's College of Engineering and Technology, Vasai";

  const baseWorkshop = storedWorkshop ?? defaultMatch?.workshop;
  const workshop = baseWorkshop
    ? {
        ...baseWorkshop,
        ...(capacity !== undefined
          ? {
              capacity,
              seatsText: `Limited to ${capacity} Seats`,
            }
          : {}),
        venueText: location,
        registrationConfig: {
          ...(baseWorkshop.registrationConfig || {}),
          ...(typeof isRegistrationOpen === "boolean" ? { isOpen: isRegistrationOpen } : {}),
          ...(typeof requireApproval === "boolean" ? { requireApproval } : {}),
        },
      }
    : undefined;

  return {
    id: (r.id as string) || slug,
    slug,
    title: r.title as string,
    startsAt: r.starts_at as string,
    endsAt: (r.ends_at as string) || undefined,
    timezone: (r.timezone as string) || "Asia/Kolkata",
    format: (r.format as EventFormat) || "in-person",
    location,
    topics,
    summary: (r.summary as string) || defaultMatch?.summary,
    image: (r.image as string) || defaultMatch?.image,
    url: (r.url as string) || defaultMatch?.url,
    cancelled: typeof r.cancelled === "number" ? r.cancelled === 1 : defaultMatch?.cancelled,
    capacity,
    priceNote: (r.price_note as string) || defaultMatch?.priceNote,
    isRegistrationOpen,
    ...(typeof requireApproval === "boolean" ? { requireApproval } : {}),
    registrationUrl: `/events/${slug}/register`,
    workshop,
  };
}

function ensureDefaultEventInSqlite(db: DatabaseSync, defMatch: ChapterEvent): void {
  db.prepare(`
    INSERT OR IGNORE INTO events (
      id, slug, title, starts_at, ends_at, timezone, format, location, capacity, is_registration_open, summary, topics, image, url, cancelled, price_note, deleted
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
  `).run(
    defMatch.id,
    defMatch.slug,
    defMatch.title,
    defMatch.startsAt,
    defMatch.endsAt ?? null,
    defMatch.timezone ?? "Asia/Kolkata",
    defMatch.format ?? "in-person",
    defMatch.location ?? "Vidyavardhini's College of Engineering and Technology, Vasai",
    defMatch.capacity ?? defMatch.workshop?.capacity ?? 150,
    defMatch.workshop?.registrationConfig?.isOpen === false ? 0 : 1,
    defMatch.summary ?? "",
    JSON.stringify(defMatch.topics ?? ["general"]),
    defMatch.image ?? null,
    defMatch.url ?? null,
    defMatch.cancelled ? 1 : 0,
    defMatch.priceNote ?? null
  );
}

export function updateEvent(
  slug: string,
  input: EventUpdateInput
): { success: boolean; event?: ChapterEvent; error?: string } {
  const db = getDatabase();

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

  const existing = db.prepare("SELECT slug, deleted FROM events WHERE slug = ?").get(slug) as
    | { slug: string; deleted?: number }
    | undefined;
  if (existing?.deleted === 1) {
    return { success: false, error: "EVENT_NOT_FOUND" };
  }
  if (!existing) {
    const defMatch = defaultEvents.find((e) => e.slug === slug);
    if (!defMatch) {
      return { success: false, error: "EVENT_NOT_FOUND" };
    }
    ensureDefaultEventInSqlite(db, defMatch);
  }

  const setClauses: string[] = [];
  const params: (string | number | null)[] = [];

  if (input.title !== undefined) {
    setClauses.push("title = ?");
    params.push(input.title.trim());
  }
  if (input.startsAt !== undefined) {
    setClauses.push("starts_at = ?");
    params.push(input.startsAt.trim());
  }
  if (input.endsAt !== undefined) {
    setClauses.push("ends_at = ?");
    params.push(input.endsAt.trim() || null);
  }
  if (input.timezone !== undefined) {
    setClauses.push("timezone = ?");
    params.push(input.timezone.trim() || "Asia/Kolkata");
  }
  if (input.format !== undefined) {
    setClauses.push("format = ?");
    params.push(input.format);
  }
  if (input.location !== undefined) {
    setClauses.push("location = ?");
    params.push(input.location.trim());
  }
  if (input.topics !== undefined) {
    setClauses.push("topics = ?");
    params.push(JSON.stringify(input.topics.length > 0 ? input.topics : ["general"]));
  }
  if (input.summary !== undefined) {
    setClauses.push("summary = ?");
    params.push(input.summary.trim() || "");
  }
  if (input.image !== undefined) {
    setClauses.push("image = ?");
    params.push(input.image.trim() || null);
  }
  if (input.url !== undefined) {
    setClauses.push("url = ?");
    params.push(input.url.trim() || null);
  }
  if (input.cancelled !== undefined) {
    setClauses.push("cancelled = ?");
    params.push(input.cancelled ? 1 : 0);
  }
  if (input.priceNote !== undefined) {
    setClauses.push("price_note = ?");
    params.push(input.priceNote.trim() || null);
  }
  if (input.workshop !== undefined) {
    setClauses.push("workshop_json = ?");
    params.push(JSON.stringify(input.workshop));
  }
  if (input.capacity !== undefined) {
    setClauses.push("capacity = ?");
    params.push(Math.floor(input.capacity));
  }
  if (input.isRegistrationOpen !== undefined) {
    setClauses.push("is_registration_open = ?");
    params.push(input.isRegistrationOpen ? 1 : 0);
  }
  if (input.requireApproval !== undefined) {
    setClauses.push("require_approval = ?");
    params.push(input.requireApproval ? 1 : 0);
  } else if (input.workshop?.registrationConfig?.requireApproval !== undefined) {
    setClauses.push("require_approval = ?");
    params.push(input.workshop.registrationConfig.requireApproval ? 1 : 0);
  }

  if (setClauses.length > 0) {
    params.push(slug);
    db.prepare(`UPDATE events SET ${setClauses.join(", ")} WHERE slug = ?`).run(...params);
  }

  const updatedRow = db.prepare("SELECT * FROM events WHERE slug = ?").get(slug) as
    | Record<string, unknown>
    | undefined;
  if (!updatedRow) {
    return { success: false, error: "EVENT_NOT_FOUND" };
  }

  return { success: true, event: mapEventRowToChapterEvent(updatedRow) };
}

export function deleteEvent(slug: string): { success: boolean; error?: string } {
  const db = getDatabase();
  const existing = db.prepare("SELECT slug FROM events WHERE slug = ?").get(slug);
  const defMatch = defaultEvents.find((e) => e.slug === slug);

  if (!existing && !defMatch) {
    return { success: false, error: "EVENT_NOT_FOUND" };
  }

  if (defMatch) {
    ensureDefaultEventInSqlite(db, defMatch);
    db.prepare("UPDATE events SET deleted = 1 WHERE slug = ?").run(slug);
  } else {
    db.prepare("DELETE FROM events WHERE slug = ?").run(slug);
  }

  return { success: true };
}

export function getAllEvents(): ChapterEvent[] {
  const db = getDatabase();
  const allRows = db.prepare("SELECT * FROM events ORDER BY starts_at DESC").all() as Record<
    string,
    unknown
  >[];

  const deletedSlugs = new Set(
    allRows.filter((r) => r.deleted === 1).map((r) => String(r.slug))
  );
  const dbEvents: ChapterEvent[] = allRows
    .filter((r) => r.deleted !== 1)
    .map(mapEventRowToChapterEvent);

  const merged = [...dbEvents];
  for (const def of defaultEvents) {
    if (!deletedSlugs.has(def.slug) && !merged.some((e) => e.slug === def.slug)) {
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
    if (options.checkedIn.startsWith("day-")) {
      const targetDay = parseInt(options.checkedIn.replace("day-", ""), 10);
      if (!isNaN(targetDay)) {
        query += " AND (checked_in_days LIKE ? OR (checked_in = 1 AND ? = 1))";
        params.push(`%${targetDay}%`, targetDay);
      }
    } else if (options.checkedIn === "all-days") {
      query += " AND (checked_in_days LIKE '%1%' AND checked_in_days LIKE '%2%' AND checked_in_days LIKE '%3%' AND checked_in_days LIKE '%4%')";
    } else if (
      options.checkedIn === "absent" ||
      options.checkedIn === "not-checked-in" ||
      options.checkedIn === "false" ||
      options.checkedIn === "0"
    ) {
      query += " AND (checked_in = 0 OR checked_in IS NULL)";
    } else {
      query += " AND checked_in = ?";
      params.push(options.checkedIn === "true" || options.checkedIn === "1" || options.checkedIn === "checked-in" ? 1 : 0);
    }
  }

  query += " ORDER BY created_at DESC";

  const rows = db.prepare(query).all(...params) as Record<string, unknown>[];

  return rows.map((r) => {
    let checkedInDays: number[] | undefined;
    if (r.checked_in_days) {
      try {
        const parsed = JSON.parse(r.checked_in_days as string);
        if (Array.isArray(parsed)) {
          checkedInDays = parsed.map(Number).filter((d) => !isNaN(d));
        }
      } catch {
        // ignore
      }
    }
    if (!checkedInDays && (r.checked_in as number) === 1) {
      checkedInDays = [1];
    }

    let checkIns: Record<number, string> | undefined;
    if (r.check_ins) {
      try {
        checkIns = JSON.parse(r.check_ins as string);
      } catch {
        // ignore
      }
    }
    if (!checkIns && (r.checked_in as number) === 1 && r.checked_in_at) {
      checkIns = { 1: r.checked_in_at as string };
    }

    return {
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
      status: (r.status as RegistrationStatus) || "confirmed",
      reviewedAt: (r.reviewed_at as string) || undefined,
      checkedIn: (r.checked_in as number) === 1,
      checkedInAt: (r.checked_in_at as string) || undefined,
      checkedInDays,
      checkIns,
      createdAt: r.created_at as string,
    };
  });
}

export function getRegistrationByReference(referenceId: string): RegistrationRecord | null {
  const db = getDatabase();
  const row = db
    .prepare("SELECT * FROM registrations WHERE reference_id = ?")
    .get(referenceId) as Record<string, unknown> | undefined;

  if (!row) return null;

  let checkedInDays: number[] | undefined;
  if (row.checked_in_days) {
    try {
      const parsed = JSON.parse(row.checked_in_days as string);
      if (Array.isArray(parsed)) {
        checkedInDays = parsed.map(Number).filter((d) => !isNaN(d));
      }
    } catch {
      // ignore
    }
  }
  if (!checkedInDays && (row.checked_in as number) === 1) {
    checkedInDays = [1];
  }

  let checkIns: Record<number, string> | undefined;
  if (row.check_ins) {
    try {
      checkIns = JSON.parse(row.check_ins as string);
    } catch {
      // ignore
    }
  }
  if (!checkIns && (row.checked_in as number) === 1 && row.checked_in_at) {
    checkIns = { 1: row.checked_in_at as string };
  }

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
    status: (row.status as RegistrationStatus) || "confirmed",
    reviewedAt: (row.reviewed_at as string) || undefined,
    checkedIn: (row.checked_in as number) === 1,
    checkedInAt: (row.checked_in_at as string) || undefined,
    checkedInDays,
    checkIns,
    createdAt: row.created_at as string,
  };
}

export type CreateRegistrationResult =
  | { success: true; registration: RegistrationRecord }
  | {
      success: false;
      error: "DUPLICATE_EMAIL" | "CAPACITY_FULL" | "REGISTRATION_CLOSED" | "INVALID_INPUT" | "EVENT_NOT_FOUND";
      message: string;
    };

export function createRegistration(
  eventSlug: string,
  input: RegistrationInput,
  options?: { forceConfirmed?: boolean }
): CreateRegistrationResult {
  const db = getDatabase();

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

  // Ensure event exists in SQLite or static catalog
  let eventRow = db
    .prepare("SELECT slug, require_approval FROM events WHERE slug = ?")
    .get(eventSlug) as { slug: string; require_approval?: number } | undefined;
  const defMatch = defaultEvents.find((e) => e.slug === eventSlug);
  if (!eventRow) {
    if (!defMatch) {
      return { success: false, error: "EVENT_NOT_FOUND", message: "Event not found." };
    }
    ensureDefaultEventInSqlite(db, defMatch);
    eventRow = db
      .prepare("SELECT slug, require_approval FROM events WHERE slug = ?")
      .get(eventSlug) as { slug: string; require_approval?: number } | undefined;
  }

  const requireApproval = Boolean(
    eventRow?.require_approval === 1 ||
      defMatch?.requireApproval ||
      defMatch?.workshop?.registrationConfig?.requireApproval
  );
  const isPending = requireApproval && !options?.forceConfirmed;

  // Check duplicate
  const existing = db
    .prepare(
      "SELECT id, reference_id, status FROM registrations WHERE event_slug = ? AND LOWER(email) = ? AND status NOT IN ('cancelled', 'declined')"
    )
    .get(eventSlug, emailNormalized) as
    | { id: string; reference_id: string; status: RegistrationStatus }
    | undefined;

  if (existing) {
    return {
      success: false,
      error: "DUPLICATE_EMAIL",
      message:
        existing.status === "pending"
          ? "An application with this email is already pending host review."
          : "This email is already registered for this event.",
    };
  }

  // Check capacity & open status
  const stats = getEventStats(eventSlug);
  if (stats.isRegistrationOpen === false) {
    return { success: false, error: "REGISTRATION_CLOSED", message: "Registration for this event is currently closed." };
  }

  const baseCapacity = stats.capacity;
  const effectiveCapacity =
    eventSlug === "dev-to-cloud"
      ? Math.max(135, baseCapacity)
      : baseCapacity === 120 && stats.totalRegistered >= baseCapacity
      ? Math.max(baseCapacity, 135)
      : baseCapacity;

  if (!isPending && stats.totalRegistered >= effectiveCapacity) {
    return {
      success: false,
      error: "CAPACITY_FULL",
      message: `Workshop capacity has been reached (${stats.totalRegistered}/${effectiveCapacity} seats reserved).`,
    };
  }

  // Generate Reference ID (guaranteed collision-free across all events)
  const nextNum = isPending
    ? stats.totalRegistered + (stats.pendingCount ?? 0) + 1
    : stats.totalRegistered + 1;
  if (!isPending && (eventSlug === "dev-to-cloud" || baseCapacity === 120) && nextNum >= 120) {
    try {
      db.prepare("UPDATE events SET capacity = 135 WHERE slug = ?").run(eventSlug);
    } catch {
      // ignore
    }
  }
  let referenceId = buildEventReferenceId(eventSlug, nextNum, isPending);
  while (db.prepare("SELECT id FROM registrations WHERE reference_id = ?").get(referenceId)) {
    referenceId = buildEventReferenceId(eventSlug, nextNum, true);
  }
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const initialStatus: RegistrationStatus = isPending ? "pending" : "confirmed";

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
    fullName,
    emailNormalized,
    phone,
    college,
    department,
    yearOfStudy,
    track,
    experienceLevel,
    portfolioUrl ?? null,
    notes ?? null,
    initialStatus,
    0,
    createdAt
  );

  return {
    success: true,
    registration: {
      id,
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
      portfolioUrl,
      notes,
      status: initialStatus,
      checkedIn: false,
      createdAt,
    },
  };
}

export function checkInAttendee(
  eventSlug: string,
  referenceId: string,
  day: number = 1
): { success: boolean; message: string; registration?: RegistrationRecord } {
  const db = getDatabase();

  const ref = referenceId.trim().toUpperCase();
  const reg = getRegistrationByReference(ref);

  if (!reg || reg.eventSlug !== eventSlug) {
    return { success: false, message: "Pass reference was not found for this event." };
  }

  if (reg.status && reg.status !== "confirmed") {
    const reason =
      reg.status === "pending"
        ? "is PENDING HOST APPROVAL and cannot be checked in yet."
        : reg.status === "waitlisted"
          ? "is on the WAITLIST and has not been approved yet."
          : `is ${reg.status.toUpperCase()} and is not valid for entry.`;
    return {
      success: false,
      message: `${reg.fullName}'s registration ${reason}`,
      registration: reg,
    };
  }

  const existingDays = reg.checkedInDays || (reg.checkedIn ? [1] : []);
  const existingCheckIns = reg.checkIns || (reg.checkedInAt ? { 1: reg.checkedInAt } : {});

  if (existingDays.includes(day)) {
    const priorTime = existingCheckIns[day] || reg.checkedInAt || "previously";
    return {
      success: false,
      message: `${reg.fullName} is ALREADY checked in for Day ${day} (at ${priorTime}).`,
      registration: reg,
    };
  }

  const now = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  const updatedDays = Array.from(new Set([...existingDays, day])).sort((a, b) => a - b);
  const updatedCheckIns = { ...existingCheckIns, [day]: now };

  db.prepare(`
    UPDATE registrations
    SET checked_in = 1,
        checked_in_at = ?,
        checked_in_days = ?,
        check_ins = ?
    WHERE reference_id = ?
  `).run(
    now,
    JSON.stringify(updatedDays),
    JSON.stringify(updatedCheckIns),
    ref
  );

  const updatedReg = getRegistrationByReference(ref)!;

  const dayText = ` for Day ${day}`;
  const progressText = updatedDays.length > 1 ? ` (${updatedDays.length}/4 Days Attended)` : "";

  return {
    success: true,
    message: `Successfully checked in ${reg.fullName}${dayText}!${progressText}`,
    registration: updatedReg,
  };
}

export function cancelRegistration(referenceId: string): boolean {
  const db = getDatabase();
  const ref = referenceId.trim().toUpperCase();
  const res = db.prepare("UPDATE registrations SET status = 'cancelled' WHERE reference_id = ?").run(ref);
  return res.changes > 0;
}

export async function cancelRegistrationAsync(referenceId: string): Promise<boolean> {
  const ref = referenceId.trim().toUpperCase();
  const existing = getRegistrationByReference(ref);
  try {
    await cancelFirestoreRegistration(ref);
  } catch (err) {
    console.warn("Firestore cancel failed:", err);
  }
  const cancelled = cancelRegistration(ref);
  revalidateEventCaches(existing?.eventSlug);
  return cancelled;
}

export function deleteRegistration(referenceId: string): boolean {
  const db = getDatabase();
  const ref = referenceId.trim().toUpperCase();
  const res = db.prepare("DELETE FROM registrations WHERE reference_id = ?").run(ref);
  return res.changes > 0;
}

export async function deleteRegistrationAsync(referenceId: string): Promise<boolean> {
  const ref = referenceId.trim().toUpperCase();
  const existing = getRegistrationByReference(ref);
  try {
    await deleteFirestoreRegistration(ref);
  } catch (err) {
    console.warn("Firestore delete failed:", err);
  }
  const deleted = deleteRegistration(ref);
  revalidateEventCaches(existing?.eventSlug);
  return deleted;
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
       OR event_slug LIKE 'test-%'
  `).run();
}

/**
 * Lightweight public stats: reads ONLY the single `events/{slug}` document's denormalized
 * `registeredCount` (or uses `preloadedEvent` with 0 extra reads) instead of scanning every registration doc.
 */
export async function getPublicEventStatsAsync(
  slug: string,
  preloadedEvent?: ChapterEvent | null
): Promise<EventStats> {
  try {
    const firestoreStats = await getFirestorePublicEventStats(slug, preloadedEvent);
    if (firestoreStats) return firestoreStats;
  } catch (err) {
    console.warn("Firestore public stats query failed, falling back to local SQLite:", (err as Error).message);
  }
  return getEventStats(slug);
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
    if (firestoreRegs !== null) return firestoreRegs;
  } catch (err) {
    console.warn("Firestore registrations query failed, falling back to local SQLite:", (err as Error).message);
  }
  return getRegistrations(eventSlug, options);
}

export async function getRegistrationsPaginatedAsync(
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
): Promise<PaginatedRegistrationsResult> {
  try {
    const result = await getFirestoreRegistrationsPaginated(eventSlug, options);
    if (result !== null) return result;
  } catch (err) {
    console.warn("Firestore paginated registrations failed, falling back:", (err as Error).message);
  }
  // Fallback: use full list from SQLite and slice manually
  const all = await getRegistrations(eventSlug, {
    search: options.search,
    track: options.track,
    status: options.status,
    checkedIn: options.checkedIn,
  });
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(100, options.pageSize ?? 50);
  const total = all.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const slice = all.slice((page - 1) * pageSize, page * pageSize);
  const counts = {
    confirmed: all.filter((r) => !r.status || r.status === "confirmed").length,
    pending: all.filter((r) => r.status === "pending").length,
    waitlisted: all.filter((r) => r.status === "waitlisted").length,
    removed: all.filter((r) => r.status === "cancelled" || r.status === "declined").length,
    all: total,
  };
  return { registrations: slice, total, page, pageSize, totalPages, counts };
}

export async function createRegistrationAsync(
  eventSlug: string,
  input: RegistrationInput,
  options?: { forceConfirmed?: boolean }
): Promise<CreateRegistrationResult> {
  try {
    const firestoreResult = await createFirestoreRegistration(eventSlug, input, options);
    if (firestoreResult) {
      if (firestoreResult.success) {
        try {
          const db = getDatabase();
          const r = firestoreResult.registration;
          const localEvent = db.prepare("SELECT slug FROM events WHERE slug = ?").get(eventSlug);
          if (!localEvent) {
            const fsEvent = await getFirestoreEvent(eventSlug);
            if (fsEvent) {
              db.prepare(`
                INSERT OR IGNORE INTO events (id, slug, title, starts_at, ends_at, timezone, format, location, summary, topics)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `).run(
                fsEvent.id,
                fsEvent.slug,
                fsEvent.title,
                fsEvent.startsAt,
                fsEvent.endsAt ?? null,
                fsEvent.timezone ?? "Asia/Kolkata",
                fsEvent.format ?? "in-person",
                fsEvent.location ?? "Vidyavardhini's College of Engineering and Technology, Vasai",
                fsEvent.summary ?? "",
                JSON.stringify(fsEvent.topics ?? ["general"])
              );
            }
          }
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
      if (firestoreResult.success) {
        revalidateEventCaches(eventSlug);
      }
      return firestoreResult;
    }
  } catch (err) {
    console.warn("Firestore registration failed, falling back to local SQLite:", (err as Error).message);
  }
  const localResult = createRegistration(eventSlug, input, options);
  if (localResult.success) {
    revalidateEventCaches(eventSlug);
  }
  return localResult;
}

export async function checkInAttendeeAsync(
  eventSlug: string,
  referenceId: string,
  day?: number
): Promise<{ success: boolean; message: string; registration?: RegistrationRecord }> {
  try {
    const firestoreResult = await checkInFirestoreAttendee(eventSlug, referenceId, day);
    if (firestoreResult) {
      if (firestoreResult.success && firestoreResult.registration) {
        try {
          const db = getDatabase();
          const reg = firestoreResult.registration;
          db.prepare(`
            UPDATE registrations
            SET checked_in = 1,
                checked_in_at = ?,
                checked_in_days = ?,
                check_ins = ?
            WHERE reference_id = ?
          `).run(
            reg.checkedInAt ?? new Date().toISOString(),
            JSON.stringify(reg.checkedInDays || [day ?? 1]),
            JSON.stringify(reg.checkIns || {}),
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
  return checkInAttendee(eventSlug, referenceId, day);
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

  const localResult = createEvent(input);
  if (localResult.success && localResult.event) {
    revalidateEventCaches(localResult.event.slug);
  }
  return localResult;
}

export async function updateEventAsync(
  slug: string,
  input: EventUpdateInput
): Promise<{ success: boolean; event?: ChapterEvent; error?: string }> {
  try {
    const firestoreResult = await updateFirestoreEvent(slug, input);
    if (firestoreResult) {
      if (firestoreResult.success && firestoreResult.event) {
        try {
          const localResult = updateEvent(slug, input);
          if (!localResult.success && localResult.error === "EVENT_NOT_FOUND") {
            const ev = firestoreResult.event;
            createEvent({
              slug: ev.slug,
              title: ev.title,
              startsAt: ev.startsAt,
              endsAt: ev.endsAt,
              timezone: ev.timezone,
              format: ev.format,
              location: ev.location,
              topics: ev.topics,
              summary: ev.summary,
              image: ev.image,
              url: ev.url,
              cancelled: ev.cancelled,
              capacity: input.capacity ?? ev.workshop?.capacity,
              priceNote: input.priceNote ?? ev.priceNote,
              isRegistrationOpen:
                input.isRegistrationOpen ??
                ev.isRegistrationOpen ??
                ev.workshop?.registrationConfig?.isOpen,
              requireApproval:
                input.requireApproval ??
                ev.requireApproval ??
                ev.workshop?.registrationConfig?.requireApproval,
              workshop: input.workshop ?? ev.workshop,
            });
          }
        } catch {
          // ignore local SQLite mirroring error
        }
        return firestoreResult;
      }
      if (firestoreResult.error !== "EVENT_NOT_FOUND") {
        return firestoreResult;
      }
    }
  } catch (err) {
    console.warn("Firestore updateEvent failed, falling back to local SQLite:", (err as Error).message);
  }

  const localUpdated = updateEvent(slug, input);
  if (localUpdated.success) {
    revalidateEventCaches(slug);
  }
  return localUpdated;
}

export async function deleteEventAsync(
  slug: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const fsResult = await deleteFirestoreEvent(slug);
    if (fsResult) {
      if (fsResult.success) {
        try {
          deleteEvent(slug);
        } catch {
          // ignore local SQLite mirroring error
        }
      }
      return fsResult;
    }
  } catch (err) {
    console.warn("Firestore deleteEvent failed, falling back to local SQLite:", (err as Error).message);
  }

  const localRes = deleteEvent(slug);
  if (localRes.success) {
    revalidateEventCaches(slug);
  }
  return localRes;
}

function mergeWithStaticEventDefaults(
  event: ChapterEvent,
  defMatch?: ChapterEvent
): ChapterEvent {
  if (!defMatch) return event;

  const cap = event.capacity ?? defMatch.capacity ?? defMatch.workshop?.capacity;
  const requireApproval =
    event.requireApproval ??
    event.workshop?.registrationConfig?.requireApproval ??
    defMatch.requireApproval ??
    defMatch.workshop?.registrationConfig?.requireApproval;

  const mergedWorkshop =
    event.workshop ||
    (defMatch.workshop
      ? {
          ...defMatch.workshop,
          ...(cap !== undefined
            ? {
                capacity: cap,
                seatsText: `Limited to ${cap} Seats`,
              }
            : {}),
          ...(event.location ? { venueText: event.location } : {}),
          registrationConfig: {
            ...(defMatch.workshop.registrationConfig || {}),
            ...(typeof event.isRegistrationOpen === "boolean"
              ? { isOpen: event.isRegistrationOpen }
              : {}),
            ...(typeof requireApproval === "boolean" ? { requireApproval } : {}),
          },
        }
      : undefined);

  return {
    ...event,
    image: event.image || defMatch.image,
    url: event.url || defMatch.url,
    priceNote: event.priceNote || defMatch.priceNote,
    ...(typeof requireApproval === "boolean" ? { requireApproval } : {}),
    workshop: mergedWorkshop,
  };
}

export async function getAllEventsAsync(): Promise<ChapterEvent[]> {
  try {
    let firestoreEvents = await getFirestoreEvents();
    if (firestoreEvents && firestoreEvents.length === 0) {
      const deletedSlugs = await getFirestoreDeletedEventSlugs();
      if (deletedSlugs.length === 0) {
        await seedFirestoreInitialEvents(defaultEvents);
        firestoreEvents = await getFirestoreEvents();
      }
    }
    if (firestoreEvents) {
      const deletedSet = new Set(await getFirestoreDeletedEventSlugs());
      const merged = firestoreEvents.map((ev) =>
        mergeWithStaticEventDefaults(
          ev,
          defaultEvents.find((d) => d.slug === ev.slug)
        )
      );
      for (const def of defaultEvents) {
        if (!deletedSet.has(def.slug) && !merged.some((e) => e.slug === def.slug)) {
          merged.push(def);
        }
      }
      return merged;
    }
  } catch (err) {
    console.warn("Firestore getAllEvents failed, falling back to local SQLite:", (err as Error).message);
  }

  try {
    return getAllEvents();
  } catch (err) {
    console.warn("SQLite getAllEvents fallback failed, returning static events:", (err as Error).message);
    return defaultEvents;
  }
}

export async function getEventBySlugAsync(slug: string): Promise<ChapterEvent | null> {
  try {
    const firestoreEvent = await getFirestoreEvent(slug);
    if (firestoreEvent) {
      const defMatch = defaultEvents.find((e) => e.slug === slug);
      return mergeWithStaticEventDefaults(firestoreEvent, defMatch);
    }
    const deletedSet = new Set(await getFirestoreDeletedEventSlugs());
    if (deletedSet.has(slug)) {
      return null;
    }
  } catch (err) {
    console.warn("Firestore getEvent failed, falling back to local SQLite:", (err as Error).message);
  }

  try {
    const all = getAllEvents();
    return all.find((e) => e.slug === slug) ?? null;
  } catch (err) {
    console.warn("SQLite getEventBySlug fallback failed, checking static events:", (err as Error).message);
    return defaultEvents.find((e) => e.slug === slug) ?? null;
  }
}

export function updateRegistration(
  eventSlug: string,
  referenceId: string,
  updates: RegistrationUpdateInput
): { success: boolean; message: string; registration?: RegistrationRecord } {
  const db = getDatabase();
  const ref = referenceId.trim().toUpperCase();
  const existing = getRegistrationByReference(ref);
  if (!existing || existing.eventSlug !== eventSlug) {
    return { success: false, message: "Pass reference was not found for this event." };
  }

  const setClauses: string[] = [];
  const params: (string | number | null)[] = [];

  if (updates.fullName !== undefined && updates.fullName.trim()) {
    setClauses.push("full_name = ?");
    params.push(updates.fullName.trim());
  }
  if (updates.email !== undefined && updates.email.trim()) {
    setClauses.push("email = ?");
    params.push(updates.email.trim().toLowerCase());
  }
  if (updates.phone !== undefined && updates.phone.trim()) {
    setClauses.push("phone = ?");
    params.push(updates.phone.trim());
  }
  if (updates.college !== undefined && updates.college.trim()) {
    setClauses.push("college = ?");
    params.push(updates.college.trim());
  }
  if (updates.department !== undefined && updates.department.trim()) {
    setClauses.push("department = ?");
    params.push(updates.department.trim());
  }
  if (updates.yearOfStudy !== undefined && updates.yearOfStudy.trim()) {
    setClauses.push("year_of_study = ?");
    params.push(updates.yearOfStudy.trim());
  }
  if (updates.track !== undefined) {
    setClauses.push("track = ?");
    params.push(updates.track.trim() || "General Admission");
  }
  if (updates.experienceLevel !== undefined && updates.experienceLevel.trim()) {
    setClauses.push("experience_level = ?");
    params.push(updates.experienceLevel.trim());
  }
  if (updates.portfolioUrl !== undefined) {
    setClauses.push("portfolio_url = ?");
    params.push(updates.portfolioUrl.trim() || null);
  }
  if (updates.notes !== undefined) {
    setClauses.push("notes = ?");
    params.push(updates.notes.trim() || null);
  }
  if (updates.status !== undefined) {
    setClauses.push("status = ?");
    params.push(updates.status);
  }

  if (setClauses.length > 0) {
    params.push(ref);
    db.prepare(`UPDATE registrations SET ${setClauses.join(", ")} WHERE reference_id = ?`).run(...params);
  }

  const updated = getRegistrationByReference(ref)!;
  return {
    success: true,
    message: `Updated registration for ${updated.fullName}.`,
    registration: updated,
  };
}

export async function updateRegistrationAsync(
  eventSlug: string,
  referenceId: string,
  updates: RegistrationUpdateInput
): Promise<{ success: boolean; message: string; registration?: RegistrationRecord }> {
  try {
    const fsResult = await updateFirestoreRegistration(eventSlug, referenceId, updates);
    if (fsResult) {
      if (fsResult.success) {
        try {
          updateRegistration(eventSlug, referenceId, updates);
        } catch {
          // ignore local SQLite mirroring error
        }
      }
      return fsResult;
    }
  } catch (err) {
    console.warn("Firestore updateRegistration failed, falling back to local SQLite:", (err as Error).message);
  }

  const localRes = updateRegistration(eventSlug, referenceId, updates);
  if (localRes.success) {
    revalidateEventCaches(eventSlug);
  }
  return localRes;
}

export function reviewRegistration(
  eventSlug: string,
  referenceId: string,
  decision: "approve" | "decline" | "waitlist",
  options?: { force?: boolean }
): {
  success: boolean;
  code?: "NOT_FOUND" | "CAPACITY_FULL";
  message: string;
  registration?: RegistrationRecord;
  previousStatus?: RegistrationStatus;
} {
  const db = getDatabase();
  const ref = referenceId.trim().toUpperCase();
  const existing = getRegistrationByReference(ref);
  if (!existing || existing.eventSlug !== eventSlug) {
    return {
      success: false,
      code: "NOT_FOUND",
      message: "Registration reference was not found for this event.",
    };
  }

  const nextStatus: RegistrationStatus =
    decision === "approve" ? "confirmed" : decision === "decline" ? "declined" : "waitlisted";
  const previousStatus: RegistrationStatus = existing.status || "confirmed";

  if (previousStatus === nextStatus) {
    return {
      success: true,
      message: `${existing.fullName} is already ${nextStatus}.`,
      registration: existing,
      previousStatus,
    };
  }

  if (nextStatus === "confirmed" && previousStatus !== "confirmed" && !options?.force) {
    const stats = getEventStats(eventSlug);
    if (stats.totalRegistered >= stats.capacity) {
      return {
        success: false,
        code: "CAPACITY_FULL",
        message: `Event capacity reached (${stats.totalRegistered}/${stats.capacity} confirmed seats). Increase capacity before approving more applicants.`,
      };
    }
  }

  const now = new Date().toISOString();
  db.prepare("UPDATE registrations SET status = ?, reviewed_at = ? WHERE reference_id = ?").run(
    nextStatus,
    now,
    ref
  );

  const updated = getRegistrationByReference(ref)!;
  const verb =
    nextStatus === "confirmed"
      ? "Approved"
      : nextStatus === "declined"
        ? "Declined"
        : "Moved to Waitlist";

  return {
    success: true,
    message: `${verb}: ${updated.fullName}`,
    registration: updated,
    previousStatus,
  };
}

export async function reviewRegistrationAsync(
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
}> {
  try {
    const fsResult = await reviewFirestoreRegistration(eventSlug, referenceId, decision, options);
    if (fsResult) {
      if (fsResult.success) {
        try {
          reviewRegistration(eventSlug, referenceId, decision, { force: true });
        } catch {
          // ignore local SQLite mirroring error
        }
      }
      return fsResult;
    }
  } catch (err) {
    console.warn("Firestore reviewRegistration failed, falling back to local SQLite:", (err as Error).message);
  }

  const localRes = reviewRegistration(eventSlug, referenceId, decision, options);
  if (localRes.success) {
    revalidateEventCaches(eventSlug);
  }
  return localRes;
}

export function revokeCheckInAttendee(
  eventSlug: string,
  referenceId: string,
  day: number = 1
): { success: boolean; message: string; registration?: RegistrationRecord } {
  const db = getDatabase();
  const ref = referenceId.trim().toUpperCase();
  const reg = getRegistrationByReference(ref);
  if (!reg || reg.eventSlug !== eventSlug) {
    return { success: false, message: "Pass reference was not found for this event." };
  }

  const existingDays = reg.checkedInDays || (reg.checkedIn ? [1] : []);
  const existingCheckIns = { ...(reg.checkIns || (reg.checkedInAt ? { 1: reg.checkedInAt } : {})) };

  if (!existingDays.includes(day)) {
    return {
      success: false,
      message: `${reg.fullName} is not checked in for Day ${day}.`,
      registration: reg,
    };
  }

  const updatedDays = existingDays.filter((d) => d !== day);
  delete existingCheckIns[day];
  const stillCheckedIn = updatedDays.length > 0;
  const latestTime = stillCheckedIn
    ? existingCheckIns[updatedDays[updatedDays.length - 1]] || reg.checkedInAt || ""
    : null;

  db.prepare(`
    UPDATE registrations
    SET checked_in = ?,
        checked_in_at = ?,
        checked_in_days = ?,
        check_ins = ?
    WHERE reference_id = ?
  `).run(
    stillCheckedIn ? 1 : 0,
    latestTime,
    JSON.stringify(updatedDays),
    JSON.stringify(existingCheckIns),
    ref
  );

  return {
    success: true,
    message: `Removed Day ${day} check-in for ${reg.fullName}.`,
    registration: getRegistrationByReference(ref)!,
  };
}

export async function revokeCheckInAttendeeAsync(
  eventSlug: string,
  referenceId: string,
  day: number = 1
): Promise<{ success: boolean; message: string; registration?: RegistrationRecord }> {
  try {
    const fsResult = await revokeCheckInFirestoreAttendee(eventSlug, referenceId, day);
    if (fsResult) {
      if (fsResult.success) {
        try {
          revokeCheckInAttendee(eventSlug, referenceId, day);
        } catch {
          // ignore local SQLite mirroring error
        }
      }
      return fsResult;
    }
  } catch (err) {
    console.warn("Firestore revokeCheckIn failed, falling back to local SQLite:", (err as Error).message);
  }
  return revokeCheckInAttendee(eventSlug, referenceId, day);
}

export function getSiteSettings(): ChapterSettings {
  const db = getDatabase();
  const row = db
    .prepare("SELECT payload FROM site_settings WHERE id = 'main'")
    .get() as { payload?: string } | undefined;

  if (!row?.payload) return DEFAULT_CHAPTER_SETTINGS;

  try {
    const parsed = JSON.parse(row.payload) as Partial<ChapterSettings>;
    return {
      ...DEFAULT_CHAPTER_SETTINGS,
      ...parsed,
      chapter: {
        ...DEFAULT_CHAPTER_SETTINGS.chapter,
        ...(parsed.chapter || {}),
      },
      team: Array.isArray(parsed.team) ? parsed.team : DEFAULT_CHAPTER_SETTINGS.team,
      learningAreas: Array.isArray(parsed.learningAreas)
        ? parsed.learningAreas
        : DEFAULT_CHAPTER_SETTINGS.learningAreas,
      homeFaq: Array.isArray(parsed.homeFaq) ? parsed.homeFaq : DEFAULT_CHAPTER_SETTINGS.homeFaq,
      joinFaq: Array.isArray(parsed.joinFaq) ? parsed.joinFaq : DEFAULT_CHAPTER_SETTINGS.joinFaq,
      aboutCards: Array.isArray(parsed.aboutCards)
        ? parsed.aboutCards
        : DEFAULT_CHAPTER_SETTINGS.aboutCards,
    };
  } catch {
    return DEFAULT_CHAPTER_SETTINGS;
  }
}

export function updateSiteSettings(settings: ChapterSettings): ChapterSettings {
  const db = getDatabase();
  const payload: ChapterSettings = {
    ...settings,
    updatedAt: new Date().toISOString(),
  };
  db.prepare(`
    INSERT OR REPLACE INTO site_settings (id, payload, updated_at)
    VALUES ('main', ?, ?)
  `).run(JSON.stringify(payload), payload.updatedAt!);
  return payload;
}

export async function getSiteSettingsAsync(): Promise<ChapterSettings> {
  try {
    const fsSettings = await getFirestoreSiteSettings();
    if (fsSettings) return fsSettings;
  } catch (err) {
    console.warn("Firestore getSiteSettings failed, falling back to local SQLite:", (err as Error).message);
  }
  return getSiteSettings();
}

export async function updateSiteSettingsAsync(
  settings: ChapterSettings
): Promise<ChapterSettings> {
  const localSaved = updateSiteSettings(settings);
  try {
    const fsSaved = await updateFirestoreSiteSettings(localSaved);
    if (fsSaved) return fsSaved;
  } catch (err) {
    console.warn("Firestore updateSiteSettings failed, saved to SQLite:", (err as Error).message);
  }
  revalidateSiteCaches();
  return localSaved;
}

export function logEmailRecord(log: EmailLog): void {
  const db = getDatabase();
  db.prepare(`
    INSERT OR REPLACE INTO email_logs (
      id, event_slug, type, subject, recipient_count, recipients, sent_at, status, sender, preview_text
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    log.id,
    log.eventSlug,
    log.type,
    log.subject,
    log.recipientCount,
    JSON.stringify(log.recipients),
    log.sentAt,
    log.status,
    log.sender ?? null,
    log.previewText ?? null
  );
}

export function getEmailLogs(eventSlug: string): EmailLog[] {
  const db = getDatabase();
  const rows = db
    .prepare("SELECT * FROM email_logs WHERE event_slug = ? ORDER BY sent_at DESC LIMIT 50")
    .all(eventSlug) as Record<string, unknown>[];

  return rows.map((r) => {
    let recipients: string[] = [];
    try {
      recipients = JSON.parse(r.recipients as string);
    } catch {
      recipients = [];
    }
    return {
      id: r.id as string,
      eventSlug: r.event_slug as string,
      type: r.type as EmailLog["type"],
      subject: r.subject as string,
      recipientCount: r.recipient_count as number,
      recipients,
      sentAt: r.sent_at as string,
      status: r.status as "sent" | "simulated" | "failed",
      sender: (r.sender as string) || undefined,
      previewText: (r.preview_text as string) || undefined,
    };
  });
}

export async function logEmailRecordAsync(log: EmailLog): Promise<void> {
  try {
    logEmailRecord(log);
  } catch (err) {
    console.warn("SQLite logEmailRecord failed:", (err as Error).message);
  }
  try {
    await logFirestoreEmail(log);
  } catch (err) {
    console.warn("Firestore logFirestoreEmail failed:", (err as Error).message);
  }
}

export async function getEmailLogsAsync(eventSlug: string): Promise<EmailLog[]> {
  try {
    const fsLogs = await getFirestoreEmailLogs(eventSlug);
    if (fsLogs && fsLogs.length > 0) return fsLogs;
  } catch (err) {
    console.warn("Firestore getEmailLogs failed, falling back to local SQLite:", (err as Error).message);
  }
  return getEmailLogs(eventSlug);
}

export function logAuditRecord(entry: AuditLogEntry): void {
  const db = getDatabase();
  db.prepare(`
    INSERT OR REPLACE INTO audit_logs (
      id, action, actor_role, actor_identifier, ip_address, user_agent, event_slug, details, timestamp
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    entry.id,
    entry.action,
    entry.actorRole,
    entry.actorIdentifier ?? null,
    entry.ipAddress ?? null,
    entry.userAgent ?? null,
    entry.eventSlug ?? null,
    JSON.stringify(entry.details || {}),
    entry.timestamp
  );
}

export function getAuditRecords(options?: {
  eventSlug?: string;
  action?: string;
  limit?: number;
}): AuditLogEntry[] {
  const db = getDatabase();
  const maxLimit = Math.min(options?.limit ?? 100, 200);

  let query = "SELECT * FROM audit_logs";
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (options?.eventSlug && options.eventSlug !== "all") {
    conditions.push("event_slug = ?");
    params.push(options.eventSlug);
  }
  if (options?.action && options.action !== "all") {
    conditions.push("action = ?");
    params.push(options.action);
  }

  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }

  query += " ORDER BY timestamp DESC LIMIT ?";
  params.push(maxLimit);

  const rows = db.prepare(query).all(...params) as Record<string, unknown>[];

  return rows.map((r) => {
    let details: Record<string, unknown> = {};
    try {
      details = typeof r.details === "string" ? JSON.parse(r.details) : {};
    } catch {
      details = {};
    }
    return {
      id: r.id as string,
      action: r.action as AuditAction,
      actorRole: r.actor_role as AuditActorRole,
      actorIdentifier: (r.actor_identifier as string) || undefined,
      ipAddress: (r.ip_address as string) || undefined,
      userAgent: (r.user_agent as string) || undefined,
      eventSlug: (r.event_slug as string) || undefined,
      details,
      timestamp: r.timestamp as string,
    };
  });
}

export async function logAuditEventAsync(
  entry: Omit<AuditLogEntry, "id" | "timestamp"> & { id?: string; timestamp?: string }
): Promise<AuditLogEntry> {
  const fullEntry: AuditLogEntry = {
    ...entry,
    id: entry.id || crypto.randomUUID(),
    timestamp: entry.timestamp || new Date().toISOString(),
  };

  try {
    logAuditRecord(fullEntry);
  } catch (err) {
    console.warn("SQLite logAuditRecord failed:", (err as Error).message);
  }

  try {
    await logFirestoreAudit(fullEntry);
  } catch (err) {
    console.warn("Firestore logFirestoreAudit failed:", (err as Error).message);
  }

  return fullEntry;
}

export async function getAuditLogsAsync(options?: {
  eventSlug?: string;
  action?: string;
  limit?: number;
}): Promise<AuditLogEntry[]> {
  try {
    const fsLogs = await getFirestoreAuditLogs(options);
    if (fsLogs && fsLogs.length > 0) return fsLogs;
  } catch (err) {
    console.warn("Firestore getAuditLogs failed, falling back to local SQLite:", (err as Error).message);
  }
  return getAuditRecords(options);
}




