---
id: T-0142
title: Hide the done toggle when no done to-dos are left
milestone: M2
app: web
status: done
size: S
tier: haiku
depends_on: []
feature_spec: —
files: [web/features/notes/components/notes-section.tsx]
specs: [specs/06-features/prj-lists.md]
ac_files: []
---

# T-0142: Hide the done toggle when no done to-dos are left

## Goal
On a project or task page, the To-dos card showed "Hide done" even when Show done was on and no done to-dos were left
(e.g. after reopening the last one). This was a minor finding in the feat-prj-lists review. The prototype fix is
`e11b70e`; this task copies it to the app.

## Change
- `web/features/notes/components/notes-section.tsx`: the twin of `web/proto/features/notes/components/notes-section.tsx`
  (copy, rewrite `@/proto/` imports, Prettier). The toggle shows only when `(showDone && doneCount > 0) || hiddenDone > 0`.

## Acceptance criteria
- [x] `pm4 twins`: the file equals its prototype twin.
- [x] Existing tests still pass.

---

## Implementation notes
Main session. Applied the prototype's one-line change (`e11b70e`) to the twin.

`pm4 check T-0142`: PASS (scope ok; lint, format, typecheck, test, build ok; twins 128 equal).

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | main session (Opus) | PASS | Twin copy |

## Review
_The owner's review (quick lane), or `review-feature`'s verdict._
