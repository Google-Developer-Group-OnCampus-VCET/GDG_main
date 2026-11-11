# Database Migrations

## What changed in this pass

`src/lib/db/index.ts`'s `getDatabase()` still uses `CREATE TABLE IF NOT EXISTS` +
`safeAddColumn()` (try/catch `ALTER TABLE ADD COLUMN`) as its migration mechanism — this was
**not** replaced with a versioned migration system (e.g. a `schema_migrations` tracking table)
in this pass; that remains a real gap, called out below rather than silently left undocumented.

Concrete fixes made:

1. **`PRAGMA foreign_keys = ON;`** added immediately after connection open. SQLite does not
   persist this pragma in the file — every declared `FOREIGN KEY ... ON DELETE CASCADE` in the
   schema (`sessions.user_id`, `registrations.event_slug`) was previously decorative. Now
   enforced on every connection.
2. **`users.firebase_uid`** column + a partial unique index
   (`CREATE UNIQUE INDEX ... WHERE firebase_uid IS NOT NULL`) added via `safeAddColumn` — safe
   on an existing database, existing rows get `NULL` until bootstrapped/invited.
3. **Cross-tenant leak fixed**: `getAdminUsers()` previously ran
   `WHERE chapter_id = ? OR chapter_id = 'gdg-vcet'` — meaning *any* chapter's call always also
   returned every `gdg-vcet` user regardless of the argument. Now `WHERE chapter_id = ?` only.
4. **Certificate ID collision risk fixed**: `issueCertificate()` previously generated a random
   4-digit suffix with no uniqueness check (1-in-9000 collision chance in a loop with no
   retry). Now retries up to 20 times against a `SELECT` existence check, falling back to a
   UUID-derived suffix if all 20 collide.
5. **Demo/seed data gated**: the hardcoded admin users (shared `gdgvcet2025!` password), the
   124 synthetic "Student Developer #N" registrations, sample resources, sample certificates,
   and the sample announcement are now all gated behind `process.env.NODE_ENV !== "production"`
   — they previously ran unconditionally on every cold start, including in a hypothetical
   production deployment. The chapter tenant row and the real `devcraft-2025` event seed are
   **not** gated (they're real chapter/event data, not demo filler).
6. **Missing CRUD completed**: added `updateSpeakerAdmin`, `updateSponsorAdmin`,
   `updateAgendaSession`, `updateResourceAdmin`, `deleteAnnouncementAdmin` — previously these
   four entities only had create/list/delete, no update, and announcements had no delete.

## Known remaining gaps (not fixed in this pass)

- **No versioned migration tracking.** If you need to ship a schema change that isn't a new
  nullable column, you're on your own today — there's no `schema_migrations` table, no
  rollback story, no transaction wrapping the whole `_db.exec(...)` block.
- **No backup-before-migrate step.** `safeAddColumn` swallows all errors silently (by design,
  to make `ALTER TABLE ADD COLUMN` idempotent on repeat boots) — this also means a *genuine*
  schema error on that statement is invisible rather than surfaced.
- **`registrations.event_slug` FK targets `events.slug`, not `events.id`.** This works (slug
  is `UNIQUE NOT NULL`) but is an unusual FK target; renaming an event's slug would orphan its
  registrations silently. Not changed in this pass since event slugs are not currently
  editable through the admin UI (`updateEventAdmin` never touches `slug`).
- See `docs/repository-audit/07-database-audit.md` for the full original schema audit —
  several LOW/INFORMATIONAL findings there (missing indexes on `sponsors.chapter_id`,
  `speakers.chapter_id`, etc.) were not addressed in this pass; this file documents only what
  changed, the original audit remains the historical record of what was found.

## Schema-hosting decision

See `DATABASE_HOSTING_DECISION.md` — **this is the most important open item**, not the
migration-tooling gap above.
