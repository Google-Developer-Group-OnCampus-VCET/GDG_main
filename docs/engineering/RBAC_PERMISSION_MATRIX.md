# RBAC Permission Matrix

Source of truth: `src/lib/auth/roles.ts`. Enforcement: `requirePermission()` as the first line
of every `/api/admin/**` route handler (and `/api/events/[slug]/check-in`), backed by
`src/proxy.ts` at the edge. Confirmed by `curl` against a production build with no session
cookie: `/admin` → `307` to `/admin/login`; `/api/admin/events` → `401`.

| Permission | super-admin | chapter-admin | core-team | event-manager | registration-manager | check-in-volunteer | content-manager | analytics-viewer |
|---|---|---|---|---|---|---|---|---|
| manage_chapters | ✅ | | | | | | | |
| manage_events | ✅ | ✅ | ✅ | ✅ | | | | |
| manage_registrations | ✅ | ✅ | ✅ | ✅ | ✅ | | | |
| manage_attendance | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | | |
| manage_speakers | ✅ | ✅ | ✅ | ✅ | | | ✅ | |
| manage_sponsors | ✅ | ✅ | ✅ | ✅ | | | ✅ | |
| manage_agenda | ✅ | ✅ | ✅ | ✅ | | | | |
| manage_team | ✅ | ✅ | | | | | | |
| manage_announcements | ✅ | ✅ | ✅ | | | | ✅ | |
| manage_certificates | ✅ | ✅ | | | | | | |
| manage_resources | ✅ | ✅ | ✅ | | | | ✅ | |
| view_analytics | ✅ | ✅ | ✅ | ✅ | ✅ | | | ✅ |
| manage_settings | ✅ | ✅ | | | | | | |

`super-admin` additionally holds the literal `"all"` grant (`hasPermission` short-circuits to
`true` for any permission string when the role's list contains `"all"`), so it also covers any
permission added later without an explicit matrix update — by design, not an oversight.

## Route → permission mapping

| Route | Methods | Permission |
|---|---|---|
| `/api/admin/events`, `/api/admin/events/[slug]`, `.../duplicate` | GET/POST/PUT/DELETE | `manage_events` |
| `/api/admin/registrations`, `/api/admin/registrations/[id]` | GET/PATCH | `manage_registrations` |
| `/api/events/[slug]/check-in` | POST | `manage_attendance` |
| `/api/admin/speakers` | GET/POST/PATCH/DELETE | `manage_speakers` |
| `/api/admin/sponsors` | GET/POST/PATCH/DELETE | `manage_sponsors` |
| `/api/admin/agenda` | GET/POST/PATCH/DELETE | `manage_agenda` |
| `/api/admin/team` | GET/POST/PATCH/DELETE | `manage_team` (+ `super-admin`-only check to grant the `super-admin` role) |
| `/api/admin/announcements` | GET/POST/DELETE | `manage_announcements` |
| `/api/admin/certificates`, `.../[id]`, `.../bulk-issue` | GET/POST/PATCH | `manage_certificates` |
| `/api/admin/resources` | GET/POST/PATCH/DELETE | `manage_resources` |
| `/api/admin/analytics` | GET | `view_analytics` |
| `/api/admin/settings` | GET/POST | `manage_settings` |
| `/api/admin/upload` | POST | Mapped per `entity` field (events→manage_events, speakers→manage_speakers, sponsors→manage_sponsors, chapters→manage_settings, resources→manage_resources) |

## Cross-tenant (IDOR) notes

`chapterId` is **never** taken from a client-supplied query/body param for scoping a read or
write — every route uses `user.chapterId` from the verified session. The one exception is
`/api/admin/analytics?chapterId=`, which only honors the client-supplied value when the
caller's role holds `"all"` (i.e. `super-admin`); every other role is forced to its own
chapter regardless of what it passes.
