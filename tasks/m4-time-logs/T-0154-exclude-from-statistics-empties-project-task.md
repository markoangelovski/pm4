---
id: T-0154
title: Exclude from statistics empties and disables Project and Task
milestone: M4
app: web
status: done
size: S
tier: haiku
depends_on: []
feature_spec: —
files: [web/features/time/components/log-form-dialog.tsx, web/features/time/components/task-picker.tsx, web/features/time/components/log-form-dialog.ac.test.tsx, web/proto/features/time/components/log-form-dialog.tsx, web/proto/features/time/components/task-picker.tsx, specs/01-requirements/time-logs.md, specs/04-web/screens.md]
specs: [specs/01-requirements/time-logs.md, specs/04-web/screens.md]
ac_files: []
---

# T-0154: Exclude from statistics empties and disables Project and Task

## Goal
The owner's request (2026-11-09): in the Log time / Edit log dialog, ticking *Exclude from statistics* empties Project and Task
and disables both; unticking enables them again, empty. The prototype change is `fc51579`; this task copies it to the app.

## Change
- `web/features/time/components/task-picker.tsx`: the twin of its prototype file (a `disabled` prop, as `LogProjectPicker`:
  passed to `Combobox` and `ComboboxInput`, no clear button while disabled).
- `web/features/time/components/log-form-dialog.tsx`: the twin of its prototype file (`excludeFromStats` watched; the checkbox's
  `register` `onChange` clears `project`, `task`, the deleted-name state and their errors when ticked; both pickers disabled and
  both Recent chip rows hidden while ticked).
- `web/features/time/components/log-form-dialog.ac.test.tsx` (main session): one test, *T-0154 FR-TLOG-018 SCR-041*.
- Specs: FR-TLOG-018 (statement + AC), SCR-041.

## Acceptance criteria
- [x] `pm4 twins`: both files equal their prototype twins.
- [x] The T-0154 test passes; the other dialog tests still pass.

---

## Implementation notes
Main session, inline. Prototype changed with the owner (confirmed 2026-11-09), app twins copied with only the import paths changed.
API unchanged: an excluded log may still carry a project or task (e.g. PMSPA imports, integrations.md); an edited log that already
has them keeps them in the disabled boxes until the box is unticked and ticked again (owner kept this, 2026-11-09).

`pm4 check T-0154` (2026-11-09): FAIL only on work outside this task: scope, lint, typecheck, build ok; twins ok (137 equal);
format:check flags `features/dashboard/stats.ac.test.ts`, `day-view.ac.test.tsx`, `log-timeline.ac.test.tsx`, and the only failing
tests are in `log-timeline.ac.test.tsx` (T-0152, not implemented yet). `log-form-dialog.ac.test.tsx`: 11/11 pass.

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | main (opus) | PASS | Prototype + twins + test |

## Review
Owner reviewed the diff and approved the commit (2026-11-09).
