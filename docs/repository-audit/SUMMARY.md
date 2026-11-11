# Repository Audit — Executive Summary

Full detail lives in the 16 files in this folder (`README.md` + `01`–`15`). This is the short version.

## What this is
GDG on Campus VCET chapter site, grown into a multi-event workshop platform: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4, raw SQLite (`node:sqlite`) with no ORM, hand-rolled scrypt-based auth. No CI/CD, no Docker, no hosting target declared.

## 🔴 Critical — fix first
**The entire admin panel and all admin APIs are unauthenticated.**
- No `middleware.ts` anywhere. `src/app/admin/layout.tsx` and all 18 `/admin/**` pages only redirect client-side in React — this doesn't gate anything server-side.
- All ~16 `/api/admin/**` routes (events, registrations, speakers, sponsors, certificates, team, settings, announcements, resources, agenda, analytics) hit the database directly with zero session/role checks. One route can create a new **super-admin** account with no auth at all.
- A real session/RBAC system exists (`src/lib/auth/index.ts`, `roles.ts`) but is only called from `/api/auth/me` — everywhere else it's dead code.
- Default seeded admin password (`gdgvcet2025!`) is shared across accounts and pre-filled/one-click in the login form.
- Audit logging exists (`logAuditEvent`) but is never invoked, and every mutation hardcodes the actor as `usr-admin` / `lead@vcet.edu.in` regardless of caller.

## Other confirmed findings
- **SQL injection: ruled out.** All ~40 query sites use parameterized `?` placeholders correctly.
- FK enforcement pragma is never set in SQLite — declared foreign keys/cascades don't actually fire. Also: a cross-tenant leak in `getAdminUsers`, and a certificate-ID collision race.
- Two disconnected event data sources: static `src/content/events.ts` vs. the SQLite `events` table — admin-created events likely never reach the public site.
- DB seed runs unconditionally on every server boot, recreating demo admin accounts + 124 synthetic records each time.
- All 14 vars in `.env.example` (`SESSION_SECRET`, Cloudinary, Resend, etc.) are declared but **unused by any code** — config surface is misleading.
- Speakers/Sponsors/Agenda/Resources admin features are missing "update" operations (create/list/delete only). Announcements "send" is simulated — no email provider wired up.
- `tsc` and `eslint` pass clean. Tests cover `src/lib` business logic well but never exercise API routes or UI components.
- Committed `data/gdg.db` / `.db-wal` files in the repo are a deployment risk — file-based SQLite doesn't suit typical serverless/ephemeral-filesystem hosting.
- Doc duplication: `docs/IMPLEMENTATION_PLAN.md` vs `docs/implementation-plan.md` collide on case-insensitive filesystems.

## Priority roadmap
- **P0:** Add real server-side auth enforcement to every `/admin/**` page and `/api/admin/**` + check-in route; rotate/remove the shared default password.
- **P1:** Reconcile the two event data sources; enable SQLite FK pragma; fix audit-log actor attribution; wire or delete unused env vars.
- **P2:** Add update operations for speakers/sponsors/agenda/resources; decide on a real hosting target compatible with the SQLite file model.
- **P3/P4:** API/route test coverage, real email provider for announcements, de-duplicate docs naming.

Full evidence with file:line citations is in `05-authentication-authorization.md`, `06-admin-panel-audit.md`, `08-api-inventory.md`, `10-security-audit.md`, and `14-engineering-roadmap.md`.
