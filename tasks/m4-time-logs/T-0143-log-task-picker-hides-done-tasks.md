---
id: T-0143
title: Log dialog task picker hides done tasks
milestone: M4
app: web
status: review
size: S
tier: haiku
depends_on: []
feature_spec: —
files: [web/features/time/components/task-picker.tsx, web/features/time/components/log-form-dialog.ac.test.tsx, specs/01-requirements/time-logs.md, specs/04-web/screens.md, specs/06-features/tlog-web.md, specs/open-questions.md]
specs: [specs/01-requirements/time-logs.md, specs/04-web/screens.md, specs/06-features/tlog-web.md]
ac_files: []
---

# T-0143: Log dialog task picker hides done tasks

## Goal
The owner's request (2026-11-06): in the Log time / Edit log dialog, done (completed) tasks are no longer listed in the
Task picker. This replaces OQ-118 (every status). The prototype change is `074b9d4`; this task copies it to the app.

## Change
- `web/features/time/components/task-picker.tsx`: the twin of `web/proto/features/time/components/task-picker.tsx`
  (`useTasks` with `statuses: ["upcoming", "in-progress"]`, so the API filters and done tasks don't use any of the 100 slots).
- `web/features/time/components/log-form-dialog.ac.test.tsx` (main session, owner-requested spec change): AC-11 checks
  that the task requests send `status: ["upcoming", "in-progress"]` instead of no status.
- Specs: OQ-118, FR-TLOG-004, SCR-041, feat-tlog-web D7.

## Acceptance criteria
- [x] `pm4 twins`: the file equals its prototype twin.
- [x] AC-11 passes with the new status filter; the other tests still pass.

---

## Implementation notes
Main session. Copied the prototype's change (`074b9d4`) to the twin; updated AC-11 and the specs as the owner asked.

`pm4 check T-0143`: PASS (scope ok; lint, format, typecheck, test, build ok; twins 128 equal).

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | main session (Opus) | PASS | Twin copy, AC-11 and specs |

## Review
_The owner's review (quick lane), or `review-feature`'s verdict._
