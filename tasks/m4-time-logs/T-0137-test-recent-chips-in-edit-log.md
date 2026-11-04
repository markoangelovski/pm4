---
id: T-0137
title: Test the Recent chips in Edit log
milestone: M4
app: web
status: done
size: S
tier: haiku
depends_on: [T-0136]
feature_spec: —
files: [web/features/time/components/log-form-recent.test.tsx]
specs: [specs/06-features/tlog-recent-links.md, specs/04-web/screens.md#scr-041]
ac_files: []
---

# T-0137: Test the Recent chips in Edit log

## Goal
Cover feat-tlog-recent-links D3/D4 in Edit log (review finding on T-0136): the chips show there, and a chip relinks a log whose
task was deleted.

## Change
`web/features/time/components/log-form-recent.test.tsx` (new, ordinary test): the setup of `log-form-recent.ac.test.tsx`; opens
Edit log for a log on Manhatan with a deleted task "Removed task" on a day with logs Manhatan · Specifications 01 and Website ·
Landing page.

## Acceptance criteria
- [x] Edit log shows "Recent projects" (Manhatan, Website) and, Manhatan being the log's project, "Recent tasks" = Specifications 01; Manhatan is pressed.
- [x] Clicking Specifications 01 replaces the deleted name and saving PATCHes `projectId` p1, `taskId` t1.

---

## Implementation notes
New ordinary test `log-form-recent.test.tsx` (setup copied from `log-form-recent.ac.test.tsx`, `renderDialog(log?)`, PATCH body). Written in the main session. The day's logs: Manhatan · Specifications 01, Website · Landing page, then the edited log (Manhatan, deleted task), so Recent projects = Manhatan, Website.

`pm4 check T-0137`: PASS (scope ok; lint, format, typecheck, test, build ok; twins 128 equal).

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | main session (Opus) | PASS | One test file |

## Review
_The owner's review (quick lane), or `review-feature`'s verdict._
