---
id: T-0111
title: Show the animated PM4 logo instead of the spinner while the session is checked
milestone: M0
app: web
status: done
size: S
tier: haiku
depends_on: [T-0109]
feature_spec: —
files:
  - web/features/auth/components/loading-mark.tsx
  - web/features/auth/components/auth-guard.tsx
  - web/features/auth/components/auth-callback.tsx
  - web/app/auth/callback/page.tsx
  - specs/04-web/screens.md
  - tasks/m0-foundation/T-0111-web-animated-logo-loading.md
  - tasks/BOARD.md
specs: [specs/04-web/screens.md]
ac_files: []
---

# T-0111: Show the animated PM4 logo instead of the spinner while the session is checked

## Goal
While the web app checks the token with the API (the app shell's AuthGuard, and the OAuth callback SCR-002),
desktop and mobile users see a stylised loading animation of the PM4 logo, like Gmail's or Outlook's loading
screens, instead of the 32 px spinner (owner, 2026-10-25).

## Change
- `web/features/auth/components/loading-mark.tsx` (new): `LoadingMark({ className? })`, an inline SVG
  (`viewBox 0 0 98 60`, `w-40 sm:w-48`, so 160 / 192 px wide), `aria-hidden`. No tile and no border: the mark's
  three staggered bars, as pill tracks in `currentColor` at 10 % opacity, so it follows the app theme
  (`text-foreground`). An `<img>` can't follow next-themes' `.dark` class, hence a component, not an SVG file.
  - Intro, once (0.5 s): the tracks rise in one after another.
  - Loop (2.2 s): on each track a round-capped stroke grows from a dot on the left to the full bar, holds, then
    drains out to the right; each bar starts 0.18 s after the one above.
  - `prefers-reduced-motion: reduce`: full bars that only fade.
  - Custom component: no shadcn component draws a branded loader.
- `auth-guard.tsx`, `auth-callback.tsx`, `app/auth/callback/page.tsx`: `<Spinner className="size-8" />` →
  `<LoadingMark />`. The callback's wrapper gets `role="status"` (the Spinner carried it); the guard's wrapper
  already has it.
- The small inline spinners ("Searching…", PMSPA cold-start hint) stay: at 14 px the mark doesn't read.

## Acceptance criteria
- [ ] `auth-guard.ac.test.tsx` and `auth-callback.ac.test.tsx` pass unchanged
- [ ] The session check and `/auth/callback` show the loading animation, light and dark theme, desktop and mobile

---

## Implementation notes
Done inline by the main session. No new dependency, no shadcn change; `components/ui/spinner.tsx` stays for the
inline spinners.
- `pm4 check T-0111`: PASS (scope ok; web lint, format, typecheck, test, build ok; twins 117 equal).

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | opus (main session) | PASS | Inline: plain bar animation + three spinner swaps |
| 2 | opus (main session) | PASS | Owner: make it a stylised loader like Gmail/Outlook; tile intro, sheen, progress bar, 96 × 112 |
| 3 | opus (main session) | PASS | Owner: larger, no border, not a copy of the logo; `LoadingMark` component, the SVG file dropped |

## Review
Owner approved (quick lane), 2026-10-25.
