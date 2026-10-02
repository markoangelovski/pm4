---
id: feat-tsk-api
title: "Tasks API: CRUD, filters, move, status and restore"
status: approved
owner: Marko Angelovski
last_updated: 2026-10-03
milestone: M3
requirements: [FR-TSK-001, FR-TSK-002, FR-TSK-003, FR-TSK-004, FR-TSK-005, FR-TSK-006, FR-TSK-007, FR-TRASH-003, API-TSK-001, API-TSK-002, API-TSK-003, API-TSK-004, API-TSK-005, API-TSK-006]
related: [req-tasks, req-trash, api-endpoints, api-data-model, api-conventions, sec, feat-prj-api, feat-tsk-web, OQ-028, OQ-080, OQ-081, OQ-084, OQ-085, OQ-087, OQ-088, OQ-090, OQ-091]
---

# Tasks API: CRUD, filters, move, status and restore

## Goal
The API lets a signed-in user create tasks in their projects, list them per project or across projects
(status filter, search, sort, pages), read, edit (including status and moving to another project),
delete (to the trash) and restore them. Contract:
[endpoints.md → Shared project and task shapes](../03-api/endpoints.md#shared-project-and-task-shapes),
API-TSK-001…006. The `tasks` table exists already (feat-prj-api T1). The web side is feat-tsk-web.

## Decisions
| # | Decision | Source |
| --- | --- | --- |
| D1 | Statuses `upcoming`, `in-progress`, `completed`; any transition; default `upcoming`. Due date and lead optional, no default. | OQ-006, OQ-028 (owner) |
| D2 | Every successful `PATCH`, including a status change, sets the task's `updatedAt`; the project's `updatedAt` never changes. | OQ-087, OQ-091 (owner) |
| D3 | Restore is built now (API-TSK-006); `409` when the project is in the trash. | OQ-090, OQ-030c (owner) |
| D4 | Moving a task doesn't touch time logs yet: the table doesn't exist until M4, whose feature adds the update. | Agent: data-model.md *time_logs* |
| D5 | A body `projectId` that is missing, another user's or in the trash → `404 not-found` "Project not found." (all three alike). A list `projectId` like that → empty list. | endpoints.md API-TSK-001/002 |
| D6 | The lead reuses `ProjectLeadService` unchanged; the project lookup reuses `ProjectsService.findOwned`. | feat-prj-api D9 |
| D7 | `status` query: comma-separated, split by a DTO `@Transform`, each value `@IsIn`, at least one, duplicates ignored. | conventions.md *Pagination, sorting, filtering* |

## Scope
**In:** the `tasks` module (API-TSK-001…006), `RefDto`, the OpenAPI export.

**Before the tests are written:** feat-prj-api is done.

**Non-goals** (implementers must not touch these):
- Anything in `web/`. The `tasks` table and its migration (already there; no schema change).
- Time logs and totals (D4, OQ-080). Permanent delete (API-TSK-007), the trash list, the purge (M6).
- `projects/*` beyond what's listed in *Files*, `users/*`, the Problem Details filter, `common/validation/*`.
- `api/test/*` files written in the test step.

## Read first
| Path | Why / copy this |
| --- | --- |
| `specs/03-api/endpoints.md#shared-project-and-task-shapes` and API-TSK-001…006 | Contract |
| `specs/03-api/data-model.md#tasks` | Table, *effectively deleted* |
| `api/src/projects/` (module, controller, service, repository, `dto/`) | The pattern to copy: layering, list/count queries, `findOwned` |
| `api/src/users/project-lead.service.ts`, `api/src/users/dto/project-lead.dto.ts` | Lead input and output |
| `api/src/common/exceptions/in-trash.exception.ts`, `api/src/common/dto/page-query.dto.ts`, `api/src/common/validation/transforms.ts`, `api/src/common/sql/escape-like.ts` | Shared helpers |
| `api/src/database/schema/projects.ts` | `tasks`, `taskStatus`, `TaskStatus` |
| `api/test/support/auth-test-utils.ts`, `api/test/support/project-test-utils.ts` | Test sign-in and seeding |

## Files
| App | File | C/M | Task | Notes |
| --- | --- | --- | --- | --- |
| api | `api/test/tasks.ac.e2e-spec.ts` | C | tests | API-TSK-* |
| api | `api/src/common/dto/ref.dto.ts` | C | T1 | Hand-written |
| api | `api/src/tasks/tasks.module.ts` | C | T1 | `npx nest g module tasks` |
| api | `api/src/tasks/tasks.controller.ts`, `…controller.spec.ts` | C | T1 | `npx nest g controller tasks` |
| api | `api/src/tasks/tasks.service.ts`, `…service.spec.ts` | C | T1 | `npx nest g service tasks` |
| api | `api/src/tasks/tasks.repository.ts`, `…repository.spec.ts` | C | T1 | `npx nest g provider tasks/tasks.repository --flat` |
| api | `api/src/tasks/dto/*.ts` | C | T1 | Hand-written |
| api | `api/src/app.module.ts` | M | T1 | The CLI adds `TasksModule` |
| api | `api/openapi.json` | M | T1 | `npm run openapi:export` |

## Interfaces

### DTOs (T1)
```ts
// api/src/common/dto/ref.dto.ts (conventions.md "ref object")
export class RefDto { @ApiProperty({ type: String, nullable: true }) id: string | null; title: string; deleted: boolean }

// api/src/tasks/dto/
export const TASK_STATUSES = taskStatus.enumValues;  // ['upcoming', 'in-progress', 'completed']
export const TASK_SORTS = ['updatedAt:desc', 'updatedAt:asc', 'dueDate:asc', 'dueDate:desc', 'title:asc', 'title:desc'] as const;

export class CreateTaskDto {
  @IsUUID() projectId: string;
  @Trim() @IsString() @Length(1, 200) title: string;
  @IsOptional() @TrimToNull() @IsString() @MaxLength(2000) description?: string | null;
  @IsOptional() @TrimToNull() @IsUrl({ protocols: ['http', 'https'], require_protocol: true }) @MaxLength(500) externalLink?: string | null;
  @IsOptional() @IsUUID() projectLeadUserId?: string | null;
  @IsOptional() @TrimToNull() @IsString() @MaxLength(100) projectLeadName?: string | null;
  @IsOptional() @IsIn(TASK_STATUSES) status?: TaskStatus;               // null → 400 (use @ValidateIf(o => o.status !== undefined))
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) @IsISO8601({ strict: true }) dueDate?: string | null;
}
export class UpdateTaskDto { /* the same fields; projectId, title, status: @ValidateIf((o) => o.<field> !== undefined) so null → 400 */ }
export class ListTasksQueryDto extends PageQueryDto {
  @IsOptional() @IsUUID() projectId?: string;
  @IsOptional() @Transform(/* 'a,b' → unique trimmed array */) @IsArray() @ArrayMinSize(1) @IsIn(TASK_STATUSES, { each: true }) status?: TaskStatus[];
  @IsOptional() @IsIn(TASK_SORTS) sort: TaskSort = 'updatedAt:desc';
}
export class TaskResponseDto {
  id: string; project: RefDto; title: string;
  @ApiProperty({ type: String, nullable: true }) description: string | null;
  @ApiProperty({ type: String, nullable: true }) externalLink: string | null;
  @ApiProperty({ type: ProjectLeadDto, nullable: true }) projectLead: ProjectLeadDto | null;
  @ApiProperty({ enum: TASK_STATUSES, enumName: 'TaskStatus' }) status: TaskStatus;
  /** YYYY-MM-DD */ @ApiProperty({ type: String, nullable: true }) dueDate: string | null;
  /** ISO 8601 UTC */ createdAt: string; /** ISO 8601 UTC */ updatedAt: string;
}
export class TaskListResponseDto { items: TaskResponseDto[]; page: number; pageSize: number; total: number }
```
`status=` (empty) → `400`; `status=upcoming,upcoming` = `['upcoming']`.

### Repository and service (T1)
```ts
// api/src/tasks/tasks.repository.ts (every method scoped by userId)
export interface TaskRow extends LeadRow { /* tasks columns */ projectTitle: string; projectDeletedAt: Date | null }
insert(userId: string, values: TaskValues): Promise<string>;
findById(userId: string, id: string): Promise<TaskRow | null>;   // joins projects and the lead user; includes trashed
list(userId: string, filter: { projectId?: string; status?: TaskStatus[]; q: string | null }, sort: TaskSort, page: number, pageSize: number): Promise<{ rows: TaskRow[]; total: number }>;
update(userId: string, id: string, values: Partial<TaskValues>): Promise<void>;  // also updatedAt = now()
setDeletedAt(userId: string, id: string, deletedAt: Date | null): Promise<void>;

// api/src/tasks/tasks.service.ts
create(userId, dto): Promise<TaskResponseDto>;   list(userId, query): Promise<TaskListResponseDto>;
get(userId, id): Promise<TaskResponseDto>;       update(userId, id, dto): Promise<TaskResponseDto>;
remove(userId, id): Promise<void>;               restore(userId, id): Promise<void>;
findOwned(userId: string, id: string, opts?: { allowTrashed?: boolean }): Promise<TaskRow>;

// api/src/tasks/tasks.controller.ts: @ApiBearerAuth('bearer') @Controller('tasks'), same routes as projects
```
- `list`: `JOIN projects p ON p.id = t.project_id AND p.deleted_at IS NULL`, `t.deleted_at IS NULL`, `t.user_id = $1`,
  then the filters (`status` → `inArray`, `q` → `ilike(t.title, …escapeLike…)`). Sorts: `updatedAt` → `t.updated_at`;
  `title` → `lower(t.title)`; `dueDate` → `t.due_date ASC NULLS LAST` / `DESC NULLS LAST`; always then `t.id DESC`.
- `findOwned`: not a UUID or no row → `NotFoundException('Task not found.')`; unless `allowTrashed`, `deletedAt` or
  `projectDeletedAt` set → `new InTrashException('Task is in the trash.', { projectId, projectInTrash: projectDeletedAt !== null })`.
- Project checks (`create`, and `update` with a `projectId` other than the current one): `projectsService.findOwned(userId, projectId)`;
  a `NotFoundException` or `InTrashException` from it → `NotFoundException('Project not found.')`.
- Lead: `projectLeadService.toColumns(dto, partial)` and `toDto(row)`. `project` = `{ id: projectId, title: projectTitle, deleted: false }`.
- `remove`: `findOwned` (trashed → in-trash), then `deletedAt = now()`.
- `restore`: `findOwned(…, { allowTrashed: true })`; `projectDeletedAt` set → `ConflictException('The task's project is in the trash. Restore the project instead.')`; else clear `deletedAt` (no-op when not deleted).
- `TasksModule` imports `ProjectsModule` and `UsersModule`. Run `npm run openapi:export` at the end.

## Acceptance criteria
Signed in as user A unless stated; B is another user. "P" and "Q" are A's active projects.

| AC | Case → expected | Test | Task |
| --- | --- | --- | --- |
| AC-1 | `POST /tasks {projectId:P, title:" Fix "}` → `201`: `title "Fix"`, `status "upcoming"`, `dueDate`, `description`, `externalLink`, `projectLead` `null`, `project {id:P, title, deleted:false}` | `api/test/tasks.ac.e2e-spec.ts` | T1 |
| AC-2 | `POST` with every field (`status "in-progress"`, `dueDate "2026-10-04"`, lead user B) → `201` with the same values; lead as in feat-prj-api AC-2 | `api/test/tasks.ac.e2e-spec.ts` | T1 |
| AC-3 | `400` with the named field for: no `projectId`, `projectId "x"`, no/blank/201-char title, `status "done"`, `status null`, `dueDate` `2026-02-30`, `03.10.2026`, `2026-10-03T00:00:00Z`; invalid `externalLink`; both lead fields | `api/test/tasks.ac.e2e-spec.ts` | T1 |
| AC-4 | `POST` with B's project, a random UUID, or A's trashed project → `404` `…/errors/not-found`, nothing created | `api/test/tasks.ac.e2e-spec.ts` | T1 |
| AC-5 | `GET /tasks?projectId=P` → only P's active tasks; tasks deleted individually, tasks of other projects and B's tasks absent; `projectId` of B's project or a trashed project → `items []`; `projectId=x` → `400` | `api/test/tasks.ac.e2e-spec.ts` | T1 |
| AC-6 | `GET /tasks` (no `projectId`) → A's tasks across P and Q, none from a trashed project | `api/test/tasks.ac.e2e-spec.ts` | T1 |
| AC-7 | `status=upcoming,in-progress` hides completed; `status=completed` only completed; `status=` and `status=done` → `400`; absent → all | `api/test/tasks.ac.e2e-spec.ts` | T1 |
| AC-8 | `q=api` matches "API docs" and "rapid", not "Docs"; `q=50%` literal | `api/test/tasks.ac.e2e-spec.ts` | T1 |
| AC-9 | `sort=dueDate:asc` → 2026-10-01, 2026-10-05, then no-date tasks; `dueDate:desc` → 10-05, 10-01, then no-date; `title:asc` case-insensitive; default `updatedAt:desc`; `sort=status:asc` → `400`; pagination as feat-prj-api AC-8 | `api/test/tasks.ac.e2e-spec.ts` | T1 |
| AC-10 | `GET /tasks/{id}`: own → `200`; B's, random UUID, `abc` → `404 not-found`; deleted individually → `404 in-trash` with `projectId: P`, `projectInTrash: false`; its project trashed → `404 in-trash` with `projectInTrash: true` | `api/test/tasks.ac.e2e-spec.ts` | T1 |
| AC-11 | `PATCH {status:"completed"}` → `200`, status changed, `updatedAt` later; the project's `updatedAt` unchanged (D2); `GET /projects/P` counts reflect it | `api/test/tasks.ac.e2e-spec.ts` | T1 |
| AC-12 | `PATCH` clears `description`, `externalLink`, `dueDate` and the lead with `null`; `title:null`, `status:null`, `projectId:null` → `400`; `{}` → `200` | `api/test/tasks.ac.e2e-spec.ts` | T1 |
| AC-13 | `PATCH {projectId:Q}` → `200`, `project.id Q`; P's list and counts lose it, Q's gain it; `projectId` of B's or a trashed project → `404 not-found`, task unchanged | `api/test/tasks.ac.e2e-spec.ts` | T1 |
| AC-14 | `PATCH` or `DELETE` a deleted task → `404 in-trash`; B's task → `404 not-found` | `api/test/tasks.ac.e2e-spec.ts` | T1 |
| AC-15 | `DELETE` → `204`; `GET` → `404 in-trash`; lists and `GET /projects/P` counts leave it out; P's `updatedAt` unchanged | `api/test/tasks.ac.e2e-spec.ts` | T1 |
| AC-16 | `POST /tasks/{id}/restore` on a deleted task → `204`, `GET` → `200`; on an active task → `204`; task in a trashed project → `409` `…/errors/conflict`; B's → `404 not-found` | `api/test/tasks.ac.e2e-spec.ts` | T1 |
| AC-17 | Every `/tasks` endpoint without a token → `401` | `api/test/tasks.ac.e2e-spec.ts` | T1 |
| AC-18 | `api/openapi.json` has `/api/v1/tasks` (get, post), `/api/v1/tasks/{id}` (get, patch, delete), `/api/v1/tasks/{id}/restore` (post), all requiring `bearer`, and a `TaskStatus` enum schema | `check` | T1 |

No typed stubs: the e2e tests only call HTTP endpoints.

## Checks
```bash
# AC-18: the contract has the task endpoints, all protected, with the TaskStatus enum
node -e "
const d=require('./api/openapi.json'), p=d.paths, need=[['/api/v1/tasks','get'],['/api/v1/tasks','post'],['/api/v1/tasks/{id}','get'],['/api/v1/tasks/{id}','patch'],['/api/v1/tasks/{id}','delete'],['/api/v1/tasks/{id}/restore','post']];
for (const [u,m] of need) { const op=p[u]?.[m]; if(!op){console.error('missing',m,u);process.exit(1)} if(!JSON.stringify(op.security??[]).includes('bearer')){console.error('not protected',u);process.exit(1)} }
if (!d.components?.schemas?.TaskStatus) { console.error('missing TaskStatus schema'); process.exit(1) }"
```

## Tasks
| # | Task | App | Size | Tier | Why this tier | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | Tasks module (API-TSK-001…006): CRUD, filters, move, restore | api | M | sonnet | Copies the projects module; every rule and query is stated above; ownership via the existing `findOwned` | — (feat-prj-api done) |

## Open questions
None. OQ-028, OQ-080, OQ-081, OQ-084, OQ-085, OQ-087, OQ-088, OQ-090 and OQ-091 are resolved.

## Changelog
- 2026-10-03: Initial draft.
- 2026-10-03: Approved by the owner.
