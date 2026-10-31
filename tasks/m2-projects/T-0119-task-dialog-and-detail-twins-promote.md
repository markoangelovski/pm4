---
id: T-0119
title: Task dialog and detail twins, promote service-select.tsx, Prompt twins; proposed-types.ts removed
milestone: M2
app: web
status: done
size: S
tier: haiku
depends_on: [T-0117, T-0118]
feature_spec: specs/06-features/prj-services.md
spec_row: T4
ac_files:
  - { path: web/features/tasks/components/task-service.ac.test.tsx, sha256: e17a7e6786b8548f2637bfe518a12a3ef86a47707ad83489c5ab9f230b337f4d }
  - { path: web/features/time/prompt.ac.test.ts, sha256: 72f414407806a4cbd2ff6ff5e341d25cbe463db101174c8d5782d62c8ac46051 }
  - { path: web/features/time/components/day-prompt-dialog.ac.test.tsx, sha256: 1dba0d4a8e3347f3516ee47f1507d03ded8ccd572c7c95a33307d8b05d65623f }
  - { path: web/features/time/components/day-prompt-notes.ac.test.tsx, sha256: 85377b88849810524b72c28aff090ee72cd1c7e4bd4c5cc25512bc2e823246cb }
---

# T-0119: Task dialog and detail twins, promote service-select.tsx, Prompt twins; proposed-types.ts removed

**Tier reason:** Copy-and-sed twins (D10) per *Web (T4)*

Work from the brief: `node scripts/pm4.mjs brief T-0119`. Verify with `node scripts/pm4.mjs check T-0119`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- Prototype: `proto/features/tasks/api.ts` drops the `proposed-types` import (`Task` = schema type with `project`, `TaskInput.serviceId: string | null` required). `proto/features/projects/proposed-types.ts` removed; `grep proposed-types` is empty in `web/proto` and `web/features`.
- Production twins regenerated from the prototype (rewrite `@/proto/` → `@/`, `mock/client` → `lib/api/client`, then Prettier): `features/tasks/api.ts`, `components/task-detail.tsx`, `components/task-form-dialog.tsx`, `features/time/prompt.ts`, `components/day-prompt-dialog.tsx`. `service-select.tsx` is the promoted copy (only the import delta).
- `node scripts/pm4.mjs twins`: 120 equal, 1 intended, 0 warnings, 0 failures.
- Test fixes (orchestrator, BLOCKED: test; test-step gaps, no hashed file changed):
  - `features/time/logged-time.ac.test.tsx`: the `useUpdateTask` body gets `serviceId: null` (TaskInput.serviceId is required).
  - `features/tasks/components/task-detail.ac.test.tsx` AC-13: 5 `—`, not 4 (the Service row, AC-19).
  - `features/tasks/components/task-form-dialog.ac.test.tsx`: the GET router answers `/api/v1/projects/{id}`. `ServiceSelect` loads the project; the unrouted GET threw, and the refetch after create (retry 1 + backoff) outlasted AC-6's `waitFor`.
- `pm4 check T-0119`: PASS (ac hashes ok (4), scope ok, web lint/format/typecheck/test/build/api:types ok, AC-23 ok, twins ok (120 equal)).

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | FAILED | Twins and prototype done; check fails on an unedited acceptance test (logged-time.ac.test.tsx:228 missing serviceId), AC-13 stale `—` count, and AC-6 POST never sent (cause not isolated). BLOCKED: test for the first two. |
| 2 | orchestrator | PASS | Fixed the three acceptance-test fixtures above; no implementation change. `pm4 check` PASS. |

## Review
Feature review (Opus, 2026-10-26): `pm4 check --feature prj-services` PASS, no warnings; all four tasks approved.

- Verdict: **approve**. `TaskInput.serviceId` is required, `proposed-types.ts` is gone, and twins report 0 warnings. The three fixture edits to the acceptance tests are faithful to the spec and weaken nothing.
- Minor (DoD error state): `service-select.tsx:37-40` shows "This project has no services" when the project fetch fails. Fix: a `project.isError` branch, made in the prototype twin first.
- Note: Copy all copies `**Service:** —` for a card whose task query hasn't resolved yet; the project and task links have the same documented limitation. Accept or follow up.
- Tier (haiku): fine for the twins. The failure came from gaps in the test step's fixtures. Next time, the test step should search the existing ACs for every Input body and count assertion that a new field affects.
