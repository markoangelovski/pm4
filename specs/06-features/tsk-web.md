---
id: feat-tsk-web
title: "Tasks web: task lists, inline status, due-date badges, task detail and the task dialog"
status: approved
owner: Marko Angelovski
last_updated: 2026-10-03
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
| D7 | The project picker (task dialog, `/app/tasks` filter) is a searchable combobox over `useProjects({ q, sort: "title:asc", page: 1, pageSize: 25 })`; it shows the selected project's title even when it's not in the first 25. | Agent: SCR-030, SCR-032 |
| D8 | `formatWorkDate("2026-10-03")` → "3 Oct 2026" in `lib/time` (calendar strings, no time zone). | Agent: conventions *Time and dates* |

## Scope
**In:** `features/tasks/` (hooks, due state, schema, components); `formatWorkDate`; the task section in
`ProjectDetail`; the pages `/app/tasks` and `/app/task`.

**Before the tests are written:** feat-tsk-api and feat-prj-web are done. The test writer runs `npm run api:types`.

**Non-goals** (implementers must not touch these):
- `api/`. Projects' own components except the task section slot in `project-detail.tsx` (*Files*).
- Logged time on tasks (OQ-080, M4). The trash page and permanent delete (M6).
- `lib/api/*`, `lib/auth/*`, `features/users/*` (reuse `ProjectLeadField`, `ProjectLeadLabel`, `useMe` as they are), `web/components/ui/*`.

## Read first
| Path | Why / copy this |
| --- | --- |
| `specs/04-web/screens.md` (SCR-021 tasks section, SCR-030, SCR-031, SCR-032) | Screen behavior and copy |
| `specs/03-api/endpoints.md#shared-project-and-task-shapes`, API-TSK-001…006 | Contract (in-trash extensions `projectId`, `projectInTrash`) |
| `web/features/projects/api.ts` | Hooks, keys, `unwrap`, invalidations to copy |
| `web/features/projects/schemas.ts`, `web/features/projects/components/project-form-dialog.tsx` | The form pattern to copy |
| `web/features/projects/components/projects-list.tsx`, `project-detail.tsx`, `delete-project-dialog.tsx` | List, URL state, detail states, delete pattern |
| `web/features/users/lead.ts`, `web/features/users/components/project-lead-field.tsx`, `project-lead-label.tsx` | Lead field and label |
| `web/features/tasks/status.ts`, `web/lib/api/problem.ts`, `web/lib/time/index.ts`, `web/lib/use-debounced-value.ts` | Shared helpers |
| `web/components/ui/calendar.tsx`, `popover.tsx`, `toggle-group.tsx`, `select.tsx` | Date picker and filter primitives |

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
| web | `web/features/tasks/api.ts` | C | tests, T1 | Stub from the test writer (`taskKeys` real) |
| web | `web/features/tasks/due.ts` | C | tests, T1 | Stub from the test writer |
| web | `web/lib/time/index.ts` | M | tests, T1 | `formatWorkDate`; the test writer adds its stub |
| web | `web/features/tasks/components/task-status-select.tsx` | C | T1 | |
| web | `web/features/tasks/components/due-date-badge.tsx` | C | T1 | |
| web | `web/features/tasks/schemas.ts` | C | T2 | |
| web | `web/features/tasks/components/task-form-dialog.tsx` | C | tests, T2 | Stub from the test writer |
| web | `web/features/tasks/components/project-picker.tsx` | C | T2 | |
| web | `web/features/tasks/components/due-date-field.tsx` | C | T2 | |
| web | `web/features/tasks/components/tasks-list.tsx` | C | tests, T3 | Stub from the test writer |
| web | `web/features/tasks/components/tasks-table.tsx` | C | T3 | |
| web | `web/features/tasks/components/task-detail.tsx` | C | tests, T3 | Stub from the test writer |
| web | `web/features/tasks/components/delete-task-dialog.tsx` | C | T3 | |
| web | `web/features/projects/components/project-detail.tsx` | M | T3 | Renders `<TasksList projectId={id} />` under the stats |
| web | `web/app/(dashboard-layout)/app/tasks/page.tsx` | M | T3 | Replaces the placeholder |
| web | `web/app/(dashboard-layout)/app/task/page.tsx` | M | T3 | Replaces the placeholder |

## Interfaces

### Data (T1)
```ts
// web/features/tasks/api.ts
export type Task = components["schemas"]["TaskResponseDto"];
export type TaskList = components["schemas"]["TaskListResponseDto"];
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
export function useTask(id: string): UseQueryResult<Task, Error>;                           // no retry on 404
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

### Due state and dates (T1)
```ts
// web/features/tasks/due.ts
export type DueState = "overdue" | "due-soon" | null;
/** today: YYYY-MM-DD in the profile zone (lib/time today()). Pure calendar math. */
export function dueState(dueDate: string | null, status: TaskStatus, today: string): DueState;

// web/lib/time/index.ts (add)
/** "2026-10-03" → "3 Oct 2026". Calendar string in, no time zone involved. */
export function formatWorkDate(date: string): string;
```
```tsx
// web/features/tasks/components/due-date-badge.tsx: the date (formatWorkDate) or "—", then
// a Badge "Overdue" (variant destructive) or "Due soon" (variant secondary) from dueState(…, today(me.timeZone)).
export function DueDateBadge(props: { dueDate: string | null; status: TaskStatus }): React.JSX.Element;

// web/features/tasks/components/task-status-select.tsx: a Select of TASK_STATUS_LABELS; change → useUpdateTaskStatus.
export function TaskStatusSelect(props: { task: Task; className?: string }): React.JSX.Element; // aria-label `Status of ${task.title}`
```
`DueDateBadge` uses `useMe()`; while `me` loads it shows the date without a badge.

### Form (T2)
```ts
// web/features/tasks/schemas.ts (copy projects/schemas.ts)
export const taskFormSchema = z.object({
  projectId: z.string().min(1, "Choose a project."),
  title, description, externalLink, lead,                 // as projectFormSchema
  status: z.enum(TASK_STATUSES),
  dueDate: z.string().nullable(),                         // YYYY-MM-DD or null
});
export type TaskFormValues = z.input<typeof taskFormSchema>;
export function taskFormDefaults(task: Task | undefined, me: Me | undefined, projectId?: string): TaskFormValues; // create: status "upcoming", dueDate null, lead = leadFromMe(me)
export function toTaskInput(values: TaskFormValues): TaskInput;
export const TASK_FIELD_MAP = { ...PROJECT_FIELD_MAP, projectId: "projectId", status: "status", dueDate: "dueDate" } as const;
```
```tsx
// web/features/tasks/components/task-form-dialog.tsx ("use client")
export function TaskFormDialog(props: { open: boolean; onOpenChange: (open: boolean) => void; task?: Task; defaultProjectId?: string }): React.JSX.Element;
// web/features/tasks/components/project-picker.tsx (D7)
export function ProjectPicker(props: { id?: string; value: string | null; onChange: (projectId: string | null) => void;
  allowAll?: boolean /* filter mode: an "All projects" option = null */; invalid?: boolean; selectedTitle?: string }): React.JSX.Element;
// web/features/tasks/components/due-date-field.tsx: Popover + Calendar (single), the value shown with formatWorkDate, a clear button (aria-label "Clear due date")
export function DueDateField(props: { id?: string; value: string | null; onChange: (date: string | null) => void; invalid?: boolean }): React.JSX.Element;
```
`TaskFormDialog` copies `ProjectFormDialog`: create → `toast.success("Task created")` and close, no navigation (D4);
edit → close. Failure → `applyFieldErrors(…, TASK_FIELD_MAP)`, else `toast.error("Couldn't save the task.")`.
A `404` on submit (the chosen project was deleted meanwhile) → the error "Choose a project." under Project.
Calendar day → `YYYY-MM-DD` with `format(day, "yyyy-MM-dd")` (local calendar day, never `toISOString`).

### Lists and detail (T3)
```tsx
// web/features/tasks/components/tasks-list.tsx ("use client")
/** With projectId: the project page's section (no Project column/filter, "New task" pre-selects it). Without: SCR-030. */
export function TasksList(props: { projectId?: string }): React.JSX.Element;
// URL (nuqs, history "replace"): status (D6), q, sort (TASK_SORTS, default "updatedAt:desc"), page; plus `project` when no projectId prop

// web/features/tasks/components/tasks-table.tsx
export function TasksTable(props: { tasks: Task[]; showProject: boolean }): React.JSX.Element;
// columns: Title (link `${routes.app.task}?id=`), [Project (link `${routes.app.project}?id=`)], Status (TaskStatusSelect), Due date (DueDateBadge), Project lead (ProjectLeadLabel)

// web/features/tasks/components/task-detail.tsx ("use client"; reads ?id=)
export function TaskDetail(): React.JSX.Element;
// web/features/tasks/components/delete-task-dialog.tsx (copy DeleteProjectDialog; SCR-031 text)
export function DeleteTaskDialog(props: { task: Task; open: boolean; onOpenChange: (open: boolean) => void }): React.JSX.Element;
```
- `TasksList` toolbar: (`ProjectPicker allowAll` when no `projectId`), a `ToggleGroup` (multiple) with the three
  status labels, a search box (300 ms, `useDebouncedValue`), a sort select ("Recently updated", "Due date",
  "Title A–Z"), **New task**. Any filter, search or sort change sets `page` to 1. States as SCR-030; with `projectId`,
  the heading is "Tasks" inside the project page.
- `TaskDetail`: SCR-031. `ApiError` 404 `in-trash`: `problem.projectInTrash` true → "This task's project is in the
  trash" + **Restore project** (`useRestoreProject().mutate(problem.projectId)`, then invalidate this task's detail); false →
  "This task is in the trash" + **Restore** (`useRestoreTask`); failures → `toast.error("Couldn't restore the task.")`
  (or "…the project."). Delete → `toast("Moved to trash")`, `router.push(\`${routes.app.project}?id=${task.project.id}\`)`.
- `project-detail.tsx`: render `<TasksList projectId={project.id} />` after `ProjectTaskStats`.
- Pages: `tasks/page.tsx` → `<Suspense fallback={null}><TasksList /></Suspense>` (title "Tasks"); `task/page.tsx` keeps `ViewIdGuard`, renders `<TaskDetail />`.

## Acceptance criteria
Tests mock `@/lib/api/client`, `next/navigation` and `useMe` (time zone `Europe/Zagreb`), with fake timers
where "today" matters (2026-10-03 12:00 in Zagreb).

| AC | Case → expected | Test | Task |
| --- | --- | --- | --- |
| AC-1 | `dueState`: today 2026-10-03 → `2026-10-02` overdue; `2026-10-03`, `2026-10-04` due-soon; `2026-10-05` null; `null` null; completed `2026-10-02` null; month end `2026-10-31` with due `2026-11-01` due-soon | `web/features/tasks/due.ac.test.ts` | T1 |
| AC-2 | `formatWorkDate("2026-10-03")` → "3 Oct 2026"; `"2026-01-31"` → "31 Jan 2026" | `web/lib/time/format-work-date.ac.test.ts` | T1 |
| AC-3 | `useTasks`: statuses all three → no `status` param; `["upcoming","in-progress"]` → `status=upcoming,in-progress`; `[]` → no request; `projectId` and `q` passed; `useTask` 404 → no retry | `web/features/tasks/api.ac.test.tsx` | T1 |
| AC-4 | `useUpdateTaskStatus` with a cached list filtered to `["upcoming"]` containing the task: during the request the cached row shows `completed` and keeps its index; on success the list is not refetched, the project detail and project lists are invalidated; on a `500` the cache shows `upcoming` again and the toast "Couldn't change the status." | `web/features/tasks/api.ac.test.tsx` | T1 |
| AC-5 | `useCreateTask`, `useUpdateTask` (moving P → Q), `useDeleteTask` invalidate the keys listed in *Interfaces* (both P and Q details on a move) | `web/features/tasks/api.ac.test.tsx` | T1 |
| AC-6 | `TaskFormDialog` create from a project (`defaultProjectId P`): project pre-selected, status Upcoming, lead = me, no due date; submit → `POST` body with `projectId P`, `status "upcoming"`, `dueDate null`, `projectLeadUserId me.id`; toast "Task created"; dialog closes; no navigation | `web/features/tasks/components/task-form-dialog.ac.test.tsx` | T2 |
| AC-7 | Without `defaultProjectId` and no project chosen → "Choose a project.", no request; picking a calendar day → `dueDate "2026-10-15"`; Clear due date → `null`; edit sends the changed `projectId`; a `400` field error maps under its field; a `500` → "Couldn't save the task." | `web/features/tasks/components/task-form-dialog.ac.test.tsx` | T2 |
| AC-8 | `TasksList projectId=P`: rows with title link, status select, due date with "Overdue"/"Due soon" badges, lead; no Project column; the request has `projectId=P` | `web/features/tasks/components/tasks-list.ac.test.tsx` | T3 |
| AC-9 | Toggling Completed off → request `status=upcoming,in-progress`, `page` 1; all off → "No tasks match the filter", no request; search `api` → `q=api` after 300 ms; "Due date" → `sort=dueDate:asc` | `web/features/tasks/components/tasks-list.ac.test.tsx` | T3 |
| AC-10 | `TasksList` without `projectId`: Project column with links; picking a project in the filter → `projectId` in the request and `?project=` in the URL; "All projects" → no `projectId` | `web/features/tasks/components/tasks-list.ac.test.tsx` | T3 |
| AC-11 | Changing a row's status → `PATCH {status}`; the row stays in place in a list filtered to the old status (D2) | `web/features/tasks/components/tasks-list.ac.test.tsx` | T3 |
| AC-12 | `TaskDetail`: shows title, project link, due date + badge, lead, link (`target="_blank"`), description, `—` for empty fields; inline status works as AC-11 | `web/features/tasks/components/task-detail.ac.test.tsx` | T3 |
| AC-13 | 404 `not-found` → "Task not found" + "Back to tasks"; 404 `in-trash` `projectInTrash:false` → "This task is in the trash" + Restore → `POST /api/v1/tasks/t1/restore`; `projectInTrash:true` → "This task's project is in the trash" + Restore project → `POST /api/v1/projects/p1/restore` | `web/features/tasks/components/task-detail.ac.test.tsx` | T3 |
| AC-14 | Delete → SCR-031's confirmation; confirm → `DELETE /api/v1/tasks/t1`, toast "Moved to trash", `router.push("/app/project?id=p1")` | `web/features/tasks/components/task-detail.ac.test.tsx` | T3 |
| AC-15 | `npm run build` succeeds and `web/out/app/tasks.html`, `web/out/app/task.html` exist | `check` | T3 |
| AC-16 | Locally against the API: on a project page add two tasks (one due tomorrow → "Due soon"), filter to Upcoming, mark one Completed inline (stays; the stats change to 50 %), reload (it's gone from the filter), move the other to another project, delete it from its page, restore it via its old URL | `manual` | T3 |

Typed stubs (created with the tests): the signatures above in `features/tasks/api.ts` (`taskKeys` and types
real), `features/tasks/due.ts`, `formatWorkDate` in `lib/time/index.ts`, `task-form-dialog.tsx`,
`tasks-list.tsx`, `task-detail.tsx`, each body `throw new Error("not implemented (feat-tsk-web)")`.

## Checks
```bash
# AC-15: the static export still has both task pages
cd web && npm run build >/dev/null && test -f out/app/tasks.html && test -f out/app/task.html
```

## Tasks
| # | Task | App | Size | Tier | Why this tier | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | Task hooks with the optimistic status change, due state, `formatWorkDate`, status select and due badge | web | M | opus | First optimistic update with rollback across several cached lists (D5) | — (feat-tsk-api and feat-prj-web done) |
| T2 | Task create/edit dialog with the project picker and due-date field | web | M | sonnet | Copies the project form; picker and date field from installed primitives, fully specified | T1 |
| T3 | Task lists (project page section and `/app/tasks`), task detail page, delete and restore | web | M | sonnet | Composes T1/T2 and the project list/detail patterns; states and copy stated | T2 |

## Open questions
None. OQ-081, OQ-082, OQ-084…OQ-087, OQ-090 and OQ-093 are resolved.

## Changelog
- 2026-10-03: Initial draft.
- 2026-10-03: Approved by the owner.
