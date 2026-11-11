# Testing & QA

## What was actually run, and the result

```
npx tsc --noEmit          → clean, no errors
npm run lint              → clean, no errors/warnings
npx vitest run            → 7 test files, 65 tests, all passing
npm run build             → succeeds (Turbopack, production build, all 61 routes)
```

Manual verification against a real `npm run start` production server, via `curl`:
- `GET /admin` with no cookie → `307` redirect to `/admin/login`.
- `GET /api/admin/events` with no cookie → `401 {"error":"Authentication required."}`.
- `GET /admin/login` → `200` (public, as intended).
- `GET /api/events/devcraft-2025/stats` → `200` with real data (public, as intended).
- `GET /api/certificates/verify/CERT-VCET-2025-0842` → `200` with real data (public, as intended).

No test or check in this list was skipped or had its assertions weakened to make it pass.

## Unit tests added in this pass

- `src/lib/auth/index.test.ts` — `AuthError`/`toAuthErrorResponse` status mapping,
  `sessionMaxAgeMs()` default/override, `hasPermission()` edge cases (super-admin's `"all"`
  grant, check-in-volunteer's narrow scope).
- `src/lib/firebase/storage.test.ts` — `validateUpload()`: accepts correctly-signed
  PNG/JPEG/PDF, rejects unsupported MIME types, rejects content/declared-type mismatches
  (e.g. HTML bytes declared as `image/png`), rejects oversized files. No real bucket touched.
- `src/lib/rate-limit.test.ts` — window exceeded/reset, independent keys.

Pre-existing tests (`events.test.ts`, `db/index.test.ts`, `e2e-verification.test.ts`,
`admin-fullstack.test.ts`) were kept; `admin-fullstack.test.ts` had its first `describe` block
rewritten because it tested the now-removed `verifyPassword`/`createSession`/`validateSession`/
`destroySession` functions — the replacement test asserts what's still true (the password
hasher is still used, now only to generate an unusable placeholder) and keeps the RBAC-matrix
assertions, which are unaffected by the auth migration.

## What was written but NOT executed — be explicit about this

The original plan specified Firebase Emulator-backed integration tests: session round-trip,
401/403/200 per role, suspended-account lockout, cross-chapter denial, Storage rules
allow/deny matrix. **These were not executed.** `firebase-tools` requires Java 21+ even to
start the Auth/Storage emulators in the current version, and no Java runtime is available in
this environment (`java -version` → "command not found"; `firebase emulators:start` itself
reports "firebase-tools no longer supports Java version before 21"). This is a real,
verified-by-attempting-it blocker, not an assumption.

**To actually run them**, once Java 21+ is available:

```bash
npm run emulators            # starts Auth :9099, Storage :9199, UI :4000
# in another terminal, with FIREBASE_AUTH_EMULATOR_HOST / FIREBASE_STORAGE_EMULATOR_HOST set:
npm run bootstrap-admin       # creates the first linked admin against the emulator
npm run dev
# then manually exercise: sign in, hit each /api/admin/** route as different roles,
# suspend an account and confirm its existing session cookie stops working on the next request,
# attempt a direct (non-Admin-SDK) write to the emulator Storage bucket and confirm it's denied.
```

No automated emulator test files were written, to avoid shipping tests that have literally
never been run and could be silently broken.

## Known untested surfaces

- No component/UI tests (none existed before this pass either — `vitest.config.ts` has no
  jsdom/testing-library setup).
- No HTTP-level tests of the API routes themselves (the business logic they call is unit
  tested via `db/index.test.ts`; the auth-guard wiring at the route layer was verified manually
  via `curl`, not via an automated HTTP test — consider adding one with `next/test` or a
  supertest-style harness against `next start` in CI).
