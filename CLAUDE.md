# CLAUDE.md

GDG on Campus VCET chapter website. Next.js 16 App Router, TypeScript, Tailwind v4, React 19. `cacheComponents` + `partialPrefetching` are enabled in `next.config.ts` — any component reading `searchParams`/`cookies`/`headers` must be wrapped in `<Suspense>` or the build fails.

## Brand rule
Visual identity must track `docs/design-reference.md` (GDG community portal reference: white canvas, Google Sans, #1A73E8 action blue, #4285F4 decorative blue, quiet gray surfaces). This overrides generic design-skill instincts toward novel aesthetics, pill-shaped everything, gradients, or glass effects.

## Content rule
No invented team members, events, stats, testimonials, or sponsors. Missing content gets an honest empty state, not a placeholder-dressed-as-real value. See `docs/content-needed.md` for what's genuinely missing. Never render `href="#"` — omit a link entirely if its destination isn't verified.

## Commands
- `npm run dev` — start dev server
- `npm run build` — production build (also typechecks via Next's build pipeline)
- `npm run lint` — ESLint
- `npx tsc --noEmit` — standalone typecheck
- `npx vitest run` — unit tests (`src/lib/**/*.test.ts`)

## Structure
- `src/content/` — typed local data modules (chapter config, events, team). Treat as the CMS boundary.
- `src/lib/events.ts` — pure date/filter logic, unit tested with an injected `now`.
- `src/components/ui/` — shared primitives used by `/ui-preview` and every route.
- `docs/` — design brief, design reference (token evidence + what's unverified), implementation plan, content-needed.

## Known gaps
No browser automation tool is available in this environment — visual diffing against `gdg.community.dev` and accessibility/performance scans were not run live. See `docs/implementation-plan.md` for exactly which checks were executed.
