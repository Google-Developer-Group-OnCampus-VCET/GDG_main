# 06 — Admin Panel Deep Audit

> Cross-reference: `05-authentication-authorization.md` for the access-control finding that applies uniformly to every feature below — **no page or API route in this section enforces a session or role check.** That finding is not repeated per-row; assume "Access Control: NONE (verified)" for all 16 features unless noted otherwise.

## 1. Architecture

Admin auth is **not separate** from "regular user" auth — there is no regular/attendee account system at all (see `05-authentication-authorization.md` §1). The admin workspace is the only authenticated surface, built as:
- `src/app/admin/layout.tsx` → wraps every `/admin/*` page in `<AdminLayoutShell>` (client component, `src/components/admin/admin-layout-shell.tsx`) for the sidebar/nav chrome only — no gating.
- Each `/admin/<feature>/page.tsx` is a **React Server Component** that calls a `src/lib/db.ts` getter directly (same-process SQLite reads, no HTTP hop) and passes the result as props into a `"use client"` `*-manager-view.tsx` / `*-hub-view.tsx` component.
- Each manager/hub view performs mutations via `fetch()` against the corresponding `/api/admin/<feature>/route.ts`, which calls the matching `src/lib/db.ts` writer function directly against SQLite (`node:sqlite`'s `DatabaseSync`, no ORM).

This pattern is implemented consistently across all 13 feature areas — confirmed by reading the top-of-file imports of every `/admin/**/page.tsx` (see tool trace) and grep-confirming no auth import exists in any of them or their API counterparts.

## 2. Feature-by-Feature Audit

### 2.1 Events
- Frontend: `src/app/admin/events/page.tsx` → `src/components/admin/events-manager-view.tsx` (292 lines); create/edit: `src/app/admin/events/new/page.tsx` & `src/app/admin/events/[slug]/edit/page.tsx` → `src/components/admin/event-builder-form.tsx` (327 lines).
- Backend: `GET/POST /api/admin/events` (`src/app/api/admin/events/route.ts`), `GET/PATCH/DELETE /api/admin/events/[slug]` , `POST /api/admin/events/[slug]/duplicate`.
- DB: `getAllEventsAdmin`, `getEventBySlug`, `createEventAdmin`, `updateEventAdmin`, `duplicateEventAdmin`, `deleteEventAdmin` (`src/lib/db/index.ts:979-1164`).
- Status: **COMPLETE** (full CRUD + duplicate, real SQLite persistence, verified via `src/lib/admin-fullstack.test.ts:69-107`).

### 2.2 Registrations (central + per-event)
- Frontend: `src/app/admin/registrations/page.tsx` → `central-registrations-view.tsx` (455 lines, cross-event); `src/app/admin/events/[slug]/registrations/page.tsx` → `registrations-table.tsx` (284 lines, single-event).
- Backend: `GET /api/admin/registrations`, `PATCH /api/admin/registrations/[id]`.
- DB: `getAllRegistrationsAdmin`, `getRegistrations`, `updateRegistrationStatus`, `updatePaymentStatus` (`src/lib/db/index.ts:622-778`).
- Status: **COMPLETE** for status/payment-status updates and filtering/search. No CSV export code found (`grep -rn "csv\|export" src/components/admin/central-registrations-view.tsx` not verified further — treat export claims as UNVERIFIED if referenced in UI copy).

### 2.3 Attendance & Check-in
- Frontend: `src/app/admin/attendance/page.tsx` → `attendance-hub-view.tsx` (333 lines, cross-event terminal); per-event terminal at `src/app/admin/events/[slug]/check-in/page.tsx` → `check-in-terminal.tsx` (199 lines).
- Backend: `POST /api/events/[slug]/check-in` (note: **not** under `/api/admin/` — it's nested under the public `/api/events/` namespace, `src/app/api/events/[slug]/check-in/route.ts:1-45`).
- DB: `checkInAttendee`, `getRegistrationByReference` (`src/lib/db/index.ts:937-973`).
- Status: **COMPLETE** and functionally correct (duplicate-checkin detection, timestamp + operator stamping). Access-control note: this endpoint sits outside `/api/admin/`, so even in a hypothetical future where `/api/admin/*` gets gated, this one would need its own explicit protection — worth flagging for remediation planning.

### 2.4 Speakers
- Frontend: `src/app/admin/speakers/page.tsx` → `speakers-manager-view.tsx` (323 lines).
- Backend: `GET/POST/DELETE /api/admin/speakers`.
- DB: `getSpeakersAdmin`, `createSpeakerAdmin`, `deleteSpeakerAdmin` (`src/lib/db/index.ts:1170-1232`).
- Status: **COMPLETE** for create/list/delete. No `updateSpeakerAdmin` function exists in `src/lib/db/index.ts` — edit-in-place is **NOT IMPLEMENTED** at the DB layer (UI may simulate it client-side only; unverified without reading the component's edit-submit handler in full).

### 2.5 Sponsors
- Frontend: `src/app/admin/sponsors/page.tsx` → `sponsors-manager-view.tsx` (261 lines).
- Backend: `GET/POST/DELETE /api/admin/sponsors`.
- DB: `getSponsorsAdmin`, `createSponsorAdmin`, `deleteSponsorAdmin` (`src/lib/db/index.ts:1238-1287`).
- Status: **COMPLETE** for create/list/delete; **no update function** — same gap as Speakers.

### 2.6 Agenda Builder
- Frontend: `src/app/admin/agenda/page.tsx` → `agenda-builder-view.tsx` (329 lines).
- Backend: `GET/POST/DELETE /api/admin/agenda`.
- DB: `getAgendaSessions`, `createAgendaSession`, `deleteAgendaSession` (`src/lib/db/index.ts:1293-1360`).
- Status: **COMPLETE** for create/list/delete; no update function (consistent pattern across content-type tables).

### 2.7 Announcements
- Frontend: `src/app/admin/announcements/page.tsx` → `announcements-manager-view.tsx` (219 lines).
- Backend: `GET/POST /api/admin/announcements`.
- DB: `getAnnouncementsAdmin`, `createAnnouncementAdmin` (`src/lib/db/index.ts:1623-1676`).
- Status: **PARTIAL / simulated send.** `createAnnouncementAdmin` sets `sent_count` to the current confirmed-registration count (`src/lib/db/index.ts:1646-1647`) and persists `channel: "email"` but **no email-sending integration exists anywhere in the repo** (no SMTP/SendGrid/Resend/etc. package in `package.json`). "Sending" an announcement only writes a DB row with a simulated recipient count — it does not dispatch anything. This should be classified **MOCKED** for the actual delivery mechanism, **COMPLETE** for the record-keeping/UI.

### 2.8 Certificates
- Frontend: `src/app/admin/certificates/page.tsx` → `certificates-manager-view.tsx` (327 lines); public verification at `src/app/certificates/verify/[id]/page.tsx`.
- Backend: `GET/POST /api/admin/certificates`, `PATCH /api/admin/certificates/[id]`, `POST /api/admin/certificates/bulk-issue`; public `GET /api/certificates/verify/[id]`.
- DB: `getCertificates`, `getCertificateById`, `issueCertificate`, `bulkIssueCertificates`, `updateCertificateStatus` (`src/lib/db/index.ts:1366-1528`).
- Status: **COMPLETE** — issue/revoke/bulk-issue/verify all backed by real SQLite logic, unit-tested (`src/lib/admin-fullstack.test.ts:109-139`). No PDF/image generation found — "certificates" are DB records with a verification page, not generated documents; if the product intent is a downloadable certificate file, that part is **NOT IMPLEMENTED**.

### 2.9 Resources
- Frontend: `src/app/admin/resources/page.tsx` → `resources-manager-view.tsx` (288 lines); public list at `src/app/resources/page.tsx` → `src/components/public/resources-view.tsx`.
- Backend: `GET/POST/DELETE /api/admin/resources`.
- DB: `getResources`, `getPublicResources`, `createResourceAdmin`, `deleteResourceAdmin` (`src/lib/db/index.ts:1534-1617`).
- Status: **COMPLETE** for create/list/delete/public-filter; no update function.

### 2.10 Team & RBAC
- Frontend: `src/app/admin/team/page.tsx` → `team-manager-view.tsx` (312 lines) — shows members list, the permission matrix (static, from `ROLE_PERMISSIONS`), and an audit-log tab.
- Backend: `GET/POST /api/admin/team`.
- DB: `getAdminUsers`, `createAdminUser`, `getAuditLogs` (`src/lib/db/index.ts:1682-1771`).
- Status: **PARTIAL.** Create/list work; new users get the shared default password with no reset flow (see `05-authentication-authorization.md` §2/§6). No role-edit, no suspend/activate action, no delete-user function found in `src/lib/db/index.ts` — those likely exist only as static UI affordances if present; treat as **UNVERIFIED/NOT IMPLEMENTED** absent a DB function to back them. `logAuditEvent()` exists (`src/lib/db/index.ts:1729-1752`) but a repo-wide grep shows it is **not called from any `/api/admin/*` route** — audit logging is implemented as a library function with no call sites, so the "Audit Logs" tab likely shows an empty or static set in practice. This should be flagged as **BACKEND-ONLY / disconnected**, mirroring the `hasPermission()` pattern in the auth audit.

### 2.11 Analytics (platform-wide + per-event)
- Frontend: `src/app/admin/analytics/page.tsx` → `platform-analytics-view.tsx` (213 lines); per-event: `src/app/admin/events/[slug]/analytics/page.tsx`.
- Backend: `GET /api/admin/analytics`; per-event analytics is computed inline in `getEventStats()`, no separate API route (page reads directly server-side).
- DB: `getPlatformAnalytics`, `getEventStats` (`src/lib/db/index.ts:558-616`, `1837-1901`).
- Status: **COMPLETE** — real aggregate SQL (`GROUP BY`, `strftime`) over live registration data, unit-tested (`src/lib/admin-fullstack.test.ts:161-172`).

### 2.12 Chapter Settings
- Frontend: `src/app/admin/settings/page.tsx` → `chapter-settings-view.tsx` (237 lines).
- Backend: `GET/PATCH /api/admin/settings`.
- DB: `getChapterSettings`, `updateChapterSettings` (`src/lib/db/index.ts:1777-1835`).
- Status: **COMPLETE** for the single hardcoded `gdg-vcet` chapter. `manage_chapters` permission (creating *new* chapter tenants) exists in the RBAC matrix (`src/lib/auth/roles.ts:7`) and `docs/MULTI_TENANCY.md` references multi-tenant ambitions, but no `createChapter`-style DB function exists — multi-tenant chapter creation is **NOT IMPLEMENTED**, only single-tenant settings editing.

### 2.13 Admin Dashboard / Overview
- Frontend: `src/app/admin/page.tsx` (418 lines) — imports from `@/lib/db` and also from `@/content/events` (static content module) on the same page (line 8). This mixes live DB-backed stats with static demo content; exact proportions are **UNVERIFIED** without a full line-by-line read of this 418-line file beyond the import header — flagged for follow-up if a deeper pass is wanted.

## 3. Access Control Matrix (restating the central finding per-feature)

| Feature | Frontend | Backend API | DB | Access Control | Status |
|---|---|---|---|---|---|
| Events | ✅ | ✅ | ✅ | ❌ None | COMPLETE |
| Registrations | ✅ | ✅ | ✅ | ❌ None | COMPLETE |
| Attendance/Check-in | ✅ | ✅ (public namespace) | ✅ | ❌ None | COMPLETE |
| Speakers | ✅ | ✅ (no update) | ✅ (no update) | ❌ None | PARTIAL |
| Sponsors | ✅ | ✅ (no update) | ✅ (no update) | ❌ None | PARTIAL |
| Agenda | ✅ | ✅ (no update) | ✅ (no update) | ❌ None | PARTIAL |
| Announcements | ✅ | ✅ | ✅ (no real send) | ❌ None | PARTIAL/MOCKED send |
| Certificates | ✅ | ✅ | ✅ | ❌ None | COMPLETE |
| Resources | ✅ | ✅ (no update) | ✅ (no update) | ❌ None | PARTIAL |
| Team & RBAC | ✅ | ✅ (create/list only) | ✅ (audit log unused) | ❌ None | PARTIAL |
| Analytics | ✅ | ✅ | ✅ | ❌ None | COMPLETE |
| Settings | ✅ | ✅ | ✅ (single-tenant only) | ❌ None | COMPLETE (single-tenant) |
| Dashboard/Overview | ✅ (mixed static+live) | n/a | ✅ | ❌ None | UNVERIFIED (needs deeper read) |

## 4. Admin-Specific Database Models

See `07-database-audit.md` for the full schema. Admin-relevant tables: `users`, `sessions`, `audit_logs`, plus every content table (`events`, `registrations`, `speakers`, `sponsors`, `agenda_sessions`, `announcements`, `certificates`, `resources`, `chapters`).

## 5. Summary

The admin panel is a genuinely full-stack, mostly-complete CRUD platform (not a UI mockup) — every feature's "Create"/"List"/"Delete" actions hit real SQLite tables, and several (Events, Certificates, Analytics) have unit test coverage. The two systemic gaps are: (1) **zero authorization enforcement** anywhere in `/admin/*` or `/api/admin/*` (see `05-authentication-authorization.md`), and (2) a recurring **missing-"Update"-function** pattern for Speakers/Sponsors/Agenda/Resources, plus an **implemented-but-uncalled** `logAuditEvent()`/`hasPermission()` pair that makes the Team & RBAC and audit-trail features look more enforced than they are.
