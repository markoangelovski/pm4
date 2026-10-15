---
id: feat-hard-delete
title: "Permanent delete of projects and tasks, and Delete day"
status: approved
owner: Marko Angelovski
last_updated: 2026-10-15
milestone: M4
requirements: [FR-PRJ-005, FR-TSK-007, FR-TLOG-014, FR-TLOG-019, API-PRJ-005, API-TSK-005, API-WD-004, SCR-010, SCR-021, SCR-031, SCR-040, SCR-041, SCR-042, SCR-044, SCR-045]
related: [api-data-model, api-endpoints, api-conventions, web-screens, web-routing, arch-deployment, feat-prj-api, feat-tsk-api, feat-tlog-api, feat-rpt-api, feat-prj-web, feat-tsk-web, OQ-149, OQ-150, OQ-152, OQ-153, OQ-154]
prototype: 51c6200
---

# Permanent delete of projects and tasks, and Delete day

## Goal
Deleting a project (with its tasks) or a task removes it for good, and its logs keep its name with the deleted marker
(FR-PRJ-005, FR-TSK-007, FR-TLOG-014, data-model.md *Retained names*). Editing such a log relinks it (OQ-150). The day view
gets **Delete day** (FR-TLOG-019, SCR-040, API-WD-004). The code keeps nothing of `deleted_at`.

## Decisions
| # | Decision | Source |
| --- | --- | --- |
| D1 | API-PRJ-005 / API-TSK-005 run in one transaction: lock the rows (`FOR UPDATE`), save the names on the logs, delete. The lock makes a concurrent log insert linking them wait, then fail its FK, so no log loses its name. | Agent |
| D2 | Two releases. Migration `0005` (T1) replaces the partial indexes with plain ones and deletes the rows whose `deleted_at` is set, saving their names on their logs first. The owner commits and pushes the feature without T4. T4 then drops `deleted_at` (migration `0006`, repeating the data step for rows set in between) and is committed and pushed alone. | OQ-153, OQ-154 (owner, 2026-10-15) |
| D3 | API-WD-004 is one SQL statement (two `DELETE … RETURNING` CTEs), so it needs no transaction. Nothing to delete → `404`. | OQ-152 (owner) · prototype `proposed-types.ts` |
| D4 | Problem bodies carry only `type`, `title`, `status`, `detail` and `errors`; `type`'s slug comes from the status alone. | Owner (2026-10-14) |
| D5 | A changed production file becomes its prototype twin: copy, `@/proto/mock/client` → `@/lib/api/client`, `@/proto/` → `@/`, then Prettier (`pm4 promote` never overwrites). | as feat-proto-sync-web D5 |
| D6 | `useDeleteProject` and `useDeleteTask` also invalidate `["time"]`; `useDeleteDay` invalidates like a log change (`["time"]`, `["projects"]`, `["tasks"]`). | Owner, prototype `51c6200` |
| D7 | The test step adds the contract stubs (*Contract stubs* under *Interfaces*), runs `npm run openapi:export` and `npm run api:types`, and promotes T3's three new components, so both apps typecheck while the tests fail. | Agent |

## Scope
**In:** API-PRJ-005/API-TSK-005 as permanent deletes; every read and filter of `deleted_at` removed from `api/src`; the restore
endpoints, the in-trash exception and the Problem `problemType`/`extensions` mechanism removed; `TRASH_RETENTION_DAYS` removed from
`api/.env.example`; migrations `0005` and `0006` (D2); API-WD-004. In `web/`: the prototype's changes (the deleted marker, the delete
dialogs, the edit-log relink, Delete day), the restore hooks removed, the `/app/trash` page, its route and its sidebar link removed.

**Test step (main session, before T1):** rewrites the acceptance tests that cover the removed behaviour to the ACs below and to the
already-updated ACs of feat-prj-api, feat-tsk-api, feat-tlog-api, feat-rpt-api, feat-rpt-web, feat-prj-web, feat-tsk-web and feat-shell-sidebar-sections;
replaces `/app/trash` with `/app/settings` in `web/lib/auth/return-to.ac.test.ts` and `web/app/components/shared/landing-cta.ac.test.tsx`,
and the `in-trash` sample with a `not-found` one in `web/lib/api/problem.ac.test.ts`; adds the stubs of D7. Then `pm4 hash`.

**Non-goals** (implementers must not touch these):
- Account deletion: it is a data rule only (data-model.md *Entity relationships*); the `users` FKs already cascade. No endpoint, no UI, no Redis code.
- `api/drizzle/0000…0004*` and their snapshots (never edit a committed migration).
- `web/proto/**` other than `web/proto/features/time/api.ts` and `web/proto/features/time/proposed-types.ts` (T3); `web/app/proto/**`.
- `web/components/ui/*`. Any acceptance test (`*.ac.*`).

## Read first
| Path | Why / copy this |
| --- | --- |
| `specs/03-api/data-model.md#retained-names-fr-tlog-014` | What a delete saves on the logs (T1, T4) |
| `specs/03-api/endpoints.md#api-prj-005-delete-project`, `#api-tsk-005-delete-task`, `#api-wd-004-delete-a-day` | Contracts |
| `api/src/time/time.repository.ts` → `insertLog` (`this.db.transaction`), `reportProjects` (`this.db.execute(sql…)`) | A transaction; a raw SQL statement (T1, T2) |
| `api/src/time/time-logs.controller.ts` → `remove` | A `DELETE` handler: `@HttpCode(HttpStatus.NO_CONTENT)`, `@ApiNoContentResponse` (T2) |
| `api/drizzle/0004_useful_rocket_raccoon.sql` | Generated migration format, `--> statement-breakpoint` (T1, T4) |
| `web/proto/features/time/api.ts`, `web/proto/features/projects/api.ts`, `web/proto/features/tasks/api.ts` | The hooks the promoted components call; production equals them apart from the client import (T3) |

## Files
| App | File | C/M | Task | Notes |
| --- | --- | --- | --- | --- |
| api | `api/test/projects.ac.e2e-spec.ts`, `api/test/tasks.ac.e2e-spec.ts`, `api/test/time-logs.ac.e2e-spec.ts`, `api/test/reports.ac.e2e-spec.ts`, `api/test/logged-time.ac.e2e-spec.ts` | M | tests | Rewritten (Scope) |
| api | `api/test/delete-day.ac.e2e-spec.ts` | C | tests | Acceptance tests (API-WD-004) |
| api | `api/test/support/project-test-utils.ts` | M | tests | No `deletedAt` seeding |
| api | `api/src/time/workdays.controller.ts`, `api/src/time/workdays.service.ts` | M | tests, T2 | `deleteDay`: stub (D7), then real |
| api | `api/openapi.json` | M | tests, T1, T2 | `npm run openapi:export` |
| api | `api/src/database/schema/projects.ts` | M | T1, T4 | T1: plain indexes; T4: no `deletedAt` |
| api | `api/drizzle/0005_*.sql`, `api/drizzle/meta/0005_snapshot.json`, `api/drizzle/meta/_journal.json` | C | T1 | `npm run db:generate -- --name permanent_delete`, then the data step prepended |
| api | `api/src/projects/projects.repository.ts`, `api/src/projects/projects.service.ts`, `api/src/projects/projects.controller.ts` | M | T1 | |
| api | `api/src/tasks/tasks.repository.ts`, `api/src/tasks/tasks.service.ts`, `api/src/tasks/tasks.controller.ts`, `api/src/tasks/dto/list-tasks-query.dto.ts` | M | T1 | |
| api | `api/src/projects/*.spec.ts`, `api/src/tasks/*.spec.ts` | M | T1 | Ordinary tests: drop the restore/trash cases, adjust to `delete` |
| api | `api/src/time/time.repository.ts`, `api/src/time/time-logs.service.ts`, `api/src/time/reports.service.ts` | M | T2 | |
| api | `api/src/common/dto/ref.dto.ts`, `api/src/time/dto/dashboard-report-response.dto.ts` | M | T2 | Doc comments |
| api | `api/src/common/exceptions/in-trash.exception.ts`, `api/src/common/exceptions/in-trash.exception.spec.ts` | D | T2 | `rm` (and the empty folder) |
| api | `api/src/common/filters/problem-details/problem-details.filter.ts`, `api/src/common/filters/problem-details/problem-details.filter.spec.ts` | M | T2 | D4 |
| api | `api/src/time/*.spec.ts` | M | T2 | Ordinary tests: no `*DeletedAt` fields, no "trashed"/"purged" wording |
| api | `api/.env.example` | M | T2 | Remove the `# Trash retention (days).` line, `TRASH_RETENTION_DAYS=31` and the blank line before them |
| api | `api/drizzle/0006_*.sql`, `api/drizzle/meta/0006_snapshot.json`, `api/drizzle/meta/_journal.json` | C | T4 | `npm run db:generate -- --name drop_deleted_at`, then the data step prepended |
| web | `web/features/projects/api.ac.test.tsx`, `web/features/tasks/api.ac.test.tsx`, `web/features/time/api.ac.test.tsx` | M | tests | Invalidations; `useDeleteDay` |
| web | `web/features/projects/components/project-detail.ac.test.tsx`, `web/features/tasks/components/task-detail.ac.test.tsx` | M | tests | No in-trash states; the new dialog copy |
| web | `web/features/time/components/day-view.ac.test.tsx`, `web/features/time/components/log-form-dialog.ac.test.tsx`, `web/features/time/day.ac.test.ts` | M | tests | Delete day, the marker, the relink; wording |
| web | `web/app/(dashboard-layout)/layout/vertical/sidebar/sidebaritems.ac.test.ts`, `web/app/(dashboard-layout)/layout/vertical/sidebar/nav-collapse/nav-collapse.ac.test.tsx` | M | tests | Footer: Settings only |
| web | `web/lib/api/problem.ac.test.ts`, `web/lib/auth/return-to.ac.test.ts`, `web/app/components/shared/landing-cta.ac.test.tsx` | M | tests | Samples (Scope) |
| web | `web/features/dashboard/components/dashboard-view.ac.test.tsx` | M | tests | The deleted marker (feat-rpt-web AC-10) |
| web | `web/lib/api/schema.d.ts` | M | tests, T3 | `npm run api:types` |
| web | `web/proto/features/time/components/deleted-marker.tsx` → `web/features/time/components/deleted-marker.tsx` | P | tests, T3 | Nothing to change |
| web | `web/proto/features/time/components/day-menu.tsx` → `web/features/time/components/day-menu.tsx` | P | tests, T3 | Nothing to change |
| web | `web/proto/features/time/components/delete-day-dialog.tsx` → `web/features/time/components/delete-day-dialog.tsx` | P | tests, T3 | Nothing to change |
| web | `web/features/time/api.ts` | M | tests, T3 | `useDeleteDay`: stub (D7), then real |
| web | `web/proto/features/time/api.ts` | M | T3 | `useDeleteDay` without the cast |
| web | `web/proto/features/time/proposed-types.ts` | D | T3 | `rm` |
| web | `web/features/projects/api.ts`, `web/features/tasks/api.ts` | M | T3 | Replaced by the twin (D5) |
| web | `web/features/projects/components/project-detail.tsx`, `web/features/projects/components/delete-project-dialog.tsx` | M | T3 | Replaced by the twin (D5) |
| web | `web/features/tasks/components/task-detail.tsx`, `web/features/tasks/components/delete-task-dialog.tsx` | M | T3 | Replaced by the twin (D5) |
| web | `web/features/time/components/day-view.tsx`, `web/features/time/components/day-picker.tsx`, `web/features/time/components/log-row.tsx`, `web/features/time/components/log-form-dialog.tsx`, `web/features/time/components/log-project-picker.tsx`, `web/features/time/components/task-picker.tsx`, `web/features/time/components/logged-time-section.tsx` | M | T3 | Replaced by the twin (D5) |
| web | `web/features/bookings/components/day-section.tsx`, `web/features/dashboard/components/project-hours.tsx` | M | T3 | Replaced by the twin (D5) |
| web | `web/app/(dashboard-layout)/app/trash/page.tsx` | D | T3 | `rm` (and the empty folder) |
| web | `web/lib/routes.ts`, `web/lib/api/problem.ts` | M | T3 | |
| web | `web/app/(dashboard-layout)/layout/vertical/sidebar/sidebaritems.ts`, `web/app/(dashboard-layout)/layout/vertical/sidebar/sidebaritems.test.ts` | M | T3 | |

## Interfaces

### Delete project and task (T1)
```ts
// api/src/projects/projects.repository.ts — replaces setDeletedAt. Drops `deletedAt` from ProjectRow, selectRows,
// and every isNull(projects.deletedAt) / isNull(tasks.deletedAt) condition (list, update, the counts subquery).
/** API-PRJ-005 (D1): the project and, by the cascade, its tasks; their names stay on the logs. false = not the caller's. */
async delete(userId: string, id: string): Promise<boolean> {
  return this.db.transaction(async (tx) => {
    const [project] = await tx.select({ title: projects.title }).from(projects)
      .where(and(eq(projects.userId, userId), eq(projects.id, id))).for("update");
    if (!project) return false;
    await tx.select({ id: tasks.id }).from(tasks).where(eq(tasks.projectId, id)).for("update");
    await tx.update(timeLogs).set({ deletedTaskTitle: tasks.title }).from(tasks)
      .where(and(eq(timeLogs.userId, userId), eq(timeLogs.taskId, tasks.id), eq(tasks.projectId, id)));
    await tx.update(timeLogs).set({ deletedProjectTitle: project.title })
      .where(and(eq(timeLogs.userId, userId), eq(timeLogs.projectId, id)));
    await tx.delete(projects).where(and(eq(projects.userId, userId), eq(projects.id, id)));
    return true;
  });
}

// api/src/tasks/tasks.repository.ts — replaces setDeletedAt. Drops `deletedAt` and `projectDeletedAt` from TaskRow and
// selectRows, and the isNull(tasks.deletedAt) / isNull(projects.deletedAt) conditions.
/** API-TSK-005 (D1): the task; its name stays on its logs, which keep their project. false = not the caller's. */
async delete(userId: string, id: string): Promise<boolean>;
// same shape: SELECT title FROM tasks WHERE user_id, id FOR UPDATE → none: false;
// UPDATE time_logs SET deleted_task_title = title WHERE user_id = userId AND task_id = id; DELETE the task; true.

// projects.service.ts / tasks.service.ts
async remove(userId: string, id: string): Promise<void> {
  if (!isUUID(id) || !(await this.projectsRepository.delete(userId, id)))   // tasks: tasksRepository
    throw new NotFoundException("Project not found.");                       // tasks: "Task not found."
}
// findOwned(userId, id): no `opts`; missing or non-UUID → NotFoundException only. `restore` removed from both services
// and controllers (`POST /projects/{id}/restore`, `POST /tasks/{id}/restore`), with their imports (ConflictException, InTrashException).
// tasks.service create/update: `await this.projectsService.findOwned(userId, dto.projectId)` without the try/catch
// (it already throws NotFoundException("Project not found.")). toDto: `project: { id, title, deleted: false }`.
// Doc comments: "Deletes the project and its tasks permanently (API-PRJ-005)", "Deletes the task permanently (API-TSK-005)";
// controllers' class comments end at the endpoint range (no "A trashed … → 404 in-trash"); @ApiNoContentResponse "Deleted.".
// list-tasks-query.dto.ts projectId comment: "no value or a foreign or unknown project → empty items".
```

### Database (T1, T4)
`api/src/database/schema/projects.ts`, T1: the index list becomes `index("projects_user_id_idx").on(t.userId)` for `projects`, and
`index("tasks_project_id_idx").on(t.projectId)`, `index("tasks_user_id_status_idx").on(t.userId, t.status)` for `tasks`
(data-model.md). `deletedAt` stays declared in both tables, unread, until T4 (D2). Then `npm run db:generate -- --name permanent_delete`
and prepend this data step to the generated `0005_permanent_delete.sql`, each statement ending in `--> statement-breakpoint`:
```sql
UPDATE "time_logs" SET "deleted_task_title" = t."title" FROM "tasks" t JOIN "projects" p ON p."id" = t."project_id"
  WHERE "time_logs"."task_id" = t."id" AND (t."deleted_at" IS NOT NULL OR p."deleted_at" IS NOT NULL);
UPDATE "time_logs" SET "deleted_project_title" = p."title" FROM "projects" p
  WHERE "time_logs"."project_id" = p."id" AND p."deleted_at" IS NOT NULL;
DELETE FROM "tasks" WHERE "deleted_at" IS NOT NULL;
DELETE FROM "projects" WHERE "deleted_at" IS NOT NULL;
```
T4: remove `deletedAt` (and the now unused `timestamp` import if any) from both tables, `npm run db:generate -- --name drop_deleted_at`,
and prepend the same data step to `0006_drop_deleted_at.sql`.

### Delete day and the time read model (T2)
```ts
// api/src/time/time.repository.ts
/** API-WD-004 (D3): the day's workday and logs (their bookings go with them). false = there was neither. */
async deleteDay(userId: string, date: string): Promise<boolean> {
  const result = await this.db.execute<{ n: number }>(sql`
    WITH l AS (DELETE FROM ${timeLogs} WHERE ${timeLogs.userId} = ${userId} AND ${timeLogs.workDate} = ${date} RETURNING 1),
         w AS (DELETE FROM ${workdays} WHERE ${workdays.userId} = ${userId} AND ${workdays.workDate} = ${date} RETURNING 1)
    SELECT ((SELECT count(*) FROM l) + (SELECT count(*) FROM w))::int AS n`);
  return result.rows[0].n > 0;
}
// TimeLogRow drops taskDeletedAt, taskProjectDeletedAt, projectDeletedAt; selectRows drops them and the `taskProject`
// alias and its join. ReportProjectRow drops projectDeletedAt; reportProjects' SQL drops `p.deleted_at` (SELECT and GROUP BY).

// api/src/time/workdays.service.ts
/** API-WD-004. */
async deleteDay(userId: string, date: string): Promise<void> {
  assertDate(date, "date");
  if (!(await this.timeRepository.deleteDay(userId, date))) throw new NotFoundException("Workday not found.");
}

// api/src/time/time-logs.service.ts
function toRef(id: string | null, title: string | null, snapshot: string | null): RefDto | null;
// title !== null → { id, title, deleted: false }; snapshot !== null → { id: null, title: snapshot, deleted: true }; else null.
// toTimeLogDto doc: "The `TimeLog` read model, with the retained names of deleted links."
// resolveLink: the two try/catch blocks go; findOwned of tasks/projects already throws "Task not found." / "Project not found.".
// api/src/time/reports.service.ts toProjectRef: live → deleted: false.
// ref.dto.ts doc: "`deleted` is true for a deleted project or task: `id` is null and `title` is its retained name."
// dashboard-report-response.dto.ts project doc: "The project `Ref` (a deleted project → its retained name, `deleted: true`); …".
// Comments that say "trashed" or "purged" say "deleted".
```
The problem filter (D4): delete `STANDARD_MEMBERS`, `extractProblemType`, the `problemType`/`extensions` fields of `describe`'s
result and the extension loop; `slug = SLUG_BY_STATUS[described.status] ?? "error"`. The filter spec loses its `problemType`/`extensions` cases.

### Contract stubs (test step; T2, T3)
```ts
// api/src/time/workdays.controller.ts (class comment: API-WD-001…004) — final
/** Delete the day's start and logs (API-WD-004). */
@Delete(":date") @HttpCode(HttpStatus.NO_CONTENT) @ApiParam({ name: "date", type: String, format: "date" })
@ApiNoContentResponse({ description: "Deleted." }) @ApiProblemResponses(400, 401, 404)
deleteDay(@CurrentUser() user: AuthUser, @Param("date") date: string): Promise<void> {
  return this.workdaysService.deleteDay(user.id, date);
}
```
`WorkdaysService.deleteDay` and `useDeleteDay`'s `mutationFn` get the body `throw new Error("not implemented (feat-hard-delete)")`.
Then `npm run openapi:export`, `npm run api:types`, and `node scripts/pm4.mjs promote <T3>`.

### Web (T3)
- Every `Replaced by the twin` row: D5, e.g. `sed -e 's#@/proto/mock/client#@/lib/api/client#' -e 's#@/proto/#@/#g' proto/features/x.tsx > features/x.tsx`
  from `web/`, then `npx prettier --write` on the changed files. `node scripts/pm4.mjs twins` must then report no failure.
- `web/features/time/api.ts` and its twin `web/proto/features/time/api.ts`: the `useDeleteDay` of the prototype, with
  `unwrapVoid(await apiClient.DELETE("/api/v1/workdays/{date}", { params: { path: { date } } }))` (no cast) and without the
  `proposed-types` import; then `rm web/proto/features/time/proposed-types.ts`. `useRestoreProject` and `useRestoreTask` disappear with the twins.
- `web/lib/routes.ts`: remove `trash`. `sidebaritems.ts`: remove the Trash item and the `Trash2` import; the doc comment says
  "Settings lives in `footerItems`." `sidebaritems.test.ts`: the footer names are `["Settings"]`.
- `web/lib/api/problem.ts`: the `slug` comment's examples are `("not-found", "validation", …)`.
- `npm run api:types` after T2's `openapi.json` (no restore paths, `DELETE /api/v1/workdays/{date}`).

## Acceptance criteria
| AC | Case → expected | Test | Task |
| --- | --- | --- | --- |
| AC-1 | API-PRJ-005: `DELETE /projects/P` → `204`; `GET` → `404` `…/errors/not-found`; the list leaves it out; its task rows are gone from the database; `DELETE` again → `404 not-found`; B's → `404`, B's project unchanged | `api/test/projects.ac.e2e-spec.ts` | T1 |
| AC-2 | API-TSK-005: `DELETE /tasks/T` → `204`; the row is gone; `GET`/`PATCH`/`DELETE` T → `404 not-found`; P's counts leave it out, P's `updatedAt` unchanged; `POST /tasks` into a deleted project and `PATCH {projectId}` to one → `404 not-found` | `api/test/tasks.ac.e2e-spec.ts` | T1 |
| AC-3 | `POST /projects/P/restore` and `POST /tasks/T/restore` → `404` | `api/test/projects.ac.e2e-spec.ts`, `api/test/tasks.ac.e2e-spec.ts` | T1 |
| AC-4 | FR-TLOG-014: after `DELETE /projects/P`, its direct log and its task T's log stay in their day with `project {id: null, title: P's, deleted: true}` (T's log also `task {id: null, title: T's, deleted: true}`), keep their `bookingDate` and count in `totalMinutes`; after `DELETE /tasks/U` its log has `task {id: null, title: U's, deleted: true}` and its live `project`; a log linked to a deleted id → `404` | `api/test/time-logs.ac.e2e-spec.ts` | T1 |
| AC-5 | API-RPT-001: a deleted project's minutes are one row `project {id: null, title, deleted: true}`, merged by retained name; a live project's `deleted` is `false` | `api/test/reports.ac.e2e-spec.ts` | T1 |
| AC-6 | `loggedMinutes` of P still counts the logs of its deleted task | `api/test/logged-time.ac.e2e-spec.ts` | T1 |
| AC-7 | Migration `0005` on a local database at `0004` where project P (one task, logs on both) and task U of project Q have `deleted_at` set: `npm run db:migrate` → P, its task and U are gone; their logs show the retained names; `\d projects` shows `projects_user_id_idx` and no partial index | `manual` | T1 |
| AC-8 | API-WD-004: a day with a start, two logs (one booked to it) and an earlier day's log booked to it → `DELETE /workdays/{date}` `204`; `GET /workdays/{date}` → `startMinute null`, `logs []`, `totalMinutes 0`; API-WD-001 leaves it out; the earlier log still has that `bookingDate` (API-BOOK-001 of that date lists it); again → `404 not-found`; a day with only a start → `204`; a future date → `404`; `2026-13-01` → `400`; B's start and log on that date unchanged | `api/test/delete-day.ac.e2e-spec.ts` | T2 |
| AC-9 | `useDeleteProject("p1")` removes the detail and invalidates `projectKeys.lists()`, `["tasks"]` and `["time"]`; `useDeleteTask` also invalidates `["time"]` | `web/features/projects/api.ac.test.tsx`, `web/features/tasks/api.ac.test.tsx` | T3 |
| AC-10 | `useDeleteDay` with `2026-10-06` → `DELETE /api/v1/workdays/2026-10-06`; invalidates `["time"]`, `["projects"]`, `["tasks"]` | `web/features/time/api.ac.test.tsx` | T3 |
| AC-11 | SCR-021 / SCR-031: a `404` → "Project not found" / "Task not found" only; the dialogs say "… will be deleted permanently. …"; Delete → `DELETE`, toast "Project deleted" / "Task deleted", the list / the project page; the Logged time section shows on a loaded page | `web/features/projects/components/project-detail.ac.test.tsx`, `web/features/tasks/components/task-detail.ac.test.tsx` | T3 |
| AC-12 | SCR-040 Delete day: **Day actions** → **Delete day** disabled on a day with no start and no logs; on a day with a start and 2 logs (1h 30m) the dialog says "<date in full>: its start time and its 2 logs (1h 30m) will be deleted permanently, with their bookings."; Cancel → no request; Delete → `DELETE /api/v1/workdays/<date>`, toast "Day deleted", the dialog closes, the URL keeps the date; a `500` → toast "Couldn't delete the day.", the dialog stays | `web/features/time/components/day-view.ac.test.tsx` | T3 |
| AC-13 | SCR-040/042: a log of a deleted project and task shows both names as plain text with an element labelled "deleted" and no link; in By project its group heading shows the name with the marker and no project icon. SCR-010: Hours by project shows a deleted project as plain text with the marker (feat-rpt-web AC-10) | `web/features/time/components/day-view.ac.test.tsx`, `web/features/dashboard/components/dashboard-view.ac.test.tsx` | T3 |
| AC-14 | SCR-041 (OQ-150): editing a log of a deleted project shows its name with the marker in the Project box; Save with only the text changed → `PATCH` without `projectId`/`taskId`; clearing the box → `PATCH` with `projectId: null`, `taskId: null`; picking project P → `projectId: "P"` | `web/features/time/components/log-form-dialog.ac.test.tsx` | T3 |
| AC-15 | The sidebar footer is one section with Settings only; at `/app/settings` it is active | `web/app/(dashboard-layout)/layout/vertical/sidebar/sidebaritems.ac.test.ts`, `web/app/(dashboard-layout)/layout/vertical/sidebar/nav-collapse/nav-collapse.ac.test.tsx` | T3 |
| AC-16 | No restore path, `in-trash` type or trash wording in `api/src`, `api/.env.example` or `api/openapi.json`; only the schema still declares `deleted_at`; `openapi.json` has `delete` on `/api/v1/workdays/{date}` | `check` | T2 |
| AC-17 | No trash wording, `/app/trash` or restore hook in `web/` code; no `proposed-types.ts` under `web/proto/features/time`; the build has no `/app/trash` page | `check` | T3 |
| AC-18 | Locally against the API: delete a project with logged time → toast, the list; its logs show its name with the tombstone on the day view, Bookings and the Dashboard; edit one and pick another project → linked, no marker; Delete day on a day with logs → empty day, a log of another day booked to it keeps its booking on Bookings | `manual` | T3 |
| AC-19 | T4: `deleted_at` is gone from `api/src` and `0006` drops both columns | `check` | T4 |

## Checks
```bash
# AC-16: no trace in the API
! grep -rniE "\btrash(ed)?\b|in-trash|/restore|problemType|TRASH_RETENTION|purge" api/src api/.env.example api/openapi.json
test ! -e api/src/common/exceptions/in-trash.exception.ts
test -z "$(grep -rln "deletedAt\|deleted_at" api/src | grep -v '^api/src/database/schema/projects.ts$')"
node -e 'const o=require("./api/openapi.json");process.exit(o.paths["/api/v1/workdays/{date}"]?.delete?0:1)'
# AC-17: no trace in the web app
! grep -rniE "\btrash(ed)?\b|app/trash|useRestore|in-trash" web/features web/lib web/app --include=*.ts --include=*.tsx
test ! -e web/proto/features/time/proposed-types.ts
test ! -e "web/app/(dashboard-layout)/app/trash"
test ! -e web/out/app/trash.html
# AC-19: the columns are dropped
! grep -rn "deletedAt\|deleted_at" api/src
test "$(grep -c 'DROP COLUMN "deleted_at"' api/drizzle/0006_*.sql)" = 2
```

## Tasks
| # | Task | App | Size | Tier | Why this tier | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | Permanent delete of projects and tasks, restore removed, migration `0005` | api | M | opus | Transactions over several tables with row locks (D1); a data migration | — |
| T2 | Delete day (API-WD-004), the time read model, the in-trash exception and the Problem mechanism removed | api | M | haiku | Signatures and SQL spelled out; copy `time-logs.controller.ts` `remove` | T1 |
| T3 | Promote the prototype: the marker, delete dialogs, relink, Delete day; Trash page, route and link removed | web | M | haiku | Promote + twins (D5); hooks spelled out | T2 |
| T4 | Drop `deleted_at` (migration `0006`), after the release with T1–T3 is live (D2) | api | S | haiku | Generated migration plus the data step from *Interfaces* | T3 |

## Open questions
None.

## Changelog
- 2026-10-15: Initial draft (OQ-152…OQ-154). To `review`.
