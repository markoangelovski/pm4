---
id: feat-prj-lists
title: "Project management lists: title A–Z defaults, open tasks by default, notes and to-dos A–Z sorts"
status: approved
owner: Marko Angelovski
last_updated: 2026-11-04
milestone: M2
requirements: [FR-PRJ-002, FR-TSK-002, FR-TSK-003, FR-NOTE-002, FR-NOTE-005, FR-NOTE-008]
related: [api-endpoints, web-screens, web-prototype, feat-prj-web, feat-tsk-web, feat-note-todos, OQ-264, OQ-265]
prototype: d7882d5
---

# Project management lists: title A–Z defaults, open tasks by default, notes and to-dos A–Z sorts

## Goal
The project and task lists open sorted by title A–Z, and the task lists (SCR-030 and SCR-021's Tasks) show only open tasks until
**Completed** is picked (FR-PRJ-002, FR-TSK-002/003). The Notes page (SCR-070) gets a **Title A–Z** sort for notes (API-NOTE-001
`sort=title:asc`) and a **Parent A–Z** sort for to-dos. Each tab has its own default filter and sort. To-dos keep their place when
ticked off (FR-NOTE-005, SCR-072), and so do the project and task pages' cards (FR-NOTE-008, SCR-073). Note and to-do project links show
the project icon, and a To-dos task group shows the task icon.

## Decisions
| # | Decision | Source |
| --- | --- | --- |
| D1 | Projects and Tasks: **Title A–Z** is the default and first in the sort menu. Tasks: **Upcoming** and **In progress** by default; with them and no task, "No open tasks". | OQ-264 (owner, 2026-11-04), prototype `d7882d5` |
| D2 | Notes **Title A–Z**: `lower(title)` A–Z, untitled last, equal titles and untitled notes most recently edited first; the range is on `updatedAt`. It's the Notes tab's default and the SCR-073 Notes card's order. GET /todos doesn't take it. | OQ-264 (owner, 2026-11-04), prototype `d7882d5` |
| D3 | Title sorts compare character by character (`lower(title)` in the database's collation, as projects and tasks already do), not in natural number order. | OQ-265 (owner, 2026-11-04) |
| D4 | To-dos **Parent A–Z** is the web's own sort: GET /todos with `createdAt:asc`; `groupTodos(…, { byParent: true })` puts General among the projects by name. The date sorts keep General first. In a group, the to-dos keep the request's order, done or not. | OQ-264 (owner, 2026-11-04), prototype `d7882d5` |
| D5 | The API's default `sort` stays `updatedAt:desc`: the web always sends a sort. `GET /todos` gets its own `TodoSort` enum (the four date sorts), so the OpenAPI document says it rejects `title:asc`. | Agent |
| D6 | A changed production web file becomes its prototype twin: `sed -e 's#@/proto/mock/client#@/lib/api/client#' -e 's#@/proto/#@/#g'`, then Prettier. The 10 files were twins at `39dd7e7`, so the copy brings in only `d7882d5`'s changes. Before that, the prototype moves off `proposed-types.ts` onto the generated types. | As feat-prj-services D10 |
| D7 | The test step writes the final API contract (both query DTOs, `openapi.json`, `schema.d.ts`) and the `group.ts` stub, and updates the existing acceptance tests that assert the old defaults. | Agent, as feat-prj-services D9 |

## Scope
**In:** `api/`: `title:asc` on API-NOTE-001; `TodoSort` on API-TODO-001. `web/`: the twins of 10 prototype files (Projects and Tasks lists,
the Notes page, its toolbar, the To-dos board and grouping, the project and task cards, link lines); the prototype off `proposed-types.ts`.

**Before the tests are written:** the working tree is clean (prototype `d7882d5` committed).

**Test step (main session, before T1):** D7. The contract files, `npm run openapi:export` (api), `npm run api:types` (web), the stub, the new
and updated acceptance tests (rows with `tests`), then `pm4 hash`.

**Non-goals** (implementers must not touch these):
- The projects and tasks API (their sorts already exist); SCR-020's expanded task rows (still most recently updated first).
- `web/lib/**` (except the generated `schema.d.ts`), `web/components/ui/*`, `web/app/**`, `web/proto/mock/**`.
- Any `*.ac.*` test, `api/openapi.json`, and the files the test step writes (rows whose *Task* is only `tests`).

## Read first
| Path | Why / copy this |
| --- | --- |
| `specs/03-api/endpoints.md#api-note-001-list-notes` and the *Search, sort, range* paragraph above it | Contract (T1) |
| `api/src/tasks/tasks.repository.ts` → `ORDER_BY` | The `lower(title)` order (T1) |
| `web/proto/features/notes/api.ts`, `web/proto/features/notes/proposed-types.ts` | The hooks the components call, and the type to drop (T2) |

## Files
| App | File | C/M | Task | Notes |
| --- | --- | --- | --- | --- |
| api | `api/test/note-title-sort.ac.e2e-spec.ts` | C | tests | AC-1…AC-4 |
| api | `api/test/notes.ac.e2e-spec.ts` | M | tests | AC-5 loses its `sort=title:asc → 400` line (AC-4 moves it to `/todos`) |
| api | `api/src/notes/dto/list-notes-query.dto.ts`, `api/src/notes/dto/list-todos-query.dto.ts` | M | tests | Final (*Contract*) |
| api | `api/openapi.json` | M | tests | `npm run openapi:export` |
| api | `api/src/notes/notes.repository.ts`, `api/src/notes/todos.repository.ts` | M | T1 | |
| web | `web/lib/api/schema.d.ts` | M | tests | `npm run api:types` |
| web | `web/features/notes/group.ts` | M | tests, T2 | Test step: the stub. T2: the twin |
| web | `web/features/notes/api.ts` | M | tests, T2 | Test step: `TodoListOptions` (`useTodos`, `noteKeys.todoList`), so `web/` typechecks against `TodoSort`. T2: the twin |
| web | `web/features/notes/group.ac.test.ts` | M | tests | AC-10, AC-11 (the "open before done" case becomes AC-11) |
| web | `web/features/notes/components/notes-view.ac.test.tsx` | M | tests | AC-7…AC-9; AC-15's expected URLs get the new defaults |
| web | `web/features/notes/components/notes-section.ac.test.tsx` | C | tests | AC-12, AC-13 |
| web | `web/features/projects/components/projects-list.ac.test.tsx` | M | tests | AC-5; AC-12's list requests get `sort: "title:asc"` |
| web | `web/features/tasks/components/tasks-list.ac.test.tsx` | M | tests | AC-6; AC-8…AC-10 and AC-14 get the new defaults |
| web | `web/proto/features/notes/api.ts`, `web/proto/features/notes/types.ts` | M | T2 | Off `proposed-types.ts` (*Web (T2)*) |
| web | `web/proto/features/notes/proposed-types.ts` | D | T2 | `rm` |
| web | `web/features/notes/types.ts`, `web/features/notes/components/link-line.tsx`, `web/features/notes/components/notes-section.tsx`, `web/features/notes/components/notes-toolbar.tsx`, `web/features/notes/components/notes-view.tsx`, `web/features/notes/components/todos-board.tsx`, `web/features/projects/components/projects-list.tsx`, `web/features/tasks/components/tasks-list.tsx` | M | T2 | Twins (D6) |

## Interfaces

### Contract (test step; T1)
```ts
// api/src/notes/dto/list-notes-query.dto.ts
export const NOTE_SORTS = ["updatedAt:desc", "updatedAt:asc", "createdAt:desc", "createdAt:asc", "title:asc"] as const;
// ListNotesQueryDto.sort: decorators unchanged (enumName "NoteSort", default "updatedAt:desc"); its doc comment becomes:
/** Sort order; ties break on `id` in the same direction. `title:asc`: the title A–Z ignoring case, untitled notes last, equal titles most recently edited first. */

// api/src/notes/dto/list-todos-query.dto.ts
import { ApiProperty, OmitType } from "@nestjs/swagger";
import { IsIn, IsOptional } from "class-validator";
export const TODO_SORTS = ["updatedAt:desc", "updatedAt:asc", "createdAt:desc", "createdAt:asc"] as const;
export type TodoSort = (typeof TODO_SORTS)[number];
/** `GET /todos` query (API-TODO-001): the notes filter, search and range, without paging; its own sort (no `title:asc`). */
export class ListTodosQueryDto extends OmitType(ListNotesQueryDto, ["page", "pageSize", "sort"] as const) {
  /** Sort order; ties break on `id` in the same direction. */
  @ApiProperty({ enum: TODO_SORTS, enumName: "TodoSort", required: false, default: "updatedAt:desc" })
  @IsOptional()
  @IsIn(TODO_SORTS)
  sort: TodoSort = "updatedAt:desc";
}
```
Then `npm run openapi:export` (api) and `npm run api:types` (web). Both apps typecheck: `todos.repository.ts` still takes `NoteSort`,
which `TodoSort` fits, and `web/features/notes/api.ts` gets the prototype's `TodoListOptions` type for `useTodos` (its twin, so T2's copy keeps it).

### API (T1)
- `notes.repository.ts`: `SORT_COLUMN` gains `title: notes.updatedAt` (it's also the range column, so `title:asc` ranges on the last
  edit; say so in a comment). `orderBy`: `sort === "title:asc"` → `[sql\`lower(${notes.title}) asc nulls last\`, desc(notes.updatedAt), desc(notes.id)]`;
  the other sorts as today. `list` keeps reading the range column from `SORT_COLUMN`.
- `todos.repository.ts`: `orderBy(sort: TodoSort)` and `list(…, sort: TodoSort)`, with `TodoSort` from `./dto/list-todos-query.dto.js` in
  place of `NoteSort`. Nothing else changes.

### Web (T2)
Prototype first (D6):
- `proto/features/notes/api.ts`: drop the `./proposed-types` import; `NoteListOptions = Pick<NoteListQuery, "q" | "sort" | "from" | "to">`
  (its doc comment stays); in `useNotes`, `params: { query: { ...filter, ...options, page, pageSize } }` with no cast and without the
  "`title:asc` is proposed" comment.
- `proto/features/notes/types.ts`: `NOTE_SORTS`' comment becomes "The Notes tab's sorts; `title:asc` is the default."
- `rm web/proto/features/notes/proposed-types.ts`. `cd web && npm run typecheck` passes.

Then the twins, from the repo root:
```bash
F="features/notes/api.ts features/notes/types.ts features/notes/group.ts features/notes/components/link-line.tsx features/notes/components/notes-section.tsx features/notes/components/notes-toolbar.tsx features/notes/components/notes-view.tsx features/notes/components/todos-board.tsx features/projects/components/projects-list.tsx features/tasks/components/tasks-list.tsx"
for f in $F; do sed -e 's#@/proto/mock/client#@/lib/api/client#' -e 's#@/proto/#@/#g' web/proto/$f > web/$f; done
cd web && npx prettier --write $F
```
What the twins bring (all in prototype `d7882d5`, `git show d7882d5 -- web/proto/features`):
```ts
// features/notes/group.ts
/** By creation, oldest first, done or not (ties on id), so ticking one off doesn't move it. */
export function byCreated(a: Todo, b: Todo): number;              // replaces byOpenThenDone
export function groupTodos(todos: Todo[], opts?: { byParent?: boolean; withGeneral?: boolean }): TodoGroup[];
// features/notes/types.ts
export const TODO_SORTS = ["parent:asc", "updatedAt:desc", "updatedAt:asc", "createdAt:desc", "createdAt:asc"] as const;
// features/notes/api.ts
export type TodoListOptions = Pick<TodoListQuery, "q" | "sort" | "from" | "to">;   // useTodos' and noteKeys.todoList's options
```
URL state on `/app/notes`: `show` and `sort` have no nuqs default. Absent or unknown, they're the tab's (Notes: `show` General,
`sort` `title:asc`; To-dos: `show` all, `sort` `parent:asc`). A value equal to the tab's default is written as absent. Switching tabs
clears `show`, `sort` and `page`, and keeps `q`, `from` and `to`.

## Acceptance criteria
API fixtures: user A (`Europe/Zagreb`) with notes "Banana" (updated 3 Oct), "apple" (updated 1 Oct), "Apple" (updated 2 Oct), "Cherry", and two
untitled ones U1 (updated 5 Oct) and U2 (updated 7 Oct); user B with a note "Aardvark". Web tests mock `@/lib/api/client` as the files they
extend do.

| AC | Case → expected | Test | Task |
| --- | --- | --- | --- |
| AC-1 | `GET /notes?sort=title:asc` → `Apple` (2 Oct), `apple` (1 Oct), `Banana`, `Cherry`, U2, U1; never B's | `api/test/note-title-sort.ac.e2e-spec.ts` | T1 |
| AC-2 | `title:asc` ranges on `updatedAt` in the user's zone (a user of its own): a note created 1 Oct and edited `2026-10-09T22:30Z` is in `?sort=title:asc&from=2026-10-10`, and one created 10 Oct but edited 5 Oct isn't | `api/test/note-title-sort.ac.e2e-spec.ts` | T1 |
| AC-3 | `?sort=title:asc&pageSize=2&page=2` → `Banana`, `Cherry`, `total` 6 | `api/test/note-title-sort.ac.e2e-spec.ts` | T1 |
| AC-4 | `GET /todos?sort=title:asc` → `400` with an error on field `sort`; `GET /todos?sort=createdAt:asc` → `200`, oldest first | `api/test/note-title-sort.ac.e2e-spec.ts` | T1 |
| AC-5 | SCR-020: no params → the list request has `sort: "title:asc"`; the sort menu's options are Title A–Z, Recently updated, Recently created; picking Recently updated → `sort: "updatedAt:desc"` and `?sort=updatedAt:desc`; picking Title A–Z again → no `sort` in the URL | `web/features/projects/components/projects-list.ac.test.tsx` | T2 |
| AC-6 | SCR-030 and a project's tasks: no params → `status: ["upcoming", "in-progress"]`, `sort: "title:asc"`; Completed shows off; picking it → no `status` (all three) in the request; the sort menu starts with Title A–Z; empty with the default statuses → "No open tasks"; empty with all three → "No tasks yet"; only Upcoming and none → "No tasks match the filter" | `web/features/tasks/components/tasks-list.ac.test.tsx` | T2 |
| AC-7 | SCR-070 Notes tab: no params → `GET /api/v1/notes?unlinked=true&sort=title%3Aasc&page=1&pageSize=20`; the sort menu starts with Title A–Z, then the four date sorts; `?sort=parent:asc` → `title:asc` | `web/features/notes/components/notes-view.ac.test.tsx` | T2 |
| AC-8 | To-dos tab: `?tab=todos` → `GET /api/v1/todos?sort=createdAt%3Aasc` (All to-dos); the menu starts with Parent A–Z; `?tab=todos&sort=updatedAt:desc` → that sort; `?tab=todos&sort=title:asc` → `createdAt:asc` | `web/features/notes/components/notes-view.ac.test.tsx` | T2 |
| AC-9 | `?show=all&sort=createdAt:desc&q=x`, clicking **To-dos** → the URL is `?tab=todos&q=x`, and the request is `/api/v1/todos?q=x&sort=createdAt%3Aasc`; back to **Notes** → `unlinked=true` and `title:asc` | `web/features/notes/components/notes-view.ac.test.tsx` | T2 |
| AC-10 | `groupTodos` of General, "Zeta", "alpha", "alpha · Task" and a deleted project's to-dos: default → General, alpha, alpha · Task, Zeta, deleted; `byParent` → alpha, alpha · Task, General, Zeta, deleted; `withGeneral` with no General to-do → an empty General group in that place; without it → none | `web/features/notes/group.ac.test.ts` | T2 |
| AC-11 | In a group the to-dos keep the given order, done or not (`[first, done, second]` stays so); `byCreated` orders by `createdAt` ascending, ties by `id` | `web/features/notes/group.ac.test.ts` | T2 |
| AC-12 | `NotesSection` of a project: the Notes card requests `projectId=P&sort=title%3Aasc&page=1&pageSize=3` | `web/features/notes/components/notes-section.ac.test.tsx` | T2 |
| AC-13 | To-dos card with A (open, oldest), B (done), C (open): A, C and "Show done (1)"; Show done → A, B, C in that order, then "Hide done"; ticking A (PATCH, then a refetch with A done) keeps it first, before C, and the button stays "Show done (1)" | `web/features/notes/components/notes-section.ac.test.tsx` | T2 |
| AC-14 | The contract has `title:asc` in `NoteSort` and a `TodoSort` for `/todos`; the twins equal their prototype files; no `proposed-types.ts` in `proto/features/notes`, and nothing imports it | check | T2 |

Typed stubs (D7): `web/features/notes/group.ts` gets `export function byCreated(a: Todo, b: Todo): number` and `groupTodos`' second
parameter `opts: { byParent?: boolean; withGeneral?: boolean } = {}`, each new piece throwing `new Error("not implemented (feat-prj-lists)")`
(`groupTodos` throws only when `opts` has a key, so the existing callers keep working).

## Checks
```bash
# AC-14: the contract, the twins and the prototype's types
grep -q '"title:asc"' api/openapi.json && grep -q '"TodoSort"' api/openapi.json && grep -q 'TodoSort:' web/lib/api/schema.d.ts
node scripts/pm4.mjs twins | grep -q "0 warnings, 0 failures"
test ! -e web/proto/features/notes/proposed-types.ts
! grep -rq 'proposed-types' web/proto/features/notes web/features/notes
```

## Tasks
| # | Task | App | Size | Tier | Why this tier | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | Notes `title:asc` order and range; to-dos on `TodoSort` | api | S | haiku | Two repository edits spelled out in *API (T1)*; copies `tasks.repository.ts`' `lower(title)` | — |
| T2 | Prototype off `proposed-types`; twins of the 10 list files | web | S | haiku | Copy-and-sed twins (D6), the command under *Web (T2)* | — |

## Open questions
None. OQ-264 and OQ-265 are answered.

## Changelog
- 2026-11-04: Initial draft from prototype `d7882d5`, OQ-264 and OQ-265. Status `review`.
- 2026-11-04: Approved by the owner. Status `approved`.
- 2026-11-04: Test step: `web/features/notes/api.ts` gets `TodoListOptions` so `web/` typechecks against `TodoSort` (row in *Files*). Tasks T-0140 (T1), T-0141 (T2).
