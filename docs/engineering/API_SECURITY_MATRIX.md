# API Security Matrix

Verified with a production build (`npm run build && npm run start`) and `curl` against a
cold session (no cookie):

| Endpoint | Auth required | Verified behavior (no cookie) |
|---|---|---|
| `GET /admin` (and all `/admin/**`) | Yes | `307` → `/admin/login` |
| `GET /api/admin/events` (and all `/api/admin/**`) | Yes | `401 {"error":"Authentication required."}` |
| `POST /api/events/[slug]/check-in` | Yes (`manage_attendance`) | `401` (proxy-level) |
| `POST /api/events/[slug]/register` | No (by design) | `200`/`201` on valid input — public registration |
| `GET /api/events/[slug]/stats` | No (by design) | `200` — public event capacity display |
| `GET /api/certificates/verify/[id]` | No (by design) | `200` — public certificate verification |
| `POST /api/auth/session`, `/api/auth/logout`, `GET /api/auth/me` | N/A (these *are* the auth endpoints) | — |

Every `/api/admin/**` route additionally requires the specific permission listed in
`RBAC_PERMISSION_MATRIX.md`, enforced inside the route handler — the table above only shows
the coarse "logged in at all" layer enforced by `src/proxy.ts`.

## Rate limiting

In-memory, per-process, fixed-window (`src/lib/rate-limit.ts`) applied to the two public,
unauthenticated endpoints that are realistic abuse targets:

- `POST /api/events/[slug]/register`: 10 requests / 10 minutes / IP.
- `GET /api/certificates/verify/[id]`: 30 requests / 10 minutes / IP.

This is **not distributed** — on a multi-instance deployment each instance has independent
counters, so the effective limit is `limit × instance count`. Acceptable for blunting naive
scripted abuse today; move to a shared store (Redis, Upstash) before relying on it at scale.

## Error response sanitization

Every route that previously returned `message: String(error)` (leaking raw exception text,
including SQLite error strings, to the client) now logs the full error server-side via
`console.error` and returns a fixed, generic message. Confirmed by grep: zero remaining
`String(error)` interpolations inside a client-facing JSON response across `src/app/api/**`.
