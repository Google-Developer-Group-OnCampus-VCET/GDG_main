# Security Audit

Defensive, static, read-only review. No exploitation was performed. Severity scale: CRITICAL / HIGH / MEDIUM / LOW / INFORMATIONAL. No secret values are reproduced below — only variable names.

## SEC-01 — CRITICAL: No authentication/authorization on any admin API route

**Affected files:** every file under `src/app/api/admin/**/route.ts` (confirmed for `events/route.ts`, `events/[slug]/route.ts`, `events/[slug]/duplicate/route.ts`, `analytics/route.ts`, `registrations/route.ts`, `registrations/[id]/route.ts`, `certificates/route.ts`, `certificates/[id]/route.ts`, `certificates/bulk-issue/route.ts`, `agenda/route.ts`, `announcements/route.ts`, `resources/route.ts`, `settings/route.ts`, `speakers/route.ts`, `sponsors/route.ts`, `team/route.ts`).

**Evidence:** `grep -r "validateSession|gdg_session|cookies()" src/app/api/admin` returns **zero matches**. There is no `src/middleware.ts` (confirmed via glob — file does not exist). `src/app/api/admin/events/route.ts:4-11` reads the request body and calls `getAllEventsAdmin()` / `createEventAdmin()` directly with no cookie read, no role check, no caller identity resolution at all. The "protection" that exists is purely a client-side React redirect inside `src/components/admin/admin-layout-shell.tsx` (a `"use client"` component), which only affects rendering of the admin UI shell in a browser — it does not and cannot gate direct HTTP requests to the API routes.

**Impact:** Any unauthenticated actor who can reach the deployed server can create/update/delete events, issue or revoke certificates, read/export all registrant PII (name, email, phone, college, department), modify chapter settings, create admin team members, and post announcements — all without a session cookie or credential of any kind. This is a full authorization bypass of the entire admin surface, not a privilege-escalation edge case.

**Remediation:** Add `src/middleware.ts` matching `/admin/*` and `/api/admin/*` that calls `validateSession(cookies().get("gdg_session")?.value)` and returns 401/redirect on failure; additionally enforce `hasPermission(session.user.role, ...)` per route for RBAC (the primitive already exists in `src/lib/auth/roles.ts` and is unit-tested in `src/lib/admin-fullstack.test.ts:52-66`, but is never called from any route handler — confirmed by the same grep).

---

## SEC-02 — HIGH: Public check-in and registration endpoints have no abuse controls

**Affected files:** `src/app/api/events/[slug]/check-in/route.ts`, `src/app/api/events/[slug]/register/route.ts`.

**Evidence:** `checkInAttendee()` is reachable by `POST /api/events/[slug]/check-in` with no auth (intentional for a public-facing scanner terminal per design, but the route itself should be gated to an authenticated volunteer session — currently it is not, compounding SEC-01). No rate limiting exists anywhere in the codebase (`grep -ri "rate.?limit"` across `src/` returns zero matches).

**Impact:** An attacker who enumerates or guesses reference IDs (format `GDG-VCET-2025-NNNN`, a small sequential numeric space — confirmed at `src/lib/db/index.ts:868`) can mark arbitrary attendees as checked-in, corrupting attendance data used for analytics and certificate eligibility (`bulkIssueCertificates` gates on `checked_in`, `src/lib/db/index.ts:1499`). The registration endpoint can also be scripted to fill event capacity (denial of service against legitimate registrants) since there is no CAPTCHA/rate limit.

**Remediation:** Require the check-in route to run behind the same session middleware as SEC-01; add per-IP rate limiting (e.g. a simple in-memory or SQLite-backed token bucket, since no external cache is configured) to the public registration endpoint.

---

## SEC-03 — HIGH: Hardcoded, reused default password for every seeded and newly-created admin account

**Affected files:** `src/lib/db/index.ts:304` (`hashPassword("gdgvcet2025!")` for all four seeded users: chapter-admin, super-admin, event-manager, check-in-volunteer), `src/lib/db/index.ts:1708` (`createAdminUser()` assigns the **same literal string** `"gdgvcet2025!"` as the default password hash for every team member added through the admin UI).

**Evidence:** The literal password string is committed in source control (`src/lib/db/index.ts`), used across all seed accounts including `superadmin@gdg.community`, and is never forced to be rotated (no `must_change_password` flag in the `users` table schema at `src/lib/db/index.ts:73-84`).

**Impact:** Anyone with read access to this repository (public GitHub, forks, CI logs) knows the login credential for every admin account unless rotated out-of-band. Combined with SEC-01 this is largely moot for the API itself, but the credential also grants UI-level session creation via `/api/auth/login`, and new team members created via `createAdminUser` silently inherit this same password with no forced-reset flow.

**Remediation:** Generate a random per-user initial password (or an invite-token/magic-link flow) instead of a shared literal; never commit real/plausible default credentials to source.

---

## SEC-04 — MEDIUM: `SESSION_SECRET` and `CHECKIN_TERMINAL_SECRET` are declared but unused

**Affected files:** `.env.example:11-13, 31`; `src/lib/auth/index.ts` (entire file).

**Evidence:** `.env.example` documents `SESSION_SECRET` ("Generate a secure 32+ character random secret in production") and `CHECKIN_TERMINAL_SECRET`, but `src/lib/auth/index.ts` never reads `process.env.SESSION_SECRET` anywhere — session tokens are generated purely from `crypto.randomBytes(32)` (`createSessionToken`, line 23-25), which is cryptographically sound on its own but means the documented env var does nothing. `grep` for `CHECKIN_TERMINAL_SECRET` and `SESSION_SECRET` usage outside `.env.example` found no references in `src/`.

**Impact:** Not a direct vulnerability (the token generation itself is fine — 256 bits of CSPRNG entropy), but it is misleading documentation: an operator who rotates `SESSION_SECRET` believing it invalidates sessions or signs tokens is not actually changing any security property. `CHECKIN_TERMINAL_SECRET` implies a check-in authentication mechanism that does not exist (reinforcing SEC-02).

**Remediation:** Either wire these variables into real enforcement (e.g. HMAC-sign session tokens with `SESSION_SECRET`, require `CHECKIN_TERMINAL_SECRET` as a header on the check-in route) or remove them from `.env.example` to avoid false assurance.

---

## SEC-05 — MEDIUM: No CSRF protection on state-changing routes

**Affected files:** all `POST`/`PATCH`/`DELETE` handlers under `src/app/api/admin/**` and `src/app/api/events/[slug]/{register,check-in}`.

**Evidence:** `response.cookies.set("gdg_session", ..., { sameSite: "lax", ... })` (`src/app/api/auth/login/route.ts:52-58`) relies solely on `SameSite=Lax` as CSRF mitigation. `Lax` blocks cross-site simple-form `GET` navigation-triggered cookie attachment but does **not** block cross-site `fetch`/XHR `POST` from a page the victim's browser has open if the attacker's JS targets a same-site-lax-exempt top-level navigation, and in particular does not protect `GET`-triggered side effects. No anti-CSRF token (double-submit cookie, synchronizer token) was found anywhere in `src/`.

**Impact:** Lower severity given SEC-01 already means these routes require no cookie at all today — but once SEC-01 is fixed and routes start trusting the session cookie, `SameSite=Lax` alone is a thinner-than-ideal CSRF defense for a state-changing admin panel.

**Remediation:** When implementing SEC-01's session checks, also add a synchronizer CSRF token (or rely on `SameSite=Strict` for admin-only cookies, with a separate relaxed cookie only where cross-site linking is needed).

---

## SEC-06 — LOW: No CORS configuration — default same-origin only (informational positive, with a caveat)

**Affected files:** `next.config.ts` (no `headers()` block, no CORS `Access-Control-Allow-Origin` anywhere in `src/app/api/**`).

**Evidence:** `next.config.ts:1-33` contains no `headers()` function. Next.js Route Handlers default to no CORS headers, i.e. effectively same-origin-only for browser `fetch` from other origins.

**Impact:** None currently — this is the safer default. Flagged as informational so that if CORS headers are added later (e.g. for a future mobile app or partner integration) they are added deliberately and scoped, not with a wildcard `*`.

---

## SEC-07 — MEDIUM: Raw error objects/messages returned to clients on 500 paths

**Affected files:** `src/app/api/auth/login/route.ts:62-65`, `src/app/api/auth/logout/route.ts:17-21`, `src/app/api/auth/me/route.ts:23-27`, `src/app/api/certificates/verify/[id]/route.ts:38-42`, `src/app/api/admin/events/route.ts:9, 33`, and the same `String(error)` pattern appears repeated across admin routes.

**Evidence:** Each of these catch blocks returns `{ error: "...", message: String(error) }` directly in the HTTP response body. `String(error)` on a thrown `Error` typically yields `"Error: <message>"` — for a SQLite constraint violation or a Node internal error this can surface internal implementation detail (e.g. table/column names, file path fragments) to any caller, authenticated or not (worse given SEC-01).

**Impact:** Information disclosure aiding reconnaissance (schema/column names, library internals); low direct exploitability but a standard OWASP finding (A09/A05-adjacent: security misconfiguration / improper error handling).

**Remediation:** Log the full error server-side (`console.error`, already done in some routes e.g. `register/route.ts:41`) and return a generic client-facing message; never interpolate `String(error)` into the JSON response.

---

## SEC-08 — MEDIUM: Audit log records a hardcoded, falsified actor identity

**Affected files:** `src/app/api/admin/events/route.ts:22-29`.

**Evidence:** `logAuditEvent({ userId: "usr-admin", userEmail: "lead@vcet.edu.in", action: "create_event", ... })` — these values are literal constants in the route handler, not derived from any session lookup (there is none, per SEC-01).

**Impact:** The `audit_logs` table (`src/lib/db/index.ts:249-259`, intended per `docs/ROLE_PERMISSIONS.md`/schema comments to support accountability) cannot be trusted to attribute actions to the real actor. Every event created through this route — by anyone — is recorded as having been done by `lead@vcet.edu.in`. This undermines any future incident-response or compliance use of the audit trail.

**Remediation:** Resolve the acting user from `validateSession()` (once SEC-01 is fixed) and pass the real `user.id`/`user.email` into every `logAuditEvent()` call; audit this pattern across all admin routes, not just `events/route.ts` (not individually re-verified in every file by this fork — flagged as likely-repeated, **UNVERIFIED** beyond the cited file).

---

## SEC-09 — LOW: SQL injection risk — not found; parameterization is consistently correct

**Affected files:** `src/lib/db/index.ts` (entire module, ~40 query sites reviewed).

**Evidence:** Every `db.prepare(...)` call in `src/lib/db/index.ts` uses `?` placeholders with values passed via `.get(...)`/`.run(...)`/`.all(...)` argument lists (e.g. `getRegistrations`, line 622-654; `createRegistration`, line 818-935; dynamic filter builders like `getAllRegistrationsAdmin`, line 682-722, concatenate only **static SQL fragments and `?` placeholders** into the query string, never raw user input). No instance of string-interpolating a request value directly into a SQL string was found. The one `db.exec()` call with interpolation (`safeAddColumn`, line 36-42) interpolates `tableName`/`columnName`/`colDef`, but these are **hardcoded literals passed only from the fixed migration calls at line 268-280**, never from request input.

**Impact:** None identified. Listed as informational/LOW-confirmed-safe specifically because SQL injection is the single most important thing to rule out in a hand-rolled SQL layer with no ORM, and it was verified clean.

---

## SEC-10 — INFORMATIONAL: No file upload functionality exists

**Evidence:** `.env.example:21-24` documents optional `CLOUDINARY_*` variables for "Banner & Proof Uploads," but no code in `src/app/api/**` or `src/components/**` implements a file-upload handler, and `CLOUDINARY_CLOUD_NAME`/`CLOUDINARY_API_KEY`/`CLOUDINARY_API_SECRET` are not referenced anywhere in `src/` (grep found no usages). This is forward-looking configuration for a feature that does not exist yet — not a current risk, but also means any claim of "image upload" capability in other docs should be treated as aspirational/UNVERIFIED, not implemented.

---

## SEC-11 — INFORMATIONAL: Dependency audit

`npm audit --json` was run (read-only). All reported findings are `moderate` severity and confined to **devDependencies** transitively pulled in by `@typescript-eslint/*` (via `eslint-config-next`) — i.e. lint tooling, not runtime/production code. No vulnerabilities were reported against `next`, `react`, or `react-dom`, the only three production dependencies (`package.json`). A fix is available by upgrading `eslint-config-next`, which is a `devDependency`-only, non-production-risk change.

---

## Summary

| ID | Severity | Area |
|---|---|---|
| SEC-01 | CRITICAL | No auth on admin API — full access-control bypass |
| SEC-02 | HIGH | No rate limiting / abuse control on public check-in & registration |
| SEC-03 | HIGH | Hardcoded shared default password for all admin accounts |
| SEC-04 | MEDIUM | Unused `SESSION_SECRET`/`CHECKIN_TERMINAL_SECRET` — misleading config |
| SEC-05 | MEDIUM | No CSRF token; relies solely on `SameSite=Lax` |
| SEC-06 | LOW (informational) | CORS: default-safe, no action needed today |
| SEC-07 | MEDIUM | Raw error/exception messages returned to API clients |
| SEC-08 | MEDIUM | Audit log actor identity is hardcoded/falsified |
| SEC-09 | LOW (confirmed-safe) | SQL injection — not present; parameterization verified clean |
| SEC-10 | INFORMATIONAL | No file upload code exists yet (env vars are unused placeholders) |
| SEC-11 | INFORMATIONAL | npm audit: moderate findings limited to devDependencies/lint tooling |

**Single highest-priority fix:** SEC-01. It subsumes or amplifies SEC-02, SEC-05, and SEC-08 — implementing session-based middleware for `/admin` and `/api/admin/*` (plus the two public-but-sensitive event routes) is the one change with the largest security impact on this codebase.
