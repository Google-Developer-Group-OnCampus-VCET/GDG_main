# GDG VCET — Project Audit & Codebase Inventory

**Audit Date:** November 2026  
**Auditor:** Principal Software Architect & Full-Stack Lead  
**Repository:** GDG on Campus VCET (`d:\gdg`)  
**Stack:** Next.js 16.4.3 (App Router), React 19.3.0, TypeScript 5, Tailwind CSS v4, Vitest 3.2.7, Node.js v24.19.0  

---

## 1. Executive Summary

The existing GDG VCET codebase is a clean, well-structured Next.js 16 App Router application adhering to strict Google Developer Groups visual identity guidelines. It currently operates primarily as a static/content-driven chapter website with 6 historical events and 6 verified team members.

However, to evolve into a centralized, scalable, multi-event community platform, the platform lacks:
1. A dynamic backend persistence layer for live events, sessions, speakers, sponsors, and attendee registrations.
2. Dynamic event registration workflows with capacity management, custom forms, server validation, duplicate prevention, and attendee pass/QR generation.
3. Sub-pages for flagship events (Agenda, Speakers, Sponsors, and dedicated Registration).
4. An administrative management workspace for event organizers to view registrations, inspect analytics, and conduct live QR-based check-ins.

The repository is healthy with zero TypeScript errors and 21 passing unit tests. The Stitch export in `stitch.md` provides an approved, high-fidelity design for a 5-page workshop experience (`DevCraft 2025`) which will serve as the foundation for our multi-event sub-system.

---

## 2. Application Architecture

```
d:\gdg
├── src/
│   ├── app/                    # Next.js 16 App Router
│   │   ├── layout.tsx          # Root layout with Google Sans, SiteHeader & SiteFooter
│   │   ├── globals.css         # Tailwind v4 import, GDG CSS variables & design tokens
│   │   ├── page.tsx            # Chapter homepage (Hero, Upcoming/Past Events, Story, FAQ)
│   │   ├── not-found.tsx       # Styled 404 page
│   │   ├── about/page.tsx      # Chapter story & values
│   │   ├── join/page.tsx       # Community joining instructions & link
│   │   ├── team/page.tsx       # Core team listing (6 organizers)
│   │   ├── ui-preview/page.tsx # UI component showcase (internal dev tool)
│   │   └── events/             # Events directory
│   │       ├── page.tsx        # Event listing with search/filter tabs
│   │       └── [slug]/page.tsx # Event detail page (basic single-view)
│   ├── components/             # Reusable UI & section components
│   │   ├── ui/                 # Primitives: button, card, chip, empty-state, section-heading, text-field
│   │   ├── site-header.tsx     # Sticky header with GDG lockup, nav links, CTA
│   │   ├── site-footer.tsx     # Footer with copyright, disclaimer, links
│   │   ├── mobile-nav.tsx      # Responsive drawer for mobile viewports
│   │   ├── gdg-logo.tsx        # SVG GDG bracket mark
│   │   ├── event-card.tsx      # Standardized event listing card
│   │   ├── event-filters.tsx   # Search, topic & format filters
│   │   ├── event-status-section.tsx # Suspense-safe upcoming/past status
│   │   ├── events-explorer.tsx # Interactive event filter harness
│   │   ├── recent-past-events-section.tsx
│   │   ├── upcoming-events-section.tsx
│   │   └── team-card.tsx       # Team member photo & bio card
│   ├── content/                # Typed static data modules (CMS boundary)
│   │   ├── chapter.ts          # Chapter name, links, description
│   │   ├── events.ts           # 6 historical events
│   │   ├── learning-areas.ts   # Core tech pillars (Web, Cloud, AI, Android)
│   │   └── team.ts             # 6 verified organizers
│   ├── lib/
│   │   ├── events.ts           # Pure date/filter utility logic
│   │   └── events.test.ts      # 21 unit tests covering event filtering
│   └── types/
│       └── index.ts            # Type definitions: ChapterEvent, TeamMember, ChapterConfig
├── docs/                       # Project documentation
├── public/                     # Static media (event posters, team photos, SVG marks)
├── stitch.md                   # Approved 5-page Stitch design reference
├── next.config.ts              # Next 16 experimental flags (cacheComponents, partialPrefetching)
└── package.json
```

---

## 3. Complete Route Inventory

| Route | Type | Implementation Status | Purpose / Description |
|---|---|---|---|
| `/` | Server Component | Fully Functional | Homepage featuring hero, upcoming events teaser, 3 recent past events, learning tracks, community intro, team preview, FAQ, and CTA. |
| `/events` | Server + Client | Fully Functional | Complete listing with search, category filters, and upcoming/past tabs. Properly wrapped in `<Suspense>`. |
| `/events/[slug]` | Server Component | Partially Functional | Single detail page for historical events. Lacks rich workshop views (Agenda, Speakers, Sponsors, Custom Registration). |
| `/events/[slug]/register` | Missing | To Be Implemented | Dynamic registration form with client & server validation, progress indicator, capacity handling, and QR pass generation. |
| `/events/[slug]/agenda` | Missing | To Be Implemented | Multi-day schedule with track filters, session timing, speaker tags, and bookmarking. |
| `/events/[slug]/speakers` | Missing | To Be Implemented | Keynote instructors and lab mentors categorized by track and role. |
| `/events/[slug]/sponsors` | Missing | To Be Implemented | Partner tiers, perk breakdown, budget allocation visualizer, and partnership inquiry CTA. |
| `/admin` | Missing | To Be Implemented | Centralized organizer dashboard with event overview, registration counts, and quick actions. |
| `/admin/events/[slug]/registrations` | Missing | To Be Implemented | Participant management table, status toggles, attendee check-in scanner/search, and CSV export. |
| `/api/events/[slug]/register` | API Route (POST) | To Be Implemented | Registration processing endpoint with schema validation, concurrency/capacity check, duplicate prevention, and DB storage. |
| `/api/events/[slug]/check-in` | API Route (POST) | To Be Implemented | Fast check-in verification for event day attendance via pass reference or QR. |
| `/team` | Server Component | Fully Functional | 6 core team members with verified avatars and roles. |
| `/about` | Server Component | Fully Functional | Narrative about the GDG on Campus VCET chapter, values, and mission. |
| `/join` | Server Component | Fully Functional | Explanation on how to join the official community on `gdg.community.dev`. |
| `/ui-preview` | Client Component | Fully Functional | Dev-only design tokens and UI primitive preview. |
| `/not-found` | Server Component | Fully Functional | Custom styled 404 handler. |

---

## 4. Existing Features Audit

### 4.1 Functional Features
- **Strict Brand Design System:** Clean white surface, Google Sans typography, primary action blue (`#1A73E8`), decorative blue (`#4285F4`), and semantic status colors.
- **Event Filtering & Date Handling:** `src/lib/events.ts` handles UTC date-only strings and full ISO timestamps safely with positive offset consideration (`Asia/Kolkata`).
- **Partial Prerendering & Cache Components:** `next.config.ts` enables `cacheComponents: true` and `partialPrefetching: true`. All searchParams reads are wrapped in `<Suspense>`.
- **Responsive Layout:** `MobileNav` handles small viewports cleanly; responsive grids for team and event cards.
- **Unit Testing:** 21 comprehensive tests for event filtering, past/upcoming sorting, and date range formatting.

### 4.2 Partially Implemented Features
- **Event Detail View (`/events/[slug]`):** Basic static details layout with dates, location, and recap text. Does not support multi-track workshops, rich media, agenda timelines, speaker profiles, or dynamic registration.
- **Static Content Boundaries:** Content is currently hardcoded in TypeScript files (`src/content/`). While clean, it cannot receive new registrations or dynamic updates without source edits.

### 4.3 Broken / Unimplemented Features
- **No Registration Backend:** No database connection exists; no API endpoints exist to receive, validate, or store registrations.
- **No Check-in System:** No QR pass generation, attendance tracking, or check-in validation mechanism exists.
- **No Admin Dashboard:** Event leads cannot inspect attendees, check registration capacity, or manage event status without accessing code.

---

## 5. Security, Validation & Technical Debt

1. **Client-Side vs Server-Side Validation:** The Stitch export relied entirely on vanilla browser form validation. A secure implementation must validate all registration inputs on the server using strict schemas.
2. **Race Conditions on Limited Seats:** DevCraft 2025 caps seating at 150. Simultaneous submissions could cause over-subscription without atomic database transactions or mutex locks.
3. **Data Storage & Portability:** Need a persistent, zero-friction embedded storage engine (Node.js built-in `node:sqlite` or robust file-backed store) that requires zero external server setup for local dev while remaining production-deployable.
4. **Cache & Suspense Boundaries:** In Next.js 16 with `cacheComponents` and `partialPrefetching`, any component accessing request-time data (like search params, headers, or real-time registration counters) must be properly isolated with `<Suspense>` to avoid breaking the build.
5. **No Spoofing / Data Integrity:** Registration IDs must be cryptographically collision-resistant (e.g. `GDG-VCET-2025-XXXX`) and verifiable during check-in.

---

## 6. Stitch Design Integration Plan

The Stitch export in `stitch.md` contains 5 complete HTML views:
1. **Event Details:** Hero narrative, registration progress bar, 4 core pillars bento, learning objectives, persona breakdown, prep guide, venue logistics, and interactive FAQ.
2. **Registration:** Split layout with dynamic multi-section form (personal details, academic background, track selection, experience level, guidelines consent), real-time seats remaining counter, and modal pass preview with QR code.
3. **Agenda:** Multi-day tab switcher (Day 1 / Day 2), track filter buttons (Technical, Hands-on, Keynote, Break), session cards with time badges, speaker tags, and bookmark counter.
4. **Speakers:** Keynote instructors, lab mentors, and organizer spotlights with skill tags, Google-colored top stripes, and category filters.
5. **Sponsors:** Title sponsor showcase, Gold tier, Tech & Platform partners (GitHub, Postman, JetBrains, Vercel), ecosystem partners, perks matrix, budget visualizer, and sponsor inquiry form.

These will be modularized into reusable React components and integrated into unified dynamic routes under `/events/[slug]/...` while honoring the chapter's design tokens and maintaining full backward compatibility for simple historical events.

