# Deployment Guide

## Blocking item — read `DATABASE_HOSTING_DECISION.md` first

Do not deploy to Vercel's standard serverless runtime until the SQLite persistence question
is resolved. Everything else in this guide assumes that's been handled (either a hosted DB
swap, or a non-serverless target where the local file is fine).

## Environment variables required in production

See `.env.example` for the full list and `FIREBASE_SETUP.md` for where each Firebase value
comes from. Summary of what must be set (vs. local-dev-only):

| Variable | Required in prod? |
|---|---|
| `NEXT_PUBLIC_FIREBASE_*` (5 vars) | Yes |
| `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` | Yes |
| `FIREBASE_AUTH_EMULATOR_HOST` / `FIREBASE_STORAGE_EMULATOR_HOST` / `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST` | No — leave unset in production |
| `SESSION_COOKIE_NAME` / `SESSION_MAX_AGE_DAYS` | No — sane defaults (`gdg_session`, 5 days) |
| `DATABASE_PATH` | Only relevant if still file-based; irrelevant after a hosted-DB swap |
| `RESEND_API_KEY` / `EMAIL_FROM` | Only if you want real announcement email delivery |

## Build / start

Standard Next.js: `npm run build` then `npm run start` (or your platform's Next.js adapter).
`npm run lint`, `npx tsc --noEmit`, and `npx vitest run` should all be run in CI before
deploying — see `TESTING_AND_QA.md` for current pass/fail status.

## CI/CD

**Not present.** No `.github/workflows/*`, no other CI config exists in this repository before
or after this pass — this was out of scope for this implementation (the spec's P0–P1 security
work took priority within the available time). A minimal workflow to add:

```yaml
# .github/workflows/ci.yml (not created — reference only)
on: [push, pull_request]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 24 }
      - run: npm ci
      - run: npx tsc --noEmit
      - run: npm run lint
      - run: npx vitest run
      - run: npm run build
```

## Storage rules deployment

`npx firebase deploy --only storage` (requires `firebase login` and a real project set in
`.firebaserc`, which currently points at the placeholder `gdg-vcet-dev` — change it to your
real project ID before deploying rules against a live project).

## Logging / monitoring

Not present before or after this pass. Errors are logged via `console.error` with route
context (see `API_SECURITY_MATRIX.md`'s sanitization note) — there is no log aggregation,
alerting, or APM wired up. Out of scope for this pass; flagged as a real gap.

## Backup / recovery

Not present. Whatever database you end up on (see `DATABASE_HOSTING_DECISION.md`), you need a
real backup policy before this holds real attendee PII and certificates at scale — nothing in
this codebase backs up `data/gdg.db` or a future hosted replacement today.
