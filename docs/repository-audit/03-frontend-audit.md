# 03 — Frontend Audit

Scope: `src/app/**` (Next.js 16 App Router) and `src/components/**`. Verified by reading every `page.tsx`, `next.config.ts`, `src/app/admin/layout.tsx`, `src/components/admin/admin-layout-shell.tsx`, `src/components/admin/admin-login-form.tsx`, `src/lib/auth/index.ts`, all `src/components/ui/*`, and representative `src/content/*`/`src/lib/db` call sites. Not independently re-verified here: `src/lib/db/index.ts` internals (owned by the database-audit fork) and `src/app/api/**` route bodies (owned by the backend/API fork) — this file only documents what the frontend *calls*.

## 1. Build flags (verified: `next.config.ts:17-21`)

```ts
experimental: { agentFeedback: true },
cacheComponents: true,
partialPrefetching: true,
```

`cacheComponents`/`partialPrefetching` are indeed enabled, confirming the CLAUDE.md constraint that any component reading `searchParams`/`cookies`/`headers` must be wrapped in `<Suspense>`.

**Verified compliant usages:**
- `src/components/events-explorer.tsx` calls `useSearchParams()` and is wrapped in `<Suspense>` at both call sites: `src/app/events/page.tsx:23-25` and indirectly via `EventFilters`/`EventsExplorer` composition.
- `src/app/page.tsx:91,110` wraps `UpcomingEventsSection`/`RecentPastEventsSection` in `<Suspense>`.
- `src/app/admin/layout.tsx:14-18` wraps the entire `AdminLayoutShell` in `<Suspense>` — notable because `AdminLayoutShell` (`src/components/admin/admin-layout-shell.tsx`) uses `usePathname()`/`useRouter()`, not `searchParams`/`cookies`/`headers`, so this Suspense boundary is defensive rather than strictly required.
- Every admin `page.tsx` wraps its "manager view" in `<Suspense>` (e.g. `src/app/admin/events/page.tsx:15-17`), though none of these manager views read `searchParams`/`cookies`/`headers` server-side — they receive data as already-fetched props. The Suspense usage here is a defensive pattern, not evidence those components need it.
- No direct `cookies()`/`headers()` calls were found anywhere under `src/app/**/page.tsx` (grep returned no matches) — session/cookie reading happens exclusively in API routes (`src/app/api/auth/*`), not in page components. **This also means no server page performs a session check (see §3 CRITICAL finding).**

## 2. Full route tree (verified via `Glob src/app/**/page.tsx`)

**Public routes:**
| Route | File |
|---|---|
| `/` | `src/app/page.tsx` |
| `/about` | `src/app/about/page.tsx` |
| `/events` | `src/app/events/page.tsx` |
| `/events/[slug]` | `src/app/events/[slug]/page.tsx` |
| `/events/[slug]/agenda` | `src/app/events/[slug]/agenda/page.tsx` |
| `/events/[slug]/register` | `src/app/events/[slug]/register/page.tsx` |
| `/events/[slug]/speakers` | `src/app/events/[slug]/speakers/page.tsx` |
| `/events/[slug]/sponsors` | `src/app/events/[slug]/sponsors/page.tsx` |
| `/team` | `src/app/team/page.tsx` |
| `/join` | `src/app/join/page.tsx` |
| `/contact` | `src/app/contact/page.tsx` |
| `/resources` | `src/app/resources/page.tsx` |
| `/certificates` | `src/app/certificates/page.tsx` |
| `/certificates/verify/[id]` | `src/app/certificates/verify/[id]/page.tsx` |
| `/ui-preview` | `src/app/ui-preview/page.tsx` (`robots: noindex`, not in nav — dev-only component gallery, confirmed at line 11) |

**Admin routes (all under `src/app/admin/layout.tsx`):**
| Route | File |
|---|---|
| `/admin` | `src/app/admin/page.tsx` |
| `/admin/login` | `src/app/admin/login/page.tsx` |
| `/admin/events` | `src/app/admin/events/page.tsx` |
| `/admin/events/new` | `src/app/admin/events/new/page.tsx` |
| `/admin/events/[slug]/edit` | `src/app/admin/events/[slug]/edit/page.tsx` |
| `/admin/events/[slug]/check-in` | `src/app/admin/events/[slug]/check-in/page.tsx` (legacy generation, see §6) |
| `/admin/events/[slug]/registrations` | `src/app/admin/events/[slug]/registrations/page.tsx` (legacy) |
| `/admin/events/[slug]/analytics` | `src/app/admin/events/[slug]/analytics/page.tsx` (legacy) |
| `/admin/registrations` | `src/app/admin/registrations/page.tsx` |
| `/admin/attendance` | `src/app/admin/attendance/page.tsx` |
| `/admin/speakers` | `src/app/admin/speakers/page.tsx` |
| `/admin/sponsors` | `src/app/admin/sponsors/page.tsx` |
| `/admin/agenda` | `src/app/admin/agenda/page.tsx` |
| `/admin/announcements` | `src/app/admin/announcements/page.tsx` |
| `/admin/team` | `src/app/admin/team/page.tsx` |
| `/admin/certificates` | `src/app/admin/certificates/page.tsx` |
| `/admin/resources` | `src/app/admin/resources/page.tsx` |
| `/admin/analytics` | `src/app/admin/analytics/page.tsx` |
| `/admin/settings` | `src/app/admin/settings/page.tsx` |

No `loading.tsx`, `error.tsx`, or custom `not-found.tsx` exist per-route (only one root `src/app/not-found.tsx` — UNVERIFIED content, not read by this fork). `generateStaticParams`/`notFound()` is used ad hoc per dynamic page instead.

## 3. CRITICAL finding — admin panel has no authentication guard at the frontend layer

Verified by: reading `src/app/admin/layout.tsx` (full file, 20 lines) and `src/components/admin/admin-layout-shell.tsx` (full file, 187 lines) — neither calls `cookies()`, imports `validateSession` from `src/lib/auth`, or redirects unauthenticated visitors. A repo-wide grep (`grep -rln "auth\|session\|cookie" src/app/admin --include="*.tsx"`) returned **zero files**. Every admin `page.tsx` (18 files) calls `src/lib/db` functions directly at render time with no session check — e.g. `src/app/admin/page.tsx:15-18` calls `getPlatformAnalytics`, `getAllEventsAdmin`, `getAllRegistrationsAdmin`, `getAuditLogs` unconditionally.

`AdminLayoutShell` (`src/components/admin/admin-layout-shell.tsx:50-52`) only special-cases `/admin/login` to skip rendering the sidebar chrome — it does not block rendering of `children` on any other admin route for a logged-out visitor. The sidebar footer hardcodes a fake signed-in identity ("Jatush Hingu / Chapter Admin", lines 151-157) regardless of who — if anyone — is actually authenticated.

**Impact:** anyone who navigates directly to `/admin`, `/admin/events`, `/admin/team`, etc. gets the full admin dashboard (including PII in registrations, audit logs, and RBAC/team management) with no login required. The `/api/auth/login` flow (`src/app/api/auth/login/route.ts`) sets an `httpOnly` cookie correctly, but nothing in the page tree ever checks it. This is almost certainly the single highest-severity issue in the whole codebase; full exploitation detail and severity classification is deferred to `10-security-audit.md`, and the backend/API-route side of this (whether `/api/admin/*` routes check session) is deferred to `04-backend-audit.md`/`05-authentication-authorization.md`.

**Secondary finding:** `src/components/admin/admin-login-form.tsx:8-37,41-42` hardcodes a real-looking demo password (`gdgvcet2025!`) and four organizer email addresses directly in client-shipped source as pre-filled form state and "Quick Role Switcher" presets — visible to any visitor of `/admin/login` (itself unguarded) via page source/React DevTools, not just to someone who already has credentials.

## 4. Page-by-page inventory

| Route | Purpose | Key Components | Data Source | Auth Required (enforced) | Status |
|---|---|---|---|---|---|
| `/` | Chapter homepage | `UpcomingEventsSection`, `RecentPastEventsSection`, `TeamCard`, `Faq`, UI primitives | `src/content/chapter.ts`, `events.ts`, `team.ts`, `learning-areas.ts` (static) | None | Complete |
| `/about` | Chapter mission/eligibility | `Card`, `SectionHeading`, `Button` | `src/content/chapter.ts` | None | Complete |
| `/events` | Event list/filter | `EventsExplorer` (client, `useSearchParams`) | `src/content/events.ts` (static) | None | Complete |
| `/events/[slug]` | Event detail; branches to rich "workshop" view or plain recap | `EventDetailsView` (workshop) or inline recap; `EventStatusActions/Eyebrow` | `src/content/events.ts` + `getEventStats(slug)` from `src/lib/db` for live capacity (`src/app/events/[slug]/page.tsx:51`, wrapped in try/catch fallback) | None | Complete, but see §5 data-boundary finding |
| `/events/[slug]/agenda` | Workshop schedule | `EventAgendaView` | `src/content/events.ts` only | None | Complete (static only) |
| `/events/[slug]/register` | Workshop registration form | `EventRegistrationView` | `src/content/events.ts` + `getEventStats` | None (public registration flow) | Complete |
| `/events/[slug]/speakers` | Workshop speaker bios | `EventSpeakersView` | `src/content/events.ts` (`event.workshop.speakers`, UNVERIFIED shape — owned by database/content fork) | None | Complete |
| `/events/[slug]/sponsors` | Workshop sponsor list | `EventSponsorsView` | `src/content/events.ts` | None | Complete |
| `/team` | Organizer roster | `TeamCard` | `src/content/team.ts` | None | Complete |
| `/join` | Join CTA + FAQ | `Faq`, `Button` | `src/content/chapter.ts` | None | Complete |
| `/contact` | Contact form | `ContactView` (`src/components/public/contact-view.tsx`, not read in depth by this fork) | Likely posts to an API route — UNVERIFIED, defer to backend audit | None | UNVERIFIED (form target not traced) |
| `/resources` | Resource catalog | `ResourcesView` | `getPublicResources()` from `src/lib/db` | None | Complete — **note: this page reads live DB data**, unlike most other public pages which read static content |
| `/certificates` | Certificate ID lookup | `CertificateLookupView` | Client-side lookup, presumably calls `/api/certificates/verify/[id]` — UNVERIFIED, defer to backend audit | None | UNVERIFIED (API call not traced) |
| `/certificates/verify/[id]` | Verified certificate display | `VerifiedCertificateCard` | `getCertificateById(id)` from `src/lib/db` (`src/app/certificates/verify/[id]/page.tsx:19`) | None | Complete |
| `/ui-preview` | Internal component gallery | All `src/components/ui/*` + `Faq` | Hardcoded inline data | None (noindex) | Complete, dev tool only |
| `/admin/login` | Admin sign-in | `AdminLoginForm` | POSTs to `/api/auth/login` | N/A (this is the login page itself) | Complete, but exposes demo credentials (§3) |
| `/admin` | Ops dashboard | Inline JSX, no manager-view component | `getPlatformAnalytics`, `getAllEventsAdmin`, `getAllRegistrationsAdmin`, `getAuditLogs` (all `src/lib/db`) | **None enforced** (§3) | Complete UI, CRITICAL auth gap |
| `/admin/events` | Events CRUD list | `EventsManagerView` (client) | `getAllEventsAdmin()` server-fetched, then presumably `fetch()`s `/api/admin/events` for mutations — UNVERIFIED, defer to backend | **None enforced** | Complete UI |
| `/admin/events/new` | Event creation form | `EventBuilderForm` (`isEditMode={false}`) | Form only; POST target UNVERIFIED | **None enforced** | Complete UI |
| `/admin/events/[slug]/edit` | Event edit form | `EventBuilderForm` (`isEditMode={true}`) | `getEventBySlug(slug)` from `src/lib/db` | **None enforced** | Complete UI |
| `/admin/events/[slug]/check-in` | **Legacy** per-event check-in terminal | `AdminHeader`, `CheckInTerminal` | `src/content/events.ts` (static `events.find`) + `getEventStats` | **None enforced** | Legacy/parallel implementation — see §6 |
| `/admin/events/[slug]/registrations` | **Legacy** per-event roster | `AdminHeader`, `RegistrationsTable` | `getRegistrations(slug)`, `getEventStats(slug)` | **None enforced** | Legacy — see §6 |
| `/admin/events/[slug]/analytics` | **Legacy** per-event analytics | `AdminHeader`, inline JSX | `getEventStats(slug)`, with a **hardcoded fabricated fallback stats object** inline at `src/app/admin/events/[slug]/analytics/page.tsx:34-58` (fake 124/150 registrations, fake track/department breakdowns, fake "Labs 402/403" network capacity copy) used if the DB call throws | **None enforced** | Legacy; fallback branch violates the spirit of CLAUDE.md's no-invented-data rule (flagged for 09/10) |
| `/admin/registrations` | **Current** centralized roster across all events | `CentralRegistrationsView` | `getAllRegistrationsAdmin()`, `getAllEventsAdmin()` | **None enforced** | Complete UI |
| `/admin/attendance` | **Current** QR check-in hub (multi-event) | `AttendanceHubView` | `getAllEventsAdmin()` | **None enforced** | Complete UI |
| `/admin/speakers` | Speaker directory CRUD | `SpeakersManagerView` | `getSpeakersAdmin()` | **None enforced** | Complete UI |
| `/admin/sponsors` | Sponsor directory CRUD | `SponsorsManagerView` | `getSponsorsAdmin()` | **None enforced** | Complete UI |
| `/admin/agenda` | Cross-event agenda/session builder | `AgendaBuilderView` | `getAllEventsAdmin()`, `getAgendaSessions()` | **None enforced** | Complete UI |
| `/admin/announcements` | Broadcast/announcement composer | `AnnouncementsManagerView` | `getAnnouncementsAdmin()`, `getAllEventsAdmin()` | **None enforced** | Complete UI (whether email actually sends is a backend concern) |
| `/admin/team` | RBAC / team member management | `TeamManagerView` | `getAdminUsers()`, `getAuditLogs(..., 25)` | **None enforced** | Complete UI |
| `/admin/certificates` | Certificate issuance | `CertificatesManagerView` | `getCertificates()`, `getAllEventsAdmin()` | **None enforced** | Complete UI |
| `/admin/resources` | Resource catalog CRUD | `ResourcesManagerView` | `getResources()` | **None enforced** | Complete UI |
| `/admin/analytics` | Cross-event platform analytics | `PlatformAnalyticsView` | `getPlatformAnalytics("gdg-vcet")`, `getAllEventsAdmin()` | **None enforced** | Complete UI |
| `/admin/settings` | Chapter tenant settings | `ChapterSettingsView` | `getChapterSettings("gdg-vcet")` | **None enforced** | Complete UI |

## 5. Content/DB boundary — contradicts CLAUDE.md's "src/content/ is the CMS boundary" framing

Verified by grepping import sites: `src/content/events.ts` is still imported by every **public** event route (home, `/events`, `/events/[slug]` and its four subpages) as the source of truth for event identity, copy, and workshop structure. Meanwhile `src/lib/db` (SQLite) is imported by **every admin page** and by `/resources` and `/certificates/verify/[id]` on the public side.

This means the admin "Events Manager" (`/admin/events`, backed by `getAllEventsAdmin()`/`getEventBySlug()` against SQLite) and the public events pages (backed by the static `src/content/events.ts` array) are **two separate data stores that are not obviously reconciled**. `src/app/admin/page.tsx:63-67` even surfaces both counts side-by-side ("Total Events" from `getAllEventsAdmin().length` vs. "`{staticEvents.length}` total in chapter catalog"), implying the two are tracked as distinct and possibly divergent.

**Finding:** An event created or edited via `/admin/events/new` or `/admin/events/[slug]/edit` (which read/write `src/lib/db`) will very likely **not appear or update on the public `/events` and `/events/[slug]` pages**, which only ever read `src/content/events.ts`. This looks like a disconnected/broken end-to-end workflow rather than a UI bug — confirming the actual write target of `EventBuilderForm`'s submit handler is necessary to be certain (deferred to `04-backend-audit.md` / `09-business-logic-workflows.md`), but the read-side split is conclusively verified here. This also means CLAUDE.md's description of `src/content/` as "the CMS boundary" is only true for the public site's event/team/chapter copy — it is no longer the boundary for registrations, certificates, resources, speakers, sponsors, agenda, or announcements, which all live in SQLite via `src/lib/db`.

## 6. Legacy vs. current admin generations

Two generations of admin UI coexist for event-scoped operations:
- **Legacy** (`src/app/admin/events/[slug]/check-in|registrations|analytics/page.tsx`): per-event URLs, use `AdminHeader` (`src/components/admin/admin-header.tsx`, not read in depth) as chrome instead of `AdminLayoutShell`, read `src/content/events.ts` (static) to resolve the event, and only support the single seeded slug `devcraft-2025` (`generateStaticParams` hardcodes `[{ slug: "devcraft-2025" }]` in all three files).
- **Current** (`src/app/admin/attendance`, `/admin/registrations`, `/admin/analytics`): global, cross-event dashboards under `AdminLayoutShell`, backed entirely by `src/lib/db`.

Both generations are live and linked from navigation (`AdminLayoutShell`'s `NAV_GROUPS` links to the current ones; the legacy per-event routes are linked from `src/app/admin/page.tsx:239-251`'s per-event action icons). This is duplicated functionality, not dead code — both are reachable in the running app.

## 7. Shared UI primitives (`src/components/ui/`)

| Component | Variants/props verified | Notes |
|---|---|---|
| `button.tsx` | `variant`: `primary`/`secondary`/`ghost`; `size`: `md`/`lg`; renders as `<Link>` when `href` given, else `<button>` | Single implementation handles both link and action semantics via a discriminated prop union (lines 33-41) |
| `chip.tsx` | `selected` boolean, toggles `aria-pressed` and styling | Used for event category filters |
| `text-field.tsx` | `label` (required), `hideLabel`, auto-generates `id`/`htmlFor` from label if not supplied | Accessible-by-default pattern |
| `card.tsx`, `section-heading.tsx`, `empty-state.tsx` | Not read in full by this fork (time-boxed) — referenced across nearly every public page per earlier grep hits | UNVERIFIED prop surface, but confirmed in active use |

## 8. Admin manager-view components (`src/components/admin/*.tsx`)

All are client components (`"use client"` — 31 files repo-wide carry this directive) that receive server-fetched `initial*` props from their parent `page.tsx` and are presumed to `fetch()` the matching `/api/admin/*` route for mutations (create/update/delete), consistent with the `initialX` naming convention seen in every admin page (e.g. `initialEvents`, `initialSpeakers`, `initialCertificates`). The actual `fetch()` call sites inside each manager-view file were **not individually read** by this fork (16 files, out of scope budget) — confirming each one's wiring to its API route is deferred to `04-backend-audit.md`. What is verified: the page→component handoff for all 13 manager views (`events-manager-view`, `central-registrations-view`, `attendance-hub-view`, `speakers-manager-view`, `sponsors-manager-view`, `agenda-builder-view`, `announcements-manager-view`, `team-manager-view`, `certificates-manager-view`, `resources-manager-view`, `platform-analytics-view`, `chapter-settings-view`, `event-builder-form`), plus two legacy-route components (`check-in-terminal`, `registrations-table`) and chrome components (`admin-layout-shell`, `admin-header`, `admin-login-form`).

## 9. Workshop components (`src/components/workshop/*.tsx`)

`event-details-view.tsx`, `event-agenda-view.tsx`, `event-registration-view.tsx`, `event-speakers-view.tsx`, `event-sponsors-view.tsx` — all receive `event`/`workshop`/`stats` as props from their respective `src/app/events/[slug]/**/page.tsx` parent (verified at the call sites in §4). Internal rendering logic not read in full by this fork; UNVERIFIED beyond the prop contract.

## 10. Public components (`src/components/public/*.tsx`)

`certificate-lookup-view.tsx`, `contact-view.tsx`, `resources-view.tsx`, `verified-certificate-card.tsx` — confirmed as the rendering layer for `/certificates`, `/contact`, `/resources`, `/certificates/verify/[id]` respectively (import sites verified in §4). Internal fetch/submit targets UNVERIFIED by this fork.

## 11. Content rule (CLAUDE.md) compliance check

- `grep -rn 'href="#"' src/` returned **zero matches** — no placeholder links found anywhere in the codebase. Compliant.
- No fabricated public-facing stats were found on any page this fork read directly, **except** the legacy `/admin/events/[slug]/analytics` hardcoded fallback object (§4, §6) — that page is admin-only (though unauthenticated-reachable per §3), so it's a lower-severity content-rule concern than a public-facing violation, but still worth remediating since the admin UI is in fact publicly reachable today.
- The demo credentials embedded in `admin-login-form.tsx` (§3) are a borderline case: not "invented team/event/stat" content in the CLAUDE.md sense, but real-looking operator identities and a real-looking password shipped to every client bundle.

## Summary of cross-cutting findings for other audit files
1. **CRITICAL (→ 10-security-audit.md):** No frontend-layer session check on any `/admin/**` route or page.
2. **CRITICAL (→ 10-security-audit.md):** Hardcoded demo password + organizer emails in client-shipped `admin-login-form.tsx`.
3. **HIGH (→ 09-business-logic-workflows.md, 04-backend-audit.md):** Public event pages and admin event management read from two different data sources (`src/content/events.ts` vs `src/lib/db`) with no confirmed reconciliation — admin-created events may never surface publicly.
4. **MEDIUM (→ 12-code-quality-testing.md):** Two parallel generations of event-scoped admin UI (legacy per-event routes pinned to a single hardcoded slug, vs. current global dashboards) coexist and are both linked from the UI.
5. **LOW (→ 12-code-quality-testing.md):** Hardcoded fabricated fallback analytics data in `admin/events/[slug]/analytics/page.tsx`.
