# Authentication Architecture

## What existed before (for the record)

Three disconnected authentication implementations coexisted in this repository:

1. `src/lib/auth/index.ts` + `src/lib/auth/roles.ts` — scrypt password hashing, a SQLite
   `sessions` table, an 8-role permission matrix. This powered the real `/admin/login` page
   and `/api/auth/{login,logout,me}`, but nothing ever called `validateSession()` from any
   `/admin/**` page or `/api/admin/**` route, and `hasPermission()` was never called anywhere.
2. `src/lib/auth.ts` (a second, flat file alongside the `auth/` directory) — a completely
   separate HMAC-signed single-passcode system (`ADMIN_SECRET`/`ADMIN_PASSWORD`, default
   `"devcraft-vcet-2025"`), powering a duplicate legacy admin UI at `/admin/console/**` and
   `/api/admin/{login,logout,session}`.
3. `src/proxy.ts` — a real `proxy`/`middleware` file (Next.js 16 does load `proxy.ts`; it is
   not a misnamed dead file as initially suspected) that enforced system #2's cookie
   (`gdg_admin_session`) on `/admin/console/**` and `/api/admin/**` — but explicitly let plain
   `/admin/**` (the actual admin panel) pass through unchecked (`if (!isConsoleRoute &&
   !isAdminApiRoute) return NextResponse.next()`), and even for `/api/admin/**` it checked a
   cookie that the real login flow never set. Net effect: the real admin panel had zero
   enforcement, and the real API routes were gated by a cookie nothing ever issued.

All of #2 and the old #3 were deleted (`src/lib/auth.ts`, its test, `src/proxy.ts`'s old body,
`src/app/admin/console/**`, `src/app/api/admin/{login,logout,session}`,
`src/components/admin/admin-header.tsx`) rather than patched, since they were fully dead,
duplicate, and built on a weaker scheme (single shared passcode) than the real system.

## What exists now

**Identity**: Firebase Authentication (email/password). **Session**: a Firebase session
cookie, verified server-side. **Authorization**: SQLite `users` table + the existing 8-role
`ROLE_PERMISSIONS` matrix — now actually enforced.

### Login flow

1. `admin-login-form.tsx` calls `signInWithEmailAndPassword` (Firebase Client SDK).
2. On success, it gets a fresh ID token and `POST`s it to `/api/auth/session`.
3. `src/app/api/auth/session/route.ts` verifies the ID token with the Admin SDK
   (`verifyIdToken`), looks up the matching SQLite profile by `firebase_uid`
   (`getAdminUserByFirebaseUid`), rejects if no profile or `status !== "active"`, then calls
   `createSessionCookie` and sets it as the `gdg_session` HttpOnly cookie (`Secure` in
   production, `SameSite=Lax`, `Path=/`, max-age from `SESSION_MAX_AGE_DAYS`, default 5 days).
4. The client-side Firebase auth state is left as-is (harmless) and additionally cleared on
   logout (`admin-layout-shell.tsx` calls `signOut()` alongside `POST /api/auth/logout`).

### Logout

`POST /api/auth/logout` deletes the cookie. It does **not** call `revokeRefreshTokens` — that
is reserved for account suspension (see Team lifecycle below), so logging out on one device
doesn't kill sessions on other devices, matching normal expectations.

### Server-side verification (`src/lib/auth/index.ts`)

- `getCurrentUser()`: reads the `gdg_session` cookie → `verifyFirebaseSessionCookie` (checks
  revocation too) → `getAdminUserByFirebaseUid` → returns `null` unless the SQLite row is
  `status === "active"`. **SQLite is always re-queried**; nothing about role/permission is
  trusted from the cookie itself, so a role change or suspension takes effect on the very next
  request, not "whenever the token happens to expire."
- `requireAuth()` / `requirePermission(permission)` / `requireChapterAccess(chapterId)`: throw
  a typed `AuthError(401 | 403)` that every route converts via `toAuthErrorResponse()`.

### Defense in depth: proxy + per-route checks

`src/proxy.ts` (Next.js 16's current convention — `middleware.ts` is deprecated) matches
`/admin/:path*`, `/api/admin/:path*`, `/api/events/:slug/check-in` and redirects/401s anyone
without a valid, active session **before the request reaches a page or route handler**. This
is coarse-grained ("is anyone logged in") and intentionally does not replace the fine-grained
`requirePermission("manage_x")` call that is the first line of every route handler body — both
layers exist on purpose; the proxy stops unauthenticated traffic at the edge, the route-level
check stops an authenticated-but-under-permissioned user.

## RBAC

See `RBAC_PERMISSION_MATRIX.md`. Permission grants are defined in `src/lib/auth/roles.ts`
(unchanged logic, now actually called). `super-admin` is the only role that can grant the
`super-admin` role to someone else (enforced in `POST`/`PATCH /api/admin/team`).

## Team/account lifecycle

- **Invite**: `POST /api/admin/team` creates (or reuses) a Firebase Auth user with no
  password, links it via `firebase_uid`, inserts the SQLite row with `status: "invited"`, and
  generates a password-reset link via `generatePasswordResetLink`. No shared or guessable
  password is ever set. If no email provider is configured, the response's `inviteSent: false`
  tells the caller the link exists but wasn't emailed — the admin UI must surface that link to
  hand to the invitee manually until a provider is wired up.
- **Suspend**: `PATCH /api/admin/team?id=...` with `status: "suspended"` updates SQLite and
  calls `disableFirebaseUser()`, which also calls `revokeRefreshTokens` — any session already
  in flight for that account dies on its next request, not just future logins.
- **Reactivate**: the inverse, `enableFirebaseUser()`.
- **Delete**: `DELETE /api/admin/team?id=...` removes the SQLite row (an admin cannot delete
  their own account). The Firebase identity itself is left intact by design — deleting it is a
  separate, more destructive operation this implementation does not expose.

## Known limitations / honest gaps

- No CSRF token is implemented. Risk is partially mitigated by `SameSite=Lax` (blocks
  cross-site `POST` form submissions from being sent with the cookie) but a dedicated
  double-submit CSRF token was in the original spec and was not built in this pass — see
  `SECURITY_REMEDIATION_REPORT.md`.
- Password reset/email-verification links are generated but not emailed (no provider
  configured) — see `RESEND_API_KEY` in `.env.example`.
- Firebase emulator-backed integration tests described in `TESTING_AND_QA.md` were written as
  a verification plan but could not be executed in this environment (no Java 21+ runtime
  available for `firebase-tools`) — run them yourself before trusting this in production.
