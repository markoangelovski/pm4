---
id: T-0028
title: Tasks module (API-TSK-001…006): CRUD, filters, move, restore
milestone: M3
app: api
status: done
size: M
tier: haiku
depends_on: [T-0024]
feature_spec: specs/06-features/tsk-api.md
spec_row: T1
ac_files:
  - { path: api/test/tasks.ac.e2e-spec.ts, sha256: d312177042731bfbadba689136dd745b60df48c3e708e364be62ecb4e99b40b8 }
---

# T-0028: Tasks module (API-TSK-001…006): CRUD, filters, move, restore

**Tier reason:** Copies the projects module; every rule and query is stated above; ownership via the existing `findOwned`

Work from the brief: `node scripts/pm4.mjs brief T-0028`. Verify with `node scripts/pm4.mjs check T-0028`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

New `api/src/tasks/` module (controller, service, repository, DTOs) registered in `app.module.ts`, a
shared `api/src/common/dto/ref.dto.ts`, and the regenerated `api/openapi.json`. Reviewer: the new
`RefDto` in `common/`, and how the service turns the project's in-trash error into a plain 404 on create/move.

`pm4 check T-0028` (2026-10-04): ac hashes ok, scope ok, lint, format:check, typecheck, test, test:e2e,
build, openapi:export ok, AC-18 ok → **PASS**.

Fix round (attempt 2): DTOs now copy the projects DTOs (`@IsOptional()` + `@TrimToNull()`; `ValidateIf` only on
`status`, and on `projectId`/`title`/`status` in update); status uses `enumName: "TaskStatus"` and the schema's
`taskStatus.enumValues`/`TaskStatus`; `findOwned` has only `allowTrashed`; repository dead code removed; doc
comments fixed; unit specs added (controller, service, repository, `dto/create-task.dto.spec.ts`); openapi re-exported.
`pm4 check T-0028`: ac hashes ok, lint, format:check, typecheck, test, test:e2e, build, openapi:export, AC-18 ok;
scope FAIL only because the three `tasks.*.spec.ts` files are not matched by the Files table (its rows use `…controller.spec.ts`).
Orchestrator: wrote out those three paths in full in `tsk-api.md` *Files* (notation only, as in prj-api); scope now flags only that spec edit.

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | PASS | All 28 acceptance tests pass, every gate green on the first run |
| 2 | sonnet | PASS | Review fixes: DTO null handling, unit tests, minors |

## Review
_Filled in by `review-feature`._

**2026-10-04, Opus reviewer: `changes-requested`.** `pm4 check --feature` PASS. Scoping, trash, sorting,
timestamps and the in-trash → 404 mapping on create/move are correct; `RefDto` is in the spec's *Files*.
1. **Blocker:** `CreateTaskDto` uses `@ValidateIf(o => o.x !== undefined)` instead of `@IsOptional()`, so
   `null`/`""` for description, externalLink, dueDate, projectLeadUserId and projectLeadName → 400
   (conventions: empty optional strings become `null`; the contract says nullable). Copy `CreateProjectDto`:
   `@IsOptional()` + `@TrimToNull()`, `@IsOptional() @IsUUID()` for the lead id; keep `ValidateIf` only on `status`.
2. **Major:** the unit tests in *Files* (`tasks.controller.spec.ts`, `tasks.service.spec.ts`,
   `tasks.repository.spec.ts`) are missing. At least: `findOwned` (bad UUID, missing, task trashed, project
   trashed), the create/move in-trash → 404 mapping, `restore` (409 for a trashed project, no-op when active).
3. Minor: `status` is published as `nullable: true` in create/update; drop it and add `enumName: "TaskStatus"`.
4. Minor: `TASK_STATUSES` is hand-written; use `taskStatus.enumValues` and `TaskStatus` from the schema.
5. Minor: `findOwned` has an extra `checkProjectTrash` option; go back to the spec's single `allowTrashed`.
6. Minor: doc comments in `openapi.json`: `dueDate` says "ISO 8601 UTC" (should be `YYYY-MM-DD` work date);
   the list `status` comment says "empty = no filter" (should be "absent = no filter").
7. Minor: dead code in `tasks.repository.ts`: the `titleMatch` order, the repeated `"upcoming"` default,
   the identity `toRow`, the `lead` join in the count query.

Tier feedback: haiku borderline: structure and queries were right, but it missed the DTO null handling
(the ACs don't catch it) and skipped the unit tests.

**2026-10-04, Opus re-review: `approve`.** All 7 findings fixed, no regressions (`UpdateTaskDto` null
handling matches `UpdateProjectDto`; restore's 409 keeps the conflict problem type). `pm4 check` passes
except scope on the expected `tsk-api.md` *Files* notation edit. Remaining minors (optional): the
`GET /tasks` `status` query enum is inline in `openapi.json` (add `enumName: "TaskStatus"` in
`list-tasks-query.dto.ts`); a few narrating doc comments in `tasks.service.ts` (lines 33, 37, 92, 145).
Repository spec covers only `findById` (queries are covered by the e2e ACs).

Tier feedback: haiku borderline (missed DTO null handling and unit tests); sonnet fixed both cleanly. Haiku
is fine for copy-a-module tasks if the spec says to copy the DTO decorators and lists the unit tests.

Owner-requested cleanups (orchestrator, 2026-10-04): `enumName: "TaskStatus"` on the list `status` query
(now a `$ref` in `openapi.json`); narrating comments in `tasks.service.ts` trimmed. `pm4 check` as above.
