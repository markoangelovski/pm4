---
id: feat-prj-services
title: "Project services: a project's services, a task's service, and the Prompt's Service line"
status: approved
owner: Marko Angelovski
last_updated: 2026-10-26
milestone: M2
requirements: [FR-PRJ-009, FR-TSK-009, FR-TLOG-020]
related: [api-endpoints, api-data-model, web-screens, web-prototype, feat-prj-api, feat-tsk-api, feat-tlog-prompt, feat-book-partial, OQ-243, OQ-244, OQ-245, OQ-246, OQ-247, OQ-248]
prototype: 9e4c367
---

# Project services: a project's services, a task's service, and the Prompt's Service line

## Goal
A project keeps a free list of services (FR-PRJ-009). Each task can be linked to one of its project's services
(FR-TSK-009), and the Logs Prompt shows and copies it (FR-TLOG-020). Screens: SCR-021, SCR-022, SCR-031, SCR-032, SCR-040.
API: *Shared project and task shapes* (`ProjectService`, `ServiceRef`, *Services input*, `serviceId`), API-PRJ-001…004 and
API-PRJ-006, API-TSK-001…004. Tables: [project_services](../03-api/data-model.md#project_services), `tasks.service_id`.

## Decisions
| # | Decision | Source |
| --- | --- | --- |
| D1 | Names are free per project, suggested from the names on the user's projects. Removing a service in use warns inline with its task count, and saving clears it from those tasks. **Services** on SCR-021 Details, **Service** on SCR-031 Details; no task list column or filter. The Prompt has its own **Service:** line after **Task** (`—` for none), copied too. | OQ-243 (owner, 2026-10-26), prototype `9e4c367` |
| D2 | A name is 1–50 chars after trimming, at most 20 per project, unique within a project ignoring case. | OQ-244 (owner, 2026-10-26) |
| D3 | The removal warning is inline while editing; **Save** asks nothing more. | OQ-245 (owner, 2026-10-26) |
| D4 | Suggestions come from API-PRJ-006 `GET /projects/service-names`, not from the project list (the prototype read its first 100 projects). | OQ-246 (owner, 2026-10-26) |
| D5 | A task moved to another project loses its service unless the request names one of the new project's. | OQ-247 (owner, 2026-10-26) |
| D6 | The project's create and update bodies carry the **whole** list of names (`services: string[]`), not ids. A name equal to a current one ignoring case keeps that service (its id and tasks) and saves the sent spelling; the UI has no rename. | Owner, prototype `9e4c367` (`proposed-types.ts`); Agent (spelling) |
| D7 | Removing a service deletes its row; the FK `ON DELETE SET NULL` clears it from the tasks without touching their `updatedAt`. | Agent |
| D8 | The project update and its service changes run in one transaction that first locks the project row (`FOR UPDATE`), so two saves of the same project never break the unique name index. A task saved with a service that a concurrent project save just removed fails with the FK error (`500`): one user racing their own two requests, accepted. | Agent |
| D9 | The test step makes the final contract (DTOs, controller route, validators, `openapi.json`, `schema.d.ts`) with typed stubs, so both apps typecheck while the tests fail. It also adds `services` / `service` to the existing acceptance tests' fixtures and whole-body assertions. | Agent, as feat-book-partial D8 |
| D10 | A changed production web file becomes its prototype twin: `sed -e 's#@/proto/mock/client#@/lib/api/client#' -e 's#@/proto/#@/#g'`, then Prettier. The prototype first moves off `proposed-types.ts` onto the generated types and gets `useServiceNames` (D4). | as feat-hard-delete D5 |

## Scope
**In:** `api/`: the `project_services` table and `tasks.service_id` (migration `0011`); services on API-PRJ-001…004; API-PRJ-006;
`serviceId` and `service` on API-TSK-001…004. `web/`: the prototype's twins of the project dialog and detail, the task dialog and
detail, the Prompt dialog and builder; the `useServiceNames` hook; the prototype moves to the generated types.

**Before the tests are written:** the working tree is clean (prototype `9e4c367` committed).

**Test step (main session, before T1):** D9. New acceptance test files (rows with `tests`, C), the fixture and body updates of the
existing ones (rows with `tests`, M), the contract files and stubs, `npm run openapi:export`, `npm run api:types`, then `pm4 hash`.

**Non-goals** (implementers must not touch these):
- The project and task lists (SCR-020, SCR-030, SCR-021's task table), their queries and filters; the PMSPA connector (services aren't synced).
- `web/lib/api/*` (except the generated `schema.d.ts`), `web/lib/auth/*`, `web/components/ui/*`, `web/app/**`.
- Any `*.ac.*` test, `api/openapi.json`, and the files the test step writes (rows whose *Task* is only `tests`).

## Read first
| Path | Why / copy this |
| --- | --- |
| `specs/03-api/endpoints.md#shared-project-and-task-shapes`, API-PRJ-001/004/006, API-TSK-001/004 | Contract |
| `specs/03-api/data-model.md#project_services`, `#tasks` | Table, `service_id`, indexes |
| `api/src/projects/projects.repository.ts`, `api/src/projects/projects.service.ts` | `insert`, `update`, `selectRows`, `toDto`, `findOwned` (T1) |
| `api/src/tasks/tasks.repository.ts`, `api/src/tasks/tasks.service.ts` | `selectRows`, `update` (move), `toDto` (T2) |
| `api/src/time/time.repository.ts` → `setBookings` | A transaction that locks rows first (`.for("update")`) (T1) |
| `api/src/database/schema/notes.ts` | A partial index (`.where(sql…)`) (T1) |
| `api/src/time/bookings.service.ts` → `invalid` | A `400` with one field error (T1) |
| `web/proto/features/projects/api.ts`, `web/proto/features/tasks/api.ts` | The hooks the components call: production keeps these names and shapes (T3, T4) |
| `web/proto/mock/client.ts` → `projects`, `savedServices`, `tasks`, `serviceOf` | The mock's rules, matching the API (T3, T4) |

## Files
| App | File | C/M | Task | Notes |
| --- | --- | --- | --- | --- |
| api | `api/test/project-services.ac.e2e-spec.ts` | C | tests | Acceptance tests |
| api | `api/test/support/project-test-utils.ts` | M | tests | `insertService(userId, projectId, name)`, `setTaskService(taskId, serviceId)` |
| api | `api/test/projects.ac.e2e-spec.ts`, `api/test/tasks.ac.e2e-spec.ts` | M | tests | Whole bodies get `services: []` / `service: null` |
| api | `api/src/projects/dto/project-service.dto.ts` | C | tests | `ProjectServiceDto`, `ServiceRefDto`, `ServiceNamesResponseDto`, final |
| api | `api/src/common/validation/unique-ignoring-case.ts` | C | tests | `UniqueIgnoringCase`, final |
| api | `api/src/common/validation/transforms.ts` | M | tests | `TrimEach`, final |
| api | `api/src/projects/dto/create-project.dto.ts`, `api/src/projects/dto/update-project.dto.ts`, `api/src/projects/dto/project-response.dto.ts`, `api/src/tasks/dto/create-task.dto.ts`, `api/src/tasks/dto/update-task.dto.ts`, `api/src/tasks/dto/task-response.dto.ts` | M | tests | Final (*Contract*); comments are OpenAPI descriptions |
| api | `api/src/projects/projects.controller.ts` | M | tests | `serviceNames` route, final |
| api | `api/openapi.json` | M | tests | `npm run openapi:export` |
| api | `api/src/projects/projects.service.ts` | M | tests, T1 | Stubs, then real |
| api | `api/src/tasks/tasks.service.ts` | M | tests, T2 | Stub `service: null`, then real |
| api | `api/src/database/schema/projects.ts` | M | T1 | `projectServices`, `tasks.serviceId` |
| api | `api/drizzle/0011_project_services.sql`, `api/drizzle/meta/0011_snapshot.json`, `api/drizzle/meta/_journal.json` | C/M | T1 | `npm run db:generate -- --name project_services`, as generated |
| api | `api/src/projects/projects.repository.ts` | M | T1 | |
| api | `api/src/projects/projects.service.spec.ts`, `api/src/projects/projects.repository.spec.ts`, `api/src/projects/projects.controller.spec.ts` | M | T1 | Ordinary tests, only where they break |
| api | `api/src/tasks/tasks.repository.ts` | M | T2 | |
| api | `api/src/tasks/tasks.service.spec.ts`, `api/src/tasks/tasks.repository.spec.ts` | M | T2 | Ordinary tests, only where they break |
| web | `web/features/projects/components/project-services.ac.test.tsx` | C | tests | Acceptance tests (T3) |
| web | `web/features/tasks/components/task-service.ac.test.tsx` | C | tests | Acceptance tests (T4) |
| web | `web/features/time/prompt.ac.test.ts`, `web/features/time/components/day-prompt-dialog.ac.test.tsx`, `web/features/time/components/day-prompt-notes.ac.test.tsx` | M | tests | The **Service:** line (AC-20…AC-22) |
| web | `web/features/**/*.ac.test.ts`, `web/features/**/*.ac.test.tsx` | M | tests | `services: []` in Project fixtures, `service: null` in Task fixtures; `services: []` / `serviceId: null` in the form bodies of `project-form-dialog.ac.test.tsx` and `task-form-dialog.ac.test.tsx` |
| web | `web/lib/api/schema.d.ts` | M | tests | `npm run api:types` |
| web | `web/features/projects/api.ts` | M | tests, T3 | Test step: `projectKeys.serviceNames` and a stub `useServiceNames`. T3: the twin |
| web | `web/proto/features/projects/api.ts`, `web/proto/features/projects/schemas.ts`, `web/proto/features/projects/components/services-field.tsx`, `web/proto/mock/client.ts` | M | T3 | D10, *Web (T3)* |
| web | `web/features/projects/schemas.ts`, `web/features/projects/components/project-form-dialog.tsx`, `web/features/projects/components/project-detail.tsx`, `web/features/tasks/schemas.ts` | M | T3 | Twins (D10). `tasks/schemas.ts` extends `projectFormSchema`, so it moves with it (OQ-248) |
| web | `proto/features/projects/components/services-field.tsx` → `features/projects/components/services-field.tsx` | P | T3 | Promoted after the prototype change above, so it's the twin |
| web | `web/proto/features/tasks/api.ts` | M | T4 | Generated types in place of `proposed-types.ts` |
| web | `web/proto/features/projects/proposed-types.ts` | D | T4 | `rm` |
| web | `web/features/tasks/api.ts`, `web/features/tasks/components/task-form-dialog.tsx`, `web/features/tasks/components/task-detail.tsx`, `web/features/time/prompt.ts`, `web/features/time/components/day-prompt-dialog.tsx` | M | T4 | Twins (D10) |
| web | `proto/features/tasks/components/service-select.tsx` → `features/tasks/components/service-select.tsx` | P | T4 | |

## Interfaces

### Contract (test step; T1, T2)
```ts
// api/src/projects/dto/project-service.dto.ts
/** `ProjectService`: a service the project offers (FR-PRJ-009). */
export class ProjectServiceDto {
  @ApiProperty({ type: String, format: "uuid" }) id: string;
  name: string;
  /** The project's tasks linked to it, computed. */
  @ApiProperty({ type: "integer" }) taskCount: number;
}
/** `ServiceRef`: a task's service (FR-TSK-009). */
export class ServiceRefDto {
  @ApiProperty({ type: String, format: "uuid" }) id: string;
  name: string;
}
/** API-PRJ-006: every service name on the caller's projects, once ignoring case, A–Z. */
export class ServiceNamesResponseDto { items: string[]; }

// api/src/common/validation/transforms.ts
/** Trims each string of an array input; other values pass through. */
export const TrimEach = () => Transform(({ value }: { value: unknown }) =>
  Array.isArray(value) ? value.map((v: unknown) => (typeof v === "string" ? v.trim() : v)) : value);

// api/src/common/validation/unique-ignoring-case.ts (pattern: minutes.ts)
/** No two strings of the array equal ignoring case (`toLowerCase`). Non-arrays and non-strings pass (other validators catch them). */
@ValidatorConstraint({ name: "uniqueIgnoringCase", async: false })
export class UniqueIgnoringCase implements ValidatorConstraintInterface { /* validate; defaultMessage(): "services must not repeat a name (ignoring case)" */ }

// create-project.dto.ts (after projectLeadName)
/** The project's service names (OQ-243, OQ-244): each 1–50 chars after trimming, at most 20, unique ignoring case; absent = none. */
@ApiProperty({ type: [String], required: false, maxItems: 20 })
@IsOptional() @TrimEach() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @Length(1, 50, { each: true }) @Validate(UniqueIgnoringCase)
services?: string[];
// update-project.dto.ts: the same, but `@ValidateIf((o: UpdateProjectDto) => o.services !== undefined)` in place of
// `@IsOptional()` (null → 400), and the doc "…; replaces the project's services (a name kept ignoring case keeps its service); absent = unchanged."
// project-response.dto.ts (after projectLead)
/** By name A–Z ignoring case, then id. */
@ApiProperty({ type: [ProjectServiceDto] }) services: ProjectServiceDto[];

// create-task.dto.ts (after projectLeadName)
/** One of the project's services (FR-TSK-009); absent or `null` = none. */
@ApiProperty({ type: String, format: "uuid", nullable: true, required: false })
@IsOptional() @IsUUID() serviceId?: string | null;
// update-task.dto.ts: the same field and decorators; doc "One of the task's project's services (after a move, the new project's), or `null`;
// absent = unchanged, except that a move clears it (OQ-247)."
// task-response.dto.ts (after project)
@ApiProperty({ type: ServiceRefDto, nullable: true }) service: ServiceRefDto | null;

// projects.controller.ts — declared BEFORE `@Get(":id")`
/** Every service name on the caller's projects (API-PRJ-006). */
@Get("service-names") @ApiProblemResponses(401)
serviceNames(@CurrentUser() user: AuthUser): Promise<ServiceNamesResponseDto> { return this.projectsService.serviceNames(user.id); }
```
Stubs: `ProjectsService.serviceNames` throws `new Error("not implemented (feat-prj-services)")`; `ProjectsService.toDto` returns
`services: []`; `TasksService.toDto` returns `service: null`. Then `npm run openapi:export` (api) and `npm run api:types` (web).

### Database (T1)
```ts
// api/src/database/schema/projects.ts — between projects and tasks; import uniqueIndex
/** A service a project offers (data-model.md *project_services*). */
export const projectServices = pgTable("project_services", {
  id: uuid("id").primaryKey().default(sql`uuidv7()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 50 }).notNull()
}, (t) => [uniqueIndex("project_services_project_name").on(t.projectId, sql`lower(${t.name})`)]);
// tasks: after projectId
serviceId: uuid("service_id").references(() => projectServices.id, { onDelete: "set null" }),
// tasks indexes: add
index("tasks_service_id_idx").on(t.serviceId).where(sql`${t.serviceId} IS NOT NULL`)
```
Migration: `npm run db:generate -- --name project_services` → `drizzle/0011_project_services.sql`, kept as generated.

### API: projects (T1)
`ProjectsRepository`:
```ts
export interface ProjectServiceRow { id: string; projectId: string; name: string; taskCount: number }
insert(userId: string, values: ProjectValues, services: string[]): Promise<string>;
update(userId: string, id: string, values: Partial<ProjectValues>, services?: string[]): Promise<void>;
/** The services of the given projects (the caller's), by lower(name) then id; with each one's task count. */
servicesOf(userId: string, projectIds: string[]): Promise<ProjectServiceRow[]>;
/** API-PRJ-006. */
serviceNames(userId: string): Promise<string[]>;
/** Whether `serviceId` is a service of the caller's project `projectId` (T2 uses it). */
hasService(userId: string, projectId: string, serviceId: string): Promise<boolean>;
```
- `insert`: one transaction: insert the project (`returning id`); if `services` isn't empty, insert one `project_services` row per
  name `{ userId, projectId, name }` in one statement.
- `update`: one transaction (D8): (1) `select id from projects where user_id = userId and id = id for update`; (2) the project update as
  today (`set …values, updatedAt: now()`); (3) only when `services !== undefined`: read the project's services (`id`, `name`); delete the
  ones whose `name.toLowerCase()` isn't among the sent names' (`inArray(id, …)`, skipped when none); for each sent name, the current
  service with the same lower-cased name → `update set name = <sent>` when the spelling differs, else none → collect it; insert the
  collected names in one statement. Deletes run before inserts.
- `servicesOf`: `[]` without a query when `projectIds` is empty. One query on `project_services` where `user_id = userId` and
  `project_id in projectIds`, `taskCount` = `(select count(*) from tasks where tasks.service_id = project_services.id)` mapped with
  `Number`, ordered `lower(name) asc, id asc`.
- `serviceNames`: `select distinct on (lower(s.name)) s.name from project_services s join projects p on p.id = s.project_id where
  p.user_id = userId order by lower(s.name), s.name` → the names.
- `hasService`: `select 1 from project_services where user_id = userId and project_id = projectId and id = serviceId limit 1`.

`ProjectsService`:
- `create`: `insert(userId, {…}, dto.services ?? [])`. `update`: passes `dto.services` (undefined = unchanged).
- `get`: `toDto(row, await servicesOf(userId, [id]))`. `list`: one `servicesOf(userId, rows.map((r) => r.id))` for the page, grouped
  by `projectId` into each item (order kept).
- `toDto(row, services: ProjectServiceRow[])` → `services: services.map(({ id, name, taskCount }) => ({ id, name, taskCount }))`.
- `serviceNames(userId)` → `{ items: await repo.serviceNames(userId) }`.
- `assertService(userId: string, projectId: string, serviceId: string): Promise<void>`: `hasService` false →
  `BadRequestException({ errors: [{ field: "serviceId", message: "must be one of the project's services" }] })` (the shape of
  `bookings.service.ts` → `invalid`).

### API: tasks (T2)
- `TaskValues` gains `serviceId: string | null`; `TaskRow` gains `serviceId: string | null`, `serviceName: string | null`.
  `selectRows` selects `tasks.serviceId` and `projectServices.name` as `serviceName` via
  `.leftJoin(projectServices, eq(projectServices.id, tasks.serviceId))`.
- `create`: after `findOwned(project)`, a non-null `dto.serviceId` → `projectsService.assertService(userId, dto.projectId, dto.serviceId)`;
  inserts `serviceId: dto.serviceId ?? null`.
- `update`: `moved = dto.projectId !== undefined && dto.projectId !== task.projectId`; `target = moved ? dto.projectId : task.projectId`.
  `dto.serviceId` a string → `assertService(userId, target, dto.serviceId)` (after the target project check), then `values.serviceId = dto.serviceId`;
  `dto.serviceId === null` → `values.serviceId = null`; absent and `moved` → `values.serviceId = null`; else unchanged.
- `toDto`: `service: row.serviceId ? { id: row.serviceId, name: row.serviceName! } : null`.
- PMSPA sync calls `create`/`update` unchanged: it never sends `serviceId`, so a synced move clears the service (D5).

### Web (T3): projects
Prototype first (D10), then the production twins:
- `proto/features/projects/api.ts`: drop the `proposed-types` import and every `as Project` / `as ProjectList` cast; `Project` and
  `ProjectList` are the schema types again (as before `9e4c367`); `export type ProjectService = components["schemas"]["ProjectServiceDto"];`.
  `ProjectInput` gets `services: string[]` (no `extends`). Add:
  ```ts
  // projectKeys
  serviceNames: () => [...projectKeys.all, "service-names"] as const,
  /** API-PRJ-006: the service names on the user's projects (the Services field's suggestions). */
  export function useServiceNames(): UseQueryResult<string[]> // queryFn: unwrap(await apiClient.GET("/api/v1/projects/service-names", { signal })).items
  ```
  `useCreateProject`, `useUpdateProject` and `useDeleteProject` also `void queryClient.invalidateQueries({ queryKey: projectKeys.serviceNames() })`
  (update keeps its `["tasks"]` invalidation). Doc comments name the new invalidation.
- `proto/features/projects/schemas.ts`: `export const SERVICE_NAME_MAX = 50; export const SERVICES_MAX = 20;` in place of the
  `proposed-types` import.
- `proto/features/projects/components/services-field.tsx`: `useServiceSuggestions` and its `useProjects` call go; `const suggestions =
  useServiceNames().data ?? [];` (already A–Z and unique); `SERVICE_NAME_MAX` from `@/proto/features/projects/schemas`.
- `proto/mock/client.ts`: in `projects`, `GET` with path id `service-names` answers before the id lookup with
  `{ items }`: every project's service names, once ignoring case, `localeCompare` A–Z.
- Production: `features/projects/api.ts`, `schemas.ts`, `components/project-form-dialog.tsx`, `components/project-detail.tsx` and
  `features/tasks/schemas.ts` become their twins (`tasks/schemas.ts` extends `projectFormSchema`, so without its twin the task form
  misses `services` and typecheck fails; it compiles against the generated `Task.service` and the stub `TaskInput.serviceId?`, OQ-248); `pm4 promote` copies `services-field.tsx`. `npm run typecheck` passes in `web/`.

### Web (T4): tasks and Prompt
- `proto/features/tasks/api.ts`: drop the `proposed-types` import; `Task` = `Omit<TaskResponse, "project"> & { project: … }` (as before
  `9e4c367`); `TaskInput` gets `serviceId: string | null` (no `extends`). `rm proto/features/projects/proposed-types.ts`; then
  `grep -rn proposed-types web/proto` is empty.
- Production: `features/tasks/api.ts`, `components/task-form-dialog.tsx`, `components/task-detail.tsx`,
  `features/time/prompt.ts`, `components/day-prompt-dialog.tsx` become their twins; `pm4 promote` copies `service-select.tsx`.
- Afterwards `node scripts/pm4.mjs twins` reports no failure.

## Acceptance criteria
API fixtures: user A with project P (services "QA", "Design") and project R (service "Backend development"); user B with a project
and service of their own.

| AC | Case → expected | Test | Task |
| --- | --- | --- | --- |
| AC-1 | `POST /projects {title, services: [" QA ", "Design"]}` → `201`, `services` = Design, QA (A–Z), each with a UUID `id` and `taskCount` 0; without `services` → `[]` | `api/test/project-services.ac.e2e-spec.ts` | T1 |
| AC-2 | `services` with a 51-char name, 21 names, `["QA", "qa"]`, `[""]`, `[1]` or `null` (on PATCH) → `400` on field `services`; the duplicate one with "services must not repeat a name (ignoring case)"; nothing saved | `api/test/project-services.ac.e2e-spec.ts` | T1 |
| AC-3 | `PATCH /projects/P {services: ["qa", "Content"]}` → QA keeps its `id`, now spelled "qa"; "Content" added; "Design" gone; its tasks get `service: null` and keep their `updatedAt` | `api/test/project-services.ac.e2e-spec.ts` | T1 |
| AC-4 | `PATCH /projects/P {title}` (no `services`) → services unchanged; `{services: []}` → all removed | `api/test/project-services.ac.e2e-spec.ts` | T1 |
| AC-5 | `taskCount`: 2 tasks on QA, 0 on Design, in `GET /projects/P` and `GET /projects` | `api/test/project-services.ac.e2e-spec.ts` | T1 |
| AC-6 | `GET /projects/service-names` → A's names once ignoring case, A–Z ("Backend development", "Design", "QA" with R also having "qa" → one QA); never B's; no project → `[]`; no token → `401` | `api/test/project-services.ac.e2e-spec.ts` | T1 |
| AC-7 | `DELETE /projects/P` → its services are gone (not in API-PRJ-006) | `api/test/project-services.ac.e2e-spec.ts` | T1 |
| AC-8 | `POST /tasks {projectId: P, serviceId: QA}` → `service: {id, name: "QA"}`; without `serviceId` → `null` | `api/test/project-services.ac.e2e-spec.ts` | T2 |
| AC-9 | `serviceId` of R's service, B's service, an unknown UUID → `400` field `serviceId` "must be one of the project's services"; `"x"` → `400` field `serviceId` | `api/test/project-services.ac.e2e-spec.ts` | T2 |
| AC-10 | `PATCH /tasks/T {serviceId: Design}` sets it; `{serviceId: null}` clears it; `{title}` keeps it | `api/test/project-services.ac.e2e-spec.ts` | T2 |
| AC-11 | Task T on P with QA: `PATCH {projectId: R}` → `service: null`; `PATCH {projectId: R, serviceId: <R's service>}` → that service; `{projectId: R, serviceId: QA}` → `400` `serviceId`, task unchanged; `{projectId: P}` (same project) keeps QA | `api/test/project-services.ac.e2e-spec.ts` | T2 |
| AC-12 | `GET /tasks?projectId=P` and `GET /tasks/T` show each task's `service` | `api/test/project-services.ac.e2e-spec.ts` | T2 |
| AC-13 | `useServiceNames` calls `GET /api/v1/projects/service-names` and returns `items`; create, update and delete of a project invalidate `projectKeys.serviceNames()`; update also invalidates `["tasks"]` | `web/features/projects/components/project-services.ac.test.tsx` | T3 |
| AC-14 | New project: typing "back" in **Services** lists "Backend development" (from `useServiceNames`); picking it and **Add "Ops"** → the POST body has `services: ["Backend development", "Ops"]` | `web/features/projects/components/project-services.ac.test.tsx` | T3 |
| AC-15 | Edit a project whose "QA" has `taskCount` 2: removing its chip shows "2 tasks use “QA”. They'll have no service."; with `taskCount` 1, "1 task uses “QA”. It'll have no service."; with 0, nothing; **Save** sends the remaining names | `web/features/projects/components/project-services.ac.test.tsx` | T3 |
| AC-16 | A `400` with field `services` shows its message under **Services**, and the dialog stays open | `web/features/projects/components/project-services.ac.test.tsx` | T3 |
| AC-17 | Project detail **Services** shows each service's name; none → `—` | `web/features/projects/components/project-services.ac.test.tsx` | T3 |
| AC-18 | Task dialog: **Service** lists **No service** and the chosen project's services, and the POST body has the picked `serviceId`; picking another project resets it to `null`; a project without services → the select is disabled; a `400` on `serviceId` shows under **Service** | `web/features/tasks/components/task-service.ac.test.tsx` | T4 |
| AC-19 | Task detail **Service** shows the name; none → `—` | `web/features/tasks/components/task-service.ac.test.tsx` | T4 |
| AC-20 | `promptMarkdown` puts `**Service:** <name>` after the Task line, `—` when the entry's `service` is absent or null | `web/features/time/prompt.ac.test.ts` | T4 |
| AC-21 | Prompt dialog: each card shows **Service:** with its task's service (`—` without a task or service); **Copy to clipboard** and **Copy all** include the line (feat-tlog-prompt's AC-8/AC-9 markdown gains it) | `web/features/time/components/day-prompt-dialog.ac.test.tsx` | T4 |
| AC-22 | feat-tlog-prompt's edited-notes copies (AC-14…AC-17) include the Service line | `web/features/time/components/day-prompt-notes.ac.test.tsx` | T4 |
| AC-23 | The contract has API-PRJ-006 and the new fields in both apps; the prototype has no `proposed-types.ts` and nothing imports it | check | T4 |

Typed stubs (D9): see *Contract*; `web/features/projects/api.ts`: `projectKeys.serviceNames` and `useServiceNames()` whose
`queryFn` throws `new Error("not implemented (feat-prj-services)")`.

## Checks
```bash
# AC-23: the contract and the prototype's types
grep -q '"/api/v1/projects/service-names"' api/openapi.json && grep -q 'ProjectServiceDto' web/lib/api/schema.d.ts && grep -q 'serviceId' web/lib/api/schema.d.ts
test ! -e web/proto/features/projects/proposed-types.ts
! grep -rq 'proposed-types' web/proto web/features
```

## Tasks
| # | Task | App | Size | Tier | Why this tier | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | `project_services` table and migration; services on API-PRJ-001…004 (replace in one locked transaction) and API-PRJ-006 | api | M | sonnet | Writes over two tables in one transaction with a row lock (D8) | — |
| T2 | `serviceId` / `service` on API-TSK-001…004, cleared on a move | api | S | haiku | Every rule spelled out in *API: tasks*; copies the `selectRows` joins | T1 |
| T3 | Prototype off `proposed-types` for projects, `useServiceNames` + mock route; project dialog and detail twins, promote `services-field.tsx` | web | S | haiku | Copy-and-sed twins (D10) with the delta listed in *Web (T3)* | T1 |
| T4 | Task dialog and detail twins, promote `service-select.tsx`, Prompt twins; `proposed-types.ts` removed | web | S | haiku | Copy-and-sed twins (D10) per *Web (T4)* | T2, T3 |

## Open questions
None. OQ-243…OQ-248 are answered.

## Changelog
- 2026-10-26: Initial draft from prototype `9e4c367` and OQ-243…OQ-247. Status `review`.
- 2026-10-26: Approved by the owner.
- 2026-10-26: OQ-248: the `features/tasks/schemas.ts` twin moves from T4 to T3 (T3 alone failed typecheck).
