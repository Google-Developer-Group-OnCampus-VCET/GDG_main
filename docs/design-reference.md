# Design reference

Evidence transcribed from the brief supplied by the user on 2026-10-29. **No browser automation tool is available in this build session**, so none of the values below were re-verified by live inspection in this session — they are carried over as-is from the brief's own research (which the brief says was done by inspecting public HTML/CSS on 2026-10-29). Treat this file as a starting baseline, not a confirmed visual diff. If a browser tool becomes available later, re-run the comparison described in `implementation-plan.md` before trusting these values further.

## Sources
- Primary reference: https://gdg.community.dev/
- Chapter identity / join destination: https://gdg.community.dev/gdg-on-campus-vidyavardhinis-college-of-engineering-and-technology-vasai-india/
- Secondary reference (visually different system, not used as primary): https://developers.google.com/community
- Style sheets cited in the brief: `https://gdg.community.dev/config/style/generalstyles/?v=515`, `https://gdg.community.dev/config/style/theme/?v=515`

## Typography
- Primary: Google Sans, Open Sans fallback (GDG general stylesheet declaration, per brief).
- `next/font/google` in this installed Next.js version (16.4.3) actually ships "Google Sans", "Google Sans Flex", and "Google Sans Code" as loadable families — verified directly in this session by reading `node_modules/next/dist/compiled/@next/font/dist/google/font-data.json`. Weights available: 400/500/600/700 + variable.
- Decision: use `next/font/google`'s `Google_Sans` export, weights 400/500/700, system-sans fallback stack. Do not use Google Sans Flex/Code (those back the secondary, newer developer-site system per the brief).

## Color tokens
| Token | Value | Source |
|---|---|---|
| background | #FFFFFF | brief |
| foreground | #202124 | brief |
| foreground-muted | #5F6368 | brief |
| border | #DADCE0 | brief |
| surface-muted | #F1F3F4 | brief |
| primary (accessible action blue) | #1A73E8 | brief |
| primary-decorative (brand blue) | #4285F4 | brief |
| error | #E3000F | brief (semantic status, not logo palette) |
| success | #008A00 | brief (semantic status, not logo palette) |
| warning | #F3BE02 | brief (semantic status, not logo palette) |

No approved chapter/GDG logo asset was supplied. The brief explicitly warns not to guess the four brand-accent hex values from the logo — those are deferred until a real asset exists (see `content-needed.md`). The site currently uses a text wordmark instead of a drawn lockup.

## Layout starting values (unmeasured, proposed by the brief)
- Container max-width: 1200px
- Gutters: 20px mobile / 32px tablet / 40px desktop
- Spacing rhythm: 8px base, 4px refinements
- Section spacing: 56–96px
- Header height: ~72px desktop / ~64px mobile
- Radius: 8–16px
- Hero heading: fluid 40–64px, line-height ~1.08–1.15
- Section headings: 28–40px
- Body: 16–18px, line-height 1.5–1.65
- Labels: 12–14px

## Unverified / explicitly out of scope this session
- No live screenshot comparison at 360/390/768/1024/1440px against gdg.community.dev was performed (no browser tool in this environment).
- No Lighthouse or real accessibility-scanner run was performed.
- Logo-derived brand accent colors are not set — pending an approved asset.
