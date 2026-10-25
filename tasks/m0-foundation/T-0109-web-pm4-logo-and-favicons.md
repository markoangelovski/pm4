---
id: T-0109
title: Replace the template logo and favicon with the PM4 mark, add the icon set
milestone: M0
app: web
status: done
size: S
tier: haiku
depends_on: []
feature_spec: —
files:
  - web/app/favicon.ico
  - web/app/icon.svg
  - web/app/apple-icon.png
  - web/public/images/logos/logoicon.svg
  - web/public/icons/*.png
  - specs/04-web/screens.md
  - tasks/m0-foundation/T-0109-web-pm4-logo-and-favicons.md
  - tasks/m0-foundation/T-0110-api-favicon.md
  - tasks/BOARD.md
specs: [specs/04-web/screens.md]
ac_files: []
---

# T-0109: Replace the template logo and favicon with the PM4 mark, add the icon set

## Goal
The app shows the PM4 logo (concept C, "Stack": three staggered bars on a near-black tile, a grey edge in dark
mode), chosen by the owner on 2026-10-25, in the sidebar, the browser tab and on iOS home screens.

## Change
Asset files only; no code. Next's metadata file conventions emit the `<link>` tags.
- `web/public/images/logos/logoicon.svg`: replaced in place (path pinned by `full-logo.ac.test.tsx`). The tile
  always carries the `#404040` edge: it's invisible on the light sidebar and separates the tile on the dark one
  (an `<img>` can't follow next-themes' `.dark` class).
- `web/app/favicon.ico`: 16, 32 and 48 px PNG entries, tile with edge.
- `web/app/icon.svg`: the tile, with the edge shown only under `prefers-color-scheme: dark`.
- `web/app/apple-icon.png`: 180 px, opaque full-bleed tile (iOS applies its own mask).
- `web/public/icons/icon-192.png`, `icon-512.png` (rounded tile, no edge) and `icon-maskable-512.png`
  (full bleed, bars at 80 % in the safe zone): for a future web app manifest. Nothing references them yet.

## Acceptance criteria
- [ ] `full-logo.ac.test.tsx` passes unchanged
- [ ] `out/index.html` and `out/app.html` link `favicon.ico`, `icon.svg` and `apple-icon.png`
- [ ] The sidebar shows the new mark in light and dark themes

---

## Implementation notes
Done inline by the main session. The assets come from one SVG on a 32-unit grid, with the bars snapped to
even units so the 16 px favicon stays crisp. They were rendered with `sharp` (already in `web/node_modules`)
by a throwaway script outside the repo, and the ICO was packed by hand (no new dependency).
- web gates: lint, typecheck ok; `npm test` 74 files / 259 tests passed; `npm run build` ok (prototype guard ok).
- `out/index.html`, `out/app.html`: `<link rel="icon" href="/favicon.ico…" sizes="48x48">`,
  `<link rel="icon" href="/icon.svg…" type="image/svg+xml">`, `<link rel="apple-touch-icon" href="/apple-icon.png…" sizes="180x180">`.
- `pm4 check T-0109`: gates PASS (web lint, format, typecheck, test, build ok; twins 117 equal). Scope FAILs only on
  T-0110's 6 api/spec files, which share this branch (a quick-lane check knows only its own `files:`).

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | opus (main session) | PASS | Inline: assets generated from the chosen concept |

## Review
Owner approved (quick lane), 2026-10-25.
