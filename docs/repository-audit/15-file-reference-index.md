# 15 — File Reference Index

Scope: every file under `src/`, root-level config, and `docs/`. "Interacts with" lists direct importers/importees confirmed by reading the file or its imports — not transitive guesses.

## Root / Config

| File | Purpose | Interacts with |
|---|---|---|
| `next.config.ts` | Next config: image remote patterns for Google-hosted avatars, `cacheComponents`/`partialPrefetching`/`agentFeedback` experimental flags, Turbopack CSS loader for Tailwind v4 | Build pipeline; `CLAUDE.md` calls out that `cacheComponents` requires `Suspense` around any `searchParams`/`cookies`/`headers` consumer |
| `vitest.config.ts` | Test runner config: node environment, `fileParallelism: false`, `@` → `src/` alias | `src/lib/*.test.ts` |
| `tsconfig.json` | TS compiler config | whole `src/` tree |
| `eslint.config.mjs` | Lint rules (Next core-web-vitals config) | whole `src/` tree |
| `package.json` | Dependency manifest — Next 16.4.3, React 19.3.0, Tailwind v4, Vitest 3 | npm scripts: `dev`, `build`, `start`, `lint`, `test` |
| `.env.example` | Documents expected env var **names** only (values not inspected/disclosed here) | Runtime config — see `11-devops-deployment.md` |
| `AGENTS.md` | Auto-generated banner by `next dev`, re-written on every dev server start (self-documenting per its own text) | n/a — not hand-maintained |
| `README.md` | Unedited `create-next-app` boilerplate; **does not describe this project** | superseded for audit purposes by this directory's `README.md` |
| `stitch.md` | Present at repo root; not read as part of this file's scope — UNVERIFIED content/purpose |
| `data/gdg.db`, `.db-shm`, `.db-wal` | Live SQLite database file + WAL/shared-memory companions, created/opened by `src/lib/db/index.ts:32,47` | Every DB query function in `src/lib/db/index.ts` |

## `src/app/` — Routing

| Path | Purpose | Data deps | Auth gate observed |
|---|---|---|---|
| `layout.tsx` | Root HTML shell, Google Sans font, Material Symbols stylesheet, header/footer | `@/components/site-header`, `site-footer` | none (public) |
| `page.tsx` | Home page | `@/content/{chapter,events,team,learning-areas}` (static content modules, not DB) | none (public) |
| `not-found.tsx` | 404 page | — | none |
| `about/`, `contact/`, `join/`, `team/`, `resources/`, `ui-preview/` | Static/content-driven public pages | `src/content/*`, `src/components/public/*` | none (public) |
| `events/page.tsx`, `events/[slug]/**` | Event listing/detail/register/agenda/speakers/sponsors | `src/content/events.ts` for listing; registration flow also writes to SQLite via API | none (public) |
| `certificates/page.tsx`, `certificates/verify/[id]/page.tsx` | Public certificate lookup/verification UI | `src/components/public/certificate-lookup-view.tsx`, `verified-certificate-card.tsx` → API `GET /api/certificates/verify/[id]` | none (intentionally public) |
| `admin/layout.tsx` | Wraps all `/admin/*` in `<Suspense>` + `AdminLayoutShell` | — | **No server-side auth check** — see `05`/`06`/`10` |
| `admin/page.tsx` | Admin overview dashboard — calls `getAllEventsAdmin`, `getAllRegistrationsAdmin`, `getPlatformAnalytics`, `getAuditLogs` directly in a server component | `src/lib/db` | **None** — queries run unconditionally for any visitor who loads the URL |
| `admin/login/page.tsx` | Login form page | `src/components/admin/admin-login-form.tsx` → `POST /api/auth/login` | n/a (this *is* the login screen) |
| `admin/{events,registrations,attendance,speakers,sponsors,agenda,announcements,certificates,resources,team,analytics,settings}/page.tsx` | One admin feature screen each, each a thin wrapper rendering a `*-manager-view.tsx`/`*-builder-view.tsx`/`*-hub-view.tsx` client component | `src/components/admin/*` → `/api/admin/*` | **None observed in sampled files** (`admin/page.tsx`, `admin/layout.tsx`) — full per-page confirmation is `06-admin-panel-audit.md`'s scope (other fork) |
| `admin/events/[slug]/{edit,check-in,registrations,analytics}/page.tsx` | Per-event admin sub-views | `src/components/admin/{event-builder-form,check-in-terminal,registrations-table}.tsx` | not verified here |
| `api/auth/login/route.ts` | `POST` — verifies credentials against `users` table, issues `gdg_session` httpOnly cookie | `@/lib/auth` (`verifyPassword`, `createSession`), `@/lib/db` (`getDatabase`) | n/a — this issues auth |
| `api/auth/logout/route.ts` | `POST` — destroys session | `@/lib/auth` (`destroySession`) presumed — not read in full in this file; see `08-api-inventory.md` |
| `api/auth/me/route.ts` | `GET` — reads `gdg_session` cookie, calls `validateSession`, returns current user or 401 | `next/headers` `cookies()`, `@/lib/auth` | self (returns auth state) |
| `api/events/[slug]/{register,check-in,stats}/route.ts` | Public registration create, public check-in (by reference), public stats endpoint | `@/lib/db` | **register/stats**: none by design (public). **check-in**: not confirmed whether gated — flag for `08`/`10` |
| `api/certificates/verify/[id]/route.ts` | Public certificate verification lookup | `@/lib/db` (`getCertificateById` presumed) | none (public, by design) |
| `api/admin/**` (15 route files: events, events/[slug], events/[slug]/duplicate, registrations, registrations/[id], agenda, announcements, certificates, certificates/[id], certificates/bulk-issue, resources, settings, speakers, sponsors, team, analytics) | Full CRUD for every admin resource | `@/lib/db` directly | **Confirmed unauthenticated** on `admin/events/route.ts` and `admin/registrations/route.ts` (read directly, no `validateSession`/`hasPermission` call, no cookie read) — see `05-authentication-authorization.md` for the full severity writeup (other fork) |

## `src/lib/`

| File | Purpose | Depends on | Depended on by |
|---|---|---|---|
| `db/index.ts` | Single source of DB truth: schema DDL, demo-data seeding, ~40 exported query/mutation functions (events, registrations, speakers, sponsors, agenda, certificates, resources, announcements, admin users, audit logs, chapter settings, platform analytics) | `node:sqlite`, `@/types`, `@/lib/auth` (`hashPassword`, for seeding) | every `app/admin/**/page.tsx` server component, every `app/api/**/route.ts` |
| `db/index.test.ts` | Unit tests for the DB module | `vitest`, `@/lib/db` | test runner only |
| `auth/index.ts` | `hashPassword`/`verifyPassword` (scrypt + timing-safe compare), `createSessionToken`, `createSession`, `validateSession`, `destroySession`; re-exports `roles.ts` | `node:crypto`, `@/types`, `@/lib/db` | `api/auth/*`, `db/index.ts` (seeding) |
| `auth/roles.ts` | `ROLE_PERMISSIONS` matrix for 8 `AdminRole`s, `hasPermission(role, perm)` | `@/types` | re-exported by `auth/index.ts`; **not called by any admin API route** found in this audit — dead/unwired code path, see `05` |
| `events.ts` | Pure functions: `isUpcoming`, `sortByStart`, `upcomingEvents`, `pastEvents`, `formatEventDateRange` (IST-aware), `filterEvents`, `availableTopics`, `availableFormats` | `@/types` only — **no DB import**, matches `CLAUDE.md`'s description | `src/components/{upcoming-events-section,recent-past-events-section,events-explorer,event-filters}.tsx` (presumed; not individually re-read here) |
| `events.test.ts` | Injected-`now` unit tests for `events.ts`, per `CLAUDE.md`'s stated testing convention | `vitest`, `@/lib/events` | test runner |
| `admin-fullstack.test.ts`, `e2e-verification.test.ts` | Broader test suites touching the admin/DB stack and verification flow | `vitest`, `@/lib/db` (presumed) | test runner — **not individually traced in this file**; see `12-code-quality-testing.md`/`13` (other fork) for coverage claims |

## `src/types/`

| File | Purpose |
|---|---|
| `index.ts` | All domain types/interfaces: `ChapterEvent`, `RegistrationRecord`/`Input`, `AdminUser`, `AdminRole`, `ChapterTenant`, `AgendaSession`, `WorkshopSpeaker`/`Sponsor`/`Details`/etc., `Announcement`, `CertificateRecord`, `CommunityResource`, `AuditLogRecord`, `TeamMember`, `ChapterConfig`. This is the de facto schema contract between `db/index.ts` row-mapping code and every component. |
| `sqlite.d.ts` | Ambient module declaration for `node:sqlite` (`DatabaseSync`, `StatementSync`) — ships Node's experimental built-in SQLite type surface since no `@types` package exists for it |

## `src/content/` (CMS boundary per `CLAUDE.md`)

| File | Purpose | Notes |
|---|---|---|
| `chapter.ts` | Chapter-level config object (`name`, tagline, `joinUrl`, socials, nav) — typed as `ChapterConfig` | Static, hand-authored |
| `events.ts` | Static array of `ChapterEvent`s for the public listing; imports `devcraft-workshop.ts` for the one event with full workshop detail | Comment at top states event titles/dates were "transcribed from a screenshot the user supplied" — i.e. manually curated, not fetched live |
| `devcraft-workshop.ts` | Full `WorkshopDetails` object for the DevCraft 2025 event (pillars, learning objectives, personas, prep requirements, FAQ, agenda, speakers, sponsors, registration config) | Large hand-authored content block |
| `learning-areas.ts` | Simple `LearningArea[]` for the homepage "Where we focus" grid | Static |
| `team.ts` | Static `TeamMember[]` array | Comment states names/roles were "transcribed from a screenshot" — consistent with `CLAUDE.md`'s "no invented team members" rule, since this is a transcription of a real source, not a fabrication |

**Note**: `src/content/*.ts` (static file content) and `src/lib/db/index.ts` (SQLite `events`/`registrations` tables) are **two independent, unsynchronized data sources for "events."** The public `/events` page reads `src/content/events.ts`; `/admin` reads the SQLite `events` table seeded separately with `devcraft-2025` (`src/lib/db/index.ts:356-379`). `admin/page.tsx:8,66` explicitly reads both and displays them side-by-side (`staticEvents.length` vs `events.length`) rather than reconciling them — confirmed duplication, not a false positive.

## `src/components/`

| Group | Files | Purpose |
|---|---|---|
| `ui/` | `button.tsx`, `card.tsx`, `chip.tsx`, `empty-state.tsx`, `section-heading.tsx`, `text-field.tsx` | Shared design-system primitives per `CLAUDE.md` ("used by `/ui-preview` and every route"). `button.tsx` renders either `next/link` (`href`) or a native `<button>` depending on props (first 5 lines confirm `Link` import + variant/size typing). |
| `admin/` | `admin-header.tsx`, `admin-layout-shell.tsx`, `admin-login-form.tsx`, `agenda-builder-view.tsx`, `announcements-manager-view.tsx`, `attendance-hub-view.tsx`, `central-registrations-view.tsx`, `certificates-manager-view.tsx`, `chapter-settings-view.tsx`, `check-in-terminal.tsx`, `event-builder-form.tsx`, `events-manager-view.tsx`, `platform-analytics-view.tsx`, `registrations-table.tsx`, `resources-manager-view.tsx`, `speakers-manager-view.tsx`, `sponsors-manager-view.tsx`, `team-manager-view.tsx` | One client-side "manager/builder/hub" component per admin feature area, consumed by the matching `src/app/admin/*/page.tsx`. `admin-layout-shell.tsx` is fully traced in `02-system-architecture.md` and `05`/`06` (hardcodes "Jatush Hingu / Chapter Admin" in the footer regardless of actual logged-in user — `admin-layout-shell.tsx:151-157` — confirming it does not consume real session state). |
| `public/` | `certificate-lookup-view.tsx`, `contact-view.tsx`, `resources-view.tsx` | Client views for public-facing DB-backed pages |
| `workshop/` | `event-agenda-view.tsx`, `event-details-view.tsx`, `event-registration-view.tsx`, `event-speakers-view.tsx`, `event-sponsors-view.tsx` | Render the `WorkshopDetails` content type for a given event |
| top-level | `event-card.tsx`, `event-filters.tsx`, `events-explorer.tsx`, `event-status-section.tsx`, `event-sub-nav.tsx`, `faq.tsx`, `gdg-logo.tsx`, `mobile-nav.tsx`, `recent-past-events-section.tsx`, `site-footer.tsx`, `site-header.tsx`, `team-card.tsx`, `upcoming-events-section.tsx` | Shared public-site components, presumed consumers of `src/lib/events.ts` filter/sort helpers (not individually re-verified in this file) |

## `docs/` (pre-existing, not created by this audit)

| File | Apparent purpose | Caveat |
|---|---|---|
| `ARCHITECTURE.md`, `API_REFERENCE.md`, `DATABASE_SCHEMA.md`, `DEPLOYMENT.md`, `MULTI_TENANCY.md`, `ROLE_PERMISSIONS.md`, `IMPLEMENTATION_STATUS.md`, `PROJECT_AUDIT.md`, `FEATURE_TRACEABILITY.md`, `IMPLEMENTATION_PLAN.md` | Platform-era design/reference docs, uppercase naming | **Not verified line-by-line against code by this file** — other audit files in this package independently re-derive the same ground truth from source rather than trusting these; treat pre-existing docs as prior art, re-check before citing |
| `design-brief.md`, `design-reference.md`, `content-needed.md`, `implementation-plan.md` | Chapter-site-era docs, lowercase naming, referenced directly by `CLAUDE.md`'s brand/content rules | Still appear to be the operative brand/content source of truth per `CLAUDE.md` |

## Unused / Dead Code Observed in This Pass

- `src/lib/auth/roles.ts`'s `hasPermission` — exported, re-exported, never called (see `auth/index.ts` row above). Confirmed by inspecting the two admin API routes read in full during this audit (`api/admin/events/route.ts`, `api/admin/registrations/route.ts`); a repo-wide confirmation across all 15 admin routes is `06-admin-panel-audit.md`'s job (other fork).
- `src/app/README.md` content is generic boilerplate, effectively unused as project documentation.
