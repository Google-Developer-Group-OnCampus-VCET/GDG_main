# Implementation plan / status

Tracks build phases for the GDG on Campus VCET site. See `design-brief.md` and `design-reference.md` for the design source material, and `content-needed.md` for what's intentionally missing.

## Phases
1. **Docs + project rules** — done (this directory, `CLAUDE.md`).
2. **Tokens, fonts, UI primitives, `/ui-preview`** — done.
3. **Shared layout (header/footer/mobile nav) + homepage** — done.
4. **Remaining routes** (`/events`, `/events/[slug]`, `/team`, `/about`, `/join`, 404) — done.
5. **Metadata, tests, verification** — done; see "Checks actually run" below.

## Routes shipped
- `/` — hero, events teaser (empty state), learning areas, community story, team preview, FAQ, join CTA.
- `/events` — tabs (upcoming/past) + search/topic/format filters reflected in the URL via `useSearchParams`; wrapped in `<Suspense>` as required by `cacheComponents`.
- `/events/[slug]` — detail/recap page; unknown slugs hit `notFound()`.
- `/team` — grid with empty state (no roster supplied yet).
- `/about`, `/join` — static content pages.
- `/ui-preview` — dev reference, `robots: noindex`, not in nav.
- `not-found.tsx` — styled 404.

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
