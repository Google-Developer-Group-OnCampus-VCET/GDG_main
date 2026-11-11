# Security Remediation Report

Maps every finding in `docs/repository-audit/10-security-audit.md` (and the overlapping
findings independently surfaced by the other six audit files) to what happened to it in this
implementation pass.

| Finding | Severity (as audited) | Status | Note |
|---|---|---|---|
| No auth enforcement on any `/admin/**` page or `/api/admin/**` route | CRITICAL | **Fixed** | `src/proxy.ts` (coarse) + `requirePermission()` per route (fine-grained). Verified via `curl` — see `API_SECURITY_MATRIX.md`. |
| Shared default admin password, pre-filled in login form | CRITICAL/HIGH | **Fixed** | Password auth replaced by Firebase; `admin-login-form.tsx`'s preset-account quick-switcher deleted; new accounts get a Firebase password-reset invite, never a shared password. |
| `logAuditEvent` hardcodes actor as `usr-admin`/`lead@vcet.edu.in` on every mutation | HIGH | **Fixed** | Every route now passes the real `requirePermission()`-resolved `user.id`/`user.email`. |
| SQL injection | — | **No change needed** | Independently re-verified: all ~85 query sites use parameterized `?` placeholders. No raw string concatenation into SQL found anywhere. |
| FK enforcement pragma never set | HIGH | **Fixed** | `PRAGMA foreign_keys = ON;` added. |
| Cross-tenant leak in `getAdminUsers` | MEDIUM | **Fixed** | Query no longer unconditionally also matches `chapter_id = 'gdg-vcet'`. |
| Certificate ID collision risk | MEDIUM | **Fixed** | Retry-with-uniqueness-check loop added, matching the pattern `createRegistration` already used. |
| Raw `message: String(error)` leaked to clients | MEDIUM | **Fixed** | Replaced with server-side `console.error` + generic client message across every route that had it. |
| `.env.example` documents unused variables (`SESSION_SECRET`, `CHECKIN_TERMINAL_SECRET`, `CLOUDINARY_*`) | MEDIUM | **Fixed** | Removed the dead ones; the Firebase section documents variables that are actually read (`src/lib/firebase/config.ts`). |
| No CSRF protection on cookie-authenticated mutations | MEDIUM | **Partially addressed** | `SameSite=Lax` blocks the most common cross-site `POST` vector. A dedicated CSRF token was not implemented in this pass — see "Remaining" below. |
| No rate limiting on public endpoints | MEDIUM | **Fixed** (register, certificate verify) | See `API_SECURITY_MATRIX.md` for the exact limits; in-memory/per-process, not distributed. |
| Check-in endpoint unauthenticated | HIGH | **Fixed** | Now requires `manage_attendance` via the same `requirePermission()` pattern. |
| Announcements claim "published"/delivered with no email provider configured | LOW/INFORMATIONAL | **Fixed** | `createAnnouncementAdmin` now returns `status: "draft"`, `sentCount: 0` unless `RESEND_API_KEY` is actually set. |
| Missing update operations for speakers/sponsors/agenda/resources | — (completeness, not security) | **Fixed** | Added in `src/lib/db/index.ts` + wired `PATCH` handlers. |
| Two disconnected admin surfaces (`/admin/**` vs. `/admin/console/**`) | — (architecture) | **Fixed by deletion** | `/admin/console/**` and its passcode auth system were dead/duplicate — deleted rather than gated, since fixing a surface nobody should be using doubles the attack surface for no benefit. |
| Dual event data sources (static content vs. SQLite) causing admin-created events to be invisible publicly | — (architecture) | **Partially fixed** | Public `/events` and `/events/[slug]` now merge both sources (`mergeEventSources`); the rich "workshop" marketing template (pillars/FAQ/personas) still only exists for statically-authored events — an admin-created event gets the plain fallback detail layout, not the rich one. See `docs/repository-audit/03-frontend-audit.md` for the original finding. |

## Remaining (not fixed in this pass — be explicit, don't let this rot into an assumed "done")

- **No dedicated CSRF token.** `SameSite=Lax` is a real mitigation but not equivalent to one.
  If you need stronger guarantees (e.g. a `GET`-based CSRF-exploitable action existed —
  audited and none currently is, since all mutations are `POST`/`PUT`/`PATCH`/`DELETE`), add a
  double-submit token to the session-creation response and require it as a header on mutating
  requests.
- **No distributed rate limiting.** Fine for a single instance; move to Redis/Upstash before
  multi-instance production traffic.
- **No versioned DB migrations** — see `DATABASE_MIGRATIONS.md`.
- **SQLite-on-Vercel is unresolved** — see `DATABASE_HOSTING_DECISION.md`. This is the single
  highest-severity open item in the whole report; everything above this line is moot if the
  database itself doesn't persist in production.
- **Firebase emulator-backed integration tests were written but not executed** (no Java 21+ in
  this environment) — see `TESTING_AND_QA.md`.
- **4 of 5 upload fields** (speaker photo, sponsor logo, chapter logo, resource attachment)
  were not wired to the new Storage upload flow — see `STORAGE_ARCHITECTURE.md`.
