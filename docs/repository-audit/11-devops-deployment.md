# 11 — DevOps & Deployment Audit

Scope: environment configuration, build config, hosting/CI assumptions, logging, backup/recovery. Evidence-based; read-only inspection.

## 1. Environment Variables

Declared in `.env.example` (lines 1-26), values redacted:

| Variable | Declared purpose (per comment) | Actually consumed in `src/`? |
|---|---|---|
| `NEXT_PUBLIC_CHAPTER_ID` | Chapter identifier | **No** — no match for `process.env` reference in `src/` (verified via repo-wide grep) |
| `NEXT_PUBLIC_CHAPTER_NAME` | Chapter display name | **No** |
| `NEXT_PUBLIC_CHAPTER_CITY` | Chapter city | **No** |
| `NEXT_PUBLIC_SITE_URL` | Site base URL | **No** |
| `SESSION_SECRET` | Session signing secret | **No** — `src/lib/auth/index.ts` (full file read) never references it; sessions are unsigned random tokens, see below |
| `SESSION_COOKIE_NAME` | Cookie name | **No** — cookie name `"gdg_session"` is hardcoded in `src/app/api/auth/login/route.ts:52` |
| `SESSION_MAX_AGE_DAYS` | Session TTL | **No** — `7 * 24 * 60 * 60 * 1000` (7 days) is hardcoded in `src/lib/auth/index.ts:30` |
| `DATABASE_PATH` | SQLite file location | **No** — path is hardcoded as `path.join(process.cwd(), "data", "gdg.db")` in `src/lib/db/index.ts:25-29` |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Image upload | **No** — no Cloudinary SDK in `package.json` dependencies, no reference anywhere in `src/` |
| `RESEND_API_KEY` / `EMAIL_FROM` | Email delivery | **No** — no email SDK dependency, no reference in `src/` |
| `CHECKIN_TERMINAL_SECRET` | QR/barcode check-in terminal auth | **No** — `src/app/api/events/[slug]/check-in/route.ts` has no reference to this variable |

**Finding (DEVOPS-1, evidence-grade: confirmed):** A repo-wide `grep -rn "process.env" src/` returns exactly one hit — `process.env.NODE_ENV` in `src/app/api/auth/login/route.ts:54` (used only to toggle the `secure` cookie flag). None of the 14 variables documented in `.env.example` are read anywhere in application code. The file is aspirational/decorative, not wired up. Any operator who sets these in production gets no effect; all "optional cloud integrations" described as having "graceful fallback to local/stub" in fact have no code path at all, stub or otherwise.

## 2. Build Configuration (`next.config.ts`)

- `cacheComponents: true`, `partialPrefetching: true` (lines 20-21) — per `CLAUDE.md`, this requires any component reading `searchParams`/`cookies`/`headers` to be wrapped in `<Suspense>` or the build fails. Confirmed the production build pipeline (`npm run build`) is the enforcement point; not re-run destructively here, but `npx tsc --noEmit` passed with exit code 0 and `npm run lint` passed with no output (both read-only, run in this audit), so no outstanding type or lint errors exist as of this audit.
- `experimental.agentFeedback: true` (line 17) — Next.js 16 experimental flag; purpose not independently documented by this fork, flagged as **UNVERIFIED** beyond its presence in config.
- `images.remotePatterns` allow `*.googleusercontent.com` and `lh3.googleusercontent.com` (lines 6-14) — suggests Google account avatar images are an anticipated image source, though no code in `src/` currently constructs such URLs (UNVERIFIED whether this is forward-looking or vestigial).
- `turbopack.rules["*.css"]` wires Tailwind v4 via `@tailwindcss/turbopack` loader (lines 22-27).

## 3. Database Deployment Model — Architectural Risk

- `src/lib/db/index.ts` uses `node:sqlite`'s `DatabaseSync` against a file at `./data/gdg.db` (confirmed lines 3, 25-29), with `PRAGMA journal_mode = WAL` (line 48).
- The database files (`data/gdg.db`, `data/gdg.db-shm`, `data/gdg.db-wal`) exist on disk in the working tree. `.gitignore` lines "local database" section (`data/*.db*`, `data/*.db-wal`, `data/*.db-shm`) excludes them from version control, so they are *not* committed — correcting an assumption made available in the parent task framing. This is still a **deployment risk**, not a non-issue: the directory-creation logic (`fs.mkdirSync(DATA_DIR, { recursive: true })`, lines 26-28) will run on every cold start, and a fresh filesystem means a fresh, empty database unless the deployment target provides persistent writable disk.
- **Finding (DEVOPS-2):** File-backed SQLite with local writable-disk assumptions is incompatible with typical serverless/edge hosting (e.g., Vercel's default Next.js deployment target), where the filesystem is ephemeral per invocation/instance and not shared across instances. No deployment target is declared anywhere in the repo (no `vercel.json`, no Dockerfile, no platform-specific config found — confirmed via directory listing), so the intended production host is **UNVERIFIED**. If the intended target is a traditional long-running Node server with a persistent volume, this is fine; if it is Vercel/serverless, registrations, sessions, and all admin data will not persist reliably across deploys/instances.

## 4. CI/CD

- No `.github/workflows/`, no `Dockerfile`, `docker-compose.yml`, or other CI config files exist in the repository (confirmed: `find . -iname "docker*" -o -iname "*.yml" -o -iname "*.yaml"` returned no matches outside `node_modules`, and `.github/` does not exist).
- **Finding (DEVOPS-3):** There is no automated CI pipeline running `tsc`, `eslint`, or `vitest` on push/PR. All quality gates are manual (`npm run build`, `npm run lint`, `npx vitest run`, per `CLAUDE.md`'s Commands section). This is a real, confirmed gap, not a guess.

## 5. Dev vs. Production Differences

The only prod/dev branch in the codebase is `process.env.NODE_ENV === "production"` controlling the `secure` flag on the session cookie (`src/app/api/auth/login/route.ts:54`). No other environment-conditional behavior (feature flags, logging verbosity, different DB targets) was found in `src/`.

## 6. Logging & Monitoring

No logging library (e.g., pino, winston) appears in `package.json` dependencies, and no structured logging calls were found; error paths in API routes return raw `String(error)` in JSON responses (e.g., `src/app/api/auth/login/route.ts:63`) rather than logging server-side. No monitoring/APM integration (Sentry, Datadog, etc.) exists in dependencies. **Confirmed absent.**

## 7. Backup & Recovery

No backup, snapshot, or export tooling for `data/gdg.db` exists in the repo (no scripts in `package.json`, no cron/task definitions). Because the file is git-ignored and lives only on the runtime filesystem, there is currently no recovery path if that file is lost — this compounds the risk in Section 3.

## Summary of Confirmed Gaps

| Area | Status |
|---|---|
| Environment variable wiring | Declared but unused (DEVOPS-1) |
| CI/CD | Absent (DEVOPS-3) |
| Containerization | Absent |
| Production hosting target | Unverified/undeclared |
| DB persistence strategy for prod | Unaddressed, high risk if serverless (DEVOPS-2) |
| Logging/monitoring | Absent |
| Backup/recovery | Absent |
