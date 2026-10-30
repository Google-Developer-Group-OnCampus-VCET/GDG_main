# Content needed from the chapter

Nothing below was fabricated to fill a gap — these are the real inputs the chapter still needs to supply before the site reflects reality. The site currently renders honest empty states wherever one of these is missing.

## Provenance of the current events and team data

On 2026-10-29 the user supplied two screenshots (the chapter's events listing and its organizer list) as the source of truth for titles, names, roles, dates, and ordering. Those screenshot facts are transcribed as-is (`transcribedFrom`/`transcribedAt` on each record in `src/content/events.ts` and `src/content/team.ts`). Separately, in that same session, the official chapter page and each event's own detail page were fetched live to resolve locations, formats, summaries, poster images, avatars, and profile/event URLs — those fields carry their own `sourceUrl`/`lastVerifiedAt` (2026-10-29) distinct from the screenshot transcription date. Re-verify both before reusing this data much later, since event listings and team rosters change.

## Resolved in this pass
- **Logo.** `public/GDG-Lockup-1Line-Black_vMWBFT9.svg` (the generic Google Developer Groups lockup, user-supplied) is used in the header and footer via `src/components/gdg-logo.tsx`. It is not VCET-specific — swap in a chapter-specific lockup if one exists. Its cutouts are literal white shapes (not transparent), so it's wrapped in a white backdrop chip on gray sections.
- **Events.** All 6 historical events from the screenshot are in `src/content/events.ts`, enriched with verified location/format/summary/poster/official-URL from each event's live detail page.
- **Team.** All 6 organizers are in `src/content/team.ts` with verified avatars and profile links from the live chapter page.

## Still missing / outstanding
- **Event posters.** Only "Unlocking Global Opportunities" and "Horizon 1.0" have a unique poster (`public/images/events/`). The other four events share GDG's generic default thumbnail on the official site, which is deliberately **not** used here as a fake unique poster — their cards/detail pages show no image rather than a misleading one.
- **Shreya Agnihotri's profile link.** The URL referenced from the chapter page (`/u/m5p8dk/`) returns HTTP 404 on the official site as of 2026-10-29. Omitted rather than guessed; re-check periodically.
- **Horizon 1.0 fine print.** The verified official listing describes it as a multi-round hackathon with a named sponsor and a cash prize pool; the site's summary stays high-level (hybrid hackathon, online rounds + in-person finale) rather than reproducing sponsor/prize specifics, to avoid representing promotional detail as settled chapter-site copy. Add it explicitly if the chapter wants it published.
- **Older events' precise times.** The live event pages reported internally inconsistent UTC/IST time conversions for several events; rather than risk publishing a wrong clock time, all six events are stored and displayed as date-only. Add real `startsAt`/`endsAt` instants + `timezone` once a human confirms the correct time for a given event.
- **Photography.** Real event/community photographs with captions, to replace the geometric placeholder art in the hero and community sections.
- **Contacts/socials.** Verified chapter email and social/community URLs (Instagram, LinkedIn, Discord, etc.). Currently omitted rather than linked with placeholder `#` hrefs.
- **Production hostname.** Needed to set `metadataBase`, the sitemap, and `robots.txt` canonical behavior. Currently left unset with the default (relative) metadata behavior.
- **Four brand-accent hex values.** Still the brief's semantic status colors, not logo-derived — see `design-reference.md`.

## Known verification gaps (tooling, not content)
- No browser automation tool was available in this build session, so there is no live visual diff against `https://gdg.community.dev/` at any viewport, no Lighthouse run, and no real assistive-tech pass — only `npm run lint`, `tsc --noEmit`, `next build`, and `vitest run` were actually executed, plus manual `curl` checks of each route's HTTP status and rendered HTML. Re-run a visual/a11y pass with a browser tool before publishing.
