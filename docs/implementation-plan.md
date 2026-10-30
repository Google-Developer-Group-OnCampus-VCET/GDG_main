# Implementation plan / status

Tracks build phases for the GDG on Campus VCET site. See `design-brief.md` and `design-reference.md` for the design source material, and `content-needed.md` for what's intentionally missing.

## Phases
1. **Docs + project rules** — done (this directory, `CLAUDE.md`).
2. **Tokens, fonts, UI primitives, `/ui-preview`** — done.
3. **Shared layout (header/footer/mobile nav) + homepage** — done.
4. **Remaining routes** (`/events`, `/events/[slug]`, `/team`, `/about`, `/join`, 404) — done.
5. **Metadata, tests, verification** — done; see "Checks actually run" below.
6. **Real content pass** (6 historical events, 6 organizers, logo) — done. See `content-needed.md` for provenance and what's still outstanding.

## Routes shipped
- `/` — hero, upcoming-events teaser (genuine empty state — none scheduled), "Recently at GDG VCET" recap of the 3 most recent past events, learning areas, community story, organizer preview (links to `/team`), FAQ, join CTA.
- `/events` — tabs (upcoming/past) + search/topic/format filters reflected in the URL via `useSearchParams`; filter chips only render for topics/formats actually present in the data (`availableTopics`/`availableFormats` in `src/lib/events.ts`); wrapped in `<Suspense>` as required by `cacheComponents`.
- `/events/[slug]` — detail/recap page for all 6 real slugs; the only time-dependent pieces (upcoming/past eyebrow, registration button) are isolated into `src/components/event-status-section.tsx` and individually wrapped in `<Suspense>` so `connection()` doesn't block prerendering of the rest of the page; unknown slugs hit `notFound()` → real 404.
- `/team` — grid of all 6 organizers, responsive 1→2→3→4 columns.
- `/about`, `/join` — static content pages.
- `/ui-preview` — dev reference, `robots: noindex`, not in nav.
- `not-found.tsx` — styled 404.

## Events/team data model notes
- `ChapterEvent.startsAt` accepts either a date-only string (`"YYYY-MM-DD"`) or a full ISO instant; `location`/`format`/`summary`/`timezone` are now optional since several historical records only had a date and title. `formatEventDateRange` renders date-only events with no time suffix. All 6 current events are date-only by deliberate choice (see `content-needed.md` — the live source's time data was internally inconsistent).
- `priceNote` holds the screenshot's "Free registration" as transcribed historical text (e.g. "Free event") — never rendered as an active CTA; no `registrationUrl` is set on any past event.

## Checks actually run
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`
- `npx vitest run`

## Checks NOT run (no tooling available in this session)
- Live browser visual diff against `gdg.community.dev` at 360/390/768/1024/1440px.
- Lighthouse / real performance measurement.
- Automated or manual screen-reader pass.

Re-run these with a browser-capable environment before treating the visual fidelity or accessibility claims as fully verified.
