# Content needed from the chapter

Nothing below was fabricated to fill a gap — these are the real inputs the chapter still needs to supply before the site reflects reality. The site currently renders honest empty states wherever one of these is missing.

- **Chapter-specific logo.** `public/GDG-Lockup-1Line-Black_vMWBFT9.svg` (the generic Google Developer Groups lockup) is now used in the header and footer via `src/components/gdg-logo.tsx`. It is not VCET-specific and was supplied by the user, not sourced from the official chapter page — if a VCET chapter lockup or an "on Campus" variant exists, swap it in. Note: this asset's rounded cutouts are drawn as literal white shapes (not a transparent hole), so it only reads correctly on a white surface — it's wrapped in a white backdrop chip anywhere it sits on a gray section. Any required VCET institutional mark and usage guidance are still outstanding, as are the exact four brand-accent hex values (left as the brief's semantic status colors, not logo-derived — see `design-reference.md`).
- **Team roster.** Current organizer/core-team names, roles, academic year, photos, and verified profile URLs. `/team` currently renders an empty state.
- **Events.** Any real upcoming or past event: title, stable slug, start/end instants with timezone, location/format, summary, poster image, registration URL, recap assets for past events. `src/content/events.ts` ships empty; re-check the official chapter page before adding anything.
- **Photography.** Real event/community photographs with captions, to replace the geometric placeholder art in the hero and community sections.
- **Contacts/socials.** Verified chapter email and social/community URLs (Instagram, LinkedIn, Discord, etc.). Currently omitted rather than linked with placeholder `#` hrefs.
- **Production hostname.** Needed to set `metadataBase`, the sitemap, and `robots.txt` canonical behavior. Currently left unset with the default (relative) metadata behavior.

## Known verification gaps (tooling, not content)
- No browser automation tool was available in this build session, so there is no live visual diff against `https://gdg.community.dev/` at any viewport, no Lighthouse run, and no real assistive-tech pass — only `npm run lint`, `tsc --noEmit`, `next build`, and `vitest run` were actually executed. Re-run a visual/a11y pass with a browser tool before publishing.
