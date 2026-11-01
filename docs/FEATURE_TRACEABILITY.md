# GDG VCET — Feature Traceability Matrix

This matrix maps every platform capability from its existing state in the codebase to the required implementation state, priority level, and verification criteria.

| Feature | Existing State | Required Change | Priority | Target Architecture / Route | Verification Criteria |
|---|---|---|---|---|---|
| **Homepage** | Static Next.js Server Component displaying historical events and static copy | Preserve existing clean layout; link directly into dynamic flagship workshop events | High | `/` | Responsive check; verifies links to upcoming workshops & past recaps. |
| **Events Hub** | Static listing with client filters for topic/format/upcoming/past | Preserve existing explorer; add flagship multi-track badge and direct "Register" & "View Workshop" links | High | `/events` | Filter test; verifies DevCraft 2025 and historical events render correctly. |
| **Event Details** | Basic static text-and-details page in `/events/[slug]` | Transform into dynamic event experience: detect workshop capabilities, render overview, pillars, objectives, logistics, and tabbed navigation to Agenda, Speakers, Sponsors, and Register | High | `/events/[slug]` | Pre-renders historical events as simple recaps; renders rich workshop layout for DevCraft 2025. |
| **Registration Experience** | Completely missing (no routes or forms) | Implement full Stitch registration experience: multi-section form, live seat counter, track preference, experience level, client & server validation | Critical | `/events/[slug]/register` | Field validation (empty, invalid email/phone), capacity limiting, duplicate prevention, confirmation modal with pass and QR code. |
| **Registration API** | No API endpoints exist | Create robust REST endpoint with Zod-style schema validation, duplicate detection, atomic capacity check, and persistent storage | Critical | `POST /api/events/[slug]/register` | 200 on valid submission, 400 on bad data, 409 on duplicate email, 403 when registration is closed or at capacity. |
| **Agenda & Schedule** | Missing | Integrate Stitch multi-day agenda with track filtering (Technical, Hands-on Lab, Keynote, Break), session details, speaker associations, and local bookmarking | High | `/events/[slug]/agenda` | Day 1 / Day 2 tab switching, track filtering, responsive timetable layout. |
| **Speakers & Mentors** | Team page exists for chapter core; no event speaker catalog | Integrate Stitch speakers page: Keynote Instructors, Hands-on Mentors, and Organizing Leads with category tabs and topic tags | Medium | `/events/[slug]/speakers` | Category filter (All, Keynote, Hands-on, Mentors, Leads), responsive card grid, Google brand accent stripes. |
| **Sponsors & Partners** | Missing (no sponsors data or view) | Integrate Stitch sponsors page: Tiered partners (Title, Gold, Tooling, Ecosystem), perk matrix, budget visualizer, and sponsor inquiry modal | Medium | `/events/[slug]/sponsors` | Tier cards, interactive perks matrix, responsive sponsor showcase. |
| **Persistent Storage** | TypeScript arrays in `src/content/` only | Implement embedded persistent storage layer (`node:sqlite` / SQLite repository pattern) for events, registrations, and check-ins | Critical | `src/lib/db/` | Data survives application restarts; handles concurrent inserts with transactional integrity. |
| **Admin Dashboard** | Completely missing | Build centralized administrative workspace for event organizers: event metrics, registration count vs capacity, attendee roster table, search, and CSV export | Critical | `/admin`<br>`/admin/events/[slug]/registrations` | View all registrations, filter by track/year, export CSV, toggle status. |
| **Attendance & Check-in** | Missing | Fast attendee check-in scanner and search: verify unique attendee reference (`GDG-VCET-2025-XXXX`), toggle check-in status, record check-in timestamp | High | `/admin/events/[slug]/check-in`<br>`POST /api/events/[slug]/check-in` | Scan/enter Pass Ref ID; updates status to Checked In; rejects non-existent or duplicate check-in. |
| **Event Analytics** | Missing | Visual and tabular registration analytics: total attendees, track distribution, college breakdown, year-of-study breakdown, attendance rate | Medium | `/admin/events/[slug]/analytics` | Dynamic aggregation metrics based on real database records. |
| **Design Consistency** | Tailwind v4 with GDG Community reference tokens | Integrate Stitch color variables and Plus Jakarta Sans/Inter typography cleanly into the existing Tailwind v4 theme without visual collision | High | `src/app/globals.css`<br>`src/components/` | Consistent Google color palette (Blue `#4285F4`, Green `#34A853`, Yellow `#FBBC05`, Red `#EA4335`). |

---

## Traceability Checkpoints

1. **Zero Degradation Rule:** Historical events (`horizon-1-0`, `introduction-to-google-cloud-study-jams`, etc.) must continue to render cleanly.
2. **Data-Driven Configuration:** Workshop details, agenda items, speakers, and sponsors must be driven by typed data structures rather than hardcoded raw HTML.
3. **Robust Input Validation:** Form submissions must be validated independently on the backend with sanitized inputs.
4. **Offline First & Self-Contained:** The platform must run with zero required external SaaS dependencies.

