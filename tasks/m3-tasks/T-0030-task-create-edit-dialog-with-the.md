---
id: T-0030
title: Task create/edit dialog with the project picker and due-date field
milestone: M3
app: web
status: done
size: M
tier: haiku
depends_on: [T-0029]
feature_spec: specs/06-features/tsk-web.md
spec_row: T2
ac_files:
  - { path: web/features/tasks/components/task-form-dialog.ac.test.tsx, sha256: 988ce996c5fd242d620db81636b0ae190d1454c26dd71abaf514ead099788f86 }
---

# T-0030: Task create/edit dialog with the project picker and due-date field

**Tier reason:** Copies the project form; picker and date field from installed primitives, fully specified

Work from the brief: `node scripts/pm4.mjs brief T-0030`. Verify with `node scripts/pm4.mjs check T-0030`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- `features/tasks/schemas.ts` (new): `taskFormSchema`, `taskFormDefaults`, `toTaskInput`, `TASK_FIELD_MAP`, copied from the projects form pattern.
- `task-form-dialog.tsx`: on `useCreateTask` / `useUpdateTask`; a 404 sets "Choose a project." on the project field, a 400 goes through `applyFieldErrors`, anything else toasts "Couldn't save the task."; the dialog stays open on failure.
- `pm4 check T-0030`: PASS (ac hashes ok (1), scope ok, lint/format:check/typecheck/test/build/api:types ok; AC-16 skipped as a later task).

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | done | Form dialog on the real hooks, schemas.ts added; check PASS |
| 2 | haiku | done | Review fixes: TASK_STATUSES, spread PROJECT_FIELD_MAP |

## Review
**Verdict: approve** (Opus reviewer, 2026-10-04).
- Minor: `schemas.ts:12` hard-codes the status enum instead of `z.enum(TASK_STATUSES)`, and `TASK_FIELD_MAP` lists the keys instead of spreading `PROJECT_FIELD_MAP`. `mutate` with callbacks instead of `mutateAsync` behaves the same.
- Tier: haiku was right.
