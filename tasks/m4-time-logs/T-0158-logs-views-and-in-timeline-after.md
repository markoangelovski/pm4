---
id: T-0158
title: Logs views: + and ⋯ in Timeline, + after a row's task, task icons: the four prototype twins
milestone: M4
app: web
status: done
size: S
tier: haiku
depends_on: []
feature_spec: specs/06-features/tlog-views-actions.md
spec_row: T1
ac_files:
  - { path: web/features/time/components/log-views-actions.ac.test.tsx, sha256: d964c40f48a88472fad01f8d11ae56dfe71032d5bde0ec71c19e2ec5ff0b2abb }
  - { path: web/features/time/components/log-timeline.ac.test.tsx, sha256: 00c65c5e441b169118d39488926b54c8352525a061389c0dc4512d05d7148ed4 }
---

# T-0158: Logs views: + and ⋯ in Timeline, + after a row's task, task icons: the four prototype twins

**Tier reason:** Promote + twin copy, the commands under *Interfaces → Web*

Work from the brief: `node scripts/pm4.mjs brief T-0158`. Verify with `node scripts/pm4.mjs check T-0158`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- Promoted `group-log-button.tsx` (no `@/proto/` import). Copied `log-row.tsx`, `log-timeline.tsx`, `day-view.tsx` from their prototype twins with `sed 's#@/proto/#@/#g'`, then prettier. No other edits.
- `day-view.tsx`: `GroupLogButton` and `groupLink` moved out to the shared `group-log-button.tsx`. The By Task heading gets the `ListTodo` icon.
- Reviewer: `day-view.tsx` shows a larger diff than the twin step suggests. It is the prototype's content, not a production-only removal. Check that nothing production-only was dropped.
- `pm4 check T-0158`:
  ```
  PASS T-0158
    ac hashes: ok (2)
    scope: ok
    web lint: ok (17s)
    web format:check: ok (5s)
    web typecheck: ok (3s)
    web test: ok (40s)
    web build: ok (29s)
    check AC-8: twins equal: ok
    twins: ok (141 equal)
  ```
- Targeted run before check: `log-views-actions`, `log-timeline`, `log-timeline-groups`, `day-view` ac tests, 25/25 passing.

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | PASS | Promote + twin copy + prettier; all ACs green; pm4 check PASS |

## Review
_Filled in by `review-feature`._
**Verdict: approve** (Opus reviewer, 2026-11-12). `pm4 check --feature`: PASS (hashes, scope, lint, format, typecheck,
test, build, AC-8 twins, 141 twins equal). The four files are byte-equal to their prototype twins; the day-view diff only
moves `groupLink`/`GroupLogButton` to `group-log-button.tsx`; Sequential rows get no `onLog` (D2); deleted refs
(`id: null`) get no +.

Minor findings, not fixed:
- `log-timeline.tsx` `onLog` JSDoc says "a group's project (its +)"; it also drives the rows' task +. Fix in the
  prototype twin first, next time the screen changes.
- The + sits inside a `role="button"` trigger div (nested interactive), the existing By Project pattern; keyboard works.
- AC-1 / AC-3 assert lightly (dialog opens, group stays collapsed); enough for a twin copy.

Manual checks for the owner: 360 px Timeline row (text truncates, ⋯ stays visible); keyboard: a group's + doesn't
toggle the group, rows' ⋯ reachable; icons and + in light and dark.

Tier feedback: haiku was right (promote + sed copy, equal to the twins on the first attempt).
