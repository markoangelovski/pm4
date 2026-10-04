---
id: feat-tsk-web
title: "Tasks web: task lists, inline status, due-date badges, task detail and the task dialog"
status: approved
owner: Marko Angelovski
last_updated: 2026-10-04
milestone: M3
requirements: [FR-TSK-001, FR-TSK-002, FR-TSK-003, FR-TSK-004, FR-TSK-005, FR-TSK-006, FR-TSK-007, FR-TSK-008, FR-PRJ-008, FR-TRASH-003, SCR-021, SCR-030, SCR-031, SCR-032]
related: [req-tasks, web-screens, web-routing, web-conventions, ADR-0009, feat-tsk-api, feat-prj-web, OQ-081, OQ-082, OQ-084, OQ-085, OQ-086, OQ-087, OQ-090, OQ-093]
---

# Tasks web: task lists, inline status, due-date badges, task detail and the task dialog

## Goal
A signed-in user sees and filters a project's tasks on its page (SCR-021), all tasks on `/app/tasks`
(SCR-030), changes a task's status inline, sees overdue / due-soon badges, opens a task (SCR-031),
creates and edits tasks in a dialog (SCR-032), moves a task to another project, and deletes and restores
tasks. Behavior: [screens.md](../04-web/screens.md#screens), [req-tasks](../01-requirements/tasks.md).
API: feat-tsk-api. Patterns: feat-prj-web.

## Decisions
| # | Decision | Source |
| --- | --- | --- |
| D1 | Status filter: three toggles, all on by default; none on → "No tasks match the filter" without a request. | OQ-081, OQ-085 (owner) |
| D2 | Inline status change: optimistic, the row stays in place (sort and filter) until reload/re-sort/re-filter; on failure the old status comes back with a toast. | OQ-087 (owner), conventions *Data layer* (optimistic + rollback) |
| D3 | Due soon = today or tomorrow, overdue = before today, in the profile time zone; completed / no date → no badge. | OQ-082 (owner) |
| D4 | Create task → stay, toast "Task created"; delete from the detail page → the project page, toast "Moved to trash". | OQ-093, OQ-086 (owner) |
| D5 | D2 in the cache: `onMutate` patches the task in every cached task list and its detail; on success, task lists are invalidated with `refetchType: "none"` (stale, no refetch now), and the project's detail and `projectKeys.lists()` are invalidated normally (counts, FR-PRJ-008). | Agent |
| D6 | `?status=` holds the selected statuses, comma-separated; absent = all; empty (`status=`) = none. | Agent: conventions *UI rules* (nuqs) |
| D7 | The project combobox (task dialog, `/app/tasks` filter) loads `useProjects({ q: "", sort: "title:asc", page: 1, pageSize: 100 })` once and filters in the browser; beyond 100 projects only the first 100 can be picked. Its value is `{ id, title }`. A `?project=` id not in that list still filters the request, and the box shows **All projects**. | Owner (2026-10-04) |
| D8 | `formatWorkDate("2026-10-03")` → "3 Oct 2026" in `lib/time` (calendar strings, no time zone). | Agent: conventions *Time and dates* |
| D9 | The layout, classes and copy of the components are owner-approved; the Statistics card on the project page keeps `project.taskCounts`. | Owner (2026-10-04) |
| D10 | `TasksList` takes `project?: { id, title }` and `TaskFormDialog` `defaultProject?: { id, title }`, so the dialog can show the pre-selected project without a lookup; the form holds `project: { id, title } \| null` and sends `projectId`. | Owner (2026-10-04) |
| D11 | A row opens the task on click, except on a link, a button, the status select (`[role=combobox]`), a click from a portaled menu, or while text is selected. | Owner (2026-10-04, as feat-prj-web D12) |
| D12 | After a delete, the task page renders nothing and disables its query before navigating, so "in the trash" never flashes. | Agent: feat-prj-web D13 |
| D13 | No separate `tasks-table.tsx`: the table stays inside `tasks-list.tsx`. | Owner (2026-10-04) |
| D14 | `Task` (and `TaskList.items`) narrow the generated `Ref` so `project.id` is a `string`: the shared `Ref.id` is nullable for purged entities, but a task's project is always live (endpoints.md *Task*, `deleted: false`). The hooks return the unwrapped body as `Task` / `TaskList`. `TaskListParams.statuses` goes to the typed query as the `status` array (the generated type); openapi-fetch serializes it, and the API accepts repeated or comma-separated values. | Agent: generated types (test step) |

## Scope
**In:** `features/tasks/` (hooks, due state, schema, components); `formatWorkDate`; the task section in
`ProjectDetail`; the pages `/app/tasks` and `/app/task`.

**Before the tests are written:** feat-tsk-api is done (T-0028 merged, its `openapi.json`). The test writer runs
`npm run api:types`.

**Non-goals** (implementers must not touch these):
- `api/`. Projects' own components except `project-detail.tsx` (the task section and the counts, *Files*).
- Logged time on tasks (OQ-080, M4). The trash page and permanent delete (M6).
- `lib/api/*`, `lib/auth/*`, `features/users/*` (reuse `ProjectLeadField`, `ProjectLeadLabel`, `useMe` as they are), `web/components/ui/*`.

## Read first
| Path | Why / copy this |
| --- | --- |
| `specs/04-web/screens.md` (SCR-021 tasks section, SCR-030, SCR-031, SCR-032) | Screen behavior and copy |
| `specs/03-api/endpoints.md#shared-project-and-task-shapes`, API-TSK-001…006 | Contract (in-trash extensions `projectId`, `projectInTrash`) |
| `web/features/projects/api.ts` | Hooks, keys, `unwrap`, invalidations to copy |
| `web/features/projects/schemas.ts`, `web/features/projects/components/project-form-dialog.tsx` | The form pattern to copy (`applyFieldErrors`, submit errors) |
| `web/features/projects/components/projects-list.tsx`, `project-detail.tsx` | API states (loading, error + Retry), pagination, `leaving` |
| `web/features/users/lead.ts` | `fromProjectLead`, `leadFromMe`, `leadToInput` |
| `web/features/tasks/status.ts`, `web/lib/api/problem.ts`, `web/lib/time/index.ts`, `web/lib/use-debounced-value.ts` | Shared helpers |

## Files
| App | File | C/M | Task | Notes |
| --- | --- | --- | --- | --- |
| web | `web/features/tasks/api.ac.test.tsx` | C | tests | Acceptance tests |
| web | `web/features/tasks/due.ac.test.ts` | C | tests | Acceptance tests |
| web | `web/lib/time/format-work-date.ac.test.ts` | C | tests | Acceptance tests |
| web | `web/features/tasks/components/task-form-dialog.ac.test.tsx` | C | tests | Acceptance tests |
| web | `web/features/tasks/components/tasks-list.ac.test.tsx` | C | tests | Acceptance tests |
| web | `web/features/tasks/components/task-detail.ac.test.tsx` | C | tests | Acceptance tests |
| web | `web/lib/api/schema.d.ts` | M | tests | `npm run api:types` |
| web | `web/features/projects/components/project-detail.ac.test.tsx` | M | tests | feat-prj-web's AC-13: the statistics queries scoped to the Statistics card (the Tasks section repeats the status labels); re-hashed into T-0027 |
| web | `web/features/tasks/api.ts` | C | tests, T1 | Stub from the test writer (`taskKeys` and types real) |
| web | `web/features/tasks/due.ts` | C | tests | `dueState`, final |
| web | `web/lib/time/index.ts` | M | tests | `formatWorkDate`, final |
| web | `web/features/tasks/components/task-status-select.tsx` | C | tests, T1 | |
| web | `web/features/tasks/components/due-date-badge.tsx` | C | tests | Final |
| web | `web/features/tasks/schemas.ts` | C | T2 | Replaces the dialog's inline schema and `toInput` |
| web | `web/features/tasks/components/task-form-dialog.tsx` | C | tests, T2 | |
| web | `web/features/tasks/components/project-picker.tsx` | C | tests | Final (D7) |
| web | `web/features/tasks/components/due-date-field.tsx` | C | tests | Final |
| web | `web/features/tasks/components/tasks-list.tsx` | C | tests, T3 | |
| web | `web/features/tasks/components/task-detail.tsx` | C | tests, T3 | |
| web | `web/features/tasks/components/delete-task-dialog.tsx` | C | tests, T3 | |
| web | `web/features/projects/components/project-detail.tsx` | M | tests, T3 | The Tasks section |
| web | `web/app/(dashboard-layout)/app/tasks/page.tsx` | M | tests | Final |
| web | `web/app/(dashboard-layout)/app/task/page.tsx` | M | tests | Final |

## Interfaces

### Data (T1)
```ts
// web/features/tasks/api.ts
export type Task = Omit<TaskResponseDto, "project"> & { project: { id: string; title: string; deleted: boolean } }; // D14
export type TaskList = Omit<TaskListResponseDto, "items"> & { items: Task[] };
export type ProjectRef = { id: string; title: string };
export const TASK_SORTS = ["updatedAt:desc", "dueDate:asc", "title:asc"] as const;   // offered in the UI
export type TaskSort = (typeof TASK_SORTS)[number];
export interface TaskListParams { projectId?: string; statuses: TaskStatus[]; q: string; sort: TaskSort; page: number; pageSize: number }
export interface TaskInput { projectId: string; title: string; description: string | null; externalLink: string | null;
  projectLeadUserId: string | null; projectLeadName: string | null; status: TaskStatus; dueDate: string | null }

export const taskKeys = {
  all: ["tasks"] as const,
  lists: () => [...taskKeys.all, "list"] as const,
  list: (params: TaskListParams) => [...taskKeys.lists(), params] as const,
  details: () => [...taskKeys.all, "detail"] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
};
/** statuses [] → disabled (no request); all three → no `status` param; else `status=a,b`. q "" omitted. keepPreviousData. */
export function useTasks(params: TaskListParams): UseQueryResult<TaskList, Error>;
export function useTask(id: string, enabled?: boolean): UseQueryResult<Task, Error>;      // no retry on 404; enabled defaults to true
export function useCreateTask(): UseMutationResult<Task, Error, TaskInput>;                // invalidate lists(), projectKeys.detail(projectId), projectKeys.lists()
export function useUpdateTask(id: string): UseMutationResult<Task, Error, TaskInput>;      // setQueryData(detail); invalidate lists(), the old and new project details, projectKeys.lists()
export function useUpdateTaskStatus(): UseMutationResult<Task, Error, { task: Task; status: TaskStatus }>; // D2, D5
export function useDeleteTask(): UseMutationResult<void, Error, Task>;                     // removeQueries(detail); invalidate lists(), projectKeys.detail(task.project.id), projectKeys.lists()
export function useRestoreTask(): UseMutationResult<void, Error, string>;                  // invalidate detail(id), lists(), projectKeys.all
```
`useUpdateTaskStatus`: `PATCH /api/v1/tasks/{id} {status}`. `onMutate`: `cancelQueries(taskKeys.all)`, snapshot
`getQueriesData(taskKeys.lists())` and the detail, then `setQueriesData` replacing that task's `status` (nothing else moves).
`onError`: put the snapshots back, `toast.error("Couldn't change the status.")`. `onSuccess(task)`: `setQueryData(detail)`,
patch the lists with the returned task, `invalidateQueries({ queryKey: taskKeys.lists(), refetchType: "none" })`,
`invalidateQueries(projectKeys.detail(task.project.id))` and `invalidateQueries(projectKeys.lists())`.
`useDeleteTask`: don't await the invalidations in `onSuccess` (the page must disable its query first, D12).

### Status select (T1)
```tsx
// web/features/tasks/components/task-status-select.tsx: a Select of TASK_STATUS_LABELS, coloured with
// TASK_STATUS_BADGE; a change to another status → useUpdateTaskStatus().mutate({ task, status }).
export function TaskStatusSelect(props: { task: Task; className?: string }): React.JSX.Element; // aria-label `Status of ${task.title}`
```
Already final before T1: `dueState(dueDate, status, today)` in `features/tasks/due.ts`,
`formatWorkDate(date)` in `lib/time/index.ts`, `DueDateBadge({ dueDate, status })` (the date or `—`, then **Overdue**
`variant="destructive"` or **Due soon** `bg-chart-4/12! text-chart-4!`, from `today(me.timeZone)`; no badge while `me` loads).

### Form (T2)
```ts
// web/features/tasks/schemas.ts (copy projects/schemas.ts)
export const taskFormSchema = projectFormSchema.extend({
  project: z.custom<ProjectRef | null>().refine((v) => v !== null, "Choose a project."),
  status: z.enum(TASK_STATUSES),
  dueDate: z.string().nullable(),                         // YYYY-MM-DD or null
});
export type TaskFormValues = z.input<typeof taskFormSchema>;
/** Edit: the task's values (project = { id, title } of task.project). Create: project = defaultProject ?? null, status "upcoming", dueDate null, lead = leadFromMe(me). */
export function taskFormDefaults(task: Task | undefined, me: Me | undefined, defaultProject?: ProjectRef): TaskFormValues;
/** As toProjectInput, plus projectId = project.id, status, dueDate. */
export function toTaskInput(values: TaskFormValues): TaskInput;
export const TASK_FIELD_MAP = { ...PROJECT_FIELD_MAP, projectId: "project", status: "status", dueDate: "dueDate" } as const;
```
```tsx
// web/features/tasks/components/task-form-dialog.tsx (the form mounts only while open)
export function TaskFormDialog(props: { open: boolean; onOpenChange: (open: boolean) => void; task?: Task; defaultProject?: ProjectRef }): React.JSX.Element;
```
Already final: `ProjectPicker({ id?, value: ProjectRef | null, onChange, allowAll?, invalid?, className? })` (D7) and
`DueDateField({ id?, value, onChange, invalid? })` (calendar day → `format(day, "yyyy-MM-dd")`; **Clear due date** → `null`).

The dialog's inline schema, `toLead` and `toInput` go; the form uses `taskFormSchema`, `taskFormDefaults`, `toTaskInput`.
Submit with `useCreateTask` / `useUpdateTask(task.id)` (`mutateAsync`): create → `toast.success("Task created")` and close,
no navigation (D4); edit → close. Failure → `applyFieldErrors(error, setError, TASK_FIELD_MAP)`; else a `404` (the chosen
project was deleted meanwhile) → `setError("project", { message: "Choose a project." })`; else
`toast.error("Couldn't save the task.")`. The dialog stays open on any failure.

### Lists and detail (T3)
```tsx
// web/features/tasks/components/tasks-list.tsx
/** With project: the project page's Tasks card (no Project column/filter; "New task" pre-selects it). Without: SCR-030 ("New task" pre-selects the project filter's project, if any). */
export function TasksList(props: { project?: ProjectRef }): React.JSX.Element;
// web/features/tasks/components/task-detail.tsx (reads ?id=)
export function TaskDetail(): React.JSX.Element;
// web/features/tasks/components/delete-task-dialog.tsx (SCR-031 text)
export function DeleteTaskDialog(props: { task: Task; open: boolean; onOpenChange: (open: boolean) => void; onDeleted?: () => void }): React.JSX.Element;
```
The layout, classes and copy stay as they are (D9); the bullets say what changes.
- `TasksList`: the URL state stays (nuqs, `history: "replace"`, `clearOnDefault`: `status` D6, `q`, `sort`, `page`, `project`;
  `project` is ignored when the prop is set). Rows come from
  `useTasks({ projectId: project?.id ?? (params.project || undefined), statuses: status, q, sort, page, pageSize: 25 })`,
  `total` from its `total`. Body, in order: no status selected → "No tasks match the filter" (no request); `isError` →
  "Couldn't load tasks." with **Retry** (`refetch`); `isPending` → the skeleton; `total` 0 and filtered (`q`, fewer than
  three statuses, or a `?project=` filter) → "No tasks match the filter"; `total` 0 → "No tasks yet" / "Create a task to
  start tracking your work." with **New task**; else the table.
- `TaskDetail`: `useTask(idParam, !leaving)`. `isPending` → skeleton; `ApiError` 404 slug `in-trash`:
  `problem.projectInTrash` true → "This task's project is in the trash" / "Restore the project to see this task again." +
  **Restore project** (`useRestoreProject().mutate(problem.projectId)`, then invalidate this task's detail); false → "This task is in the trash" + **Restore** (`useRestoreTask`); failures → `toast.error("Couldn't restore the task.")`
  (or "…the project."); both with **Back to tasks**. Other 404 → "Task not found"; other errors → "Couldn't load the task."
  with **Retry**. Delete: `DeleteTaskDialog` calls `useDeleteTask`, then `onDeleted` sets `leaving` (render `null`), calls
  `router.push(\`${routes.app.project}?id=${task.project.id}\`)` and `toast("Moved to trash")`; a failed delete →
  `toast.error("Couldn't delete the task.")`, the dialog stays open.
- `project-detail.tsx`: `<TasksList project={{ id: project.id, title: project.title }} />` after the grid;
  `ProjectTaskStats` keeps `project.taskCounts`.

## Acceptance criteria
Tests mock `@/lib/api/client`, `next/navigation` and `useMe` (time zone `Europe/Zagreb`), wrap in `NuqsTestingAdapter`,
and use fake timers where "today" matters (2026-10-03 12:00 in Zagreb).

| AC | Case → expected | Test | Task |
| --- | --- | --- | --- |
| AC-1 | `dueState`: today 2026-10-03 → `2026-10-02` overdue; `2026-10-03`, `2026-10-04` due-soon; `2026-10-05` null; `null` null; completed `2026-10-02` null; month end `2026-10-31` with due `2026-11-01` due-soon | `web/features/tasks/due.ac.test.ts` | T1 |
| AC-2 | `formatWorkDate("2026-10-03")` → "3 Oct 2026"; `"2026-01-31"` → "31 Jan 2026" | `web/lib/time/format-work-date.ac.test.ts` | T1 |
| AC-3 | `useTasks`: statuses all three → no `status` param; `["upcoming","in-progress"]` → `status=upcoming,in-progress`; `[]` → no request; `projectId` and `q` passed; `useTask` 404 → no retry | `web/features/tasks/api.ac.test.tsx` | T1 |
| AC-4 | `useUpdateTaskStatus` with a cached list filtered to `["upcoming"]` containing the task: during the request the cached row shows `completed` and keeps its index; on success the list is not refetched, the project detail and project lists are invalidated; on a `500` the cache shows `upcoming` again and the toast "Couldn't change the status." | `web/features/tasks/api.ac.test.tsx` | T1 |
| AC-5 | `useCreateTask`, `useUpdateTask` (moving P → Q), `useDeleteTask` invalidate the keys listed in *Interfaces* (both P and Q details on a move) | `web/features/tasks/api.ac.test.tsx` | T1 |
| AC-6 | `TaskFormDialog` create with `defaultProject {p1, "Website"}`: Project shows "Website", status Upcoming, lead = me, "No due date"; submit with a title → `POST` body with `projectId "p1"`, `status "upcoming"`, `dueDate null`, `projectLeadUserId me.id`; toast "Task created"; dialog closes; no navigation | `web/features/tasks/components/task-form-dialog.ac.test.tsx` | T2 |
| AC-7 | Without `defaultProject` and no project chosen → "Choose a project.", no request; picking a calendar day → `dueDate "2026-10-15"`; Clear due date → `null`; edit after picking another project in the combobox → `PATCH` with its `projectId`; a `400` field error maps under its field; a `404` → "Choose a project." under Project; a `500` → "Couldn't save the task." and the dialog stays open | `web/features/tasks/components/task-form-dialog.ac.test.tsx` | T2 |
| AC-8 | `TasksList project={p1}`: the request has `projectId=p1`; rows with the title link (`/app/task?id=…`), status select, due date with "Overdue"/"Due soon" badges, lead, Created and Updated dates; no Project column; clicking a row outside the link → `router.push("/app/task?id=…")`; "New task" opens the dialog with the project pre-selected | `web/features/tasks/components/tasks-list.ac.test.tsx` | T3 |
| AC-9 | Toggling Completed off → request `status=upcoming,in-progress`, `page` 1; all off → "No tasks match the filter", no request; search `api` → `q=api` after 300 ms; "Due date" → `sort=dueDate:asc` | `web/features/tasks/components/tasks-list.ac.test.tsx` | T3 |
| AC-10 | States: no items unfiltered → "No tasks yet" with **New task**; no items with `q` → "No tasks match the filter"; error → "Couldn't load tasks." and Retry refetches | `web/features/tasks/components/tasks-list.ac.test.tsx` | T3 |
| AC-11 | `TasksList` without `project`: Project column with links; picking a project in the filter → `projectId` in the request and `?project=` in the URL; "All projects" → no `projectId` | `web/features/tasks/components/tasks-list.ac.test.tsx` | T3 |
| AC-12 | Changing a row's status → `PATCH {status}`; the row stays in place in a list filtered to the old status (D2) | `web/features/tasks/components/tasks-list.ac.test.tsx` | T3 |
| AC-13 | `TaskDetail`: shows title, the Tasks back link, project link, due date + badge, lead, link (`target="_blank"`), description, `—` for empty fields; inline status works as AC-12 | `web/features/tasks/components/task-detail.ac.test.tsx` | T3 |
| AC-14 | 404 `not-found` → "Task not found" + "Back to tasks"; 404 `in-trash` `projectInTrash:false` → "This task is in the trash" + Restore → `POST /api/v1/tasks/t1/restore`; `projectInTrash:true` → "This task's project is in the trash" + Restore project → `POST /api/v1/projects/p1/restore`; `500` → "Couldn't load the task." + Retry | `web/features/tasks/components/task-detail.ac.test.tsx` | T3 |
| AC-15 | Delete → SCR-031's confirmation; confirm → `DELETE /api/v1/tasks/t1`, toast "Moved to trash", `router.push("/app/project?id=p1")`, no `GET /api/v1/tasks/t1` after the delete | `web/features/tasks/components/task-detail.ac.test.tsx` | T3 |
| AC-16 | `npm run build` succeeds and `web/out/app/tasks.html`, `web/out/app/task.html` exist | `check` | T3 |
| AC-17 | Locally against the API: on a project page add two tasks (one due tomorrow → "Due soon"), filter to Upcoming, mark one Completed inline (stays; the stats change to 50 %), reload (it's gone from the filter), move the other to another project, delete it from its page, restore it via its old URL | `manual` | T3 |

Typed stubs (created with the tests): the hook signatures above in `features/tasks/api.ts` (`taskKeys`, types and
`TASK_SORTS` real), each body `throw new Error("not implemented (feat-tsk-web)")`. The hook and component tests
fail until T1–T3 connect the components to the hooks.

## Checks
```bash
# AC-16: the static export still has both task pages
cd web && npm run build >/dev/null && test -f out/app/tasks.html && test -f out/app/task.html && cd ..
```

## Tasks
| # | Task | App | Size | Tier | Why this tier | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | Task hooks with the optimistic status change, due state, `formatWorkDate`, status select and due badge | web | M | opus | First optimistic update with rollback across several cached lists (D5) | — (feat-tsk-api and feat-prj-web done) |
| T2 | Task create/edit dialog with the project picker and due-date field | web | M | haiku | Copies the project form; picker and date field from installed primitives, fully specified | T1 |
| T3 | Task lists (project page section and `/app/tasks`), task detail page, delete and restore | web | M | haiku | Composes T1/T2 and the project list/detail patterns; states and copy stated | T2 |

## Open questions
None. OQ-081, OQ-082, OQ-084…OQ-087, OQ-090 and OQ-093 are resolved.

## Changelog
- 2026-10-03: Initial draft.
- 2026-10-03: Approved by the owner.
- 2026-10-04: Owner layout review (D7, D9…D13): `{ id, title }` project values, the project combobox over the first 100 projects, clickable rows, Created/Updated
  columns, error and trash copy, no `tasks-table.tsx`. Back to `review`.
- 2026-10-04: T2 and T3 re-tiered sonnet → haiku (task-routing: haiku first).
- 2026-10-04: Approved by the owner.
- 2026-10-04: Test step: D14 (`Task.project.id` narrowed to `string`; `status` as the typed array). feat-prj-web's
  `project-detail.ac.test.tsx` scoped to the Statistics card, so the Tasks section's status labels don't clash.
- 2026-10-04: Review: on SCR-030, "New task" pre-selects the project filter's project (as screens.md SCR-030/032 already say).
