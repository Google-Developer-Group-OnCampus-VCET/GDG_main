# Event Creation, Secrets & Operations Guide

Use this guide when creating real chapter events, configuring production secrets, and running registration + entrance check-in on `dhruv`.

---

## 1. Creating & Managing Events

### Option A — Admin Console UI (Recommended)
1. Sign in at `/admin/console/login`.
2. Open **Create Event** (`/admin/console/events/new`).
3. Fill out the event details and submit — this writes to Cloud Firestore (`events/{slug}`) and mirrors locally to SQLite (`data/gdg.db`).
4. Public pages are immediately live at:
   - Event listing: `/events`
   - Event detail page: `/events/<slug>`
   - Public registration form: `/events/<slug>/register`
5. Manage the event anytime from `/admin/console`:
   - **Toggle Open/Closed:** Click the `Registration Open` / `Registration Closed` pill on `/admin/console` or `/admin/console/events/<slug>/registrations`.
   - **Edit Event:** `/admin/console/events/<slug>/edit` (updates title, dates, venue, capacity, topics, summary, open state).
   - **Roster & Sheets Export:** `/admin/console/events/<slug>/registrations`
   - **Check-in Terminal:** `/admin/console/events/<slug>/check-in`
   - **Analytics:** `/admin/console/events/<slug>/analytics`

---

### Option B — API (`POST /api/admin/events` & `PATCH /api/admin/events/[slug]`)
Requires an authenticated `gdg_admin_session` cookie.

```json
{
  "title": "Build with AI VCET 2026",
  "slug": "build-with-ai-vcet-2026",
  "startsAt": "2026-12-05T10:00:00+05:30",
  "endsAt": "2026-12-05T17:00:00+05:30",
  "timezone": "Asia/Kolkata",
  "format": "in-person",
  "location": "Vidyavardhini's College of Engineering and Technology, Vasai (Auditorium)",
  "topics": ["ai-ml", "web"],
  "summary": "Hands-on workshop building Gemini-powered web apps.",
  "capacity": 120,
  "isRegistrationOpen": true
}
```

---

### Complete Event Property Reference (`events/{slug}`)

| Property | Type | Required | Default | Rules / Allowed Values |
|---|---|---|---|---|
| `title` | `string` | **Yes** | — | Non-empty event display title. |
| `slug` | `string` | No | Slugified `title` | Unique lowercase URL identifier (`a-z`, `0-9`, `-`). Used as Firestore doc ID and URL `/events/<slug>`. Cannot be changed after creation. |
| `startsAt` | `string` | **Yes** | — | ISO-8601 timestamp with IST offset (`YYYY-MM-DDTHH:mm:ss+05:30`) or date-only (`YYYY-MM-DD`). |
| `endsAt` | `string` | No | `undefined` | ISO-8601 timestamp (`YYYY-MM-DDTHH:mm:ss+05:30`). |
| `timezone` | `string` | No | `"Asia/Kolkata"` | IANA timezone string. |
| `format` | `EventFormat` | No | `"in-person"` | One of: `"in-person"`, `"online"`, `"hybrid"`. |
| `location` | `string` | No | `"Vidyavardhini's College of Engineering and Technology, Vasai"` | Campus room/hall or online meeting label. |
| `topics` | `EventTopic[]` | No | `["general"]` | Non-empty subset of: `"web"`, `"ai-ml"`, `"cloud"`, `"android"`, `"general"`. |
| `summary` | `string` | No | `undefined` | Short description shown on `/events`, `/events/<slug>`, and `/events/<slug>/register`. |
| `capacity` | `number` | No | `150` | Integer `>= 1`. Enforced atomically inside the Firestore registration transaction. |
| `isRegistrationOpen` | `boolean` | No | `true` | Controls whether `/events/<slug>/register` and `POST /api/events/<slug>/register` accept new signups. |

**Auto-managed fields (do not set manually):**
- `id`: UUID generated on creation.
- `registrationUrl`: `/events/<slug>/register`.
- `registeredCount`: Atomic counter maintained by `createFirestoreRegistration`.
- `createdAt`, `updatedAt`: ISO timestamps.
- **Pass Reference IDs:** Each non-DevCraft event automatically issues globally unique IDs in the format `GDG-<6-char-event-code>-0001` (collision-checked across all events).

> **Note on `devcraft-2025`:** `devcraft-2025` is currently seeded as a demo workshop in `src/content/events.ts` and `src/lib/db/index.ts`. Until removed from `src/content/events.ts`, you can close its registration in `/admin/console` (`Registration Closed`) so students cannot register for the placeholder event.

---

## 2. Secrets & Production Environment Handling

### Local Files (Never Commit)
- `.env.local` and `secrets/*-firebase-adminsdk-*.json` are ignored by `.gitignore`.
- **Never** run `git add -f` on `.env.local` or `secrets/`.
- Once you have copied `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY` to `.env.local` and your hosting provider, **store the downloaded JSON in a password manager or delete it from the workspace**.

### Production Environment Variables (Vercel / Cloud Run / Hosting)
Set these in your host's **Environment Variables** dashboard (do **not** reuse sample values from `.env.example`):

| Variable | Purpose | Production Guidance |
|---|---|---|
| `ADMIN_SECRET` | Chapter passcode login (`/admin/console/login`) | Replace `devcraft-vcet-2025` with a strong secret passphrase. |
| `ADMIN_EMAIL` | Fallback organizer email login | Set to lead organizer's real email. |
| `ADMIN_PASSWORD` | Fallback organizer password | Replace `devcraft-vcet-2025` with a strong unique password. |
| `ADMIN_SESSION_SECRET` | HMAC-SHA256 cookie signing key | Generate a 64-char hex secret (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`). |
| `FIREBASE_PROJECT_ID` | Admin SDK project ID | `gdgoc-vcet` |
| `FIREBASE_CLIENT_EMAIL` | Service account email | From service account JSON (`client_email`). |
| `FIREBASE_PRIVATE_KEY` | Service account RSA key | Paste full key from JSON; keep `\n` line escapes or wrap in quotes depending on host UI. |
| `NEXT_PUBLIC_FIREBASE_*` | Client Firebase SDK config | Safe to expose publicly (client config for `gdgoc-vcet`). |

### Firestore Rules & Key Rotation
- Deploy `firestore.rules` and `firestore.indexes.json` via Firebase CLI (`firebase deploy --only firestore`).
- If a service account JSON is ever exposed or shared accidentally, **revoke that key immediately** in Firebase Console → **Project Settings → Service Accounts** (or GCP IAM → Service Accounts → Keys) and generate a new one.

---

## 3. Entrance QR Check-in Workflow

- Every confirmed attendee pass encodes the exact `referenceId` string (e.g. `GDG-VCET-2025-0001` or `GDG-XXXXXX-0001`) inside a PNG QR code.
- `/admin/console/events/<slug>/check-in` supports both **Camera QR Scan** (click **Camera QR Scan** inside `Live Attendance Scanner` to use the rear camera with automatic 3-second duplicate-scan cooldown) and **manual / USB-scanner** entry of the `referenceId`.

