import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type {
  AdminRole,
  AdminUser,
  AgendaSession,
  Announcement,
  AuditLogRecord,
  CertificateRecord,
  ChapterEvent,
  ChapterTenant,
  CommunityResource,
  EventCategory,
  EventFormat,
  EventVisibility,
  PaymentStatus,
  RegistrationInput,
  RegistrationRecord,
  RegistrationStatus,
  WorkshopSpeaker,
  WorkshopSponsor,
} from "@/types";
import { hashPassword } from "@/lib/auth";

// Ensure data directory exists
const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, "gdg.db");

let _db: DatabaseSync | null = null;

function safeAddColumn(db: DatabaseSync, tableName: string, columnName: string, colDef: string) {
  try {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${colDef};`);
  } catch {
    // Column already exists or table not ready, safely ignore
  }
}

export function getDatabase(): DatabaseSync {
  if (_db) return _db;

  _db = new DatabaseSync(DB_PATH);

  // Enable WAL mode and busy timeout for high-concurrency read/write
  _db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
  `);

  // Initialize Core Schema
  _db.exec(`
    -- Multi-Chapter Tenants
    CREATE TABLE IF NOT EXISTS chapters (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      short_name TEXT NOT NULL,
      tagline TEXT,
      description TEXT,
      institution TEXT NOT NULL,
      logo_url TEXT,
      primary_color TEXT DEFAULT '#1A73E8',
      contact_email TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Admin Users
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      chapter_id TEXT DEFAULT 'gdg-vcet',
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'chapter-admin',
      avatar TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (chapter_id) REFERENCES chapters(id)
    );

    -- Sessions for HTTP-only cookies
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Events Table
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      chapter_id TEXT DEFAULT 'gdg-vcet',
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      category TEXT DEFAULT 'workshop',
      visibility TEXT DEFAULT 'public',
      starts_at TEXT NOT NULL,
      ends_at TEXT,
      timezone TEXT DEFAULT 'Asia/Kolkata',
      format TEXT DEFAULT 'in-person',
      location TEXT,
      summary TEXT,
      image TEXT,
      price INTEGER DEFAULT 0,
      currency TEXT DEFAULT 'INR',
      capacity INTEGER DEFAULT 150,
      is_registration_open INTEGER DEFAULT 1,
      registration_deadline TEXT,
      tags TEXT DEFAULT '[]',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Registrations Table
    CREATE TABLE IF NOT EXISTS registrations (
      id TEXT PRIMARY KEY,
      chapter_id TEXT DEFAULT 'gdg-vcet',
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
      internal_notes TEXT,
      status TEXT DEFAULT 'confirmed',
      payment_status TEXT DEFAULT 'not-required',
      payment_reference TEXT,
      checked_in INTEGER DEFAULT 0,
      checked_in_at TEXT,
      check_in_operator TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (event_slug) REFERENCES events(slug) ON DELETE CASCADE,
      UNIQUE(event_slug, email)
    );

    -- Speakers & Mentors
    CREATE TABLE IF NOT EXISTS speakers (
      id TEXT PRIMARY KEY,
      chapter_id TEXT DEFAULT 'gdg-vcet',
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      organization TEXT NOT NULL,
      badge TEXT,
      category TEXT DEFAULT 'keynote',
      bio TEXT,
      expertise TEXT DEFAULT '[]',
      linkedin TEXT,
      github TEXT,
      website TEXT,
      email TEXT,
      photo TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Sponsors & Partners
    CREATE TABLE IF NOT EXISTS sponsors (
      id TEXT PRIMARY KEY,
      chapter_id TEXT DEFAULT 'gdg-vcet',
      name TEXT NOT NULL,
      tier TEXT DEFAULT 'gold',
      description TEXT,
      logo TEXT,
      website TEXT,
      contact_email TEXT,
      contribution TEXT,
      status TEXT DEFAULT 'approved',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Agenda Sessions
    CREATE TABLE IF NOT EXISTS agenda_sessions (
      id TEXT PRIMARY KEY,
      chapter_id TEXT DEFAULT 'gdg-vcet',
      event_slug TEXT NOT NULL,
      day INTEGER DEFAULT 1,
      time TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      track TEXT DEFAULT 'all',
      track_label TEXT,
      speaker TEXT,
      speaker_role TEXT,
      location TEXT,
      tags TEXT DEFAULT '[]',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Announcements & Targeted Notifications
    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      chapter_id TEXT DEFAULT 'gdg-vcet',
      event_slug TEXT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      target_audience TEXT DEFAULT 'all',
      channel TEXT DEFAULT 'email',
      status TEXT DEFAULT 'published',
      sent_count INTEGER DEFAULT 0,
      scheduled_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Verifiable Certificates
    CREATE TABLE IF NOT EXISTS certificates (
      id TEXT PRIMARY KEY,
      chapter_id TEXT DEFAULT 'gdg-vcet',
      certificate_id TEXT UNIQUE NOT NULL,
      event_slug TEXT NOT NULL,
      event_title TEXT NOT NULL,
      recipient_name TEXT NOT NULL,
      recipient_email TEXT NOT NULL,
      reference_id TEXT NOT NULL,
      issue_date TEXT NOT NULL,
      status TEXT DEFAULT 'issued',
      track TEXT,
      issuer_name TEXT DEFAULT 'GDG on Campus VCET',
      issuer_role TEXT DEFAULT 'Lead Organizer',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Community Resources
    CREATE TABLE IF NOT EXISTS resources (
      id TEXT PRIMARY KEY,
      chapter_id TEXT DEFAULT 'gdg-vcet',
      event_slug TEXT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT DEFAULT 'document',
      url TEXT NOT NULL,
      file_size TEXT,
      tags TEXT DEFAULT '[]',
      is_public INTEGER DEFAULT 1,
      author TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Audit Logs
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      chapter_id TEXT DEFAULT 'gdg-vcet',
      user_id TEXT NOT NULL,
      user_email TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      details TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_registrations_slug ON registrations(event_slug);
    CREATE INDEX IF NOT EXISTS idx_registrations_ref ON registrations(reference_id);
    CREATE INDEX IF NOT EXISTS idx_certificates_id ON certificates(certificate_id);
    CREATE INDEX IF NOT EXISTS idx_events_slug ON events(slug);
  `);

  // Ensure new columns exist on existing tables if upgraded
  safeAddColumn(_db, "events", "chapter_id", "TEXT DEFAULT 'gdg-vcet'");
  safeAddColumn(_db, "events", "category", "TEXT DEFAULT 'workshop'");
  safeAddColumn(_db, "events", "visibility", "TEXT DEFAULT 'public'");
  safeAddColumn(_db, "events", "summary", "TEXT");
  safeAddColumn(_db, "events", "image", "TEXT");
  safeAddColumn(_db, "events", "price", "INTEGER DEFAULT 0");
  safeAddColumn(_db, "events", "currency", "TEXT DEFAULT 'INR'");
  safeAddColumn(_db, "events", "tags", "TEXT DEFAULT '[]'");
  safeAddColumn(_db, "registrations", "chapter_id", "TEXT DEFAULT 'gdg-vcet'");
  safeAddColumn(_db, "registrations", "internal_notes", "TEXT");
  safeAddColumn(_db, "registrations", "payment_status", "TEXT DEFAULT 'not-required'");
  safeAddColumn(_db, "registrations", "payment_reference", "TEXT");
  safeAddColumn(_db, "registrations", "check_in_operator", "TEXT");

  // Seed default Chapter Tenant: GDG VCET
  const chapterCheck = _db.prepare("SELECT id FROM chapters WHERE id = ?").get("gdg-vcet");
  if (!chapterCheck) {
    _db.prepare(`
      INSERT OR IGNORE INTO chapters (id, slug, name, short_name, tagline, description, institution, primary_color, contact_email)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      "gdg-vcet",
      "vcet",
      "GDG on Campus VCET",
      "GDG VCET",
      "Learn. Build. Connect.",
      "The student developer community at Vidyavardhini's College of Engineering and Technology, Vasai.",
      "Vidyavardhini's College of Engineering and Technology, Vasai, India",
      "#1A73E8",
      "lead@vcet.edu.in"
    );
  }

  // Seed Admin Users
  const userCheck = _db.prepare("SELECT id FROM users WHERE email = ?").get("lead@vcet.edu.in");
  if (!userCheck) {
    const passwordHash = hashPassword("gdgvcet2025!");

    const insertUser = _db.prepare(`
      INSERT OR IGNORE INTO users (id, chapter_id, name, email, password_hash, role, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    // 1. Chapter Admin
    insertUser.run(
      "usr-lead",
      "gdg-vcet",
      "Jatush Hingu",
      "lead@vcet.edu.in",
      passwordHash,
      "chapter-admin",
      "active"
    );

    // 2. Platform Super Admin
    insertUser.run(
      "usr-superadmin",
      "gdg-vcet",
      "Global Community Lead",
      "superadmin@gdg.community",
      passwordHash,
      "super-admin",
      "active"
    );

    // 3. Event Manager
    insertUser.run(
      "usr-organizer",
      "gdg-vcet",
      "Dhruv Jain",
      "organizer@vcet.edu.in",
      passwordHash,
      "event-manager",
      "active"
    );

    // 4. Check-in Volunteer
    insertUser.run(
      "usr-volunteer",
      "gdg-vcet",
      "Check-in Team",
      "volunteer@vcet.edu.in",
      passwordHash,
      "check-in-volunteer",
      "active"
    );
  }

  // Seed DevCraft 2025 event
  const eventCheck = _db.prepare("SELECT slug FROM events WHERE slug = ?").get("devcraft-2025");
  if (!eventCheck) {
    _db.prepare(`
      INSERT OR IGNORE INTO events (id, chapter_id, slug, title, category, visibility, starts_at, ends_at, timezone, format, location, capacity, is_registration_open, summary)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      "devcraft-2025",
      "gdg-vcet",
      "devcraft-2025",
      "DevCraft: Architecting Scale with Modern Web, Cloud & AI",
      "workshop",
      "public",
      "2026-11-20T09:00:00+05:30",
      "2026-11-21T17:30:00+05:30",
      "Asia/Kolkata",
      "in-person",
      "Vidyavardhini's College of Engineering and Technology, Vasai (Auditorium & Labs 402)",
      150,
      1,
      "A two-day intensive, project-driven developer workshop organized by Google Developer Groups on Campus VCET."
    );

  }

  // Ensure baseline cohort registrations (124 students) are present
  const regCountRow = _db.prepare("SELECT COUNT(*) as c FROM registrations WHERE event_slug = 'devcraft-2025'").get() as { c: number };
  if ((regCountRow?.c ?? 0) < 124) {
    const insertAttendee = _db.prepare(`
      INSERT OR IGNORE INTO registrations (
        id, chapter_id, event_slug, reference_id, full_name, email, phone, college,
        department, year_of_study, track, experience_level, portfolio_url,
        notes, status, checked_in, checked_in_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const deptList = [
      "Computer Engg",
      "Information Tech",
      "AI & Data Science",
      "Electronics & Telecomm",
      "Other Engineering",
    ];
    const yearList = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
    const expList = ["Beginner", "Intermediate", "Advanced"];

    for (let i = 1; i <= 124; i++) {
      const padded = String(i).padStart(4, "0");
      const ref = `GDG-VCET-2025-${padded}`;
      const trk = i % 2 === 0 ? "Track A: Modern Web & Gemini AI" : "Track B: Cloud Architecture & GCP";
      const dept = deptList[i % deptList.length];
      const yr = yearList[i % yearList.length];
      const exp = expList[i % expList.length];

      insertAttendee.run(
        crypto.randomUUID(),
        "gdg-vcet",
        "devcraft-2025",
        ref,
        i === 1 ? "Atharva Joshi" : i === 2 ? "Pooja Sharma" : `Student Developer #${i}`,
        i === 1 ? "atharva.joshi@vcet.edu.in" : i === 2 ? "pooja.sharma@vcet.edu.in" : `student${i}@vcet.edu.in`,
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

  // Seed sample Community Resources
  const resourceCheck = _db.prepare("SELECT id FROM resources LIMIT 1").get();
  if (!resourceCheck) {
    const insertRes = _db.prepare(`
      INSERT OR IGNORE INTO resources (id, chapter_id, event_slug, title, description, category, url, file_size, tags, is_public, author)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertRes.run(
      "res-1",
      "gdg-vcet",
      "devcraft-2025",
      "React 19 & Concurrent State Masterclass Slides",
      "Official presentation deck and architecture flowcharts from Tanvi Patel's keynote.",
      "slides",
      "https://github.com/gdg-vcet/devcraft-2025-resources",
      "4.2 MB",
      JSON.stringify(["React 19", "Slides", "Architecture"]),
      1,
      "Tanvi Patel"
    );

    insertRes.run(
      "res-2",
      "gdg-vcet",
      "devcraft-2025",
      "Gemini 1.5 Pro Multimodal WebSockets Starter Kit",
      "Complete GitHub repository with Python and TypeScript code examples for function calling.",
      "code",
      "https://github.com/gdg-vcet/gemini-starter-kit",
      "1.8 MB",
      JSON.stringify(["Gemini", "WebSockets", "Python", "Code"]),
      1,
      "Pranav Kulkarni"
    );

    insertRes.run(
      "res-3",
      "gdg-vcet",
      "devcraft-2025",
      "Google Cloud Run CI/CD Pipeline Template",
      "Automated GitHub Actions workflow for multi-stage Docker builds and zero-downtime Cloud Run deployments.",
      "code",
      "https://github.com/gdg-vcet/cloud-run-pipeline",
      "850 KB",
      JSON.stringify(["Cloud Run", "Docker", "CI/CD"]),
      1,
      "Siddharth Mehta"
    );
  }

  // Seed sample Certificates
  const certCheck = _db.prepare("SELECT id FROM certificates LIMIT 1").get();
  if (!certCheck) {
    const insertCert = _db.prepare(`
      INSERT OR IGNORE INTO certificates (id, chapter_id, certificate_id, event_slug, event_title, recipient_name, recipient_email, reference_id, issue_date, status, track)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertCert.run(
      "cert-1",
      "gdg-vcet",
      "CERT-VCET-2025-0842",
      "devcraft-2025",
      "DevCraft: Architecting Scale with Modern Web, Cloud & AI",
      "Atharva Joshi",
      "atharva.joshi@vcet.edu.in",
      "GDG-VCET-2025-0842",
      "2026-11-21",
      "issued",
      "Track A: Modern Web & Gemini AI"
    );

    insertCert.run(
      "cert-2",
      "gdg-vcet",
      "CERT-VCET-2025-0843",
      "devcraft-2025",
      "DevCraft: Architecting Scale with Modern Web, Cloud & AI",
      "Pooja Sharma",
      "pooja.sharma@vcet.edu.in",
      "GDG-VCET-2025-0843",
      "2026-11-21",
      "issued",
      "Track B: Cloud Architecture & GCP"
    );
  }

  // Seed sample Announcements
  const announcementCheck = _db.prepare("SELECT id FROM announcements LIMIT 1").get();
  if (!announcementCheck) {
    _db.prepare(`
      INSERT OR IGNORE INTO announcements (id, chapter_id, event_slug, title, message, target_audience, channel, status, sent_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      "ann-1",
      "gdg-vcet",
      "devcraft-2025",
      "DevCraft 2025: Lab Preparation & Arrival Instructions",
      "Please make sure your laptops have Node.js 20+ and Docker installed before Saturday 09:00 AM check-in. Don't forget your college ID!",
      "registered",
      "email",
      "published",
      124
    );
  }

  return _db;
}

/* =========================================================================
 * 1. EVENT STATS & PUBLIC QUERIES
 * ========================================================================= */

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

/* =========================================================================
 * 2. REGISTRATIONS & CHECK-IN
 * ========================================================================= */

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
    chapterId: (r.chapter_id as string) || "gdg-vcet",
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
    internalNotes: (r.internal_notes as string) || undefined,
    status: (r.status as RegistrationStatus) || "confirmed",
    paymentStatus: (r.payment_status as PaymentStatus) || "not-required",
    paymentReference: (r.payment_reference as string) || undefined,
    checkedIn: (r.checked_in as number) === 1,
    checkedInAt: (r.checked_in_at as string) || undefined,
    checkInOperator: (r.check_in_operator as string) || undefined,
    createdAt: r.created_at as string,
  }));
}

export function getAllRegistrationsAdmin(options?: {
  search?: string;
  eventSlug?: string;
  status?: string;
  paymentStatus?: string;
  checkedIn?: string;
}): RegistrationRecord[] {
  const db = getDatabase();

  let query = "SELECT * FROM registrations WHERE 1=1";
  const params: unknown[] = [];

  if (options?.eventSlug && options.eventSlug !== "all") {
    query += " AND event_slug = ?";
    params.push(options.eventSlug);
  }

  if (options?.search) {
    query += " AND (full_name LIKE ? OR email LIKE ? OR reference_id LIKE ? OR college LIKE ?)";
    const term = `%${options.search}%`;
    params.push(term, term, term, term);
  }

  if (options?.status && options.status !== "all") {
    query += " AND status = ?";
    params.push(options.status);
  }

  if (options?.paymentStatus && options.paymentStatus !== "all") {
    query += " AND payment_status = ?";
    params.push(options.paymentStatus);
  }

  if (options?.checkedIn !== undefined && options.checkedIn !== "all") {
    query += " AND checked_in = ?";
    params.push(options.checkedIn === "true" || options.checkedIn === "1" ? 1 : 0);
  }

  query += " ORDER BY created_at DESC";

  const rows = db.prepare(query).all(...params) as Record<string, unknown>[];

  return rows.map((r) => ({
    id: r.id as string,
    chapterId: (r.chapter_id as string) || "gdg-vcet",
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
    internalNotes: (r.internal_notes as string) || undefined,
    status: (r.status as RegistrationStatus) || "confirmed",
    paymentStatus: (r.payment_status as PaymentStatus) || "not-required",
    paymentReference: (r.payment_reference as string) || undefined,
    checkedIn: (r.checked_in as number) === 1,
    checkedInAt: (r.checked_in_at as string) || undefined,
    checkInOperator: (r.check_in_operator as string) || undefined,
    createdAt: r.created_at as string,
  }));
}

export function updateRegistrationStatus(
  id: string,
  status: RegistrationStatus,
  internalNotes?: string
): boolean {
  const db = getDatabase();
  const res = db.prepare(`
    UPDATE registrations
    SET status = ?, internal_notes = COALESCE(?, internal_notes)
    WHERE id = ?
  `).run(status, internalNotes ?? null, id);

  return res.changes > 0;
}

export function updatePaymentStatus(
  id: string,
  paymentStatus: PaymentStatus,
  paymentReference?: string
): boolean {
  const db = getDatabase();
  const res = db.prepare(`
    UPDATE registrations
    SET payment_status = ?, payment_reference = COALESCE(?, payment_reference)
    WHERE id = ?
  `).run(paymentStatus, paymentReference ?? null, id);

  return res.changes > 0;
}

export function getRegistrationByReference(referenceId: string): RegistrationRecord | null {
  const db = getDatabase();
  const row = db
    .prepare("SELECT * FROM registrations WHERE reference_id = ?")
    .get(referenceId) as Record<string, unknown> | undefined;

  if (!row) return null;

  return {
    id: row.id as string,
    chapterId: (row.chapter_id as string) || "gdg-vcet",
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
    internalNotes: (row.internal_notes as string) || undefined,
    status: (row.status as RegistrationStatus) || "confirmed",
    paymentStatus: (row.payment_status as PaymentStatus) || "not-required",
    paymentReference: (row.payment_reference as string) || undefined,
    checkedIn: (row.checked_in as number) === 1,
    checkedInAt: (row.checked_in_at as string) || undefined,
    checkInOperator: (row.check_in_operator as string) || undefined,
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

  if (
    !input.fullName?.trim() ||
    !input.email?.trim() ||
    !input.phone?.trim() ||
    !input.college?.trim() ||
    !input.department?.trim() ||
    !input.yearOfStudy?.trim() ||
    !input.track?.trim() ||
    !input.experienceLevel?.trim()
  ) {
    return { success: false, error: "INVALID_INPUT", message: "All required fields must be provided." };
  }

  if (!input.agreedToCoc) {
    return { success: false, error: "INVALID_INPUT", message: "You must agree to the Code of Conduct and guidelines." };
  }

  const emailNormalized = input.email.trim().toLowerCase();

  // Check duplicate
  const existing = db
    .prepare("SELECT id, reference_id FROM registrations WHERE event_slug = ? AND LOWER(email) = ?")
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
    return { success: false, error: "CAPACITY_FULL", message: "Workshop capacity has been reached." };
  }

  // Generate Reference ID: GDG-VCET-2025-XXXX with collision avoidance
  let nextNum = stats.totalRegistered + 1;
  let referenceId = `GDG-VCET-2025-${String(nextNum).padStart(4, "0")}`;
  while (db.prepare("SELECT 1 FROM registrations WHERE reference_id = ?").get(referenceId)) {
    nextNum++;
    referenceId = `GDG-VCET-2025-${String(nextNum).padStart(4, "0")}`;
  }
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  try {
    db.prepare(`
      INSERT INTO registrations (
        id, chapter_id, event_slug, reference_id, full_name, email, phone, college,
        department, year_of_study, track, experience_level, portfolio_url,
        notes, status, checked_in, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      "gdg-vcet",
      eventSlug,
      referenceId,
      input.fullName.trim(),
      emailNormalized,
      input.phone.trim(),
      input.college.trim(),
      input.department.trim(),
      input.yearOfStudy.trim(),
      input.track.trim(),
      input.experienceLevel.trim(),
      input.portfolioUrl?.trim() || null,
      input.notes?.trim() || null,
      "confirmed",
      0,
      createdAt
    );
  } catch (err: unknown) {
    if (err && String(err).includes("UNIQUE constraint failed: registrations.event_slug, registrations.email")) {
      return {
        success: false,
        error: "DUPLICATE_EMAIL",
        message: `The email ${emailNormalized} is already registered for this event.`,
      };
    }
    throw err;
  }

  return {
    success: true,
    registration: {
      id,
      chapterId: "gdg-vcet",
      eventSlug,
      referenceId,
      fullName: input.fullName.trim(),
      email: emailNormalized,
      phone: input.phone.trim(),
      college: input.college.trim(),
      department: input.department.trim(),
      yearOfStudy: input.yearOfStudy.trim(),
      track: input.track.trim(),
      experienceLevel: input.experienceLevel.trim(),
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
  referenceId: string,
  operatorName = "Check-in Desk"
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
  db.prepare(`
    UPDATE registrations
    SET checked_in = 1, checked_in_at = ?, check_in_operator = ?
    WHERE reference_id = ?
  `).run(now, operatorName, ref);

  const updatedReg = getRegistrationByReference(ref)!;

  return {
    success: true,
    message: `Successfully checked in ${reg.fullName} (#${ref}) for ${reg.track}!`,
    registration: updatedReg,
  };
}

/* =========================================================================
 * 3. EVENT MANAGEMENT & BUILDER
 * ========================================================================= */

export function getAllEventsAdmin(chapterId = "gdg-vcet"): ChapterEvent[] {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT * FROM events WHERE chapter_id = ? ORDER BY starts_at DESC
  `).all(chapterId) as Record<string, unknown>[];

  return rows.map((r) => ({
    id: r.id as string,
    slug: r.slug as string,
    title: r.title as string,
    chapterId: (r.chapter_id as string) || "gdg-vcet",
    category: (r.category as EventCategory) || "workshop",
    visibility: (r.visibility as EventVisibility) || "public",
    startsAt: r.starts_at as string,
    endsAt: (r.ends_at as string) || undefined,
    timezone: (r.timezone as string) || "Asia/Kolkata",
    format: (r.format as EventFormat) || "in-person",
    location: (r.location as string) || undefined,
    capacity: (r.capacity as number) || 150,
    isRegistrationOpen: (r.is_registration_open as number) === 1,
    registrationDeadline: (r.registration_deadline as string) || undefined,
    summary: (r.summary as string) || undefined,
    image: (r.image as string) || undefined,
    price: (r.price as number) || 0,
    currency: (r.currency as string) || "INR",
    topics: ["web", "cloud"],
    createdAt: r.created_at as string,
  }));
}

export function getEventBySlug(slug: string, chapterId = "gdg-vcet"): ChapterEvent | null {
  const db = getDatabase();
  const r = db.prepare(`
    SELECT * FROM events WHERE slug = ? AND chapter_id = ?
  `).get(slug, chapterId) as Record<string, unknown> | undefined;

  if (!r) return null;

  return {
    id: r.id as string,
    slug: r.slug as string,
    title: r.title as string,
    chapterId: (r.chapter_id as string) || "gdg-vcet",
    category: (r.category as EventCategory) || "workshop",
    visibility: (r.visibility as EventVisibility) || "public",
    startsAt: r.starts_at as string,
    endsAt: (r.ends_at as string) || undefined,
    timezone: (r.timezone as string) || "Asia/Kolkata",
    format: (r.format as EventFormat) || "in-person",
    location: (r.location as string) || undefined,
    capacity: (r.capacity as number) || 150,
    isRegistrationOpen: (r.is_registration_open as number) === 1,
    registrationDeadline: (r.registration_deadline as string) || undefined,
    summary: (r.summary as string) || undefined,
    image: (r.image as string) || undefined,
    price: (r.price as number) || 0,
    currency: (r.currency as string) || "INR",
    topics: ["web", "cloud"],
    createdAt: r.created_at as string,
  };
}

export function createEventAdmin(event: Partial<ChapterEvent>): { success: boolean; event?: ChapterEvent; error?: string } {
  const db = getDatabase();
  const id = event.id || crypto.randomUUID();
  const slug = event.slug || (event.title ? event.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") : `event-${Date.now()}`);

  const exists = db.prepare("SELECT slug FROM events WHERE slug = ?").get(slug);
  if (exists) {
    return { success: false, error: `An event with slug "${slug}" already exists.` };
  }

  db.prepare(`
    INSERT INTO events (
      id, chapter_id, slug, title, category, visibility, starts_at, ends_at,
      timezone, format, location, capacity, is_registration_open, summary, image, price, currency
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    event.chapterId || "gdg-vcet",
    slug,
    event.title || "Untitled Event",
    event.category || "workshop",
    event.visibility || "public",
    event.startsAt || new Date().toISOString(),
    event.endsAt || null,
    event.timezone || "Asia/Kolkata",
    event.format || "in-person",
    event.location || "VCET Campus",
    event.capacity || 100,
    event.isRegistrationOpen !== false ? 1 : 0,
    event.summary || "",
    event.image || null,
    event.price || 0,
    event.currency || "INR"
  );

  return {
    success: true,
    event: {
      id,
      slug,
      title: event.title || "Untitled Event",
      startsAt: event.startsAt || new Date().toISOString(),
      topics: ["general"],
      ...event,
    } as ChapterEvent,
  };
}

export function updateEventAdmin(slug: string, event: Partial<ChapterEvent>): boolean {
  const db = getDatabase();
  const res = db.prepare(`
    UPDATE events
    SET title = COALESCE(?, title),
        category = COALESCE(?, category),
        visibility = COALESCE(?, visibility),
        starts_at = COALESCE(?, starts_at),
        ends_at = COALESCE(?, ends_at),
        format = COALESCE(?, format),
        location = COALESCE(?, location),
        capacity = COALESCE(?, capacity),
        is_registration_open = COALESCE(?, is_registration_open),
        summary = COALESCE(?, summary),
        image = COALESCE(?, image)
    WHERE slug = ?
  `).run(
    event.title ?? null,
    event.category ?? null,
    event.visibility ?? null,
    event.startsAt ?? null,
    event.endsAt ?? null,
    event.format ?? null,
    event.location ?? null,
    event.capacity ?? null,
    event.isRegistrationOpen !== undefined ? (event.isRegistrationOpen ? 1 : 0) : null,
    event.summary ?? null,
    event.image ?? null,
    slug
  );

  return res.changes > 0;
}

export function duplicateEventAdmin(slug: string): { success: boolean; newSlug?: string } {
  const db = getDatabase();
  const orig = db.prepare("SELECT * FROM events WHERE slug = ?").get(slug) as Record<string, unknown> | undefined;
  if (!orig) return { success: false };

  const newSlug = `${slug}-copy-${Date.now().toString().slice(-4)}`;
  const newTitle = `${orig.title} (Copy)`;
  const id = crypto.randomUUID();

  db.prepare(`
    INSERT INTO events (
      id, chapter_id, slug, title, category, visibility, starts_at, ends_at,
      timezone, format, location, capacity, is_registration_open, summary, image, price, currency
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    orig.chapter_id,
    newSlug,
    newTitle,
    orig.category,
    "draft",
    orig.starts_at,
    orig.ends_at,
    orig.timezone,
    orig.format,
    orig.location,
    orig.capacity,
    0,
    orig.summary,
    orig.image,
    orig.price,
    orig.currency
  );

  return { success: true, newSlug };
}

export function deleteEventAdmin(slug: string): boolean {
  const db = getDatabase();
  const res = db.prepare("DELETE FROM events WHERE slug = ?").run(slug);
  return res.changes > 0;
}

/* =========================================================================
 * 4. SPEAKERS & MENTORS
 * ========================================================================= */

export function getSpeakersAdmin(chapterId = "gdg-vcet"): WorkshopSpeaker[] {
  const db = getDatabase();
  const rows = db.prepare("SELECT * FROM speakers WHERE chapter_id = ? ORDER BY name ASC").all(chapterId) as Record<string, unknown>[];

  return rows.map((r) => ({
    id: r.id as string,
    name: r.name as string,
    role: r.role as string,
    organization: r.organization as string,
    badge: (r.badge as string) || undefined,
    category: (r.category as "keynote" | "hands-on" | "mentors" | "leads") || "keynote",
    bio: (r.bio as string) || undefined,
    photo: (r.photo as string) || undefined,
    tags: JSON.parse((r.expertise as string) || "[]"),
    socials: {
      linkedin: (r.linkedin as string) || undefined,
      github: (r.github as string) || undefined,
      website: (r.website as string) || undefined,
    },
    email: (r.email as string) || undefined,
  }));
}

export function createSpeakerAdmin(speaker: Partial<WorkshopSpeaker>, chapterId = "gdg-vcet"): WorkshopSpeaker {
  const db = getDatabase();
  const id = speaker.id || crypto.randomUUID();

  db.prepare(`
    INSERT INTO speakers (id, chapter_id, name, role, organization, badge, category, bio, expertise, linkedin, github, website, email, photo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    chapterId,
    speaker.name || "Unnamed Speaker",
    speaker.role || "Speaker",
    speaker.organization || "Independent",
    speaker.badge || null,
    speaker.category || "keynote",
    speaker.bio || null,
    JSON.stringify(speaker.tags || []),
    speaker.socials?.linkedin || null,
    speaker.socials?.github || null,
    speaker.socials?.website || null,
    speaker.email || null,
    speaker.photo || null
  );

  return {
    id,
    name: speaker.name || "Unnamed Speaker",
    role: speaker.role || "Speaker",
    organization: speaker.organization || "Independent",
    category: speaker.category || "keynote",
    tags: speaker.tags || [],
    ...speaker,
  } as WorkshopSpeaker;
}

export function deleteSpeakerAdmin(id: string): boolean {
  const db = getDatabase();
  const res = db.prepare("DELETE FROM speakers WHERE id = ?").run(id);
  return res.changes > 0;
}

/* =========================================================================
 * 5. SPONSORS & PARTNERS
 * ========================================================================= */

export function getSponsorsAdmin(chapterId = "gdg-vcet"): WorkshopSponsor[] {
  const db = getDatabase();
  const rows = db.prepare("SELECT * FROM sponsors WHERE chapter_id = ? ORDER BY created_at DESC").all(chapterId) as Record<string, unknown>[];

  return rows.map((r) => ({
    id: r.id as string,
    name: r.name as string,
    tier: (r.tier as "title" | "gold" | "silver" | "platform" | "ecosystem" | "media") || "gold",
    description: (r.description as string) || undefined,
    logo: (r.logo as string) || undefined,
    url: (r.website as string) || undefined,
    contribution: (r.contribution as string) || undefined,
    contactEmail: (r.contact_email as string) || undefined,
    status: (r.status as "approved" | "pending") || "approved",
  }));
}

export function createSponsorAdmin(sponsor: Partial<WorkshopSponsor>, chapterId = "gdg-vcet"): WorkshopSponsor {
  const db = getDatabase();
  const id = sponsor.id || crypto.randomUUID();

  db.prepare(`
    INSERT INTO sponsors (id, chapter_id, name, tier, description, logo, website, contact_email, contribution, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    chapterId,
    sponsor.name || "Unnamed Sponsor",
    sponsor.tier || "gold",
    sponsor.description || null,
    sponsor.logo || null,
    sponsor.url || null,
    sponsor.contactEmail || null,
    sponsor.contribution || null,
    sponsor.status || "approved"
  );

  return {
    id,
    name: sponsor.name || "Unnamed Sponsor",
    tier: sponsor.tier || "gold",
    ...sponsor,
  } as WorkshopSponsor;
}

export function deleteSponsorAdmin(id: string): boolean {
  const db = getDatabase();
  const res = db.prepare("DELETE FROM sponsors WHERE id = ?").run(id);
  return res.changes > 0;
}

/* =========================================================================
 * 5B. AGENDA SESSION BUILDER
 * ========================================================================= */

export function getAgendaSessions(eventSlug?: string, chapterId = "gdg-vcet"): AgendaSession[] {
  const db = getDatabase();
  let query = "SELECT * FROM agenda_sessions WHERE chapter_id = ?";
  const params: unknown[] = [chapterId];
  if (eventSlug && eventSlug !== "all") {
    query += " AND event_slug = ?";
    params.push(eventSlug);
  }
  query += " ORDER BY day ASC, time ASC";
  const rows = db.prepare(query).all(...params) as Record<string, unknown>[];

  return rows.map((r) => ({
    id: r.id as string,
    eventSlug: r.event_slug as string,
    day: (r.day as number) || 1,
    time: r.time as string,
    title: r.title as string,
    description: (r.description as string) || undefined,
    track: (r.track as string) || "all",
    trackLabel: (r.track_label as string) || undefined,
    speaker: (r.speaker as string) || undefined,
    speakerRole: (r.speaker_role as string) || undefined,
    location: (r.location as string) || undefined,
    tags: JSON.parse((r.tags as string) || "[]"),
  }));
}

export function createAgendaSession(
  session: Partial<AgendaSession> & { eventSlug: string; time: string; title: string },
  chapterId = "gdg-vcet"
): AgendaSession {
  const db = getDatabase();
  const id = session.id || crypto.randomUUID();

  db.prepare(`
    INSERT INTO agenda_sessions (
      id, chapter_id, event_slug, day, time, title, description,
      track, track_label, speaker, speaker_role, location, tags
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    chapterId,
    session.eventSlug,
    session.day || 1,
    session.time,
    session.title,
    session.description || null,
    session.track || "all",
    session.trackLabel || null,
    session.speaker || null,
    session.speakerRole || null,
    session.location || null,
    JSON.stringify(session.tags || [])
  );

  return {
    ...session,
    id,
    day: session.day || 1,
    track: session.track || "all",
  } as AgendaSession;
}

export function deleteAgendaSession(id: string): boolean {
  const db = getDatabase();
  const res = db.prepare("DELETE FROM agenda_sessions WHERE id = ?").run(id);
  return res.changes > 0;
}

/* =========================================================================
 * 6. CERTIFICATES & VERIFICATION
 * ========================================================================= */

export function getCertificates(options?: {
  chapterId?: string;
  search?: string;
  eventSlug?: string;
}): CertificateRecord[] {
  const db = getDatabase();
  let query = "SELECT * FROM certificates WHERE 1=1";
  const params: unknown[] = [];

  if (options?.chapterId) {
    query += " AND chapter_id = ?";
    params.push(options.chapterId);
  }

  if (options?.eventSlug && options.eventSlug !== "all") {
    query += " AND event_slug = ?";
    params.push(options.eventSlug);
  }

  if (options?.search) {
    query += " AND (recipient_name LIKE ? OR recipient_email LIKE ? OR certificate_id LIKE ?)";
    const term = `%${options.search}%`;
    params.push(term, term, term);
  }

  query += " ORDER BY created_at DESC";

  const rows = db.prepare(query).all(...params) as Record<string, unknown>[];

  return rows.map((r) => ({
    id: r.id as string,
    chapterId: r.chapter_id as string,
    certificateId: r.certificate_id as string,
    eventSlug: r.event_slug as string,
    eventTitle: r.event_title as string,
    recipientName: r.recipient_name as string,
    recipientEmail: r.recipient_email as string,
    referenceId: r.reference_id as string,
    issueDate: r.issue_date as string,
    status: (r.status as "issued" | "revoked") || "issued",
    track: (r.track as string) || undefined,
    issuerName: (r.issuer_name as string) || "GDG on Campus VCET",
    issuerRole: (r.issuer_role as string) || "Lead Organizer",
    createdAt: r.created_at as string,
  }));
}

export function getCertificateById(certificateId: string): CertificateRecord | null {
  const db = getDatabase();
  const cert = certificateId.trim().toUpperCase();
  const r = db
    .prepare("SELECT * FROM certificates WHERE certificate_id = ? OR reference_id = ?")
    .get(cert, cert) as Record<string, unknown> | undefined;
  if (!r) return null;

  return {
    id: r.id as string,
    chapterId: r.chapter_id as string,
    certificateId: r.certificate_id as string,
    eventSlug: r.event_slug as string,
    eventTitle: r.event_title as string,
    recipientName: r.recipient_name as string,
    recipientEmail: r.recipient_email as string,
    referenceId: r.reference_id as string,
    issueDate: r.issue_date as string,
    status: (r.status as "issued" | "revoked") || "issued",
    track: (r.track as string) || undefined,
    issuerName: (r.issuer_name as string) || "GDG on Campus VCET",
    issuerRole: (r.issuer_role as string) || "Lead Organizer",
    createdAt: r.created_at as string,
  };
}

export function issueCertificate(cert: {
  eventSlug: string;
  eventTitle: string;
  recipientName: string;
  recipientEmail: string;
  referenceId: string;
  track?: string;
  chapterId?: string;
}): CertificateRecord {
  const db = getDatabase();
  const id = crypto.randomUUID();
  const num = Math.floor(1000 + Math.random() * 9000);
  const certificateId = `CERT-VCET-2025-${num}`;
  const issueDate = new Date().toISOString().split("T")[0];

  db.prepare(`
    INSERT INTO certificates (
      id, chapter_id, certificate_id, event_slug, event_title, recipient_name,
      recipient_email, reference_id, issue_date, status, track, issuer_name, issuer_role
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    cert.chapterId || "gdg-vcet",
    certificateId,
    cert.eventSlug,
    cert.eventTitle,
    cert.recipientName,
    cert.recipientEmail,
    cert.referenceId,
    issueDate,
    "issued",
    cert.track || null,
    "GDG on Campus VCET",
    "Lead Organizer"
  );

  return {
    id,
    chapterId: cert.chapterId || "gdg-vcet",
    certificateId,
    eventSlug: cert.eventSlug,
    eventTitle: cert.eventTitle,
    recipientName: cert.recipientName,
    recipientEmail: cert.recipientEmail,
    referenceId: cert.referenceId,
    issueDate,
    status: "issued",
    track: cert.track,
    issuerName: "GDG on Campus VCET",
    issuerRole: "Lead Organizer",
    createdAt: new Date().toISOString(),
  };
}

export function bulkIssueCertificates(eventSlug: string, onlyCheckedIn = true): { count: number; eventTitle: string } {
  const db = getDatabase();
  const event = db.prepare("SELECT title FROM events WHERE slug = ?").get(eventSlug) as { title: string } | undefined;
  const eventTitle = event?.title || "DevCraft Workshop";

  let query = "SELECT * FROM registrations WHERE event_slug = ? AND status = 'confirmed'";
  if (onlyCheckedIn) {
    query += " AND checked_in = 1";
  }

  const attendees = db.prepare(query).all(eventSlug) as Record<string, unknown>[];
  let issuedCount = 0;

  for (const a of attendees) {
    const existing = db.prepare("SELECT id FROM certificates WHERE reference_id = ? AND event_slug = ?").get(a.reference_id, eventSlug);
    if (!existing) {
      issueCertificate({
        eventSlug,
        eventTitle,
        recipientName: a.full_name as string,
        recipientEmail: a.email as string,
        referenceId: a.reference_id as string,
        track: a.track as string,
      });
      issuedCount++;
    }
  }

  return { count: issuedCount, eventTitle };
}

export function updateCertificateStatus(id: string, status: "issued" | "revoked"): boolean {
  const db = getDatabase();
  const res = db.prepare("UPDATE certificates SET status = ? WHERE id = ? OR certificate_id = ?").run(status, id, id);
  return res.changes > 0;
}

/* =========================================================================
 * 7. COMMUNITY RESOURCES
 * ========================================================================= */

export function getResources(options?: { chapterId?: string; isPublicOnly?: boolean; search?: string }): CommunityResource[] {
  const db = getDatabase();
  let query = "SELECT * FROM resources WHERE 1=1";
  const params: unknown[] = [];

  if (options?.chapterId) {
    query += " AND chapter_id = ?";
    params.push(options.chapterId);
  }

  if (options?.isPublicOnly) {
    query += " AND is_public = 1";
  }

  if (options?.search) {
    query += " AND (title LIKE ? OR description LIKE ?)";
    const term = `%${options.search}%`;
    params.push(term, term);
  }

  query += " ORDER BY created_at DESC";

  const rows = db.prepare(query).all(...params) as Record<string, unknown>[];

  return rows.map((r) => ({
    id: r.id as string,
    chapterId: r.chapter_id as string,
    eventSlug: (r.event_slug as string) || undefined,
    title: r.title as string,
    description: r.description as string,
    category: (r.category as "slides" | "code" | "docs" | "video" | "tools") || "docs",
    url: r.url as string,
    fileSize: (r.file_size as string) || undefined,
    tags: JSON.parse((r.tags as string) || "[]"),
    isPublic: (r.is_public as number) === 1,
    author: (r.author as string) || undefined,
    createdAt: r.created_at as string,
  }));
}

export function getPublicResources(chapterId = "gdg-vcet"): CommunityResource[] {
  return getResources({ chapterId, isPublicOnly: true });
}

export function createResourceAdmin(res: Partial<CommunityResource>, chapterId = "gdg-vcet"): CommunityResource {
  const db = getDatabase();
  const id = res.id || crypto.randomUUID();

  db.prepare(`
    INSERT INTO resources (id, chapter_id, event_slug, title, description, category, url, file_size, tags, is_public, author)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    chapterId,
    res.eventSlug || null,
    res.title || "Untitled Resource",
    res.description || "",
    res.category || "document",
    res.url || "#",
    res.fileSize || "1.0 MB",
    JSON.stringify(res.tags || []),
    res.isPublic !== false ? 1 : 0,
    res.author || "GDG Team"
  );

  return {
    id,
    chapterId,
    title: res.title || "Untitled Resource",
    description: res.description || "",
    category: res.category || "document",
    url: res.url || "#",
    tags: res.tags || [],
    isPublic: res.isPublic !== false,
    createdAt: new Date().toISOString(),
    ...res,
  } as CommunityResource;
}

export function deleteResourceAdmin(id: string): boolean {
  const db = getDatabase();
  const res = db.prepare("DELETE FROM resources WHERE id = ?").run(id);
  return res.changes > 0;
}

/* =========================================================================
 * 8. ANNOUNCEMENTS & COMMUNICATION
 * ========================================================================= */

export function getAnnouncementsAdmin(chapterId = "gdg-vcet"): Announcement[] {
  const db = getDatabase();
  const rows = db.prepare("SELECT * FROM announcements WHERE chapter_id = ? ORDER BY created_at DESC").all(chapterId) as Record<string, unknown>[];

  return rows.map((r) => ({
    id: r.id as string,
    chapterId: r.chapter_id as string,
    eventSlug: (r.event_slug as string) || undefined,
    title: r.title as string,
    message: r.message as string,
    targetAudience: (r.target_audience as "all" | "registered" | "checked-in" | "waitlisted") || "all",
    channel: (r.channel as "email" | "web" | "banner") || "email",
    status: (r.status as "draft" | "scheduled" | "published") || "published",
    sentCount: (r.sent_count as number) || 0,
    scheduledAt: (r.scheduled_at as string) || undefined,
    createdAt: r.created_at as string,
  }));
}

export function createAnnouncementAdmin(ann: Partial<Announcement>, chapterId = "gdg-vcet"): Announcement {
  const db = getDatabase();
  const id = ann.id || crypto.randomUUID();

  // Get recipient count for simulation
  const countRow = db.prepare("SELECT COUNT(*) as count FROM registrations WHERE status = 'confirmed'").get() as { count: number };
  const sentCount = countRow?.count ?? 124;

  db.prepare(`
    INSERT INTO announcements (id, chapter_id, event_slug, title, message, target_audience, channel, status, sent_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    chapterId,
    ann.eventSlug || null,
    ann.title || "Announcement",
    ann.message || "",
    ann.targetAudience || "registered",
    ann.channel || "email",
    "published",
    sentCount
  );

  return {
    id,
    chapterId,
    title: ann.title || "Announcement",
    message: ann.message || "",
    targetAudience: ann.targetAudience || "registered",
    channel: ann.channel || "email",
    status: "published",
    sentCount,
    createdAt: new Date().toISOString(),
  };
}

/* =========================================================================
 * 9. TEAM & AUDIT LOGS
 * ========================================================================= */

export function getAdminUsers(chapterId = "gdg-vcet"): AdminUser[] {
  const db = getDatabase();
  const rows = db.prepare("SELECT id, chapter_id, name, email, role, avatar, status, created_at FROM users WHERE chapter_id = ? OR chapter_id = 'gdg-vcet'").all(chapterId) as Record<string, unknown>[];

  return rows.map((r) => ({
    id: r.id as string,
    chapterId: r.chapter_id as string,
    name: r.name as string,
    email: r.email as string,
    role: r.role as AdminRole,
    avatar: (r.avatar as string) || undefined,
    status: (r.status as "active" | "invited" | "suspended") || "active",
    createdAt: r.created_at as string,
  }));
}

export function createAdminUser(user: { name: string; email: string; role: AdminRole; chapterId?: string }): { success: boolean; user?: AdminUser; error?: string } {
  const db = getDatabase();
  const id = crypto.randomUUID();
  const emailNorm = user.email.trim().toLowerCase();

  const exists = db.prepare("SELECT id FROM users WHERE email = ?").get(emailNorm);
  if (exists) {
    return { success: false, error: "A team member with this email already exists." };
  }

  const defaultHash = hashPassword("gdgvcet2025!");

  db.prepare(`
    INSERT INTO users (id, chapter_id, name, email, password_hash, role, status)
    VALUES (?, ?, ?, ?, ?, ?, 'active')
  `).run(id, user.chapterId || "gdg-vcet", user.name.trim(), emailNorm, defaultHash, user.role);

  return {
    success: true,
    user: {
      id,
      chapterId: user.chapterId || "gdg-vcet",
      name: user.name.trim(),
      email: emailNorm,
      role: user.role,
      status: "active",
      createdAt: new Date().toISOString(),
    },
  };
}

export function logAuditEvent(log: {
  chapterId?: string;
  userId: string;
  userEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: string;
}): void {
  const db = getDatabase();
  db.prepare(`
    INSERT INTO audit_logs (id, chapter_id, user_id, user_email, action, entity_type, entity_id, details)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    crypto.randomUUID(),
    log.chapterId || "gdg-vcet",
    log.userId,
    log.userEmail,
    log.action,
    log.entityType,
    log.entityId,
    log.details || null
  );
}

export function getAuditLogs(chapterId = "gdg-vcet", limit = 20): AuditLogRecord[] {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT * FROM audit_logs WHERE chapter_id = ? ORDER BY created_at DESC LIMIT ?
  `).all(chapterId, limit) as Record<string, unknown>[];

  return rows.map((r) => ({
    id: r.id as string,
    chapterId: r.chapter_id as string,
    userId: r.user_id as string,
    userEmail: r.user_email as string,
    action: r.action as string,
    entityType: r.entity_type as string,
    entityId: r.entity_id as string,
    details: (r.details as string) || undefined,
    createdAt: r.created_at as string,
  }));
}

/* =========================================================================
 * 10. MULTI-CHAPTER SETTINGS & PLATFORM ANALYTICS
 * ========================================================================= */

export function getChapterSettings(chapterId = "gdg-vcet"): ChapterTenant {
  const db = getDatabase();
  const r = db.prepare("SELECT * FROM chapters WHERE id = ?").get(chapterId) as Record<string, unknown> | undefined;

  if (!r) {
    return {
      id: "gdg-vcet",
      slug: "vcet",
      name: "GDG on Campus VCET",
      shortName: "GDG VCET",
      tagline: "Learn. Build. Connect.",
      description: "The student developer community at Vidyavardhini's College of Engineering and Technology, Vasai.",
      institution: "Vidyavardhini's College of Engineering and Technology, Vasai, India",
      primaryColor: "#1A73E8",
      contactEmail: "lead@vcet.edu.in",
      createdAt: new Date().toISOString(),
    };
  }

  return {
    id: r.id as string,
    slug: r.slug as string,
    name: r.name as string,
    shortName: r.short_name as string,
    tagline: (r.tagline as string) || "",
    description: (r.description as string) || "",
    institution: r.institution as string,
    logoUrl: (r.logo_url as string) || undefined,
    primaryColor: (r.primary_color as string) || "#1A73E8",
    contactEmail: (r.contact_email as string) || "lead@vcet.edu.in",
    createdAt: r.created_at as string,
  };
}

export function updateChapterSettings(chapterId: string, settings: Partial<ChapterTenant>): boolean {
  const db = getDatabase();
  const res = db.prepare(`
    UPDATE chapters
    SET name = COALESCE(?, name),
        short_name = COALESCE(?, short_name),
        tagline = COALESCE(?, tagline),
        description = COALESCE(?, description),
        institution = COALESCE(?, institution),
        contact_email = COALESCE(?, contact_email),
        primary_color = COALESCE(?, primary_color)
    WHERE id = ?
  `).run(
    settings.name ?? null,
    settings.shortName ?? null,
    settings.tagline ?? null,
    settings.description ?? null,
    settings.institution ?? null,
    settings.contactEmail ?? null,
    settings.primaryColor ?? null,
    chapterId
  );

  return res.changes > 0;
}

export function getPlatformAnalytics(chapterId = "gdg-vcet") {
  const db = getDatabase();

  const totalEvents = (db.prepare("SELECT COUNT(*) as c FROM events WHERE chapter_id = ?").get(chapterId) as { c: number })?.c ?? 0;
  const totalRegistrations = (db.prepare("SELECT COUNT(*) as c FROM registrations WHERE chapter_id = ?").get(chapterId) as { c: number })?.c ?? 0;
  const totalAttendance = (db.prepare("SELECT COUNT(*) as c FROM registrations WHERE chapter_id = ? AND checked_in = 1").get(chapterId) as { c: number })?.c ?? 0;
  const totalCertificates = (db.prepare("SELECT COUNT(*) as c FROM certificates WHERE chapter_id = ?").get(chapterId) as { c: number })?.c ?? 0;
  const totalResources = (db.prepare("SELECT COUNT(*) as c FROM resources WHERE chapter_id = ?").get(chapterId) as { c: number })?.c ?? 0;

  const attendanceRate = totalRegistrations > 0 ? Math.round((totalAttendance / totalRegistrations) * 100) : 0;

  // Monthly registrations trend
  const trendRows = db.prepare(`
    SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count
    FROM registrations
    WHERE chapter_id = ?
    GROUP BY month
    ORDER BY month ASC
  `).all(chapterId) as { month: string; count: number }[];

  const monthlyTrend = trendRows.length > 0
    ? trendRows.map((r) => ({ month: String(r.month), count: Number(r.count) }))
    : [{ month: "2026-11", count: totalRegistrations }];

  // Department distribution
  const deptRows = db.prepare(`
    SELECT department, COUNT(*) as count
    FROM registrations
    WHERE chapter_id = ?
    GROUP BY department
    ORDER BY count DESC
  `).all(chapterId) as { department: string; count: number }[];

  const departmentDistribution = deptRows.map((r) => ({
    department: String(r.department),
    count: Number(r.count),
  }));

  // College distribution
  const collegeRows = db.prepare(`
    SELECT college, COUNT(*) as count
    FROM registrations
    WHERE chapter_id = ?
    GROUP BY college
    ORDER BY count DESC
    LIMIT 5
  `).all(chapterId) as { college: string; count: number }[];

  const collegeDistribution = collegeRows.map((r) => ({
    college: String(r.college),
    count: Number(r.count),
  }));

  return {
    totalEvents,
    totalRegistrations,
    totalAttendance,
    attendanceRate,
    totalCertificates,
    totalResources,
    monthlyTrend,
    departmentDistribution,
    collegeDistribution,
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
