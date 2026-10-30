# Design brief

GDG on Campus VCET (Vidyavardhini's College of Engineering and Technology, Vasai, India) — a student developer community site. Visitor tasks: understand the chapter, discover events, meet the team, join the official community.

## Visual direction
White-first, typography-led, Google Sans, quiet gray surfaces, one accessible blue for actions, sparse four-color brand accents (deferred pending logo asset), generous whitespace, light borders, restrained shadows/radii. Match `https://gdg.community.dev/` as the primary visual reference — not the newer `developers.google.com/community` system. See `design-reference.md` for the token values in use.

Avoid: neon/glass effects, excessive gradients, pill-everything, continuous animation, invented stats/counters, repeated identical card layouts in every section.

## Information architecture
| Route | Purpose |
|---|---|
| `/` | Intro, events teaser, learning areas, community story, team preview, FAQ, join CTA |
| `/events` | Upcoming/past tabs, keyword/topic/format filters reflected in URL, empty states |
| `/events/[slug]` | Full event detail or past-event recap; unknown slug → 404 |
| `/team` | Organizers/core team |
| `/about` | What the chapter does, who can join, chapter ↔ GDG ↔ VCET relationship |
| `/join` | Official join link, FAQ, verified contacts |
| `/ui-preview` | Dev-only component reference, excluded from indexing and nav |

## Content discipline
No invented team members, events, sponsors, testimonials, attendance numbers, or registration links. Real empty states instead of fabricated data. Any imported chapter fact should carry a source and verification date where practical. The official chapter page (linked above) is the valid join destination and, as of the brief's research on 2026-10-29, lists no upcoming events — so the homepage and `/events` intentionally ship with an empty events dataset rather than inventing one.
