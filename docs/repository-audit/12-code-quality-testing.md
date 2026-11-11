# 12 — Code Quality & Testing Audit

## 1. Project Organization

- Standard Next.js App Router layout: `src/app/` (routes), `src/components/` (split into `admin/`, `public/`, `workshop/`, `ui/`, plus flat top-level shared components), `src/content/` (typed static content modules), `src/lib/` (business logic + `auth/`, `db/` subfolders), `src/types/` (shared types).
- Naming convention is consistent: kebab-case filenames, `PascalCase` exported component names, `*-view.tsx` suffix for admin feature screens (e.g. `sponsors-manager-view.tsx`, `agenda-builder-view.tsx`) and `*-view.tsx` for public views (`contact-view.tsx`, `resources-view.tsx`). Confirmed uniform across all 13 files in `src/components/admin/` and 4 files in `src/components/public/`.

## 2. Type Safety

`tsconfig.json` has `"strict": true` (line 7) with no overriding `"strict": false` elsewhere — this is the strict TypeScript baseline, confirmed enabled repo-wide. `npx tsc --noEmit` was run as part of this audit and **exited 0 with no output**, confirming the codebase currently typechecks cleanly under strict mode.

`npm run lint` (ESLint via `eslint-config-next` core-web-vitals + typescript configs, `eslint.config.mjs`) was also run and produced **no output / clean pass**.

Both checks ran successfully and read-only; no code was modified to achieve this result — it was the pre-existing state.

## 3. Code Duplication

Compared `src/components/admin/sponsors-manager-view.tsx`, `resources-manager-view.tsx`, `agenda-builder-view.tsx`, `announcements-manager-view.tsx`, `team-manager-view.tsx`: each independently implements the same pattern — local `useState` for a list + form, a `fetch("/api/admin/<feature>", { method: "POST", ... })` handler, and a `fetch(.../?id=...)` `DELETE` handler, each with its own hand-rolled `try/catch` and loading-state boilerplate. **Finding (QUAL-1):** This is a confirmed, repeated structural pattern (verified across 5 files) with no shared hook/helper abstraction (no `useAdminResource`-style hook or shared CRUD client exists in `src/lib/`). Reasonable technical debt to flag, though per repo convention (`CLAUDE.md`: "don't design for hypothetical future requirements") this is not automatically a defect — it's only worth fixing if a 6th+ occurrence or a bug fix needs to land in all of them at once.

## 4. Error Handling Consistency

Admin API routes (sampled: `src/app/api/admin/sponsors/route.ts`, `announcements/route.ts`, `team/route.ts`, `auth/login/route.ts`) consistently wrap logic in `try/catch` and return `NextResponse.json({ error, message: String(error) }, { status: 500 })` on failure. This is uniform but has a security/quality implication: raw `String(error)` (which can include stack-trace-adjacent detail or SQL error text from `node:sqlite`) is returned directly to the client in every sampled route — a confirmed pattern, flagged in the security audit (`10-security-audit.md`) as an information-disclosure concern; noted here as a code-quality consistency issue (it IS consistent, just consistently leaky).

## 5. Test Suite — What Exists and What's Covered

Four test files exist, all under `src/lib/`, run via `vitest` (`vitest.config.ts`: `environment: "node"`, `fileParallelism: false`):

| File | Lines | What it actually tests (verified by reading `describe`/`it` blocks) |
|---|---|---|
| `src/lib/events.test.ts` | 185 | Pure date/filter logic in `src/lib/events.ts` — `isUpcoming`, `upcomingEvents`/`pastEvents` sorting, `filterEvents`, `formatEventDateRange`, topic/format enumeration. Uses injected `now`, per `CLAUDE.md`'s documented testing approach. |
| `src/lib/db/index.test.ts` | 144 | Direct calls into `src/lib/db/index.ts` functions: DB init + stats, registration CRUD, duplicate-email rejection, required-field/CoC validation, check-in + double-check-in prevention, registration query filtering. |
| `src/lib/admin-fullstack.test.ts` | 174 | Direct calls into `src/lib/auth` (password hashing/verification, session create/validate/destroy) and `src/lib/db` (RBAC permission matrix, event CRUD/duplicate, certificate issue + bulk-issue, resource CRUD, chapter settings/analytics scoping). |
| `src/lib/e2e-verification.test.ts` | 225 | Also direct `src/lib` calls (not real HTTP/E2E despite the filename) — public event data integrity, registration engine validation paths, check-in/attendance, admin dashboard aggregate stats. |

**Finding (QUAL-2, confirmed by reading all four files):** All tests call library functions (`src/lib/db`, `src/lib/auth`, `src/lib/events`) directly in-process. **None** of them issue an HTTP request against a Next.js route handler, and **none** render a React component. Confirmed by: (a) no `fetch`/`supertest`/`next-test-api-route-handler` import in any test file, (b) no `@testing-library/react` or similar dependency in `package.json`. This means:
- The 16 `/api/admin/*` route handlers (request parsing, status codes, the complete absence of auth checks documented in `13-feature-completeness-matrix.md` and the security audit) are **not exercised by any test**.
- No React component — including every admin manager view and every public page — has a rendered test.
- The 3 public API routes (`register`, `check-in`, `stats` under `src/app/api/events/[slug]/`) are likewise untested at the HTTP layer; only their underlying `src/lib/db` logic is.

Despite this, the `src/lib` business-logic layer itself (validation rules, date logic, RBAC matrix, certificate issuance, duplicate-prevention) has meaningfully thorough coverage — this is a real strength, not just a gap.

No coverage report (e.g. `vitest run --coverage` output, `coverage/` artifacts) exists in the repo or was generated as part of this audit, so **no coverage percentage is claimed**, per audit rules.

## 6. Documentation Duplication / Technical Debt (Confirmed)

`docs/` contains two pairs of near-identically-themed files distinguished only by filename casing or synonymous naming, confirmed by directly diffing them:
- `docs/IMPLEMENTATION_PLAN.md` (183 lines, dated Nov 1) vs `docs/implementation-plan.md` (37 lines, dated Oct 29) — **these are genuinely different documents** (the uppercase file is a v2.0 "Platform Evolution" plan; the lowercase file is the original phase-tracking doc referenced by `CLAUDE.md`'s own "Known gaps" section, which explicitly cites `docs/implementation-plan.md` by its lowercase name). Confirmed via `diff` of the first 20 lines of each — content is unrelated, not a copy/rename artifact.
- **Finding (QUAL-3):** On case-insensitive filesystems (default macOS, default Windows — this repo's own dev environment per the session's Windows platform) `IMPLEMENTATION_PLAN.md` and `implementation-plan.md` are two files that *can* coexist on NTFS/APFS (case-preserving but not case-sensitive by default) but are a landmine for tooling, `git mv`, and human readers who will not reliably distinguish them. This is a real, evidenced naming-collision risk, not a cosmetic nit.
- Similarly `docs/DATABASE_SCHEMA.md`, `docs/MULTI_TENANCY.md`, `docs/ROLE_PERMISSIONS.md`, `docs/PROJECT_AUDIT.md`, `docs/FEATURE_TRACEABILITY.md`, `docs/IMPLEMENTATION_STATUS.md` are all separate uppercase docs added alongside the pre-existing lowercase `design-brief.md`/`design-reference.md`/`content-needed.md`/`implementation-plan.md` set — two documentation eras/conventions coexisting in the same directory without consolidation. This audit's own output under `docs/repository-audit/` is a third, separate convention, by design (per the task's explicit output-location instruction).

## 7. Summary

| Dimension | Verdict | Evidence |
|---|---|---|
| Type safety | Strong — strict mode, clean `tsc` | `tsconfig.json:7`, command run |
| Lint | Clean | command run |
| Naming conventions | Consistent | file tree inspection |
| Admin CRUD pattern duplication | Present, moderate | 5-file comparison |
| Error-response consistency | Consistent but leaks raw error strings | 4-route sample |
| Business-logic test coverage | Genuinely solid | 4 test files read in full |
| HTTP/route-handler test coverage | None | confirmed absence |
| Component test coverage | None | confirmed absence |
| Docs organization | Two overlapping eras, one case-collision | directory + diff evidence |
