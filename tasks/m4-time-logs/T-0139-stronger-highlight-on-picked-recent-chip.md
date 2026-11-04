---
id: T-0139
title: Stronger highlight on the picked Recent chip
milestone: M4
app: web
status: done
size: S
tier: haiku
depends_on: [T-0138]
feature_spec: —
files: [web/features/time/components/recent-chips.tsx, specs/06-features/tlog-recent-links.md]
specs: [specs/06-features/tlog-recent-links.md]
ac_files: []
---

# T-0139: Stronger highlight on the picked Recent chip

## Goal
The picked Recent chip stands out in both themes (owner, prototype `8a2f6a8`): the `secondary` variant barely differed from
`outline`, especially in dark mode.

## Change
- `web/features/time/components/recent-chips.tsx`: the twin of `web/proto/features/time/components/recent-chips.tsx` (copy, rewrite
  `@/proto/` imports, Prettier). Always `variant="outline"`; the picked chip adds `border-primary! bg-primary/5! dark:bg-primary/15!`
  via `cn` (`!` because the theme's `.cn-button-variant-outline` and its `dark:` colours otherwise win).
- `specs/06-features/tlog-recent-links.md` D4: the same, with a changelog line.

## Acceptance criteria
- [x] `pm4 twins`: the file equals its prototype twin.
- [x] Existing tests (`aria-pressed` on the picked chip) still pass.
- [x] In the browser (prototype), the picked chip's computed border and background differ from the others in light and dark.

---

## Implementation notes
Main session. Copied the twin; checked computed styles in light and dark in the prototype (agent-browser).

`pm4 check T-0139`: PASS (scope ok; lint, format, typecheck, test, build ok; twins 128 equal).

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | main session (Opus) | PASS | Twin copy |

## Review
_The owner's review (quick lane), or `review-feature`'s verdict._
