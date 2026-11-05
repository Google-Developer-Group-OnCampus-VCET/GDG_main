# 05 — Authentication & Authorization Deep Audit

> Scope: `src/lib/auth/index.ts`, `src/lib/auth/roles.ts`, `src/app/api/auth/*`, `src/app/admin/**`, `src/app/api/admin/**`. All findings are static-read verified against source; nothing here was exploited live.

## 1. System Summary

There is **one** authentication system in the entire app: a custom SQLite-backed admin session mechanism. There is no end-user/attendee authentication — attendees register for events via a public form (`src/app/api/events/[slug]/register/route.ts`) with no account creation. "Authorization" is a client/server-side permission *library* (`src/lib/auth/roles.ts`) that exists and is unit-tested, but — critically — **is not invoked by any route or page in the application**, which is the single biggest finding of this audit (§4).

## 2. Registration

No self-service admin registration flow exists. Admin accounts are only created via:
- Seed data in `src/lib/db/index.ts:301-354` — 4 hardcoded accounts (`lead@vcet.edu.in`, `superadmin@gdg.community`, `organizer@vcet.edu.in`, `volunteer@vcet.edu.in`), all sharing the password `gdgvcet2025!` (`src/lib/db/index.ts:304`).
- `createAdminUser()` in `src/lib/db/index.ts:1698-1727`, exposed via `POST /api/admin/team` (`src/app/api/admin/team/route.ts`). New users are assigned the **same hardcoded default password** `gdgvcet2025!` (`src/lib/db/index.ts:1708`) with no forced reset or invite-token flow.

**Discrepancy:** `docs/ROLE_PERMISSIONS.md:39-65` documents different seed emails/passwords (`admin@gdgvcet.in`/`admin123`, `lead@gdgvcet.in`/`lead123`, etc.) than what the code actually seeds (`lead@vcet.edu.in`/`gdgvcet2025!`, etc., `src/lib/db/index.ts:311-353`). The doc is stale/aspirational, not a description of current behavior.

## 3. Login Flow

`src/app/api/auth/login/route.ts:5-67`:
1. Accepts `{ email, password }` JSON body (line 8).
2. Looks up `SELECT * FROM users WHERE LOWER(email) = ? AND status = 'active'` (line 18-20) — status check prevents suspended accounts from logging in.
3. Verifies password via `verifyPassword()` (line 29) — see §6 for hashing details.
4. On success, calls `createSession(user.id)` (line 38), which inserts a random 32-byte hex token into the `sessions` table with a 7-day expiry (`src/lib/auth/index.ts:27-38`).
5. Sets cookie `gdg_session` (`login/route.ts:52-58`): `httpOnly: true`, `secure: process.env.NODE_ENV === "production"`, `sameSite: "lax"`, `path: "/"`, `expires: <7 days>`.
6. Returns user object (id, name, email, role, chapterId) in the JSON body — no password/hash leakage observed.

No rate limiting, no account lockout, no CAPTCHA — `grep -rln "rate.?limit" src/` returns no matches repo-wide.

### Login UI quirk (not a backend issue, but notable)
`src/components/admin/admin-login-form.tsx:41-42` **pre-fills** the email/password fields with the real production-seeded admin credentials (`lead@vcet.edu.in` / `gdgvcet2025!`) and additionally renders a "Quick Role Switcher" (`admin-login-form.tsx:152-182`) that one-click-fills the credentials for all 4 roles, displaying `superadmin@gdg.community` as a selectable preset. Since every seeded account shares the same password (§2), this is a working credential-disclosure UI if ever deployed un-modified — see Security Audit (06/10) for severity.

## 4. Session Validation / "Middleware"

**There is no `middleware.ts` anywhere in the repository** (`find . -iname "middleware*"` returns nothing outside `node_modules`/`.next`). Next.js route protection patterns (middleware-based redirect, or a shared `requireAuth()` guard called from every handler) are absent.

`validateSession()` (`src/lib/auth/index.ts:40-72`) is the only function capable of checking a session token against the DB and expiry. A repo-wide grep (`grep -rn "validateSession" src/app src/components`) shows it is called **in exactly one place**: `src/app/api/auth/me/route.ts:14`. It is not called from:
- `src/app/admin/layout.tsx` (confirmed by reading the file — it only wraps `AdminLayoutShell` in `<Suspense>`, no auth check, lines 9-19).
- `src/components/admin/admin-layout-shell.tsx` — a `"use client"` component that renders nav based on `pathname` only (line 50-52); it has no session fetch, no redirect-if-unauthenticated logic anywhere in its ~185 lines.
- Any of the 11+ `src/app/api/admin/**/route.ts` files. Verified by `grep -n "validateSession\|hasPermission\|cookies\|auth" <file>` against every admin API route listed below — all returned no match:
  - `src/app/api/admin/events/route.ts`
  - `src/app/api/admin/events/[slug]/route.ts`
  - `src/app/api/admin/events/[slug]/duplicate/route.ts`
  - `src/app/api/admin/registrations/route.ts`
  - `src/app/api/admin/registrations/[id]/route.ts`
  - `src/app/api/admin/certificates/route.ts`
  - `src/app/api/admin/certificates/[id]/route.ts`
  - `src/app/api/admin/certificates/bulk-issue/route.ts`
  - `src/app/api/admin/settings/route.ts`
  - `src/app/api/admin/team/route.ts`
  - `src/app/api/admin/analytics/route.ts`
  - `src/app/api/admin/speakers/route.ts`
  - `src/app/api/admin/sponsors/route.ts`
  - `src/app/api/admin/resources/route.ts`
  - `src/app/api/admin/announcements/route.ts`
  - `src/app/api/admin/agenda/route.ts`
- Any `src/app/admin/**/page.tsx` server component (spot-checked `admin/page.tsx`, `admin/events/page.tsx`, `admin/events/new/page.tsx`, `admin/settings/page.tsx`, `admin/team/page.tsx` — none import or call `validateSession`/`cookies`/redirect logic).

**Conclusion (CRITICAL, cross-referenced in 10-security-audit.md as AUTH-01):** Any unauthenticated client can `curl`/`fetch` every admin API route and receive/modify full production data (attendee PII, certificates, settings, team/RBAC records) without a session cookie. The `/admin/*` pages are also unauthenticated — visiting them directly renders the full dashboard with live data, no redirect to `/admin/login`. The login screen and session system are fully implemented but **structurally disconnected** from the rest of the app — they only gate the `/api/auth/me` existence-check endpoint, which nothing else calls to decide access either (grep confirms zero call sites for `/api/auth/me` in `src/components` or `src/app` outside its own route file).

## 5. Logout

`src/app/api/auth/logout/route.ts:5-23`: reads the `gdg_session` cookie, calls `destroySession(token)` (deletes the DB row, `src/lib/auth/index.ts:74-78`), clears the cookie, returns success. Logically correct, triggered from `admin-layout-shell.tsx:54-63`. Since nothing checks the session to gate access anyway (§4), logout is cosmetic — a logged-out browser can still reach every `/admin/*` URL and call every `/api/admin/*` endpoint.

## 6. Password Hashing

`src/lib/auth/index.ts:6-21`:
```
hashPassword: scryptSync(password, randomSalt16B, 64) → "<saltHex>:<hashHex>"
verifyPassword: scryptSync again, crypto.timingSafeEqual() constant-time compare
```
This is a reasonable, modern approach (Node's `scrypt` is memory-hard, salt is random per call, comparison is timing-safe). No hardcoded/weak hashing found. Verified by `src/lib/admin-fullstack.test.ts:29-35` which asserts round-trip correctness. **This part of the system is well-built** — the problem is that nothing requires a valid session before executing privileged operations (§4), so strong hashing doesn't protect the admin surface as currently wired.

## 7. RBAC / Permission Model

`src/lib/auth/roles.ts:4-78` defines an 8-role matrix (`super-admin`, `chapter-admin`, `core-team`, `event-manager`, `registration-manager`, `check-in-volunteer`, `content-manager`, `analytics-viewer`) and `hasPermission(role, permission)`.

`grep -rn "hasPermission" src/app src/components` → **zero matches**. `hasPermission` is only referenced in its own test file (`src/lib/admin-fullstack.test.ts:8,54-65`) and re-exported from `src/lib/auth/index.ts:4`. The role matrix is fully implemented and correctly unit-tested in isolation but is **never called from a single route, page, or component** — RBAC is not enforced anywhere at runtime, contradicting `docs/ROLE_PERMISSIONS.md:6-9` ("Permissions are enforced both: Server-Side ... Client-Side ..."). That claim is UNVERIFIED-turned-FALSE by this audit.

## 8. Session Expiration

`validateSession()` (`src/lib/auth/index.ts:40-72`) checks `expires_at` against `Date.now()` and deletes expired sessions on read (lines 54-58) — correct lazy expiry. 7-day lifetime is hardcoded (`src/lib/auth/index.ts:30`), not configurable via env var. No refresh-token/sliding-expiration mechanism — not needed given cookie lifetime matches session lifetime.

## 9. Account Suspension

`users.status` supports `active | invited | suspended` (`src/lib/db/index.ts:81`, `src/types/index.ts`). Login query filters `status = 'active'` (`login/route.ts:19`) and `validateSession`'s JOIN also filters `u.status = 'active'` (`src/lib/auth/index.ts:48`) — so suspending a user does correctly invalidate their existing sessions on next validation call. However, since `validateSession` is barely used (§4), suspension has no practical effect on admin API/page access today.

## 10. CSRF

No CSRF token generation/verification found anywhere (`grep -rln "csrf" src/` → no matches). Risk is partially mitigated by `sameSite: "lax"` on the session cookie (blocks cross-site simple-GET auto-submission in most browsers for state-changing POSTs triggered by top-level navigation) but `lax` does not block cross-site fetch with credentials from a same-site context, and doesn't matter in practice since the APIs don't require the cookie at all (§4).

## 11. OAuth / Social Login / Email Verification / Password Reset

None found. No `oauth`, `passport`, `next-auth`, or similar packages in `package.json`. No password-reset route under `src/app/api/auth/`. No email-sending integration anywhere in the repo (`docs/content-needed.md` and this audit's `11-devops-deployment.md` — see that file — confirm no email provider is configured).

## 12. Sequence Diagram — Actual Login Flow

```mermaid
sequenceDiagram
    participant Browser
    participant LoginForm as admin-login-form.tsx
    participant API as /api/auth/login
    participant DB as SQLite (users, sessions)

    Browser->>LoginForm: Load /admin/login
    LoginForm->>LoginForm: Pre-fill email=lead@vcet.edu.in, password=gdgvcet2025!
    Browser->>LoginForm: Submit (or click preset + submit)
    LoginForm->>API: POST {email, password}
    API->>DB: SELECT * FROM users WHERE LOWER(email)=? AND status='active'
    DB-->>API: user row (incl. password_hash)
    API->>API: verifyPassword(password, user.password_hash) [scrypt + timingSafeEqual]
    alt invalid credentials
        API-->>LoginForm: 401 {error}
    else valid
        API->>DB: INSERT INTO sessions(token, user_id, expires_at)
        DB-->>API: ok
        API-->>Browser: Set-Cookie gdg_session (httpOnly, sameSite=lax, 7d); 200 {user}
        LoginForm->>Browser: router.push("/admin")
    end
    Note over Browser,DB: No subsequent request to /admin/* or /api/admin/* ever re-checks this cookie.
```

## 13. Protected Routes — Actual State

| Route family | Intended protection (per docs/UI) | Actual runtime protection |
|---|---|---|
| `/admin/login` | Public | Public (correct) |
| `/admin/*` (dashboard, events, team, settings, etc.) | Session-gated | **None** — fully open |
| `/api/admin/*` (15 route files) | Session + RBAC-gated | **None** — fully open |
| `/api/auth/me` | Session-gated read | Correctly checks session |
| `/api/auth/login`, `/logout` | Public | Public (correct) |
| `/api/events/[slug]/register`, `/check-in`, `/stats` | Public (attendee-facing) | Public (correct by design) |

## 14. Error Handling

All three auth routes (`login`, `logout`, `me`) wrap logic in `try/catch` and return generic JSON errors with appropriate status codes (400/401/500). `login/route.ts:62-65` includes `String(error)` in the 500 response body — a minor information-leakage concern (stack/message detail could leak internal state) but low severity since it's a catch-all exception path, not a common case.

## 15. Summary of Concrete Weaknesses (cross-referenced in `10-security-audit.md`)

1. **CRITICAL** — No authorization check on any `/admin/**` page or `/api/admin/**` route (§4). Full read/write access to attendee PII, certificates, settings, and RBAC/team management without authentication.
2. **HIGH** — Shared default password (`gdgvcet2025!`) across all seeded accounts and all newly-created team members (§2, §6), with no forced change.
3. **MEDIUM** — Admin login form pre-fills and one-click-selects real credentials in the UI, including the email of the `super-admin` preset (§3).
4. **MEDIUM** — `hasPermission()` RBAC engine is implemented and tested but entirely unused at runtime (§7) — a false sense of security if relied upon per `docs/ROLE_PERMISSIONS.md`.
5. **LOW** — No rate limiting / lockout on login attempts (§3).
6. **LOW** — No CSRF token scheme; mitigated partially by `SameSite=Lax` (§10).
7. **INFORMATIONAL** — `docs/ROLE_PERMISSIONS.md` seed credentials/emails do not match actual seed data in `src/lib/db/index.ts` (§2) — documentation drift.
