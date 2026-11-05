# 08 — API Inventory

All 23 route files under `src/app/api/**` were read in full. Methods listed are exactly what each file exports — nothing inferred. "Authentication" = does the handler itself call `validateSession`/read the `gdg_session` cookie. **No route under `/api/admin/**` does.** This is recorded as fact here; severity judgment is in `10-security-audit.md`.

## Auth routes

| Method | Endpoint | Purpose | Auth | Authorization | Request Body | Response Shape | Source File |
|---|---|---|---|---|---|---|---|
| POST | `/api/auth/login` | Verify credentials, create session, set `gdg_session` HttpOnly cookie | N/A (login) | None | `{email, password}` | `{success, user:{id,name,email,role,chapterId}}` or `{error}` (401/400/500) | `src/app/api/auth/login/route.ts` |
| POST | `/api/auth/logout` | Destroy session row, clear cookie | Reads cookie (no validation needed to log out) | None | — | `{success, message}` | `src/app/api/auth/logout/route.ts` |
| GET | `/api/auth/me` | Return current session's user | **Yes** — `validateSession(token)` | None | — | `{authenticated, user}` / `{authenticated:false}` (401) | `src/app/api/auth/me/route.ts` |

## Public event routes

| Method | Endpoint | Purpose | Auth | Authorization | Request Body | Response Shape | Source File |
|---|---|---|---|---|---|---|---|
| GET | `/api/events/[slug]/stats` | Capacity/registration/track/year/department counts | **UNAUTHENTICATED** | None | — | `EventStats` object (see `src/lib/db/index.ts:546-556`) | `src/app/api/events/[slug]/stats/route.ts` |
| POST | `/api/events/[slug]/register` | Create a registration | **UNAUTHENTICATED** (public by design) | None | `RegistrationInput` (`src/types/index.ts:258-270`) | `{success, message, registration}` (201) or `{error, message}` (400/403/409) | `src/app/api/events/[slug]/register/route.ts` |
| POST | `/api/events/[slug]/check-in` | Check in an attendee by reference ID | **UNAUTHENTICATED** — intended for the admin check-in terminal UI but the API itself enforces nothing | None | `{referenceId}` | `{success, message, registration}` or `{error, message, registration?}` (404/409) | `src/app/api/events/[slug]/check-in/route.ts` |
| GET | `/api/certificates/verify/[id]` | Public certificate verification by certificate ID or reference ID | **UNAUTHENTICATED** (public verification is the intended UX) | None | — | `{verified, certificate:{...}}` or `{verified:false, error, message}` (404) | `src/app/api/certificates/verify/[id]/route.ts` |

## Admin routes — all 14 are UNAUTHENTICATED at the API layer (no session/role check in any handler)

| Method | Endpoint | Purpose | Auth | Authorization | Request Body | Response Shape | Source File |
|---|---|---|---|---|---|---|---|
| GET | `/api/admin/agenda` | List agenda sessions, optional `?eventSlug=` | **None** | **None** | — | `{success, sessions}` | `src/app/api/admin/agenda/route.ts` |
| POST | `/api/admin/agenda` | Create agenda session | **None** | **None** | `Partial<AgendaSession> & {eventSlug,time,title}` | `{success, session}` (201) | same |
| DELETE | `/api/admin/agenda?id=` | Delete agenda session | **None** | **None** | — (query param `id`) | `{success, message}` or `{error}` (400) | same |
| GET | `/api/admin/analytics` | Platform analytics (events/registrations/attendance/certs/resources + trends) | **None** | **None** | — (`?chapterId=`) | `{success, analytics}` — shape per `getPlatformAnalytics` (`src/lib/db/index.ts:1837-1901`) | `src/app/api/admin/analytics/route.ts` |
| GET | `/api/admin/announcements` | List announcements | **None** | **None** | — | `{success, announcements}` | `src/app/api/admin/announcements/route.ts` |
| POST | `/api/admin/announcements` | Create + "send" announcement (simulated: sets `sentCount` from confirmed-registration count) | **None** | **None** | `Partial<Announcement>` | `{success, announcement}` (201) | same |
| GET | `/api/admin/certificates` | List certificates, optional `?search=&eventSlug=` | **None** | **None** | — | `{success, certificates}` | `src/app/api/admin/certificates/route.ts` |
| POST | `/api/admin/certificates` | Issue a single certificate | **None** | **None** | `{eventSlug, eventTitle, recipientName, recipientEmail, referenceId, track?}` | `{success, certificate}` (201) | same |
| PATCH | `/api/admin/certificates/[id]` | Set certificate status issued/revoked | **None** | **None** | `{status: "issued"\|"revoked"}` | `{success, message}` or `{error}` (400) | `src/app/api/admin/certificates/[id]/route.ts` |
| POST | `/api/admin/certificates/bulk-issue` | Bulk-issue certs for an event (checked-in attendees by default) | **None** | **None** | `{eventSlug, onlyCheckedIn?}` | `{success, count, eventTitle, message}` | `src/app/api/admin/certificates/bulk-issue/route.ts` |
| GET | `/api/admin/events` | List all events for `gdg-vcet` chapter | **None** | **None** | — | `{success, events}` | `src/app/api/admin/events/route.ts` |
| POST | `/api/admin/events` | Create event (SQLite `events` table) | **None** | **None** | `Partial<ChapterEvent>` | `{success, event}` (201) or `{error}` (400, slug collision) | same |
| GET | `/api/admin/events/[slug]` | Get single event | **None** | **None** | — | `{success, event}` or `{error}` (404) | `src/app/api/admin/events/[slug]/route.ts` |
| PUT | `/api/admin/events/[slug]` | Update event fields (COALESCE-style partial update) | **None** | **None** | `Partial<ChapterEvent>` | `{success, message}` or `{error}` (400) | same |
| DELETE | `/api/admin/events/[slug]` | Hard-delete event | **None** | **None** | — | `{success, message}` or `{error}` (400) | same |
| POST | `/api/admin/events/[slug]/duplicate` | Clone event as draft with new slug | **None** | **None** | — | `{success, newSlug}` or `{error}` (400) | `src/app/api/admin/events/[slug]/duplicate/route.ts` |
| GET | `/api/admin/registrations` | List/filter registrations across all events; `?export=csv` streams CSV | **None** | **None** | — (`?search&eventSlug&status&paymentStatus&checkedIn&export`) | `{success, count, registrations}` JSON, or `text/csv` attachment | `src/app/api/admin/registrations/route.ts` |
| PATCH | `/api/admin/registrations/[id]` | Update registration status and/or payment status | **None** | **None** | `{status?, internalNotes?, paymentStatus?, paymentReference?}` | `{success, message}` or `{error}` (400) | `src/app/api/admin/registrations/[id]/route.ts` |
| GET | `/api/admin/resources` | List resources, optional `?search=` | **None** | **None** | — | `{success, resources}` | `src/app/api/admin/resources/route.ts` |
| POST | `/api/admin/resources` | Create community resource | **None** | **None** | `Partial<CommunityResource>` | `{success, resource}` (201) | same |
| DELETE | `/api/admin/resources?id=` | Delete resource | **None** | **None** | — | `{success, message}` or `{error}` (400) | same |
| GET | `/api/admin/settings` | Get chapter tenant settings | **None** | **None** | — (`?chapterId=`) | `{success, settings}` | `src/app/api/admin/settings/route.ts` |
| POST | `/api/admin/settings` | Update chapter tenant settings | **None** | **None** | `Partial<ChapterTenant> & {chapterId?}` | `{success, settings}` or `{error}` (400) | same |
| GET | `/api/admin/speakers` | List speakers | **None** | **None** | — | `{success, speakers}` | `src/app/api/admin/speakers/route.ts` |
| POST | `/api/admin/speakers` | Create speaker | **None** | **None** | `Partial<WorkshopSpeaker>` | `{success, speaker}` (201) | same |
| DELETE | `/api/admin/speakers?id=` | Delete speaker | **None** | **None** | — | `{success, message}` or `{error}` (400) | same |
| GET | `/api/admin/sponsors` | List sponsors | **None** | **None** | — | `{success, sponsors}` | `src/app/api/admin/sponsors/route.ts` |
| POST | `/api/admin/sponsors` | Create sponsor | **None** | **None** | `Partial<WorkshopSponsor>` | `{success, sponsor}` (201) | same |
| DELETE | `/api/admin/sponsors?id=` | Delete sponsor | **None** | **None** | — | `{success, message}` or `{error}` (400) | same |
| GET | `/api/admin/team` | List admin users + last 30 audit logs | **None** | **None** | — | `{success, users, logs}` | `src/app/api/admin/team/route.ts` |
| POST | `/api/admin/team` | **Create a new admin user** (any `AdminRole` incl. `super-admin`), seeded with the shared default password hash `gdgvcet2025!` | **None** | **None** | `{name, email, role, chapterId?}` | `{success, user}` (201) or `{error}` (400, duplicate email) | same |

## Totals
- 23 route files, 34 distinct (method, path) handler pairs.
- Authenticated handlers: **1 of 34** (`GET /api/auth/me`). Everything else — including user/privilege creation, event deletion, registration/payment mutation, and CSV export of all attendee PII — is reachable without any credential.
- No GraphQL, no webhooks, no Server Actions (`"use server"` not found in any file read), no external API integrations found in these routes.
- Request/response shapes are TypeScript-inferred from inline object literals, not from shared Zod/JSON-schema contracts — all "Response Shape" cells above reflect the literal object constructed in the handler, not a formally declared contract, and should be treated as "partially understood" if the underlying `src/lib/db` function's return type changes without the route being updated.

This inventory does not include React Server Component data-fetching (direct `src/lib/db` calls from `page.tsx`/`layout.tsx` files without going through `/api`) — those are documented by the frontend-audit fork (`03-frontend-audit.md`) as part of page data dependencies, not as "API endpoints."
