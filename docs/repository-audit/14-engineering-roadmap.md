# 14 — Engineering Roadmap

Prioritized from findings this fork directly verified (devops/deployment, code quality, testing, feature wiring). Auth- and security-specific items are pointed at `05-authentication-authorization.md` and `10-security-audit.md` rather than re-asserted here, except where the completeness-matrix work in `13-feature-completeness-matrix.md` surfaced a concrete, independently-confirmed gap.

## P0 — Critical (security / system integrity)

1. **No authentication enforcement on any `/api/admin/*` route or the `/admin` UI itself.** Confirmed by grepping all 16 admin API route files and reading `src/app/admin/layout.tsx` + `src/components/admin/admin-layout-shell.tsx` — zero session/role checks anywhere on the admin surface, despite `src/lib/auth/index.ts` implementing working session primitives that are simply never invoked from these entry points. See `13-feature-completeness-matrix.md` (cross-cutting note) and the dedicated auth/security docs for full detail. **This is the single highest-impact item in the whole audit** — every admin write operation (event edits, certificate issuance, registrant data, settings) is currently reachable by anyone who can reach the URL.
2. **Resolve before relying on it further:** the check-in terminal implies a shared-secret protection (`CHECKIN_TERMINAL_SECRET` in `.env.example`) that does not exist in code (confirmed zero references in `src/`). If check-in terminals are meant to be usable by non-admin staff without full admin credentials, this gap needs either removal from `.env.example` (if the model is "check-in requires admin login") or real implementation (if it's meant to be a lighter-weight secret).

## P1 — High priority (functional / correctness)

3. **Decide and document the actual production hosting target**, then resolve the SQLite file-persistence question accordingly (`11-devops-deployment.md`, DEVOPS-2). This is blocking: without it, nobody can safely deploy this app to production, and the correct fix (switch to a managed DB like Turso/LibSQL/Postgres, vs. provision a persistent-disk VM/container) depends entirely on the answer.
4. **Wire up or remove the 14 unused environment variables in `.env.example`.** Confirmed zero consumption of `SESSION_SECRET`, `SESSION_COOKIE_NAME`, `SESSION_MAX_AGE_DAYS`, `DATABASE_PATH`, the three `CLOUDINARY_*` vars, `RESEND_API_KEY`/`EMAIL_FROM`, `CHECKIN_TERMINAL_SECRET`, and the four `NEXT_PUBLIC_CHAPTER_*` vars. Either implement the features they imply (session secret actually signing sessions, configurable cookie name/TTL, real Cloudinary/Resend integration) or delete the misleading documentation — right now `.env.example` actively misrepresents the app's configurability to any new operator or contributor.
5. **Add HTTP-layer tests for at least the admin API routes and the three public event API routes.** Confirmed all 4 existing test files call `src/lib` functions directly, never a route handler. The business logic is well tested; the HTTP contract (status codes, error shapes, and — once P0 #1 lands — auth enforcement) is completely unverified by automated tests. This should follow immediately after P0 #1 is fixed, specifically to lock in a regression test proving the auth gate actually works.
6. **Stop leaking raw `String(error)` in API error responses** (confirmed pattern across every sampled admin/auth route) — tie this into whatever remediation the security audit prescribes; at minimum, log server-side and return a generic message to the client.

## P2 — Architectural improvements

7. **Introduce CI** (GitHub Actions or equivalent) running `npx tsc --noEmit`, `npm run lint`, and `npx vitest run` on every PR. Confirmed absent; both checks currently pass cleanly, so this is purely about *locking in* the current clean state, not fixing anything broken today.
8. **Reconcile the admin analytics page's data path.** `src/app/admin/analytics/page.tsx` calls `getPlatformAnalytics`/`getAllEventsAdmin` directly from `src/lib/db`, while a parallel `GET /api/admin/analytics` REST route also exists with an unverified consumer. Decide whether the REST route is dead code or meant for a different client (e.g., a future public dashboard or external integration) and document/remove accordingly.
9. **Extract a shared admin CRUD hook** to de-duplicate the fetch/loading/error pattern repeated near-identically across `sponsors-manager-view.tsx`, `resources-manager-view.tsx`, `agenda-builder-view.tsx`, `announcements-manager-view.tsx`, `team-manager-view.tsx` (confirmed by direct comparison). Worth doing once a 6th manager view needs the same pattern or a bugfix must land in all of them simultaneously — not urgent on its own.
10. **Add a `DELETE` capability to the announcements admin route** if announcements are meant to be manageable long-term (confirmed: `GET`/`POST` only, no delete path, unlike its sibling resource/agenda/sponsor routes which all support delete).

## P3 — Optimization / maintainability

11. **Resolve the `docs/` naming collision** between `IMPLEMENTATION_PLAN.md` and `implementation-plan.md` (confirmed genuinely different documents, not a duplicate) — rename one (e.g. `platform-evolution-plan.md` for the uppercase v2.0 doc) so case-insensitive filesystems and humans can't conflate them. Low risk, easy fix, real (confirmed) debt.
12. **Consolidate or clearly cross-link the two generations of `docs/`** (the earlier lowercase design/content docs vs. the newer uppercase architecture/database/role docs) so a new contributor doesn't have to guess which is current.

## P4 — Future enhancements

13. Once a production DB target is chosen (P1 #3), consider adding basic backup/export tooling — confirmed entirely absent today, acceptable for current dev-stage use but a genuine gap before any real event relies on this platform.
14. If `agentFeedback` and other `experimental` Next.js 16 flags in `next.config.ts` are intentional forward bets, document why; if vestigial, remove — flagged UNVERIFIED in `11-devops-deployment.md`, worth a deliberate decision rather than silent carry-forward.
