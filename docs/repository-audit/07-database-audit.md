# 07 — Database Audit

> Scope: `src/lib/db/index.ts` (schema + all data-access functions), `src/lib/db/index.test.ts`, `src/types/index.ts`, `src/types/sqlite.d.ts`, cross-checked against `docs/DATABASE_SCHEMA.md` and `docs/MULTI_TENANCY.md`. Read-only audit — no application code was modified. Every claim below cites `src/lib/db/index.ts:<line>` unless marked UNVERIFIED.

## 1. Storage Engine (verified)

- Driver: **`node:sqlite`'s `DatabaseSync`** (Node's native built-in SQLite binding, not `better-sqlite3`) — `src/lib/db/index.ts:3`. This does not appear in `package.json` because it's a Node runtime built-in, not an npm package. Confirmed by `src/types/sqlite.d.ts` providing ambient types for it.
- Single file DB at `./data/gdg.db` (`index.ts:27-32`), lazily opened as a module-level singleton (`_db`, `index.ts:34, 44-47`).
- Pragmas actually set at startup (`index.ts:50-53`):
  ```sql
  PRAGMA journal_mode = WAL;
  PRAGMA busy_timeout = 5000;
  ```
  **`PRAGMA foreign_keys = ON;` is never executed anywhere in the codebase** (confirmed via full read of `index.ts` and `grep` for `foreign_keys` — no match). See Finding DB-1 below; `docs/DATABASE_SCHEMA.md:9` incorrectly states "Foreign Key enforcement enabled."
- `data/gdg.db`, `data/gdg.db-shm`, `data/gdg.db-wal` are present on disk but **correctly gitignored** (`.gitignore:45-47`: `data/*.db*`, `data/*.db-wal`, `data/*.db-shm`) and confirmed untracked via `git ls-files data/` (empty output). No finding here — this is handled correctly, contrary to what might be assumed from the files' presence in the working tree.
- Schema managed via `CREATE TABLE IF NOT EXISTS` run on every process start (`index.ts:56-265`), plus ad-hoc `ALTER TABLE ... ADD COLUMN` calls wrapped in `safeAddColumn` that silently swallow all errors (`index.ts:36-42`, invoked at `index.ts:268-280`). **There is no migrations framework or schema version table.**
- On first run the module also seeds: a default chapter, 4 admin users with a **shared hardcoded password** (`"gdgvcet2025!"`, `index.ts:304`), one event, 124 synthetic registrations, 3 resources, 2 certificates, and 1 announcement (`index.ts:282-537`). This seeding logic runs unconditionally inside `getDatabase()`, i.e. on every cold start / every serverless invocation if the DB is empty.

## 2. Tables (every field, sourced from `index.ts:56-259`)

### 2.1 `chapters` (`index.ts:58-70`)
| Column | Type | Constraint | Default |
|---|---|---|---|
| id | TEXT | PRIMARY KEY | — |
| slug | TEXT | UNIQUE NOT NULL | — |
| name | TEXT | NOT NULL | — |
| short_name | TEXT | NOT NULL | — |
| tagline | TEXT | | — |
| description | TEXT | | — |
| institution | TEXT | NOT NULL | — |
| logo_url | TEXT | | — |
| primary_color | TEXT | | `'#1A73E8'` |
| contact_email | TEXT | | — |
| created_at | TEXT | | `CURRENT_TIMESTAMP` |

### 2.2 `users` (`index.ts:73-84`)
| Column | Type | Constraint | Default |
|---|---|---|---|
| id | TEXT | PRIMARY KEY | — |
| chapter_id | TEXT | FK → `chapters(id)` (declared, **not enforced** — see DB-1) | `'gdg-vcet'` |
| name | TEXT | NOT NULL | — |
| email | TEXT | **UNIQUE NOT NULL (global, not per-chapter)** | — |
| password_hash | TEXT | NOT NULL | — |
| role | TEXT | | `'chapter-admin'` |
| avatar | TEXT | | — |
| status | TEXT | | `'active'` |
| created_at | TEXT | | `CURRENT_TIMESTAMP` |

Password hashing confirmed in `src/lib/auth/index.ts:6-8`: `crypto.scryptSync(password, salt, 64)` with a fresh 16-byte random salt per password, compared with `crypto.timingSafeEqual` (`src/lib/auth/index.ts:16-17`). This part of `docs/DATABASE_SCHEMA.md:118` ("Scrypt hashed password with unique salt") is accurate.

### 2.3 `sessions` (`index.ts:87-93`)
| Column | Type | Constraint | Default |
|---|---|---|---|
| token | TEXT | PRIMARY KEY | — |
| user_id | TEXT | NOT NULL, FK → `users(id)` **ON DELETE CASCADE** | — |
| expires_at | TEXT | NOT NULL | — |
| created_at | TEXT | | `CURRENT_TIMESTAMP` |

This is the only table with an `ON DELETE CASCADE` FK — but per Finding DB-1, cascade never fires because FK enforcement is off.

### 2.4 `events` (`index.ts:96-117`, plus retrofitted columns `index.ts:268-275`)
| Column | Type | Constraint | Default |
|---|---|---|---|
| id | TEXT | PRIMARY KEY | — |
| chapter_id | TEXT | **no FK declared** despite comment "Multi-Chapter Tenants" | `'gdg-vcet'` |
| slug | TEXT | UNIQUE NOT NULL | — |
| title | TEXT | NOT NULL | — |
| category | TEXT | no CHECK constraint (any string accepted) | `'workshop'` |
| visibility | TEXT | no CHECK constraint | `'public'` |
| starts_at | TEXT | NOT NULL | — |
| ends_at | TEXT | | — |
| timezone | TEXT | | `'Asia/Kolkata'` |
| format | TEXT | no CHECK constraint | `'in-person'` |
| location | TEXT | | — |
| summary | TEXT | | — |
| image | TEXT | | — |
| price | INTEGER | | `0` |
| currency | TEXT | | `'INR'` |
| capacity | INTEGER | | `150` |
| is_registration_open | INTEGER (bool) | | `1` |
| registration_deadline | TEXT | | — |
| tags | TEXT (JSON array, app-level) | | `'[]'` |
| created_at | TEXT | | `CURRENT_TIMESTAMP` |

Indexed on `slug` via `idx_events_slug` (`index.ts:264`).

### 2.5 `registrations` (`index.ts:120-145`, plus `index.ts:276-280`)
| Column | Type | Constraint | Default |
|---|---|---|---|
| id | TEXT | PRIMARY KEY | — |
| chapter_id | TEXT | no FK declared | `'gdg-vcet'` |
| event_slug | TEXT | NOT NULL, FK → `events(slug)` **ON DELETE CASCADE** | — |
| reference_id | TEXT | UNIQUE NOT NULL | — |
| full_name, email, phone, college, department, year_of_study, track, experience_level | TEXT | all NOT NULL | — |
| portfolio_url, notes, internal_notes | TEXT | nullable | — |
| status | TEXT | no CHECK | `'confirmed'` |
| payment_status | TEXT | no CHECK | `'not-required'` |
| payment_reference | TEXT | nullable | — |
| checked_in | INTEGER (bool) | | `0` |
| checked_in_at | TEXT | | — |
| check_in_operator | TEXT | | — |
| created_at | TEXT | | `CURRENT_TIMESTAMP` |

Constraint: **`UNIQUE(event_slug, email)`** (`index.ts:144`) — prevents duplicate registration per event/email pair; relied on by `createRegistration` (`index.ts:844-854, 902-910`). Note `email` itself has no format/CHECK validation at the DB layer — validated only in application code.

Indexes: `idx_registrations_slug` (`event_slug`, `index.ts:261`), `idx_registrations_ref` (`reference_id`, `index.ts:262`).

### 2.6 `speakers` (`index.ts:148-164`)
id, chapter_id (no FK), name/role/organization (NOT NULL), badge, category (default `'keynote'`, no CHECK), bio, expertise (JSON array text, default `'[]'`), linkedin, github, website, email, photo, created_at. No indexes beyond PK.

**Discrepancy:** `docs/DATABASE_SCHEMA.md:206` documents `category` values as `keynote, workshop, panel, lightning`, but the actual TypeScript union in `src/types/index.ts:90` is `"keynote" | "hands-on" | "mentors" | "leads"`. Neither is DB-enforced (no CHECK constraint), so the column accepts any string; the two docs disagree with each other and with the DB, which enforces nothing.

### 2.7 `sponsors` (`index.ts:167-179`)
id, chapter_id (no FK), name (NOT NULL), tier (default `'gold'`, no CHECK), description, logo, website, contact_email, contribution, status (default `'approved'`), created_at.

**Discrepancy:** `docs/DATABASE_SCHEMA.md:225` lists tier values as `title, platinum, gold, silver, community`; the actual TS union `WorkshopSponsor.tier` (`src/types/index.ts:112`) is `"title" | "gold" | "silver" | "platform" | "ecosystem" | "media"`. These two sources of truth disagree (`platinum`/`community` vs `platform`/`ecosystem`/`media`), and the DB enforces neither.

### 2.8 `agenda_sessions` (`index.ts:182-197`)
id, chapter_id (no FK), event_slug (**NOT NULL, no FK declared** — unlike `registrations.event_slug`), day (default `1`), time (NOT NULL), title (NOT NULL), description, track (default `'all'`), track_label, speaker, speaker_role, location, tags (JSON text, default `'[]'`), created_at. No indexes beyond PK.

### 2.9 `announcements` (`index.ts:200-212`)
id, chapter_id (no FK), event_slug (nullable, no FK), title/message (NOT NULL), target_audience (default `'all'`), channel (default `'email'`), status (default `'published'`), sent_count (default `0`), scheduled_at, created_at.

### 2.10 `certificates` (`index.ts:215-230`)
id, chapter_id (no FK), certificate_id (**UNIQUE NOT NULL**), event_slug (NOT NULL, no FK), event_title (NOT NULL — denormalized snapshot), recipient_name/email (NOT NULL), reference_id (NOT NULL, **not unique at DB level**), issue_date (NOT NULL), status (default `'issued'`), track, issuer_name (default `'GDG on Campus VCET'`), issuer_role (default `'Lead Organizer'`), created_at.

Indexed on `certificate_id` via `idx_certificates_id` (`index.ts:263`).

### 2.11 `resources` (`index.ts:233-246`)
id, chapter_id (no FK), event_slug (nullable, no FK), title/description/url (NOT NULL), category (default `'document'`, no CHECK), file_size, tags (JSON text, default `'[]'`), is_public (default `1`), author, created_at.

**Discrepancy:** `src/types/index.ts:309` TS union for `category` is `"slides" | "code" | "video" | "notes" | "document" | "docs" | "tools"`, which includes both `document` and `docs` as separate values — likely an unintentional duplicate/typo in the type definition rather than two distinct real categories (UNVERIFIED intent, but worth flagging as a code-quality item).

### 2.12 `audit_logs` (`index.ts:249-259`)
id, chapter_id (no FK), user_id (NOT NULL, no FK to `users`), user_email (NOT NULL — denormalized), action (NOT NULL), entity_type (NOT NULL), entity_id (NOT NULL), details (nullable, JSON text per `logAuditEvent` callers), created_at. No index on `created_at` or `user_id` despite `getAuditLogs` (`index.ts:1754-1771`) always sorting by `created_at DESC`.

`logAuditEvent` (`index.ts:1729-1752`) is actively called from essentially every admin mutation route (verified via grep: `agenda`, `announcements`, `certificates` [create + bulk-issue + status update], `events` [create/update/delete/duplicate], `registrations` [status/payment update], `resources`, `settings`, `speakers`, `sponsors`, `team`). It is read by `src/app/admin/page.tsx:18` and `src/app/admin/team/page.tsx:12`. This is a genuinely wired-up audit trail, not a placeholder.

## 3. Entity-Relationship Diagram (as actually declared in code)

```mermaid
erDiagram
    CHAPTERS ||--o{ USERS : "chapter_id (FK, declared+unenforced)"
    USERS ||--o{ SESSIONS : "user_id (FK, ON DELETE CASCADE, declared+unenforced)"
    EVENTS ||--o{ REGISTRATIONS : "event_slug (FK, ON DELETE CASCADE, declared+unenforced)"
    EVENTS ..o{ AGENDA_SESSIONS : "event_slug (no FK declared)"
    EVENTS ..o{ ANNOUNCEMENTS : "event_slug (no FK declared)"
    EVENTS ..o{ CERTIFICATES : "event_slug (no FK declared)"
    EVENTS ..o{ RESOURCES : "event_slug (no FK declared)"
    REGISTRATIONS ..o| CERTIFICATES : "reference_id (app-level join only, no FK)"
    CHAPTERS ..o{ EVENTS : "chapter_id column present, no FK"
    CHAPTERS ..o{ SPEAKERS : "chapter_id column present, no FK"
    CHAPTERS ..o{ SPONSORS : "chapter_id column present, no FK"
    CHAPTERS ..o{ RESOURCES : "chapter_id column present, no FK"
    CHAPTERS ..o{ AUDIT_LOGS : "chapter_id column present, no FK"

    CHAPTERS {
        TEXT id PK
        TEXT slug UK
    }
    USERS {
        TEXT id PK
        TEXT chapter_id FK
        TEXT email UK
        TEXT password_hash
        TEXT role
    }
    SESSIONS {
        TEXT token PK
        TEXT user_id FK
        TEXT expires_at
    }
    EVENTS {
        TEXT id PK
        TEXT slug UK
        TEXT chapter_id
    }
    REGISTRATIONS {
        TEXT id PK
        TEXT event_slug FK
        TEXT reference_id UK
        TEXT email
    }
    AGENDA_SESSIONS {
        TEXT id PK
        TEXT event_slug
    }
    CERTIFICATES {
        TEXT id PK
        TEXT certificate_id UK
        TEXT event_slug
        TEXT reference_id
    }
```

Solid lines (`||--o{`) mark FK relationships actually declared in SQL (`FOREIGN KEY ... REFERENCES`); dashed lines (`..o{`) mark relationships that exist only as a shared column name/value with **no FK constraint in the schema**. `docs/DATABASE_SCHEMA.md`'s ERD (lines 16-28) presents nearly all of these as solid `||--o{` relationships, which overstates what the schema actually enforces.

## 4. Data Ownership (which modules write which tables)

| Table | Write functions (all in `src/lib/db/index.ts`) | Called from |
|---|---|---|
| chapters | `updateChapterSettings` (1811) + seed (284-299) | `src/app/api/admin/settings/route.ts` |
| users | `createAdminUser` (1698) + seed (301-354) | `src/app/api/admin/team/route.ts` |
| sessions | not written in this file — see `src/lib/auth/index.ts` (session creation is auth-layer, not db-layer; UNVERIFIED without reading that file in full, out of this fork's scope — covered by the auth/admin audit fork) |
| events | `createEventAdmin` (1041), `updateEventAdmin` (1089), `duplicateEventAdmin` (1123), `deleteEventAdmin` (1160) + seed (357-379) | `src/app/api/admin/events/**` |
| registrations | `createRegistration` (818), `updateRegistrationStatus` (750), `updatePaymentStatus` (765), `checkInAttendee` (937), `cleanupTestRegistrations` (1903) + seed (381-430) | `src/app/api/events/[slug]/register`, `src/app/api/events/[slug]/check-in`, `src/app/api/admin/registrations/**` |
| speakers | `createSpeakerAdmin` (1193), `deleteSpeakerAdmin` (1228) | `src/app/api/admin/speakers/route.ts` |
| sponsors | `createSponsorAdmin` (1255), `deleteSponsorAdmin` (1283) | `src/app/api/admin/sponsors/route.ts` |
| agenda_sessions | `createAgendaSession` (1320), `deleteAgendaSession` (1356) | `src/app/api/admin/agenda/route.ts` |
| announcements | `createAnnouncementAdmin` (1642) + seed (520-537) | `src/app/api/admin/announcements/route.ts` |
| certificates | `issueCertificate` (1439), `bulkIssueCertificates` (1493), `updateCertificateStatus` (1524) + seed (483-518) | `src/app/api/admin/certificates/**` |
| resources | `createResourceAdmin` (1578), `deleteResourceAdmin` (1613) + seed (432-481) | `src/app/api/admin/resources/route.ts` |
| audit_logs | `logAuditEvent` (1729) | every admin mutation route (see §2.12) |

No table has update/delete access gated inside `src/lib/db/index.ts` itself — role/permission checks happen (if at all) in the calling API route layer, meaning the DB layer trusts all callers completely. This is a separation-of-concerns note, not a vulnerability by itself, but it means every route must remember to authorize before calling these functions (cross-reference with the auth/admin audit for whether that's consistently done).

## 5. Findings — Schema Inconsistencies & Data Integrity Concerns

**DB-1 (HIGH — Data Integrity). Foreign-key enforcement is declared in schema but never turned on.**
`index.ts:50-53` only executes `PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;`. SQLite disables FK enforcement by default unless `PRAGMA foreign_keys = ON;` is executed on **every connection**. No such call exists anywhere in the codebase (verified by full-file read + grep). Practical impact: `sessions.user_id ON DELETE CASCADE` and `registrations.event_slug ON DELETE CASCADE` will **not** actually cascade — e.g. `deleteEventAdmin` (`index.ts:1160-1164`) issues a bare `DELETE FROM events WHERE slug = ?` and orphans all of that event's `registrations`, `agenda_sessions`, `certificates`, `announcements`, and `resources` rows, since none of those FKs fire. `docs/DATABASE_SCHEMA.md:9` claims FK enforcement is on — that line is incorrect and should be corrected or the pragma should be added.

**DB-2 (MEDIUM — Multi-Tenancy). `chapter_id` is a convention, not a constraint, on 8 of 9 multi-tenant tables.**
Only `users` declares `FOREIGN KEY (chapter_id) REFERENCES chapters(id)` (`index.ts:83`). `events`, `speakers`, `sponsors`, `agenda_sessions`, `announcements`, `certificates`, `resources`, and `audit_logs` all carry a `chapter_id TEXT DEFAULT 'gdg-vcet'` column with no FK and no CHECK, so any string (including a non-existent chapter) can be written. Combined with DB-1, this means the "multi-tenant" architecture described in `docs/MULTI_TENANCY.md` is enforced entirely at the application-query level (`WHERE chapter_id = ?`), never at the schema level.

**DB-3 (MEDIUM — Multi-Tenancy / Authorization leak). `getAdminUsers` always includes the default chapter's users regardless of the requested tenant.**
`index.ts:1684`: `SELECT ... FROM users WHERE chapter_id = ? OR chapter_id = 'gdg-vcet'`. For any `chapterId` argument other than `'gdg-vcet'`, this still returns every `gdg-vcet` user alongside the requested chapter's users — a cross-tenant data leak in a system that's supposed to be multi-chapter. Likely a copy-paste leftover from single-tenant seeding logic rather than intentional.

**DB-4 (MEDIUM — Concurrency / Integrity). No DB-level uniqueness or transaction guards certificate issuance against races.**
`issueCertificate` (`index.ts:1439-1491`) generates `certificate_id` as `CERT-VCET-2025-${Math.floor(1000 + Math.random()*9000)}` — a random 4-digit suffix with **no collision check against the `certificate_id UNIQUE` constraint**, unlike `createRegistration`'s reference-ID loop (`index.ts:866-872`) which does retry on collision. If the random number collides with an existing `certificate_id`, the `INSERT` will throw a raw SQLite `UNIQUE constraint failed` error up through `bulkIssueCertificates` → the API route, unhandled. Also, `bulkIssueCertificates` (`index.ts:1493-1522`) checks-then-inserts per attendee in a loop with no transaction wrapping, so concurrent bulk-issue calls could both pass the "does a cert already exist for this reference_id" check before either insert completes.

**DB-5 (LOW — Data Integrity). Timestamp formats are inconsistent across the same logical column.**
Most `created_at` columns rely on SQLite's `CURRENT_TIMESTAMP` default, which produces `YYYY-MM-DD HH:MM:SS` (UTC, no `T`, no offset). But application code writes other "timestamp-shaped" fields in at least two different formats: `createRegistration` sets `createdAt = new Date().toISOString()` (`index.ts:874`, full ISO-8601 with `T`/`Z`), while `checkInAttendee` sets `checked_in_at` via `new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })` (`index.ts:959`) — a locale-formatted, non-ISO, non-lexically-sortable string (e.g. `"20/11/2026, 9:20:00 am"`). Any code or report that sorts/compares `checked_in_at` as a string (e.g. for "first N check-ins") will not sort chronologically.

**DB-6 (LOW — Performance). No index supports the most common multi-tenant filter.**
Every admin listing function filters by `chapter_id` (`getAllEventsAdmin`, `getSpeakersAdmin`, `getSponsorsAdmin`, `getAgendaSessions`, `getAnnouncementsAdmin`, `getCertificates`, `getResources`, `getAdminUsers`, `getAuditLogs`, `getPlatformAnalytics`), yet the only indexes created are `idx_registrations_slug`, `idx_registrations_ref`, `idx_certificates_id`, `idx_events_slug` (`index.ts:261-264`) — none include `chapter_id`. At current (seeded, ~130-row) scale this is invisible; it becomes a real full-table-scan cost only if the dataset or chapter count grows. Flagging as a forward-looking concern, not a current bug.

**DB-7 (LOW — Robustness). Schema migrations silently swallow all errors, not just "column already exists."**
`safeAddColumn` (`index.ts:36-42`) wraps `ALTER TABLE ... ADD COLUMN` in a bare `try { } catch { /* ignore */ }` with no error inspection. A genuine SQL error (disk full, locked DB, malformed column definition) would be silently discarded, leaving the schema in an unexpected state with no log output. UNVERIFIED whether this has caused any real incident — flagged as a latent risk from reading the code, not an observed failure.

**DB-8 (INFORMATIONAL). Enum-like columns (`category`, `visibility`, `format`, `status`, `payment_status`, `tier`) are declared as unconstrained `TEXT` with no `CHECK` constraints anywhere in the schema.** All validation of these "enums" happens in TypeScript unions in `src/types/index.ts` and whatever the calling route enforces — the database itself will accept any string. Two concrete places where the TS union and the hand-written doc already disagree with each other are noted in §2.6 (`speakers.category`) and §2.7 (`sponsors.tier`) above — a sign this gap is not just theoretical.

**DB-9 (INFORMATIONAL). `certificates.reference_id` is `NOT NULL` but not `UNIQUE`**, while `bulkIssueCertificates` (`index.ts:1507`) relies on an application-level `SELECT` check keyed on `(reference_id, event_slug)` before inserting to avoid duplicate issuance. Per DB-4, this check-then-insert pattern is not race-safe without either a DB-level `UNIQUE(reference_id, event_slug)` constraint or a transaction.

## 6. Correction to `docs/DATABASE_SCHEMA.md`

That document is largely accurate on column names/types/defaults (cross-checked table-by-table above) and should be kept as the day-to-day data dictionary, but it should be corrected on:
1. Line 9: foreign-key enforcement is **not** actually enabled (DB-1).
2. Line 206 (`speakers.category` enum) and line 225 (`sponsors.tier` enum): align with the actual TS unions in `src/types/index.ts:90` and `:112`, or note that neither is DB-enforced.
3. The ERD (lines 16-28) draws `CHAPTERS ||--o{ EVENTS`, `CHAPTERS ||--o{ SPEAKERS`, `CHAPTERS ||--o{ SPONSORS`, `CHAPTERS ||--o{ RESOURCES`, `EVENTS ||--o{ AGENDA_SESSIONS`, `EVENTS ||--o{ ANNOUNCEMENTS`, `EVENTS ||--o{ CERTIFICATES` as enforced (solid-line) relationships; per the actual `CREATE TABLE` statements, none of these have a `FOREIGN KEY` clause — see §3 above for the corrected diagram.

## 7. Items Not Verifiable From This File Alone

- Exact session-creation code path (`sessions` table has no writer in `db/index.ts`) — belongs to `src/lib/auth/index.ts`, out of scope for this file; see the authentication/authorization audit document.
- Whether `data/gdg.db` in a deployed (non-local) environment is persisted across restarts/deploys (e.g. on a serverless platform, the SQLite file would not survive a cold start) — this is a deployment concern, see the DevOps audit document.
