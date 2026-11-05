# 04 — Backend Audit

Scope: `src/app/api/**/route.ts` (Next.js 16 App Router route handlers) and the server-side data-access layer in `src/lib/db/index.ts`, `src/lib/events.ts`, `src/lib/auth/*`. There is no separate "controller/service" tier — route handlers call `src/lib/db` functions directly, which embed both query logic and most business rules.

## 1. Module Map

| Module | File | Responsibility |
|---|---|---|
| Data access layer | `src/lib/db/index.ts` (1914 lines) | Schema creation/migration, seed data, every CRUD operation for every entity. One `DatabaseSync` singleton (`_db`, line 34). |
| Auth primitives | `src/lib/auth/index.ts` | Password hashing (`hashPassword`/`verifyPassword`, scrypt), session create/validate/destroy. Re-exports `src/lib/auth/roles.ts`. |
| RBAC matrix | `src/lib/auth/roles.ts` | Static `ROLE_PERMISSIONS` map + `hasPermission()`. Pure data/function, importable client-side too (no server-only guard). |
| Event date/filter logic | `src/lib/events.ts` | Pure functions: `isUpcoming`, `sortByStart`, `filterEvents`, `formatEventDateRange`. Unit tested (`events.test.ts`). Operates on the **static** `src/content/events.ts` dataset, NOT the SQLite `events` table — these are two independent event sources (see finding B1 below). |
| SQLite typings | `src/types/sqlite.d.ts` | Hand-written `declare module "node:sqlite"` — the app uses Node's **built-in experimental `node:sqlite`** (`DatabaseSync`), not `better-sqlite3` or any ORM. No `package.json` dependency for this — confirms it's a Node core module (Node 22+/23+ `--experimental-sqlite`, or stable in later Node 24). |
| API routes (public) | `src/app/api/events/[slug]/{register,check-in,stats}/route.ts`, `src/app/api/certificates/verify/[id]/route.ts` | Registration, check-in, stats, certificate verification against the SQLite DB. |
| API routes (auth) | `src/app/api/auth/{login,logout,me}/route.ts` | Session lifecycle. |
| API routes (admin) | `src/app/api/admin/**/route.ts` (14 route files) | CRUD for events, registrations, speakers, sponsors, agenda, certificates, resources, announcements, team, settings, analytics. |

## 2. Request Handling Pattern

Every route handler (all 23 route files read) follows the same shape:
```ts
export async function METHOD(request: Request, { params }?) {
  try {
    const body = await request.json(); // or searchParams for GET
    const result = someDbFunction(body);
    return NextResponse.json({ success: true, ... }, { status: X });
  } catch (error) {
    return NextResponse.json({ error: "...", message: String(error) }, { status: 500 });
  }
}
```
- **Error handling**: uniform try/catch → `500` with `String(error)` interpolated into the JSON body on every single route (e.g. `src/app/api/auth/login/route.ts:61-66`, `src/app/api/admin/events/route.ts:32-34`, all 14 admin routes). This leaks raw exception text (including stack-adjacent messages from SQLite, e.g. constraint violation text) to the client — see security audit finding.
- **Status codes used**: 200 (default), 201 (create success — e.g. `admin/events/route.ts:31`, `admin/speakers/route.ts:27`), 400 (validation failure), 401 (`auth/me/route.ts:11,16`, `auth/login/route.ts:24,33`), 403 (`events/[slug]/register/route.ts:18-19` capacity/closed), 404 (`certificates/verify/[id]/route.ts:20`, `events/[slug]/check-in/route.ts:30`), 409 (duplicate email `events/[slug]/register/route.ts:17`, already-checked-in `events/[slug]/check-in/route.ts:29`), 500.
- **Input validation**: no schema library (no zod/yup/joi in `package.json`). Validation is manual and inconsistent:
  - `createRegistration` (`src/lib/db/index.ts:824-839`) checks required string fields with `?.trim()` and a `agreedToCoc` boolean.
  - Most admin POST/PUT routes (events, speakers, sponsors, agenda, resources, announcements, team) perform **no validation** at all — `await request.json()` is passed straight into the DB function, which applies `|| "default"` fallbacks rather than rejecting malformed input (e.g. `createEventAdmin`, `src/lib/db/index.ts:1041-1087`; `createSpeakerAdmin`, `:1193-1226`).
  - `admin/certificates/[id]/route.ts:14-16` is one of the few routes with an explicit allow-list check (`status !== "issued" && status !== "revoked"`).

## 3. Business Logic Embedded in the Data Layer

Nearly all business rules live in `src/lib/db/index.ts`, not in the route handlers:
- **Registration**: duplicate-email check (case-insensitive, :844-846), capacity/closed-state check via `getEventStats` (:856-864), sequential reference-ID generation with collision retry loop (`GDG-VCET-2025-XXXX`, :866-872), and a redundant DB-level `UNIQUE(event_slug, email)` constraint whose violation is caught and translated back into the same `DUPLICATE_EMAIL` error (:902-910) — i.e. duplicate protection is enforced twice (app-level pre-check + DB constraint fallback), which is reasonable defensive coding but means the error message text differs depending on which path triggered it (compare :852 vs :907).
- **Check-in**: `checkInAttendee` (:937-973) looks up by `reference_id`, rejects unknown refs (404-equivalent) and already-checked-in refs (409-equivalent) with human-readable messages embedded directly in the response payload (the API route forwards `result.message` verbatim as a UI-facing string, e.g. `events/[slug]/check-in/route.ts:35`).
- **Certificate bulk issue**: `bulkIssueCertificates` (:1493-1522) filters `status='confirmed'` (+ optionally `checked_in=1`) registrations and skips attendees who already have a certificate for that event (idempotent re-run safe).
- **Audit logging**: every admin mutation route calls `logAuditEvent()` (`src/lib/db/index.ts:1729-1752`) with a **hardcoded actor** `userId: "usr-admin"`, `userEmail: "lead@vcet.edu.in"` — see Finding B2. The actual authenticated admin's identity (available via the `gdg_session` cookie, were it checked) is never read or recorded.

## 4. Representative Request Lifecycles

### 4a. Public write: `POST /api/events/[slug]/register`
`src/app/api/events/[slug]/register/route.ts:5-47`
1. Client posts `RegistrationInput` JSON to the dynamic route.
2. Handler awaits `params` (Next 15/16 async dynamic APIs), parses body, no auth.
3. Calls `createRegistration(slug, body)` → `src/lib/db/index.ts:818`.
4. DB layer validates required fields + `agreedToCoc` → may short-circuit `INVALID_INPUT`.
5. Normalizes email, checks duplicate via `SELECT ... WHERE event_slug = ? AND LOWER(email) = ?` (:844-846).
6. Checks capacity/open status via `getEventStats` (a second, independent query pass over `registrations` — not reused from any cache).
7. Generates `referenceId`, inserts row, returns `RegistrationRecord`.
8. Route maps the discriminated-union error to an HTTP status via a literal object map (:16-21) and responds 201 on success.

### 4b. Admin mutation: `POST /api/admin/events`
`src/app/api/admin/events/route.ts:13-35`
1. **No cookie/session read, no role check** — any caller (including unauthenticated ones) can reach this handler.
2. Body passed directly to `createEventAdmin` (`src/lib/db/index.ts:1041`), which derives a slug from the title if absent and checks only for slug collision.
3. On success, calls `logAuditEvent` with the hardcoded `usr-admin` actor (not the real caller — because there is no real authenticated caller context available at all).
4. Returns 201 with the new event.

## 5. Findings (backend-specific; cross-reference 10-security-audit.md for severity)

- **B1 — Two disconnected "events" systems.** `src/lib/events.ts` + `src/content/events.ts` (static TS data, used by `isUpcoming`/`filterEvents`/public marketing pages per `src/app/events/page.tsx` — UNVERIFIED which pages consume which source, not read in this pass) vs. the SQLite `events` table driven by `src/lib/db/index.ts` (used by all `/api/admin/events*` and `/api/events/[slug]/*` routes and the admin UI). These are not reconciled; an event created via the admin panel does not appear in `src/content/events.ts` and vice versa. Needs verification by the frontend-audit fork against `src/app/events/page.tsx` and `src/app/events/[slug]/page.tsx`.
- **B2 — No real actor identity in mutations or audit logs.** Every `logAuditEvent` call across all 14 admin routes hardcodes `userId: "usr-admin"` / `userEmail: "lead@vcet.edu.in"` (grep-confirmed identical string across `admin/agenda`, `admin/announcements`, `admin/certificates` ×3, `admin/events` ×3, `admin/registrations/[id]`, `admin/resources` ×2, `admin/speakers` ×2, `admin/sponsors` ×2, `admin/team`, `admin/settings`). The audit trail is therefore non-attributable — it cannot answer "who did this" even though an `AdminUser`/session system exists and could supply this.
- **B3 — Uniform 500 error bodies leak `String(error)`** to the client on every route (23/23 files). Potential information disclosure (see security audit).
- **B4 — No pagination** anywhere: `getAllRegistrationsAdmin`, `getCertificates`, `getResources`, etc. always `SELECT *` with no `LIMIT`/offset (only `getAuditLogs` has a `limit` param, default 20, `src/lib/db/index.ts:1754`). At current seed scale (124 registrations) this is invisible; flagged as a scalability item in 14-engineering-roadmap.md.
- **B5 — `getDatabase()` auto-seeds non-trivial fake production data** (124 synthetic student registrations, sample certificates, resources, announcements) as a side effect of the *first call that opens the DB connection* (`src/lib/db/index.ts:44-537`), which happens on any server-side import chain reaching `getDatabase`. This conflicts with CLAUDE.md's "Content rule" (no invented data) for anything that surfaces this seed data as if real — the admin dashboards and public stats endpoints do display these seeded numbers. UNVERIFIED whether this is intentional demo-seed behavior for a specific environment or leftover from development; flag for the user.

## 6. Testing Coverage (backend)
- `src/lib/admin-fullstack.test.ts`, `src/lib/db/index.test.ts`, `src/lib/e2e-verification.test.ts`, `src/lib/events.test.ts` exist (not read in depth by this fork — see 12-code-quality-testing.md and 13-feature-completeness-matrix.md owned by other forks for coverage assessment).

All claims above are grounded in the full text of the 23 route files and `src/lib/db/index.ts`/`src/lib/auth/*` read in this pass; no endpoint or behavior was inferred without reading the source.
