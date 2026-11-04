---
id: T-0138
title: A project chip that clears the task also clears its error
milestone: M4
app: web
status: done
size: S
tier: haiku
depends_on: [T-0137]
feature_spec: —
files: [web/proto/features/time/components/log-form-dialog.tsx, web/features/time/components/log-form-dialog.tsx, web/features/time/components/log-form-recent.test.tsx, specs/06-features/tlog-recent-links.md]
specs: [specs/06-features/tlog-recent-links.md]
ac_files: []
---

# T-0138: A project chip that clears the task also clears its error

## Goal
Review finding on T-0136: after "This item no longer exists." under Task, picking another project with a Recent chip clears the task
and that error; a chip of the same project keeps both.

## Change
- `web/proto/features/time/components/log-form-dialog.tsx` and its twin `web/features/time/components/log-form-dialog.tsx`: the
  "Recent projects" `onPick` calls `clearErrors("task")` where it clears a task of another project.
- `web/features/time/components/log-form-recent.test.tsx`: a test of both cases.
- `specs/06-features/tlog-recent-links.md` D3: the same, with a changelog line.

## Acceptance criteria
- [x] After a 404 on save, the Manhatan chip keeps the error, the Website chip clears the task and the error (`log-form-recent.test.tsx`).

---

## Implementation notes
Main session. The new test fails without the change (checked) and passes with it.

`pm4 check T-0138`: PASS (scope ok; lint, format, typecheck, test, build ok; twins 128 equal).

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | main session (Opus) | PASS | Two-line change in both twins, one test |

## Review
_The owner's review (quick lane), or `review-feature`'s verdict._
