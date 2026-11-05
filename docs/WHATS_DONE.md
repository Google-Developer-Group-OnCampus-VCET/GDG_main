# GDG on Campus VCET — Completed Work & Architecture Summary

**Branch:** `dhruv` (synced to `dev-dhruv`)  
**Commit:** `5fe48df`  
**Stack:** Next.js 16.4.3 (Turbopack, Cache Components, Partial Prerendering), React 19.3.0, TypeScript 5, Tailwind CSS v4, Firebase SDK 12 / Firebase Admin 13, `node:sqlite`, Vitest 3.2.7  
**Verification:** 48/48 Vitest tests passing · 0 TypeScript errors · 0 ESLint warnings · 39/39 Next.js production build routes compiled  

---

## 1. Firebase Backend & Dual-Engine Persistence

The platform is backed by a resilient dual-engine architecture: Cloud Firestore is the primary cloud database, backed by a high-performance local SQLite database (`node:sqlite`) with WAL mode for offline development and local caching.

### Firestore Collections Architecture

- **`events` collection**
  - Document ID: `slug` (e.g. `devcraft-2025`, `cloud-community-day-2026`)
  - Fields: `id`, `slug`, `title`, `startsAt`, `endsAt`, `timezone`, `format`, `location`, `topics`, `summary`, `capacity`, `isRegistrationOpen`, `registrationUrl`, `createdAt`, `updatedAt`
- **`registrations` collection**
  - Document ID: Auto-generated Firestore ID
  - Fields: `id`, `eventSlug`, `referenceId` (unique `GDG-VCET-2025-XXXX`), `fullName`, `email`, `phone`, `college` (defaults to VCET), `department`, `yearOfStudy`, `track`, `experienceLevel`, `portfolioUrl`, `notes`, `status`, `checkedIn`, `checkedInAt`, `createdAt`

### Key Modules Implemented
- `src/lib/firebase/client.ts`: Singleton Firebase Client SDK configured with project `gdgoc-vcet` and Web App `1:588213745315:web:4059f5e1ca7ccacdef3116`. Exposes `loginWithEmail()`.
- `src/lib/firebase/admin.ts`: Singleton Firebase Admin SDK with graceful fallback and build-time safety (`isFirebaseAdminConfigured()` prevents unconfigured `crypto.randomBytes` calls during Next.js static prerendering).
- `src/lib/db/firestore.ts`: Firestore adapter implementing:
  - `createFirestoreEvent()` & `getFirestoreEvents()`
  - `createFirestoreRegistration()` with atomic transactional capacity limits & duplicate detection
  - `checkInFirestoreAttendee()` with double check-in prevention
  - `seedFirestoreInitialEvents()` auto-seeding default chapter events into Firestore
- `src/lib/db/index.ts`: Unified dual-engine facade exposing `createEventAsync()`, `getAllEventsAsync()`, `createRegistrationAsync()`, `getEventStatsAsync()`, and `checkInAttendeeAsync()`.

---

## 2. Event Creation & Management (Admin Console)

Dynamic event creation is wired end-to-end to Cloud Firestore with full offline SQLite mirroring.

- **Admin Create Event Page** (`src/app/admin/console/events/new/page.tsx`):
  - Real-time slug auto-generation from title (with custom override option).
  - Format selector (`In-Person`, `Online`, `Hybrid`).
  - Native `datetime-local` date/time pickers.
  - Interactive multi-select category pills (`Modern Web`, `Cloud & DevOps`, `AI / ML & Gemini`, `Android & Mobile`, `General`).
  - Seating capacity selector and instant registration open toggle.
- **Admin Events API** (`src/app/api/admin/events/route.ts`):
  - `POST /api/admin/events`: Authenticated event publication with slug deduplication (`409 Conflict` on duplicates).
  - `GET /api/admin/events`: Fetch dynamic event directory.
- **Console Dashboard** (`src/app/admin/console/page.tsx`):
  - Added **"+ Create Event"** button in primary action header.
  - Chapter events directory dynamically displays newly published Firestore events alongside historical archives.

---

## 3. Admin Authentication & Security

- **Obfuscated Route**:
  - The public `/admin` and `/admin/login` paths return **404 Not Found**.
  - All admin operations reside at `/admin/console`.
  - Middleware (`src/proxy.ts`) enforces HMAC-SHA256 session tokens (`gdg_admin_session`) and redirects unauthenticated users to `/admin/console/login`.
- **Refined Authentication** (`src/app/admin/console/login/page.tsx`):
  - **Removed Google Sign-in**: No third-party popups, redirect loops, or external OAuth friction.
  - **Email & Password Tab**: Validates against Firebase Authentication users or `.env.local` fallback.
  - **Chapter Passcode Tab**: Validates secret passcode against `ADMIN_SECRET`.
- **Credential Storage**:
  - `.env.local` / deployment environment:
    ```env
    ADMIN_SECRET=devcraft-vcet-2025
    ADMIN_EMAIL=lead@vcet.edu.in
    ADMIN_PASSWORD=devcraft-vcet-2025
    ```
  - Firebase Console: Supports creating multiple organizer accounts under *Authentication > Users*.

---

## 4. Google Sheets Universal Export

Implemented in `src/lib/sheets-export.ts` across all data views:

1. **Direct CSV Download**: Generates UTF-8 encoded files with Byte Order Mark (`\uFEFF`) to prevent character distortion in Microsoft Excel and Google Sheets.
2. **Copy to Clipboard (TSV)**: Formats data as Tab-Separated Values so organizers can click **"Copy for Sheets"** and immediately paste (`Ctrl+V`) into an open Google Sheet without saving files to disk.
3. Available on:
   - Attendee Registrations Table (`/admin/console/events/[slug]/registrations`)
   - Check-in Terminal Logs (`/admin/console/events/[slug]/check-in`)
   - Console Overview Archive (`/admin/console`)

---

## 5. Event Registration UX Simplification

The registration form (`src/components/workshop/event-registration-view.tsx`) was audited and redesigned for zero mobile friction:

| Friction Point | Previous State | Streamlined Implementation |
|---|---|---|
| **Gatekeeping** | Experience Level radio group (Beginner / Intermediate / Advanced) | **Removed**. Defaults cleanly in backend to `Intermediate`. |
| **Bloat** | Dietary / accessibility special requests textarea | **Removed**. |
| **Perceived Friction** | Multi-step progress bar ("Form Completion 40%") & checklist | **Removed**. Clean single-card flow. |
| **College Friction** | Long pre-filled text requiring mobile users to backspace 60 chars | **Placeholder hint**: Input is clean and empty with placeholder `Vidyavardhini's College of Engineering & Technology (VCET)`. If left blank, automatically resolves to VCET. |
| **Mobile Native** | Standard desktop inputs | Enhanced touch targets (48px+), HTML5 `autoComplete`, `inputMode="email"` and `inputMode="tel"`, `enterKeyHint="next"`. |
| **Portfolio** | Mandatory or clunky field | Streamlined as clean optional GitHub or LinkedIn input. |

---

## 6. Official Chapter Branding, Favicon & Site Loader

- **Favicon & App Icons**:
  - Extracted and generated high-resolution crisp icons for the browser tab bar:
    - `src/app/favicon.ico` & `public/favicon.ico`: 32x32 / 48x48 multi-resolution icons.
    - `src/app/icon.png` & `public/icon.png`: 128x128 square icon featuring the official Google Developer Groups `<>` brackets emblem.
    - `src/app/apple-icon.png`: Apple touch icon for mobile home screens and bookmarks.
    - `src/app/layout.tsx`: Explicit `icons` metadata declaration with fallback cascade.
- **Site Loader & Splash Animation**:
  - `src/components/site-loader.tsx`: Smooth initial site load splash featuring the official GDG on Campus VCET badge with an animated Google 4-color indeterminate loading bar. Gracefully fades out once the DOM has loaded.
  - `src/app/loading.tsx`: Server Suspense fallback displaying the branded chapter loader during route streaming and page transitions.
  - `src/app/globals.css`: Added `@keyframes loader-slide` animation for smooth, hardware-accelerated rendering.

---

## 7. Verification & Test Evidence

All checks run against the updated codebase:

- **Vitest Test Suite**: 48/48 tests passed (`npm test`).
- **TypeScript**: 0 type errors (`npx tsc --noEmit`).
- **ESLint**: 0 warnings or errors (`npm run lint`).
- **Next.js Turbopack Production Build**: 41/41 routes and icon assets compiled successfully (`npm run build`).

