---
id: T-0124
title: Go to Bookings and Push to PMSPA in the day menu: the three prototype twins
milestone: M4
app: web
status: done
size: S
tier: haiku
depends_on: []
feature_spec: specs/06-features/tlog-day-menu.md
spec_row: T1
ac_files:
  - { path: web/features/time/components/day-menu.ac.test.tsx, sha256: f3e10d554d681e601b3f63f98f7d8b674e4ab4c039c16955e057ec12d32d2437 }
---

# T-0124: Go to Bookings and Push to PMSPA in the day menu: the three prototype twins

**Tier reason:** Twin copy, the commands under *Interfaces → Web*

Work from the brief: `node scripts/pm4.mjs brief T-0124`. Verify with `node scripts/pm4.mjs check T-0124`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- Copied the three prototype files into `web/features/` with `@/proto/` → `@/`, then Prettier (no other change). `pm4 twins`: 120 equal, 0 failures.
- `pm4 check T-0124`:
  ```
  ac hashes: ok (1)
  scope: FAIL (1 file(s))
  web lint: ok (16s)
  web format:check: ok (5s)
  web typecheck: ok (13s)
  web test: ok (33s)
  web build: ok (25s)
  check AC-7: twins equal: ok
  twins: ok (120 equal)
  FAIL T-0124 - changed files outside scope: specs/06-features/tlog-day-menu.md (not in the Files table)
  ```
- The scope failure is the main session's spec fix, not the implementer's: before delegating, the three `P` rows of `specs/06-features/tlog-day-menu.md` were rewritten in the `proto → production` form `pm4 promote` reads (no change in scope; changelog line added). Everything else passes.

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | done (scope FAIL on a pre-existing spec change) | Twin copy and Prettier; lint, format, typecheck, test, build and twins all ok |

## Review
_Filled in by `review-feature`._

**2026-10-31, Opus reviewer: approve.** The three files are byte-exact twins (`sed` + Prettier); every check passes except scope, which flags only the main session's `P`-row format fix in the spec (correct; passes once committed). D1–D4 and the non-goals hold.
- **Major (spec D3 + prototype, not the implementation):** the disabled **Push to PMSPA** item's `title` can't show in a browser, because `DropdownMenuItem` has `data-disabled:pointer-events-none` (`web/components/ui/dropdown-menu.tsx`). AC-4 checks the attribute only in jsdom. Fix in the prototype first (e.g. `data-disabled:pointer-events-auto` on that item, a wrapper carrying the `title`, or visible text), then re-promote.
- **Minor:** a disabled **Go to Bookings** item is still an `<a href>` (middle-click / Open in new tab still work). Optional: render the link only while enabled.
- **Owner's manual checks:** Go to Bookings scroll + outline (also on `npm run build` + `npx serve out`); the hover hint with PMSPA not Connected; `w-max` at 360 px; keyboard; light and dark.
- **Tier:** haiku was right (mechanical twin copy).
- **Resolution (main session, owner's choices 2026-10-31):** both fixed in the prototype `day-menu.tsx` first, then re-copied to its twin. The disabled Push item has `data-disabled:pointer-events-auto data-disabled:cursor-default`; Go to Bookings renders its `Link` only while enabled. Spec D2/D3, AC-3/AC-4 and the test updated, `pm4 hash` re-run. `pm4 check`: everything ok except scope (the spec, main session's change).
