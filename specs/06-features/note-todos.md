---
id: feat-note-todos
title: "Notes and to-dos: API, the Notes page, project and task cards, the New menu"
status: approved
owner: Marko Angelovski
last_updated: 2026-10-24
milestone: M8
requirements: [FR-NOTE-001, FR-NOTE-002, FR-NOTE-003, FR-NOTE-004, FR-NOTE-005, FR-NOTE-006, FR-NOTE-007, FR-NOTE-008, FR-NOTE-009, SCR-070, SCR-071, SCR-072, SCR-073]
related: [req-notes, api-endpoints, api-data-model, web-screens, web-routing, web-prototype, ADR-0012, OQ-230, OQ-231, OQ-232, OQ-233, OQ-234, OQ-235]
prototype: 651433f
---

# Notes and to-dos: API, the Notes page, project and task cards, the New menu

## Goal
The user writes Markdown notes and keeps to-dos, General or linked to a project or task ([req-notes](../01-requirements/notes.md),
FR-NOTE-001…009): the `notes` and `todos` API (API-NOTE-001…004, API-TODO-001…004), the Notes page (SCR-070), the cards on project and task
pages (SCR-073) and the header **New ▾** menu, all from the confirmed prototype.

## Decisions
| # | Decision | Source |
| --- | --- | --- |
| D1 | Two tables and two resources; links, retained names and task moves as `time_logs` (data-model.md *notes*, *todos*, *Retained names*). | OQ-230 (owner) |
| D2 | The API stores the Markdown as written; the GFM subset is the renderer's job (`markdown.tsx`: no raw HTML, no images). | OQ-231 (owner) |
| D3 | `from`/`to` filter on the sort's instant as a date in the user's stored zone: `(<col> AT TIME ZONE users.time_zone)::date`. | OQ-232 (owner) |
| D4 | One `NoteInputDto` for POST and PATCH (`body` required in both); one `TodoInputDto` for both (`text` optional in the schema, required by POST in the service). The generated types then equal the prototype's `NoteInputDto` / `TodoInputDto`, so the hooks keep their input types. | Agent |
| D5 | The test step makes the contract: the `NotesModule` with both controllers, the DTOs and stubbed services (`npx nest g`), `openapi:export`, `api:types`; the prototype moves from `proposed-types.ts` to `types.ts` (aliases of the generated schema, same names); production web gets `features/notes/types.ts` and stubs. The API and web tasks then run in parallel. | Agent, as feat-book-partial D8, feat-int-web D1 |
| D6 | One `ItemLinkService` (`src/notes/item-link.service.ts`) resolves a link for notes and to-dos with `TimeLogsService.resolveLink`'s rules; `toRef` is exported from `time-logs.service.ts` and reused. | Agent |
| D7 | `pageSize` stays ≤ 100 (`PageQueryDto`): the project/task Notes card's **Show more** stops at 100 notes (prototype and twin). | Agent |
| D8 | Production web = the prototype's twins (`sed` copy + Prettier, as feat-book-web-nav); no `P` rows, because the test step's stubs already sit at three of the paths. | As feat-int-web D2 |

## Scope
**In:** `api/`: `notes`, `todos`, migration `0010`, API-NOTE-001…004, API-TODO-001…004, retained names and task moves for both. `web/`: the
`features/notes` domain, `/app/notes`, the Notes sidebar item, the header New menu, the cards on project and task detail, `RangePicker`'s `allowAll`.

**Test step (main session, before T1):**
- `api/`: from `api/`, `npx nest g module notes`, `npx nest g controller notes --no-spec`, `npx nest g controller notes/todos --flat --no-spec`,
  `npx nest g service notes --no-spec`, `npx nest g service notes/todos --flat --no-spec`, `npx nest g service notes/item-link --flat --no-spec`; the DTOs and
  controllers of *Interfaces → API*; service methods as typed stubs; `NotesModule` in `app.module.ts`; `npm run openapi:export`.
  `test/support/note-test-utils.ts` (`insertNote`, `insertTodo`: rows straight into Postgres with given timestamps).
- `web/`: `npm run api:types`; `web/proto/features/notes/types.ts` and its twin `web/features/notes/types.ts` (*Interfaces → Web types*); every
  `proposed-types` import under `web/proto` → `types`; `mock/client.ts` drops `NotesPaths` (`createClient<paths>`); `rm proposed-types.ts`; the
  web stubs; the sidebar tests' expected lists gain Notes; then `pm4 hash`.

**Non-goals** (implementers must not touch these):
- Any `*.ac.*` test and the files the test step writes (rows with `tests`), except where a row gives the task the file.
- `api/`: projects', tasks' and time logs' behaviour beyond the statements in *Retained names and task moves*. `web/`: `components/ui/*`,
  `lib/api/*` (except the generated `schema.d.ts`, written by the test step), `lib/auth/*`, the dashboard's other files, the prototype's `mock/`.
- PMSPA, reordering, clearing done, pinning, a dashboard count, checkboxes in notes (OQ-235).

## Read first
| Path | Why / copy this |
| --- | --- |
| `specs/03-api/endpoints.md#shared-note-and-to-do-shapes` | The contract, with API-NOTE-001…004 and API-TODO-001…004 below it |
| `specs/03-api/data-model.md#notes` | Columns, indexes, invariants (and `#todos`, `#retained-names-fr-tlog-014`) |
| `api/src/projects/projects.repository.ts`, `api/src/projects/projects.service.ts` | Repository and service pattern: `findOwned`, `ilike` + `escapeLike`, `ORDER_BY` map, count query, `delete` transaction |
| `api/src/time/time-logs.service.ts` | `resolveLink` (D6 copies its rules), `toRef`, `toTimeLogDto` |
| `api/src/time/time.repository.ts` | The LEFT JOINs that read live project and task titles for a log |
| `api/src/tasks/tasks.repository.ts` | `update` (task move) and `delete` (retained name): T1 extends both |
| `api/test/time-logs.ac.e2e-spec.ts` | Black-box e2e style, deleted-ref assertions |
| `web/proto/features/notes/api.ts` | The hooks; production's `features/notes/api.ts` is its twin |
| `specs/04-web/prototype.md#twin-check` | What "equals its twin" means |

## Files
| App | File | C/M | Task | Notes |
| --- | --- | --- | --- | --- |
| api | `api/test/notes.ac.e2e-spec.ts` | C | tests | AC-1…AC-8 |
| api | `api/test/todos.ac.e2e-spec.ts` | C | tests | AC-9…AC-12 |
| api | `api/test/support/note-test-utils.ts` | C | tests | `insertNote`, `insertTodo` |
| api | `api/src/notes/notes.module.ts`, `api/src/notes/notes.controller.ts`, `api/src/notes/todos.controller.ts` | C | tests | Nest CLI; complete in the test step |
| api | `api/src/notes/dto/note-input.dto.ts`, `api/src/notes/dto/list-notes-query.dto.ts`, `api/src/notes/dto/note-response.dto.ts`, `api/src/notes/dto/todo-input.dto.ts`, `api/src/notes/dto/list-todos-query.dto.ts`, `api/src/notes/dto/todo-response.dto.ts` | C | tests | Complete in the test step |
| api | `api/src/notes/notes.service.ts`, `api/src/notes/item-link.service.ts` | C | tests, T1 | Stubs, then T1 |
| api | `api/src/notes/todos.service.ts` | C | tests, T2 | Stub, then T2 |
| api | `api/src/app.module.ts`, `api/openapi.json` | M | tests | |
| api | `api/src/database/schema/notes.ts`, `api/src/database/schema/index.ts` | C/M | T1 | Both tables |
| api | `api/drizzle/0010_notes_todos.sql`, `api/drizzle/meta/*` | C/M | T1 | `npm run db:generate -- --name notes_todos` |
| api | `api/src/notes/notes.repository.ts` | C | T1 | |
| api | `api/src/time/time-logs.service.ts` | M | T1 | `export` on `toRef` only |
| api | `api/src/projects/projects.repository.ts`, `api/src/tasks/tasks.repository.ts` | M | T1 | Retained names and task moves |
| api | `api/src/notes/todos.repository.ts` | C | T2 | Copies `notes.repository.ts` |
| web | `web/lib/api/schema.d.ts` | M | tests | `npm run api:types` |
| web | `web/proto/features/notes/types.ts`, `web/features/notes/types.ts` | C | tests | D5 |
| web | `web/proto/features/notes/proposed-types.ts` | D | tests | `rm` |
| web | `web/proto/features/notes/api.ts`, `web/proto/features/notes/group.ts`, `web/proto/features/notes/components/link-line.tsx`, `web/proto/features/notes/components/notes-view.tsx`, `web/proto/features/notes/components/notes-toolbar.tsx`, `web/proto/mock/client.ts`, `web/proto/mock/seed.ts`, `web/proto/mock/store.ts` | M | tests | `proposed-types` → `types` |
| web | `web/features/notes/api.ac.test.tsx`, `web/features/notes/group.ac.test.ts`, `web/features/notes/components/notes-view.ac.test.tsx` | C | tests | AC-13…AC-15 |
| web | `web/app/(dashboard-layout)/layout/vertical/sidebar/sidebaritems.ac.test.ts`, `web/app/(dashboard-layout)/layout/vertical/sidebar/sidebaritems.test.ts` | M | tests | AC-16: Notes after Tasks |
| web | `web/features/notes/api.ts`, `web/features/notes/group.ts`, `web/features/notes/components/notes-view.tsx` | C | tests, T3 | Stubs, then the twins |
| web | `web/features/notes/schemas.ts`, `web/features/notes/components/*.tsx` (every other component) | C | T3 | Twins (D8) |
| web | `web/proto/features/notes/components/notes-section.tsx` | M | T3 | D7, before the copy |
| web | `web/features/dashboard/components/range-picker.tsx`, `web/features/projects/components/project-detail.tsx`, `web/features/tasks/components/task-detail.tsx` | M | T3 | Twins (D8) |
| web | `web/app/(dashboard-layout)/app/notes/page.tsx` | C | T3 | From `app/proto/app/notes/page.dev.tsx` |
| web | `web/lib/routes.ts`, `web/app/(dashboard-layout)/layout/vertical/sidebar/sidebaritems.ts`, `web/app/(dashboard-layout)/layout/vertical/header/index.tsx` | M | T3 | *Shell* |

## Interfaces

### API (tests; T1, T2)
Module `src/notes/` (`NotesModule`: imports `DatabaseModule`, `UsersModule`, `ProjectsModule`, `TasksModule`; controllers `NotesController`,
`TodosController`; providers `NotesService`, `TodosService`, `ItemLinkService`, `NotesRepository`, `TodosRepository`). Controllers as
`projects.controller.ts` (`@ApiBearerAuth("bearer")`, `@CurrentUser()`, `@ApiProblemResponses`, `204` deletes), routes `notes` and `todos`.

```ts
// dto/list-notes-query.dto.ts
export const NOTE_SORTS = ["updatedAt:desc", "updatedAt:asc", "createdAt:desc", "createdAt:asc"] as const;
export type NoteSort = (typeof NOTE_SORTS)[number];
export class ListNotesQueryDto extends PageQueryDto {      // q from PageQueryDto
  projectId?: string;  // @IsOptional @IsUUID
  taskId?: string;     // @IsOptional @IsUUID
  unlinked?: boolean;  // @ApiProperty({type: Boolean, required: false}); "true"/"false" → boolean (@Transform), else 400; @IsOptional @IsBoolean
  sort: NoteSort = "updatedAt:desc";   // @ApiProperty({enum: NOTE_SORTS, enumName: "NoteSort", required: false, default}) @IsOptional @IsIn
  from?: string;       // @ApiProperty({type: String, format: "date", required: false}) @IsOptional @Matches(/^\d{4}-\d{2}-\d{2}$/) @IsISO8601({strict: true})
  to?: string;         // same
}
// dto/list-todos-query.dto.ts
export class ListTodosQueryDto extends OmitType(ListNotesQueryDto, ["page", "pageSize"] as const) {}
// dto/note-input.dto.ts
export class NoteInputDto {
  title?: string | null;   // @IsOptional @TrimToNull @IsString @MaxLength(200), nullable in the schema
  body: string;            // @Trim @IsString @Length(1, 10000)
  projectId?: string | null; taskId?: string | null;   // exactly as CreateTimeLogDto
}
// dto/todo-input.dto.ts
export class TodoInputDto {
  text?: string;           // @ValidateIf(o => o.text !== undefined) @Trim @IsString @Length(1, 500)
  done?: boolean;          // @ValidateIf(o => o.done !== undefined) @IsBoolean  (null → 400)
  projectId?: string | null; taskId?: string | null;
}
// dto/note-response.dto.ts
export class NoteResponseDto { id: string; title: string | null; body: string; project: RefDto | null; task: RefDto | null; createdAt: string; updatedAt: string }
export class NoteListResponseDto { items: NoteResponseDto[]; page: number; pageSize: number; total: number }
// dto/todo-response.dto.ts
export class TodoResponseDto { id: string; text: string; doneAt: string | null; project: RefDto | null; task: RefDto | null; createdAt: string; updatedAt: string }
export class TodoListResponseDto { items: TodoResponseDto[] }
// nullable fields: @ApiProperty({ type: ..., nullable: true }); timestamps are ISO 8601 UTC (`Date.toISOString()`)

// notes.service.ts (T1)
list(userId: string, query: ListNotesQueryDto): Promise<NoteListResponseDto>;
create(userId: string, dto: NoteInputDto): Promise<NoteResponseDto>;
update(userId: string, id: string, dto: NoteInputDto): Promise<NoteResponseDto>;
remove(userId: string, id: string): Promise<void>;
// todos.service.ts (T2): the same four with ListTodosQueryDto / TodoInputDto / TodoResponseDto / TodoListResponseDto
// item-link.service.ts (T1)
export interface ItemLink { projectId: string | null; taskId: string | null }
resolve(userId: string, taskId: string | null | undefined, projectId: string | null | undefined, current: ItemLink | null): Promise<ItemLink>;
//   = TimeLogsService.resolveLink, line for line (TasksService.findOwned / ProjectsService.findOwned, the "must be the task's project" 400)
```
Controllers: `GET` → `list(user.id, query)`; `POST` → `create`, `201`; `PATCH :id` → `update`; `DELETE :id` → `remove`, `204`. A non-UUID or
unowned `id` → `404` `NotFoundException("Note not found.")` / `("To-do not found.")` (`isUUID` check in the service, as `projects.service.ts`).

**Service rules (T1 notes, T2 to-dos):**
- List: more than one of `projectId`, `taskId`, `unlinked === true` → `BadRequestException({ errors: [{ field: "projectId", message: "use at most
  one of projectId, taskId and unlinked" }] })`; `from > to` → field `from`, "must not be after to". Read the user's `timeZone` with
  `UsersRepository.findById` only when `from` or `to` is set.
- Create: `ItemLinkService.resolve(userId, dto.taskId, dto.projectId, null)`; to-dos: `dto.text === undefined` → 400 field `text`, "is required";
  `done === true` → `doneAt = now()`.
- Update: read the owned row (404), then the link only when `dto.taskId !== undefined || dto.projectId !== undefined` (not `in`: with the ES2023 target every
  declared DTO field is an own property; as `TimeLogsService.update`) (`resolve(…, current)`), which also sets both
  `deleted_*_title` to null. Notes: write `title` (`dto.title ?? null`), `body`, `updated_at = now()`. To-dos: `text` if given; `done` → `done_at`
  (`true`: `coalesce(done_at, now())`, `false`: null); `updated_at = now()` only when `text !== undefined && text !== row.text` or a link field
  is present. An empty to-do body changes nothing (API-TODO-003): no UPDATE, `200` with the row unchanged.
- Delete: `DELETE … WHERE user_id = $1 AND id = $2 RETURNING id`; none → 404.

**Repository (T1 notes, T2 to-dos):** `select` with `LEFT JOIN projects ON projects.id = notes.project_id` and `LEFT JOIN tasks ON tasks.id =
notes.task_id` for the live titles, mapped with `toRef(id, liveTitle, deletedTitle)` (exported from `time-logs.service.ts`). Conditions, all `AND`
with `notes.user_id = userId`:
```ts
projectId  → eq(notes.projectId, projectId)
taskId     → eq(notes.taskId, taskId)
unlinked   → and(isNull(notes.projectId), isNull(notes.deletedProjectTitle))
q          → or(ilike(notes.title, p), ilike(notes.body, p))        // p = `%${escapeLike(q)}%`; to-dos: ilike(todos.text, p)
from / to  → sql`(${col} AT TIME ZONE ${timeZone})::date >= ${from}::date` / `<= ${to}::date`   // col = the sort's column (D3)
order      → [dir(col), dir(notes.id)]                                // dir = asc | desc from the sort
```
Notes page with `limit`/`offset` and a `count(*)` with the same conditions (as `projects.repository.ts`); to-dos return every row.

### Database (T1)
`src/database/schema/notes.ts` declares `notes` and `todos` exactly per data-model.md (column order as listed; `timestamp(…, { withTimezone:
true }).notNull().defaultNow()`; `uuid("id").primaryKey().default(sql\`uuidv7()\`)`; FKs as `time_logs`), indexes `notes_user_updated`,
`notes_project`, `notes_task`, `todos_user`, `todos_project`, `todos_task` (partial ones `.where(sql\`… IS NOT NULL\`)`), types `Note`, `Todo`;
`export * from "./notes.js"` in `index.ts`. Migration: `npm run db:generate -- --name notes_todos` → `drizzle/0010_notes_todos.sql`.

### Retained names and task moves (T1)
In the same transactions, next to each existing `time_logs` statement, the same statement for `notes` and for `todos` (same `where` with that
table's columns):
- `ProjectsRepository.delete`: `deleted_task_title` from the project's tasks (the join the logs use), then `deleted_project_title = project.title
  WHERE project_id = id`.
- `TasksRepository.delete`: `deleted_task_title = task.title WHERE task_id = id`.
- `TasksRepository.update`: when `values.projectId !== undefined`, `project_id = values.projectId WHERE task_id = id`.

### Web types (tests)
`web/proto/features/notes/types.ts` (and its twin `web/features/notes/types.ts`):
```ts
import type { components, paths } from "@/lib/api/schema";
type S = components["schemas"];
export type NoteRefDto = S["RefDto"];
export type NoteDto = S["NoteResponseDto"];
export type NoteListDto = S["NoteListResponseDto"];
export type NoteInputDto = S["NoteInputDto"];
export type TodoDto = S["TodoResponseDto"];
export type TodoListDto = S["TodoListResponseDto"];
export type TodoInputDto = S["TodoInputDto"];
export const NOTE_SORTS = ["updatedAt:desc", "updatedAt:asc", "createdAt:desc", "createdAt:asc"] as const;
export type NoteSort = (typeof NOTE_SORTS)[number];
export type NoteListQuery = NonNullable<paths["/api/v1/notes"]["get"]["parameters"]["query"]>;
export type TodoListQuery = NonNullable<paths["/api/v1/todos"]["get"]["parameters"]["query"]>;
export type NoteFilterQuery = Pick<NoteListQuery, "projectId" | "taskId" | "unlinked">;
```
Web stubs (production, test step): `features/notes/api.ts` with every export of the prototype's `api.ts` (types, `noteKeys`, `NOTE_PAGE_SIZE`
as values; each hook's body `throw new Error("not implemented (feat-note-todos)")`); `features/notes/group.ts` likewise (`groupTodos`, `shown`,
`byOpenThenDone`, `groupLink` throw); `features/notes/components/notes-view.tsx`: `export function NotesView(): JSX.Element` throwing.

### Web (T3)
1. D7 in `web/proto/features/notes/components/notes-section.tsx`: `const NOTES_MAX = 100;` beside `NOTES_MORE`; **Show more** renders only
   while `data.total > data.items.length && limit < NOTES_MAX`, and its click is `setLimit((l) => Math.min(l + NOTES_MORE, NOTES_MAX))`.
2. The twins, from `web/`:
   ```bash
   for f in $(cd proto && find features/notes -type f) features/dashboard/components/range-picker.tsx \
            features/projects/components/project-detail.tsx features/tasks/components/task-detail.tsx; do
     mkdir -p "$(dirname "$f")"
     sed -e 's#@/proto/mock/client#@/lib/api/client#' -e 's#@/proto/#@/#g' "proto/$f" > "$f"
   done
   npx prettier --write features/notes features/dashboard/components/range-picker.tsx \
     features/projects/components/project-detail.tsx features/tasks/components/task-detail.tsx
   node ../scripts/pm4.mjs twins   # every features/notes, range-picker, project-detail, task-detail pair: equal
   ```
   All rewritten imports exist in production (`@/features/{projects,tasks,users,dashboard,time}/…`, `@/lib/routes`, `@/lib/use-debounced-value`).
   `RangePicker`'s `allowAll` defaults off, so `dashboard-view.tsx` is unchanged.
3. *Shell*:
   - `lib/routes.ts`: `notes: "/app/notes",` after `task`.
   - `sidebaritems.ts`: `{ id: "notes", name: "Notes", icon: NotebookPen, url: routes.app.notes }` after Tasks (import `NotebookPen` from
     `lucide-react`); the doc comment lists "Projects, Tasks, Notes".
   - `header/index.tsx`: `import { Suspense } from "react";` and `import { NewItemButton } from "@/features/notes/components/new-item-button";`;
     `<Suspense fallback={null}><NewItemButton /></Suspense>` right before `<LogTimeButton />` (as `proto/mock/shell/header.tsx`).
   - `app/(dashboard-layout)/app/notes/page.tsx`: `page.dev.tsx` with `@/features/notes/components/notes-view` (as `bookings/page.tsx`).

## Acceptance criteria
API tests: user A (time zone `Europe/Zagreb`) with project P (task T1, T2) and project Q; user B. Timestamps via `insertNote` / `insertTodo` where
an AC names them.

| AC | Case → expected | Test | Task |
| --- | --- | --- | --- |
| AC-1 | `POST /notes` `{title: "  ", body: " # Hi ", taskId: T1}` → `201`, `title: null`, `body: "# Hi"`, `project: {id: P, title, deleted: false}`, `task` T1, `createdAt` = `updatedAt`; without a token → `401` | `api/test/notes.ac.e2e-spec.ts` | T1 |
| AC-2 | `body` `""` or `"  "` → `400` field `body`; 10,001 characters → `400`; `title` 201 characters → `400`; `{taskId: T1, projectId: Q}` → `400` field `projectId`; B's task → `404` "Task not found."; B's project → `404` "Project not found." | `api/test/notes.ac.e2e-spec.ts` | T1 |
| AC-3 | Notes N1 (General), N2 (P), N3 (T1), N4 (Q): `projectId=P` → N2, N3; `taskId=T1` → N3; `unlinked=true` → N1; none → all four; `projectId=P&unlinked=true` → `400` field `projectId`; `unlinked=yes` → `400`; B's project id → `items: []`, `total: 0`; B sees none of them | `api/test/notes.ac.e2e-spec.ts` | T1 |
| AC-4 | `q=ALPHA` matches a note titled "alpha" and one whose body has "Alphabet", not "beta"; `q=50%` matches "50% done", not "500 done" | `api/test/notes.ac.e2e-spec.ts` | T1 |
| AC-5 | Notes X (created 2026-10-01T08:00Z, updated 2026-10-09T22:30Z), Y (created 2026-10-05T08:00Z, updated 2026-10-06T08:00Z): default sort → X, Y; `sort=createdAt:desc` → Y, X; `updatedAt:asc` → Y, X; `from=2026-10-10` → X only (22:30Z is 10 Oct in Zagreb); `sort=createdAt:asc&to=2026-10-04` → X only; `from=2026-10-10&to=2026-10-09` → `400` field `from`; `sort=title:asc` → `400`; `pageSize=1&page=2` → Y, `total: 2` | `api/test/notes.ac.e2e-spec.ts` | T1 |
| AC-6 | `PATCH /notes/{id}` `{body: "new"}` → `title: null`, link kept, `updatedAt` later than before; `{body: "x", taskId: null, projectId: null}` → General; `{title: "t"}` → `400` field `body`; B's note, an unknown UUID and `abc` → `404` | `api/test/notes.ac.e2e-spec.ts` | T1 |
| AC-7 | A note on T1 and one on P: deleting T1 → the first reads `task: {id: null, title: <T1>, deleted: true}`, project P live; a `PATCH {body}` keeps it; moving T2 (with a note) to Q → that note's `project` is Q; deleting P → both P notes read `project: {id: null, title: <P>, deleted: true}` and aren't in `unlinked=true`; a `PATCH` with `projectId: Q` → live Q, no task | `api/test/notes.ac.e2e-spec.ts` | T1 |
| AC-8 | `DELETE /notes/{id}` → `204`, then `404`; B's note → `404` and it still exists | `api/test/notes.ac.e2e-spec.ts` | T1 |
| AC-9 | `POST /todos` `{text: " Call "}` → `201`, `text: "Call"`, `doneAt: null`, General; `{}` → `400` field `text`; 501 characters → `400`; `{text: "x", done: true}` → `doneAt` set; `{text: "x", taskId: T1}` → project P, task T1 | `api/test/todos.ac.e2e-spec.ts` | T2 |
| AC-10 | `PATCH /todos/{id}`: `{done: true}` → `doneAt` set, `updatedAt` unchanged; `{done: true}` again → same `doneAt`; `{done: false}` → `null`; `{text: <same text>}` → `updatedAt` unchanged; `{text: "y"}` → later; `{projectId: P}` → later; `{done: null}` → `400`; B's → `404` | `api/test/todos.ac.e2e-spec.ts` | T2 |
| AC-11 | `GET /todos`: open and done together, no `page`/`total` in the body; the AC-3 filters (and the `400`), `q` on the text, the AC-5 sort and range cases with to-dos | `api/test/todos.ac.e2e-spec.ts` | T2 |
| AC-12 | To-dos keep deleted task and project names and follow a task move (AC-7's cases); `DELETE` → `204`, then `404` | `api/test/todos.ac.e2e-spec.ts` | T2 |
| AC-13 | Hooks (fetch stubbed): `useNotes({unlinked: true}, 2, 20, {q: "a", sort: "createdAt:asc", from: "2026-10-01", to: "2026-10-09"})` → `GET /api/v1/notes?unlinked=true&q=a&sort=createdAt%3Aasc&from=2026-10-01&to=2026-10-09&page=2&pageSize=20`; `useTodos({taskId})` → `GET /api/v1/todos?taskId=…` and returns `items`; create / update / delete of a note → `POST /notes`, `PATCH /notes/{id}`, `DELETE /notes/{id}`, each invalidating `["notes", "notes"]` and not `["notes", "todos"]`; of a to-do → `/todos…`, invalidating `["notes", "todos"]` only | `web/features/notes/api.ac.test.tsx` | T3 |
| AC-14 | `groupTodos`: General, then projects A–Z, a project's own group before its tasks' ("Alpha", "Alpha · Build", "Alpha · Deploy", "Beta"), deleted links last; open before done in a group, else the given order. `shown(t, "open", keep)` keeps a done to-do in `keep`; `groupLink` of a deleted link → `null`, of General → no link | `web/features/notes/group.ac.test.ts` | T3 |
| AC-15 | `NotesView` (fetch stubbed, nuqs test adapter): no params → `GET /notes?unlinked=true&sort=updatedAt%3Adesc&page=1&pageSize=20` and the To-dos tab reads the number of open to-dos from an unfiltered `GET /todos`; `?show=<P>` → `projectId=<P>`; `?show=all` → no filter; `?show=<unknown>` → `unlinked=true`; `?tab=todos&q=x&from=2026-10-01&to=2026-10-09` → `GET /todos?unlinked=true&q=x&sort=updatedAt%3Adesc&from=2026-10-01&to=2026-10-09` | `web/features/notes/components/notes-view.ac.test.tsx` | T3 |
| AC-16 | Sidebar: Project management lists Projects, Tasks, Notes (`/app/notes`); every app route is linked once | `web/app/(dashboard-layout)/layout/vertical/sidebar/sidebaritems.ac.test.ts` | T3 |
| AC-17 | The build has `/app/notes`; no `proposed-types.ts` or `NotesPaths` under `web/proto` | `check` | T3 |
| AC-18 | Dev server against the local API: a project page's **New ▾ → Note** starts on that project, a task page's on the task, `/app/notes` on General; the project and task cards list their items; ticking a to-do keeps it in view; the dashboard's range picker has no **All time**; a 375 px wide Notes page wraps the toolbar | manual | T3 |

Typed stubs: the services in *Interfaces → API* (each method `throw new Error("not implemented (feat-note-todos)")`) and the web stubs in
*Interfaces → Web types*.

## Checks
```bash
# AC-17: the build has the Notes page; the prototype is on the generated types
test -f web/out/app/notes.html
test ! -e web/proto/features/notes/proposed-types.ts
! grep -rq "NotesPaths" web/proto
```

## Tasks
| # | Task | App | Size | Tier | Why this tier | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | `notes` and `todos` tables, migration `0010`, the notes service and repository, `ItemLinkService`, retained names and task moves for both tables | api | M | sonnet | Writes in the project/task delete and move transactions (several tables under row locks); the first time-zone date filter | — |
| T2 | The to-dos service and repository | api | S | haiku | Copies T1's `notes.repository.ts` / `notes.service.ts`; rules spelled out | T1 |
| T3 | The web: twins of the notes domain, range picker, project and task detail; the page, route, sidebar item and header menu | web | M | haiku | Copy commands and four shell edits spelled out | — |

## Open questions
None. OQ-230…OQ-235 are resolved.

## Changelog
- 2026-10-24: Initial draft from the owner's prototype decisions (OQ-230…OQ-235).
- 2026-10-24: Prototype `651433f`. The owner approved the spec, with D4, D6 and D7.
