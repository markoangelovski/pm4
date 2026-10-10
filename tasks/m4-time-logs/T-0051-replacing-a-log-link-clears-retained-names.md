---
id: T-0051
title: Replacing a time log's link clears the retained names of a purged task or project
milestone: M4
app: api
status: done
size: S
tier: haiku
depends_on: [T-0045]
feature_spec: —
files: [api/src/time/time.repository.ts, api/src/time/time-logs.service.ts, api/src/time/time-logs.service.spec.ts]
specs: [specs/03-api/data-model.md#retained-names-fr-trash-006]
ac_files: []
---

# T-0051: Replacing a time log's link clears the retained names of a purged task or project

## Goal
`PATCH /time-logs/:id` with `taskId` or `projectId` in the body sets `deleted_task_title` and
`deleted_project_title` to null in the same `UPDATE`, so a log whose project was purged can be unlinked
(and then loses its booking and can't be booked again).

## Change
- `api/src/time/time.repository.ts`: add two optional members to `TimeLogValues`, after `bookingDate`,
  with the same kind of doc comment ("Only the update path sets it"):
  `deletedTaskTitle?: string | null;` and `deletedProjectTitle?: string | null;`.
  `updateLog` already passes `values` to `.set()`; no other change.
- `api/src/time/time-logs.service.ts`, `TimeLogsService.update`: where the link is replaced
  (`if (linkReplaced) { … Object.assign(values, link); }`), also set
  `values.deletedTaskTitle = null` and `values.deletedProjectTitle = null`. Leave the D5 block
  (`excluded` / `hasProject`) as it is: with the link replaced it already reads `link.projectId`.
  `create` is unchanged (a new log has no retained names).
- `api/src/time/time-logs.service.spec.ts`, in `describe("update clears the booking when the log becomes unbookable (D5)")`:
  - The two tests that replace the link ("taskId and projectId both null", "a move to another project
    keeps the booking") now also expect `deletedTaskTitle: null, deletedProjectTitle: null` in `values()`.
  - Add: "a purged-project log unlinked with projectId null → retained names and booking cleared": the
    log has `projectId: null, deletedProjectTitle: "Old project", deletedTaskTitle: "Old task"`; update with
    `{ projectId: null }`; expect `values()` to equal
    `{ taskId: null, projectId: null, deletedTaskTitle: null, deletedProjectTitle: null, bookingDate: null }`.
  - Leave "a purged-project log keeps its booking through an edit" as it is (no link in the body → names kept).

## Acceptance criteria
- [ ] The new and updated tests in `api/src/time/time-logs.service.spec.ts` pass.
- [ ] `api/test/time-logs.ac.e2e-spec.ts` and `api/test/bookings.ac.e2e-spec.ts` still pass (`npm run test:e2e`).
- [ ] `openapi.json` unchanged (`npm run openapi:export` leaves no diff); no migration.

---

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- `time.repository.ts`: `TimeLogValues` gains optional `deletedTaskTitle` / `deletedProjectTitle`.
- `time-logs.service.ts` (`update`): inside `if (linkReplaced)`, both retained names are set to `null`.
  The D5 block is unchanged.
- `time-logs.service.spec.ts`: the two link-replacing tests expect the cleared names; added the
  purged-project unlink test (`projectId: null` → names and booking cleared).
- `openapi.json` unchanged (`npm run openapi:export`, no diff). No migration.

`node scripts/pm4.mjs check T-0051`:
```
pm4 check T-0051
  ac hashes: none recorded
  scope: ok
  api lint: ok (9s)
  api format:check: ok (2s)
  api typecheck: ok (4s)
  api test: ok (6s)
  api test:e2e: ok (27s)
  api build: ok (5s)

PASS T-0051
```

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | PASS | Edits as above; unit spec 11/11, `pm4 check` PASS, OpenAPI unchanged. |

## Review
_The owner's review (quick lane), or `review-feature`'s verdict._
