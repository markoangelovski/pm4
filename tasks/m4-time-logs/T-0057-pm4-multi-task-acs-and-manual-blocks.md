---
id: T-0057
title: pm4 handles ACs of several tasks and keeps manual blocks
milestone: M4
app: infra
status: review
size: S
tier: haiku
depends_on: []
feature_spec: —
files: [scripts/pm4.mjs, specs/06-features/_TEMPLATE.md]
specs: []
ac_files: []
---

# T-0057: pm4 handles ACs of several tasks and keeps manual blocks

## Goal
Two `pm4` defects found in feat-proto-sync-web are fixed: an AC whose *Task* cell lists several tasks no longer runs in the first
task's check (AC-18 blocked T-0055), and `pm4 status <T> blocked` is no longer undone at once (T-0055 flipped straight back to `ready`).

## Change
- `scripts/pm4.mjs`, `loadSpec`: each AC keeps `tasks` (every task its *Task* cells name, in spec order). `task` becomes the **last** of
  them, so `check` treats the AC as pending until its last task. `readiness` (`needsTests`), `cmdHash` and `cmdBrief` use
  `tasks.includes(row)`, so every listed task records the AC's test hashes and sees the AC in its brief.
- `scripts/pm4.mjs`, `refreshBlocked(candidates)`: unblocks only the given tasks. `cmdStatus` passes the changed task's dependents, and
  only when its status moved from not satisfying (`blocked`, `ready`, `in-progress`) to satisfying (`review`, `done`). `cmdHash` passes
  the spec's tasks, reloaded after their `ac_files` are written.
- `specs/06-features/_TEMPLATE.md`: the *Task* column note says an AC with several tasks is checked with the last one.

## Acceptance criteria
- [x] In a scratch copy of `specs/06-features/proto-sync-web.md` with AC-18 back on `T2, T3`, `pm4 check T-0055` lists AC-18 as
  pending (both of its check blocks skipped) and `pm4 check T-0056` runs them; both briefs list AC-18.
- [x] `pm4 status <T> blocked` on a task whose dependencies are satisfied leaves it `blocked`, also after unrelated status changes
  and after a dependency moves from `review` to `done`. A dependency moving from `in-progress` to `review` still unblocks it, and
  `pm4 hash` still unblocks its spec's tasks.
- [x] `pm4 ready` and `pm4 brief` give the same output as before for every task, except the briefs of tasks named in a
  multi-task AC, which now list it. Recorded test files change only where an AC names several tasks.

---

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

Done inline by the main session (infra, like T-0035). Tests ran in a scratch copy of `scripts/`, `specs/` and `tasks/` (plus the
acceptance-test files the hashes need), so the repo's task statuses were never changed.

- Existing specs with a multi-task AC: `prj-api.md` AC-15 (`T2, T3`) and `prj-dates-lead-search.md` AC-11 (`T1, T2`). Their briefs now list the
  AC for every task named, and a future `pm4 hash` of the projects spec would also record `api/test/projects.ac.e2e-spec.ts` in T-0024.
- Reviewer: re-hashing all approved specs (then put back) showed that 19 done tasks have outdated `ac_files` hashes, because later
  test steps edited their acceptance tests (e.g. the sample-name renames). That's expected history, not something this task changes.
  `pm4 check` on those done tasks would report a hash mismatch.

`pm4 check T-0057`: ac hashes none recorded, scope ok, PASS (infra: no gates). `node --check scripts/pm4.mjs` ok.

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | opus (main session) | PASS | Both fixes, verified in a scratch copy |

## Review
_The owner's review (quick lane), or `review-feature`'s verdict._
