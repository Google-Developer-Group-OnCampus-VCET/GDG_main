# Database Hosting Decision — SQLite on Vercel

**Status: unresolved production blocker.** You confirmed Vercel is the real deploy target.
This was documented, not silently fixed, per the instruction not to replace the database
engine without a real credential to migrate to.

## The problem, factually

`src/lib/db/index.ts` uses Node's native `node:sqlite` (`DatabaseSync`) against a file at
`./data/gdg.db` (WAL mode: also `./data/gdg.db-wal`, `./data/gdg.db-shm`). Vercel's serverless
functions:

- Run on an **ephemeral, per-invocation filesystem** — anything written to `data/gdg.db`
  during one invocation is not guaranteed to exist on the next one, and almost certainly won't
  be visible to a *different* function instance handling a concurrent request.
- Run **multiple concurrent instances**, each of which would get its own independent SQLite
  file — so two admins hitting different instances would see different, diverging data, and
  any instance that spins down loses its writes entirely.

Firebase Authentication and Firebase Storage (added in this pass) do **not** touch this
problem at all — they solve identity and file storage, not relational data persistence. Events,
registrations, attendance, certificates, and audit logs all still live in this same SQLite
file, and all of that is at risk the moment this runs on Vercel's standard serverless runtime.

## What was NOT done, and why

A live migration to a hosted database (Turso/libSQL, Vercel Postgres, Neon, etc.) was **not**
performed, because it needs a real credential (a Turso auth token, a Postgres connection
string) that doesn't exist yet — fabricating one or silently swapping the driver without a
real target to test against would produce code that looks done but has never actually
connected to anything. This mirrors the same constraint that kept Firebase on the emulator:
don't claim a live connection that was never verified.

## Recommended path (do this before shipping to Vercel)

**Swap `node:sqlite` for `@libsql/client` against Turso.** This is the smallest-surface-area
option because Turso speaks SQLite's dialect — the ~85 hand-written SQL statements in
`src/lib/db/index.ts` do not need to be rewritten, only the connection/`prepare()`/`run()`/
`get()`/`all()` call shapes need a thin adapter (libSQL's client API is close enough that most
call sites change only in how the client is obtained, not in SQL).

Steps once you have a Turso account:
1. `turso db create gdg-vcet` → `turso db show gdg-vcet --url` → `turso db tokens create gdg-vcet`.
2. `npm install @libsql/client`.
3. Replace `new DatabaseSync(DB_PATH)` in `getDatabase()` with
   `createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN })`.
4. Adjust the `.prepare(sql).run(...)`/`.get(...)`/`.all(...)` call sites — libSQL's client
   exposes `execute()`/batched execute rather than a prepared-statement handle; this is a
   mechanical pass over the same file, not a redesign of the data model.
5. Re-run `npx vitest run` (the existing `src/lib/db/index.test.ts` and
   `src/lib/admin-fullstack.test.ts` exercise most of the surface) and fix whatever the adapter
   change breaks.
6. Keep the local file-based path as the default when `TURSO_DATABASE_URL` is unset, so local
   dev/testing is unaffected.

**Alternative**, if you'd rather consolidate on Google Cloud since Firebase is already in the
stack: Cloud SQL (Postgres) + a real ORM/query builder — a bigger rewrite (every hand-written
SQLite query would need a Postgres-dialect equivalent), not recommended as the first move.

## If Vercel is not actually final

If there's any chance the real target is a traditional VM, a Fly.io/Render persistent-disk
deployment, or a container with a mounted volume, **none of the above is necessary** — file
SQLite is fine there, and this entire document becomes moot. Confirm the actual target before
spending the migration effort above.
