# Business Logic & Workflows

> Verified by reading: `src/lib/events.ts`, `src/lib/events.test.ts`, `src/lib/e2e-verification.test.ts`, `src/lib/admin-fullstack.test.ts`, `src/lib/db/index.ts`, API routes under `src/app/api/`. Tests act as executable specifications — they were read as evidence of intended behavior, not just UI inspection.

## Pure domain logic (`src/lib/events.ts`)

Per `CLAUDE.md`, this module is deliberately pure date/filter logic, unit-tested with an injected `now` (`src/lib/events.test.ts:14`). Verified behaviors:
- `isUpcoming()` (`src/lib/events.ts:9-12`): cancelled events are never upcoming regardless of date; uses `endsAt` over `startsAt` when present; boundary is inclusive (ends exactly `now` → still upcoming).
- `filterEvents()` (`src/lib/events.ts:82-102`): case-insensitive substring match across `title`/`summary`/`location`; topic/format filters are exact-match or `"all"`.
- `formatEventDateRange()` (`src/lib/events.ts:47-68`): date-only strings (no `"T"`) never acquire a time suffix; fixed render in `Asia/Kolkata`, so a UTC-midnight date-only string never shifts to the previous IST day (explicit regression test, `src/lib/events.test.ts:151-156`).
- **Status: FULLY IMPLEMENTED.** 19/19 assertions in `events.test.ts` map directly to shipped functions; no gaps found.

---

## Workflow 1 — Public event registration

**Chain:** `src/app/events/[slug]/register/page.tsx` → `src/components/workshop/event-registration-view.tsx` (client form) → `POST /api/events/[slug]/register` (`src/app/api/events/[slug]/register/route.ts:5-47`) → `createRegistration()` (`src/lib/db/index.ts:818-935`) → SQLite `registrations` table → JSON response → form success/error UI.

**Business rules enforced in `createRegistration` (`src/lib/db/index.ts`):**
- Required-field validation: all of `fullName`, `email`, `phone`, `college`, `department`, `yearOfStudy`, `track`, `experienceLevel` must be non-empty after `.trim()` (line 824-835).
- Code-of-conduct consent gate: `agreedToCoc` must be `true` (line 837-839).
- Duplicate prevention: case-insensitive email uniqueness per event, checked explicitly (line 844-854) **and** backed by a DB-level `UNIQUE(event_slug, email)` constraint (`src/lib/db/index.ts:144`) with a caught-exception fallback (line 902-911) — defense in depth, correctly implemented.
- Capacity/registration-window enforcement via `getEventStats()` (line 856-864): rejects with `REGISTRATION_CLOSED` if `is_registration_open` is false, or `CAPACITY_FULL` if `remaining <= 0`.
- Reference ID generation: `GDG-VCET-2025-NNNN` sequential with a collision-avoidance loop (line 866-872) — not cryptographically unique, but collision-checked against the live table before insert.
- API route maps domain errors to HTTP status codes correctly: `DUPLICATE_EMAIL`→409, `CAPACITY_FULL`/`REGISTRATION_CLOSED`→403, `INVALID_INPUT`→400 (`src/app/api/events/[slug]/register/route.ts:16-21`).

**Test coverage:** `src/lib/e2e-verification.test.ts:58-160` exercises valid registration, missing fields, missing CoC consent, and duplicate-email rejection end-to-end against the real SQLite file (not mocked).

**Status: FULLY IMPLEMENTED**, with real server-side validation (not just client-side UI). No CSRF token, auth, or rate limiting on this public endpoint — see `10-security-audit.md` findings SEC-03/SEC-05.

---

## Workflow 2 — Attendance check-in

**Chain:** `src/app/admin/events/[slug]/check-in/page.tsx` → `src/components/admin/check-in-terminal.tsx` (client scanner/manual-entry UI) → `POST /api/events/[slug]/check-in` (`src/app/api/events/[slug]/check-in/route.ts:4-45`) → `checkInAttendee()` (`src/lib/db/index.ts:937-973`) → UI confirmation.

**Business rules verified:**
- Reference ID is trimmed and upper-cased before lookup (`checkInAttendee`, line 944) — tolerant of scanner/typing case variance.
- Cross-event guard: a valid reference ID registered for a *different* event slug is rejected (`reg.eventSlug !== eventSlug`, line 947).
- Idempotency: a second check-in on an already-checked-in pass fails explicitly with the prior `checkedInAt` timestamp surfaced (line 951-957) rather than silently succeeding or double-counting.
- Forged/unknown references rejected with a generic "not found" message (line 947-949) — does not leak whether the email exists elsewhere.

**Test coverage:** `src/lib/e2e-verification.test.ts:163-198` — covers the first-check-in-succeeds / second-check-in-fails sequence and a forged-reference rejection.

**Status: FULLY IMPLEMENTED** at the business-logic layer. **However, the API route itself performs no authentication check** (no session cookie read, no role check — confirmed by grep across `src/app/api/admin`/`src/app/api/events` finding zero `validateSession`/`gdg_session` references outside the auth routes themselves). This is a routing/authorization gap, not a business-logic gap — tracked as **SEC-01 (CRITICAL)** in `10-security-audit.md`. The admin UI path (`check-in-terminal.tsx`) is the only intended caller, but the endpoint is reachable by anyone who knows (or guesses) an event slug and a reference ID format.

---

## Workflow 3 — Certificate issuance and public verification

**Chain (issuance):** `src/app/admin/certificates/page.tsx` + `src/components/admin/certificates-manager-view.tsx` → `src/app/api/admin/certificates/route.ts` / `bulk-issue/route.ts` → `issueCertificate()` / `bulkIssueCertificates()` (`src/lib/db/index.ts:1439-1522`) → `certificates` table.

**Chain (verification):** `src/app/certificates/verify/[id]/page.tsx` → `GET /api/certificates/verify/[id]` (`src/app/api/certificates/verify/[id]/route.ts:8-44`) → `getCertificateById()` (`src/lib/db/index.ts:1413-1437`) → `src/components/public/verified-certificate-card.tsx`.

**Business rules verified:**
- `bulkIssueCertificates()` (line 1493-1522) only issues to registrations with `status = 'confirmed'`, optionally gated further by `checked_in = 1` (the `onlyCheckedIn` default `true`), and explicitly skips attendees who already have a certificate for that event (dedup check at line 1507) — safe to re-run.
- Certificate IDs (`CERT-VCET-2025-NNNN`, line 1450-1451) use `Math.floor(1000 + Math.random() * 9000)` — a 4-digit random suffix, **not checked for collision** against existing rows (unlike the registration reference-ID generator, which does collision-check). With only ~9000 possible values and no uniqueness constraint enforced at the DB level for `certificate_id` beyond `UNIQUE` on the column itself (`src/lib/db/index.ts:218`), a collision would throw an uncaught constraint-violation exception on `bulkIssueCertificates` for a large cohort. **Low-likelihood correctness gap**, not security.
- `getCertificateById()` (line 1413) accepts either `certificate_id` OR `reference_id` as the lookup key and normalizes to uppercase — intentional dual-lookup convenience, confirmed by the `OR reference_id = ?` clause (line 1417).
- Revocation (`updateCertificateStatus`, line 1524) flips `status` to `revoked`; the verify endpoint correctly reports `verified: cert.status === "issued"` (verify route, line 25) rather than just "found" — a revoked certificate is found but reported as unverified. Correct behavior.

**Test coverage:** `src/lib/admin-fullstack.test.ts:110-139` — issuance, lookup-by-ID, revocation, and bulk-issue (asserts only `typeof count === "number"`, doesn't assert an exact count — a weak assertion).

**Status: FULLY IMPLEMENTED** for issuance/revocation/verification logic. The verification endpoint is intentionally public/unauthenticated (correct — it's a public trust-verification feature), but it leaks the full error object via `String(error)` on the 500 path (`src/app/api/certificates/verify/[id]/route.ts:40`) — see SEC-07.

---

## Workflow 4 — Admin event creation/editing (page builder)

**Chain:** `src/app/admin/events/new/page.tsx` / `src/app/admin/events/[slug]/edit/page.tsx` → `src/components/admin/event-builder-form.tsx` → `POST /api/admin/events` or `PATCH/PUT /api/admin/events/[slug]` → `createEventAdmin()` / `updateEventAdmin()` (`src/lib/db/index.ts:1041-1121`).

**Business rules verified:**
- Slug auto-derivation from title when not supplied, with non-alphanumeric collapsing (`createEventAdmin`, line 1044) and an explicit slug-collision rejection (line 1046-1049) — "An event with slug already exists."
- `updateEventAdmin()` (line 1089-1121) uses `COALESCE(?, column)` for every field, so a partial-update payload correctly leaves unspecified fields untouched rather than nulling them.
- `duplicateEventAdmin()` (line 1123-1158) forces the copy into `visibility = 'draft'` and `is_registration_open = 0` (line 1143, 1150) — sensible default so duplicated events don't accidentally go live/open.

**Gap found:** `src/app/api/admin/events/route.ts:22-29` calls `logAuditEvent()` with **hardcoded** `userId: "usr-admin"` and `userEmail: "lead@vcet.edu.in"` regardless of who actually made the request (there is no session lookup in this route to know who the real caller is). The audit log is therefore not trustworthy as an attribution record — every event created via this route is attributed to the same fixed identity. **Tracked as SEC-08.**

**Status: PARTIALLY IMPLEMENTED** — CRUD logic itself is correct and tested (`src/lib/admin-fullstack.test.ts:69-107` covers create/update/duplicate/delete), but the audit-log attribution is non-functional/falsified, and (per Workflow 2's finding) the route has no authentication check at all, so "admin" event creation is reachable by anyone.

---

## Workflow 5 — Platform analytics & attendance dashboard

**Chain:** `src/app/admin/analytics/page.tsx` → `src/components/admin/platform-analytics-view.tsx` → `GET /api/admin/analytics` → `getPlatformAnalytics()` (`src/lib/db/index.ts:1837-1901`).

**Business rules verified:**
- `attendanceRate` is computed defensively (`totalAttendance / totalRegistrations`, guarded by `totalRegistrations > 0 ? ... : 0`, line 1846) — no divide-by-zero.
- `monthlyTrend` falls back to a single synthetic `{ month: "2026-11", count: totalRegistrations }` entry when no grouped rows exist (line 1857-1859) rather than returning an empty series — a deliberate empty-state choice, but note the hardcoded fallback month `"2026-11"` is a magic literal tied to the current seed data, not derived from `now` — will look wrong if accessed in a different month with zero real rows.
- `getEventStats()` (line 558-616) is reused by both the registration-capacity check (Workflow 1) and presumably the public event-stats endpoint (`src/app/api/events/[slug]/stats/route.ts`, not separately re-read here but same function) — single source of truth for capacity math, good reuse, no duplication found.

**Status: FULLY IMPLEMENTED**, confirmed against `src/lib/admin-fullstack.test.ts:161-173` (asserts `totalEvents > 0`, `totalRegistrations >= 124`, `departmentDistribution.length > 0`). Same authorization gap as Workflow 4 applies (`/api/admin/analytics` has no session check — see SEC-01).

---

## Summary table

| Workflow | Frontend | API | DB logic | Business rules | Auth on endpoint | Overall status |
|---|---|---|---|---|---|---|
| Event registration | ✅ | ✅ | ✅ | ✅ (validated, tested) | N/A (intentionally public) | **FULLY IMPLEMENTED** |
| Check-in | ✅ | ✅ | ✅ | ✅ (idempotent, cross-event guard) | ❌ none found | **FULLY IMPLEMENTED logic / BROKEN auth boundary** |
| Certificate issue + verify | ✅ | ✅ | ✅ | ✅ (dedup, revocation honored) | Verify: public (correct). Issue: ❌ none found | **FULLY IMPLEMENTED logic / BROKEN auth boundary on issuance** |
| Admin event create/edit | ✅ | ✅ | ✅ | ✅ (slug collision, partial update) | ❌ none found; audit log hardcoded | **PARTIALLY IMPLEMENTED** (audit trail non-functional) |
| Platform analytics | ✅ | ✅ | ✅ | ✅ (safe aggregates) | ❌ none found | **FULLY IMPLEMENTED logic / BROKEN auth boundary** |

No UI-only, mocked, or disconnected workflows were found among the five traced — every traced feature has a real, working, server-validated implementation. The recurring defect is architectural, not logical: **every `/api/admin/*` and several event-scoped `/api/events/[slug]/*` routes lack any session/role check**, detailed with full evidence in `10-security-audit.md` (SEC-01, SEC-02). Features outside this scope (agenda builder, sponsors, speakers, resources, announcements, settings, team/RBAC management) were not individually traced end-to-end by this fork — flagged as **UNVERIFIED** here; consult `06-admin-panel-audit.md` and `07-database-audit.md` for their coverage.
