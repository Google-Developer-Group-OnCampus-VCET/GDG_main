# GDG VCET — Platform Evolution & Implementation Plan

**Directive:** Centralized Multi-Event Community Platform Architecture & Stitch Design Integration  
**Version:** 2.0.0  
**Status:** Approved for Implementation  

---

## 1. Architectural Strategy & Design Principles

### 1.1 Multi-Tier Architecture
The platform is organized into three distinct tiers:
1. **Public Community Portal:** The existing VCET chapter website (`/`, `/events`, `/team`, `/about`, `/join`), preserving all verified historical records, typography, and community links.
2. **Flagship Event Microsites:** Dynamic multi-page event hubs (`/events/[slug]`, `/register`, `/agenda`, `/speakers`, `/sponsors`), built upon the Stitch design system. Each event can be configured either as a simple informational event (like the 6 historical events) or as a rich workshop with full interactive capabilities.
3. **Organizer Admin Workspace:** Centralized operations center (`/admin`, `/admin/events/[slug]/registrations`, `/admin/events/[slug]/check-in`, `/admin/events/[slug]/analytics`) enabling organizers to monitor capacity, manage registrations, review attendance, and export data.

### 1.2 Preservation of Existing Architecture
- **Zero Breaking Changes:** Keep existing components (`SiteHeader`, `SiteFooter`, `MobileNav`, `GdgLogo`, `Button`, `Card`, `Chip`, `TextField`, `SectionHeading`) fully functional.
- **Cache Components & Partial Prefetching:** Next.js 16 requires all dynamic request hooks (`useSearchParams`, `headers`, `cookies`, DB writes) to be placed inside client components or wrapped in `<Suspense>`.
- **Typed Content Models:** Extend existing `ChapterEvent` types to support rich workshop metadata (`agenda`, `speakers`, `sponsors`, `registrationConfig`) without modifying the contract for simple events.

---

## 2. Data Model & Database Architecture

### 2.1 Embedded Database Engine
We use Node.js 24 native `node:sqlite` for persistent, zero-dependency, transactional storage stored at `data/gdg.db` (with automatic directory creation and schema migration).

### 2.2 Database Schema

```sql
-- Events table (stores both imported static events and dynamic workshops)
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT,
  timezone TEXT DEFAULT 'Asia/Kolkata',
  format TEXT DEFAULT 'in-person',
  location TEXT,
  summary TEXT,
  image TEXT,
  status TEXT DEFAULT 'published', -- draft, published, archived, cancelled
  capacity INTEGER DEFAULT 150,
  is_registration_open INTEGER DEFAULT 1,
  registration_deadline TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Registrations table
CREATE TABLE IF NOT EXISTS registrations (
  id TEXT PRIMARY KEY,
  event_slug TEXT NOT NULL,
  reference_id TEXT UNIQUE NOT NULL, -- e.g. GDG-VCET-2025-XXXX
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  college TEXT NOT NULL,
  department TEXT NOT NULL,
  year_of_study TEXT NOT NULL,
  track TEXT NOT NULL,
  experience_level TEXT NOT NULL,
  portfolio_url TEXT,
  notes TEXT,
  status TEXT DEFAULT 'confirmed', -- confirmed, waitlisted, cancelled
  checked_in INTEGER DEFAULT 0,
  checked_in_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_slug) REFERENCES events(slug) ON DELETE CASCADE,
  UNIQUE(event_slug, email) -- Prevent duplicate registration per event
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_registrations_slug ON registrations(event_slug);
CREATE INDEX IF NOT EXISTS idx_registrations_ref ON registrations(reference_id);
CREATE INDEX IF NOT EXISTS idx_registrations_email ON registrations(event_slug, email);
```

---

## 3. API Contract Specifications

### 3.1 Registration Submission
- **Route:** `POST /api/events/[slug]/register`
- **Payload:**
  ```json
  {
    "fullName": "Atharva Joshi",
    "email": "name@vcet.edu.in",
    "phone": "+91 98765 43210",
    "college": "Vidyavardhini's College of Engineering & Technology",
    "department": "Computer Engg",
    "yearOfStudy": "3rd Year",
    "track": "Track A: Modern Web & Gemini AI",
    "experienceLevel": "Intermediate",
    "portfolioUrl": "https://github.com/atharva",
    "notes": "Interested in Gemini API",
    "agreedToCoc": true
  }
  ```
- **Responses:**
  - `201 Created`: Registration confirmed with `referenceId` and registration object.
  - `400 Bad Request`: Validation failure (missing required fields, malformed email/phone, CoC not agreed).
  - `409 Conflict`: Duplicate registration for this email and event.
  - `403 Forbidden`: Registration closed or event at capacity (placed on waitlist if enabled).
  - `404 Not Found`: Event does not exist.

### 3.2 Attendee Check-In
- **Route:** `POST /api/events/[slug]/check-in`
- **Payload:** `{ "referenceId": "GDG-VCET-2025-XXXX" }`
- **Responses:**
  - `200 OK`: Attendee checked in with timestamp.
  - `400 Bad Request`: Missing reference ID.
  - `404 Not Found`: Reference ID not found for this event.
  - `409 Conflict`: Attendee already checked in (returns previous check-in time).

### 3.3 Event Stats & Capacity
- **Route:** `GET /api/events/[slug]/stats`
- **Response:**
  ```json
  {
    "totalRegistered": 124,
    "capacity": 150,
    "remaining": 26,
    "percentFilled": 82,
    "isOpen": true,
    "tracks": {
      "Track A: Modern Web & Gemini AI": 72,
      "Track B: Cloud Architecture & GCP": 52
    }
  }
  ```

---

## 4. UI & Component Integration Phases

### Phase 1: Database & Data Access Layer
- Initialize `src/lib/db/index.ts` using `node:sqlite`.
- Seed DevCraft 2025 and existing historical events into SQLite (or provide automatic initialization on first run).
- Provide pure, typed query functions with ACID transactions.

### Phase 2: Event Sub-Nav & Stitch Components Adaptation
- Create `EventNav`: Persistent sub-navigation banner for workshop events (`Overview`, `Agenda`, `Speakers`, `Sponsors`, `Register`).
- Adapt Stitch components to idiomatic React 19 / TypeScript / Tailwind:
  - `EventDetailsView`: Hero, registration progress bar, core pillars, learning objectives, personas, prep guide, logistics, FAQ.
  - `EventRegistrationView`: Progress indicator, seats remaining banner, validated dynamic form, attendee pass preview & instant QR pass modal.
  - `EventAgendaView`: Multi-day tab switcher (Day 1 / Day 2), track filters, session cards, bookmarking counter, calendar sync.
  - `EventSpeakersView`: Keynotes and mentors grid with Google accent stripes, category pills, bio modal / social links.
  - `EventSponsorsView`: Premier title partner, gold partners, tooling partners, perks matrix, budget visualizer, partnership modal.

### Phase 3: Dynamic Event Routing
- Update `/events/[slug]/page.tsx` to conditionally render rich workshop experience when workshop data exists, or clean recap layout when viewing historical events.
- Implement `/events/[slug]/register/page.tsx`.
- Implement `/events/[slug]/agenda/page.tsx`.
- Implement `/events/[slug]/speakers/page.tsx`.
- Implement `/events/[slug]/sponsors/page.tsx`.

### Phase 4: Admin Workspace & Check-in System
- Implement `/admin/page.tsx` (overview of all events, total attendees, registration rates).
- Implement `/admin/events/[slug]/registrations/page.tsx` (filterable table of registered attendees, CSV export, search, status management).
- Implement `/admin/events/[slug]/check-in/page.tsx` (fast QR/reference input scanner with instant status feedback).
- Implement `/admin/events/[slug]/analytics/page.tsx` (track distribution, academic year metrics, college charts).

### Phase 5: Verification & Quality Assurance
- Automated unit and integration tests for DB, API, and validation.
- End-to-end user journey testing (registration submit, duplicate check, capacity limit, QR check-in).
- Production build verification (`npm run build`).

---

## 5. Testing & Verification Matrix

1. **Static Events Preservation Test:** Ensure all 6 historical events load without regressions.
2. **Registration Validation Test:** Test invalid email, missing required fields, unchecked CoC.
3. **Duplicate Prevention Test:** Submit the same email twice; expect 409 Conflict.
4. **Capacity Reached Test:** Verify status changes when seats are exhausted.
5. **Check-in Test:** Check in attendee; verify timestamp recorded; re-check-in returns warning.
6. **Mobile Responsiveness Test:** Test at 375px (mobile), 768px (tablet), 1280px (desktop).
7. **Production Build Test:** Verify `npm run build` succeeds cleanly with zero type or prerendering errors.

