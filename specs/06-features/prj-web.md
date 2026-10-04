---
id: feat-prj-web
title: "Projects web: list, detail with task statistics, create/edit dialog and the lead combobox"
status: approved
owner: Marko Angelovski
last_updated: 2026-10-04
milestone: M2
requirements: [FR-PRJ-001, FR-PRJ-002, FR-PRJ-003, FR-PRJ-004, FR-PRJ-005, FR-PRJ-006, FR-PRJ-008, FR-TRASH-002, SCR-020, SCR-021, SCR-022]
related: [req-projects, web-screens, web-routing, web-conventions, ADR-0009, feat-prj-api, feat-shell-user-menu, feat-tsk-web, OQ-076, OQ-077, OQ-078, OQ-083, OQ-085, OQ-086, OQ-089, OQ-090, OQ-092, OQ-093]
---

# Projects web: list, detail with task statistics, create/edit dialog and the lead combobox

## Goal
A signed-in user can browse, search and sort their projects (SCR-020), open one to see its details and
task statistics (SCR-021), create and edit projects in a dialog with the project-lead combobox (SCR-022),
delete a project to the trash and restore it from its page. Behavior:
[screens.md SCR-020…022](../04-web/screens.md#screens), [req-projects](../01-requirements/projects.md).
API: feat-prj-api. The project's task list comes in feat-tsk-web.

## Decisions
| # | Decision | Source |
| --- | --- | --- |
| D1 | New dependencies: `react-hook-form`, `zod`, `@hookform/resolvers`, `nuqs`, and the shadcn `sonner` component (installs `sonner`). | OQ-092 (owner, 2026-10-03) |
| D2 | Create → the new project's page + toast "Project created"; delete → the list + toast "Moved to trash". | OQ-093, OQ-086 (owner) |
| D3 | Lead combobox rules (≥ 2 chars search, "Use \"…\"", empty box suggests me, blur keeps typed text, clear). | OQ-078, OQ-089, SCR-022 (owner) |
| D4 | Errors from `apiClient` become an `ApiError` (`status`, Problem Details body) through `unwrap`/`unwrapVoid` in `lib/api/problem.ts`; `applyFieldErrors` maps `errors[]` to form fields. Every later domain uses these. | Agent: first instance (conventions *Forms*) |
| D5 | The lead value in forms is one `LeadValue` (`user` / `text` / `null`), converted to the API's two fields only in `leadToInput`. `features/users/lead.ts` holds it, shared with tasks. | Agent |
| D6 | `useProject` doesn't retry a `404` (not found or in the trash must show at once). | Agent: retry 1 would delay the state |
| D7 | Deleting or restoring a project also invalidates every `["tasks"]` query (its tasks disappear/reappear in task lists; the key is feat-tsk-web's `taskKeys.all`). | Agent: FR-PRJ-005 |
| D8 | Search boxes apply 300 ms after typing stops (`useDebouncedValue`) and reset `page` to 1; so do sort changes. List URL state uses nuqs with `history: "replace"`. | Agent: SCR-020, conventions *UI rules* |
| D9 | `TASK_STATUSES` and their labels live in `features/tasks/status.ts`, created here for the statistics card; feat-tsk-web reuses them. | Agent |
| D10 | The layout, classes and copy of the components are owner-approved; the lead field and label live in `features/users/components/`; the project page has no **Tasks** card yet. | Owner (2026-10-03) |
| D11 | `ProjectIcon`: a rounded-square gradient from an FNV-1a hash of the project id ; nothing stored. | Owner (2026-10-03) |
| D12 | A list row opens the project on click anywhere except its title link (which navigates itself) and while text is selected. | Owner (2026-10-03) |
| D13 | After a delete, the project page renders nothing and disables its query before navigating (`onDeleted`), so the trashed project isn't refetched and "in the trash" never flashes. | Agent: `removeQueries` on a mounted observer refetches |
| D14 | The API's counts use `inProgress`; the UI's status is `in-progress`. `taskCount(counts, status)` maps them; components never index `TaskCountsDto` by status. | Agent: contract |
| D15 | The dialog mounts its form only while open, so each opening starts from fresh `defaultValues` (no `reset`). | Owner (2026-10-03) |

## Scope
**In:** dependencies and providers (`NuqsAdapter`, `Toaster`); `lib/api/problem.ts`; `lib/use-debounced-value.ts`;
`features/projects/` (API hooks, form schema, components); `features/users/` additions (user search hook, lead
helpers, `ProjectLeadField`, `ProjectLeadLabel`); `features/tasks/status.ts`; the pages `/app/projects` and `/app/project`.

**Before the tests are written:** feat-prj-api is done (its `openapi.json`), feat-auth-web-session and
feat-shell-user-menu are done (`apiClient` with the token, `useMe`, `UserAvatar`). The test writer runs
`npm run api:types` so the new paths exist in `schema.d.ts`.

**Non-goals** (implementers must not touch these):
- `api/`. The task list section on the project page (no placeholder card either), task dialogs, `/app/tasks` and `/app/task` (feat-tsk-web).
- The trash page, permanent delete (M6). Logged time (OQ-080).
- `lib/api/client.ts`, `lib/auth/*`, `features/auth/*`, the shell (sidebar, header, drawer, footer).
- Existing files in `web/components/ui/*` (only `sonner.tsx` is added, by the CLI).

## Read first
| Path | Why / copy this |
| --- | --- |
| `specs/04-web/screens.md` (SCR-020, SCR-021, SCR-022) | Screen behavior, copy and states |
| `specs/03-api/endpoints.md#shared-project-and-task-shapes`, API-USR-003, API-PRJ-001…006 | Contract |
| `web/features/users/api.ts` | Query-key factory, `useQuery`/`useMutation` shape, `useMe` |
| `web/features/users/components/user-avatar.tsx` | Avatar for user leads |
| `web/lib/api/client.ts`, `web/lib/api/schema.d.ts` | `apiClient`, generated `paths`/`components` |
| `web/app/components/shared/view-id-guard.tsx`, `web/app/(dashboard-layout)/app/project/page.tsx` | The detail page shell |
| `web/components/ui/combobox.tsx`, `field.tsx`, `dialog.tsx`, `alert-dialog.tsx`, `table.tsx`, `pagination.tsx`, `progress.tsx`, `badge.tsx`, `select.tsx` | Base UI primitives (`render` prop, not `asChild`) |
| `web/lib/routes.ts` | Paths |

## Files
| App | File | C/M | Task | Notes |
| --- | --- | --- | --- | --- |
| web | `web/lib/api/problem.ac.test.ts` | C | tests | Acceptance tests |
| web | `web/features/projects/api.ac.test.tsx` | C | tests | Acceptance tests |
| web | `web/features/projects/stats.ac.test.ts` | C | tests | Acceptance tests |
| web | `web/features/users/lead.ac.test.ts` | C | tests | Acceptance tests |
| web | `web/features/users/components/project-lead-field.ac.test.tsx` | C | tests | Acceptance tests |
| web | `web/features/projects/components/project-form-dialog.ac.test.tsx` | C | tests | Acceptance tests |
| web | `web/features/projects/components/projects-list.ac.test.tsx` | C | tests | Acceptance tests |
| web | `web/features/projects/components/project-detail.ac.test.tsx` | C | tests | Acceptance tests |
| web | `web/lib/api/schema.d.ts` | M | tests | `npm run api:types` |
| web | `web/lib/api/problem.ts` | C | tests, T1 | Stub from the test writer |
| web | `web/features/projects/stats.ts` | C | tests, T1 | Stub from the test writer |
| web | `web/features/users/lead.ts` | C | tests, T1 | Stub from the test writer |
| web | `web/package.json`, `web/package-lock.json` | M | tests | `sonner` (shadcn CLI). Test writer: `npm install react-hook-form zod @hookform/resolvers nuqs` (the tests import them) |
| web | `web/components/ui/sonner.tsx` | C | tests | Created by the shadcn CLI |
| web | `web/app/layout.tsx` | M | tests, T1 | `<Toaster />`. T1: `NuqsAdapter` |
| web | `web/lib/use-debounced-value.ts` | C | tests | Final |
| web | `web/features/tasks/status.ts` | C | tests | Final (D9) |
| web | `web/features/users/api.ts` | M | T1 | `useUserSearch` |
| web | `web/features/projects/api.ts` | C | tests, T1 | Stub from the test writer (`projectKeys` real) |
| web | `web/features/users/components/project-lead-field.tsx` | C | tests, T2 | |
| web | `web/features/users/components/project-lead-label.tsx` | C | tests, T2 | |
| web | `web/features/projects/schemas.ts` | C | T2 | Replaces the dialog's hand-written `validate`/`toInput` |
| web | `web/features/projects/components/project-form-dialog.tsx` | C | tests, T2 | |
| web | `web/features/projects/components/projects-list.tsx` | C | tests, T3 | |
| web | `web/features/projects/components/project-detail.tsx` | C | tests, T3 | |
| web | `web/features/projects/components/project-task-stats.tsx` | C | tests, T3 | |
| web | `web/features/projects/components/task-status-badges.tsx` | C | tests, T3 | |
| web | `web/features/projects/components/project-icon.tsx` | C | tests | Final (D11) |
| web | `web/features/projects/components/delete-project-dialog.tsx` | C | tests, T3 | |
| web | `web/app/(dashboard-layout)/app/projects/page.tsx` | M | tests | Final |
| web | `web/app/(dashboard-layout)/app/project/page.tsx` | M | tests | Final |

## Interfaces

### Errors (T1)
```ts
// web/lib/api/problem.ts
export interface ProblemDetails {
  type: string; title: string; status: number; detail: string;
  errors?: { field: string; message: string }[];
  [extension: string]: unknown;               // e.g. projectId, projectInTrash (tasks)
}
export class ApiError extends Error {
  constructor(readonly status: number, readonly problem: ProblemDetails | null); // message = problem?.detail ?? `HTTP ${status}`
  /** The last path segment of `problem.type` ("not-found", "in-trash", "validation", …), or null. */
  get slug(): string | null;
}
/** openapi-fetch result → data; a non-2xx response → throws ApiError (body kept when it's Problem Details). */
export function unwrap<T>(result: { data?: T; error?: unknown; response: Response }): T;
/** For 204 endpoints: throws ApiError unless response.ok. */
export function unwrapVoid(result: { error?: unknown; response: Response }): void;
export function isApiError(e: unknown, status?: number, slug?: string): e is ApiError;
/** Sets a form error for each `errors[]` entry whose field is in `fieldMap` (API field → form field); returns true if any was set. */
export function applyFieldErrors<T extends FieldValues>(error: unknown, setError: UseFormSetError<T>, fieldMap: Partial<Record<string, Path<T>>>): boolean;
```
A thrown fetch error (network) passes through unchanged.

### Shared (T1)
```ts
// web/lib/use-debounced-value.ts
export function useDebouncedValue<T>(value: T, delayMs: number): T;

// web/features/tasks/status.ts
export const TASK_STATUSES = ["upcoming", "in-progress", "completed"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = { upcoming: "Upcoming", "in-progress": "In progress", completed: "Completed" };

// web/features/projects/stats.ts
export type TaskCounts = components["schemas"]["TaskCountsDto"];   // { upcoming, inProgress, completed, total }
/** 0 when total is 0; else Math.round(completed / total * 100) (OQ-085). */
export function completionPercent(counts: TaskCounts): number;
/** The count for a UI status ("in-progress" → counts.inProgress) (D14). */
export function taskCount(counts: TaskCounts, status: TaskStatus): number;
```
`app/layout.tsx`: inside `QueryProvider`, wrap `children` in `<NuqsAdapter>` (`nuqs/adapters/next/app`); `<Toaster />` stays.

### Lead (T1, T2)
```ts
// web/features/users/lead.ts (T1)
export type LeadUser = components["schemas"]["LeadUserDto"];   // { id, displayName, avatarUrl }
export type LeadValue = { kind: "user"; user: LeadUser } | { kind: "text"; name: string } | null;
export function fromProjectLead(lead: components["schemas"]["ProjectLeadDto"] | null): LeadValue;
export function leadFromMe(me: Me | undefined): LeadValue;        // undefined → null
export function leadToInput(value: LeadValue): { projectLeadUserId: string | null; projectLeadName: string | null }; // text trimmed; "" → both null
export function isHttpUrl(value: string): boolean;               // new URL() parses and protocol is http: or https:
export const LEAD_NAME_MAX = 100;

// web/features/users/api.ts (T1, add)
export type UserSummary = components["schemas"]["UserSummaryDto"];
// userKeys.search: (q: string) => [...userKeys.all, "search", q] as const
/** API-USR-003. Enabled only when q.trim().length >= 2; the key uses the trimmed q; staleTime 60 s. */
export function useUserSearch(q: string): UseQueryResult<UserSummary[]>;
```
```tsx
// web/features/users/components/project-lead-field.tsx (T2, "use client")
export function ProjectLeadField(props: {
  id?: string; value: LeadValue; onChange: (value: LeadValue) => void;
  invalid?: boolean; disabled?: boolean; "aria-describedby"?: string;
}): React.JSX.Element;

// web/features/users/components/project-lead-label.tsx (T2)
/** user → <UserAvatar className="h-6 w-6 text-xs" /> + name; text → the name; null → "—" (muted). */
export function ProjectLeadLabel(props: { lead: components["schemas"]["ProjectLeadDto"] | null }): React.JSX.Element;
```
`ProjectLeadField` uses the installed `Combobox` primitives (`filter={null}`, controlled `inputValue`) and searches with `useUserSearch`. Rules (SCR-022):
- The input shows the current value: a user lead as its name (with `UserAvatar size-5` before the input), a text lead as its text, `null` as empty with placeholder "Name or PM4 user". The open trigger shows only when there's no lead and no text; the clear button only when there is one.
- Typing changes only the input text. Options, by trimmed input length (while the text still equals the value's display, it counts as 0): **0** → the signed-in user (`useMe`) as a user option, its name followed by a muted "(me)"; **1** → only `Use "<text>"`; **≥ 2** → the users from `useUserSearch(useDebouncedValue(text, 300))` (avatar, name with "(me)" for the caller, email in muted text), then `Use "<text>"`. While the debounce is pending or the search is fetching: a "Searching…" row with a spinner above just `Use "<text>"`; no matches → just `Use "<text>"`.
- Picking a user → `onChange({ kind: "user", user })`; picking `Use "<text>"` → `onChange({ kind: "text", name: text })`.
- Closing (blur) with input text that differs from the value's display → `onChange` with a text lead (trimmed text) or `null` when empty.
- The clear button (`aria-label="Clear project lead"`) → `onChange(null)`.
- The text input has `maxLength` 101 so the form's 100-char rule can show its error.

### Data (T1)
```ts
// web/features/projects/api.ts
export type Project = components["schemas"]["ProjectResponseDto"];
export type ProjectList = components["schemas"]["ProjectListResponseDto"];
export const PROJECT_SORTS = ["updatedAt:desc", "createdAt:desc", "title:asc"] as const;   // the ones the UI offers
export type ProjectSort = (typeof PROJECT_SORTS)[number];
export interface ProjectListParams { q: string; sort: ProjectSort; page: number; pageSize: number }
export interface ProjectInput { title: string; description: string | null; externalLink: string | null; projectLeadUserId: string | null; projectLeadName: string | null }

export const projectKeys = {
  all: ["projects"] as const,
  lists: () => [...projectKeys.all, "list"] as const,
  list: (params: ProjectListParams) => [...projectKeys.lists(), params] as const,
  details: () => [...projectKeys.all, "detail"] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
};
export function useProjects(params: ProjectListParams): UseQueryResult<ProjectList, Error>;   // q "" omitted from the request; placeholderData: keepPreviousData
export function useProject(id: string, enabled?: boolean): UseQueryResult<Project, Error>;    // no retry on ApiError 404 (D6); enabled defaults to true (D13)
export function useCreateProject(): UseMutationResult<Project, Error, ProjectInput>;          // POST; onSuccess: setQueryData(detail), invalidate lists()
export function useUpdateProject(id: string): UseMutationResult<Project, Error, ProjectInput>; // PATCH (all fields); onSuccess: setQueryData(detail), invalidate lists()
export function useDeleteProject(): UseMutationResult<void, Error, string>;                  // DELETE; onSuccess: removeQueries(detail(id)), invalidate lists() and ["tasks"]
export function useRestoreProject(): UseMutationResult<void, Error, string>;                 // POST restore; onSuccess: invalidate detail(id), lists() and ["tasks"]
```
All requests go through `unwrap`/`unwrapVoid`, so failures are `ApiError`s.

### Form (T2)
```ts
// web/features/projects/schemas.ts
export const projectFormSchema = z.object({
  title: z.string().trim().min(1, "Enter a title.").max(200, "Use at most 200 characters."),
  description: z.string().max(2000, "Use at most 2000 characters."),
  externalLink: z.string().trim().max(500, "Use at most 500 characters.")
    .refine((v) => v === "" || isHttpUrl(v), "Enter a full link starting with http:// or https://."),
  lead: z.custom<LeadValue>().refine((v) => v?.kind !== "text" || v.name.trim().length <= LEAD_NAME_MAX, "Use at most 100 characters."),
});
export type ProjectFormValues = z.input<typeof projectFormSchema>;
export function projectFormDefaults(project: Project | undefined, me: Me | undefined): ProjectFormValues; // create: lead = leadFromMe(me)
export function toProjectInput(values: ProjectFormValues): ProjectInput;  // "" → null; lead via leadToInput
export const PROJECT_FIELD_MAP = { title: "title", description: "description", externalLink: "externalLink", projectLeadUserId: "lead", projectLeadName: "lead" } as const;
```
```tsx
// web/features/projects/components/project-form-dialog.tsx ("use client")
export function ProjectFormDialog(props: { open: boolean; onOpenChange: (open: boolean) => void; project?: Project }): React.JSX.Element;
```
react-hook-form + `zodResolver(projectFormSchema)`, the `Field`/`FieldLabel`/`FieldError` components, `Controller` for the lead.
`ProjectFormDialog` renders the inner form only while `open` (D15), and the form calls
`useForm({ resolver, defaultValues: projectFormDefaults(project, me) })`; field ids, labels, `autoFocus` on Title and
the `https://` placeholder stay as they are. Submit (button disabled and labelled "Creating…"/"Saving…" while pending):
create → `toast.success("Project created")`, close, `router.push(\`${routes.app.project}?id=${id}\`)`; edit → close.
Failure: `applyFieldErrors(error, setError, PROJECT_FIELD_MAP)`; if nothing was mapped → `toast.error("Couldn't save the project.")`. The dialog stays open on failure.

### Pages and components (T3)
```tsx
// web/features/projects/components/projects-list.tsx ("use client")
export function ProjectsList(): React.JSX.Element;
// URL: useQueryStates({ q: parseAsString.withDefault(""), sort: parseAsStringLiteral(PROJECT_SORTS).withDefault("updatedAt:desc"), page: parseAsInteger.withDefault(1) }, { history: "replace" })

// web/features/projects/components/project-detail.tsx ("use client")
export function ProjectDetail(): React.JSX.Element;   // reads ?id= (nuqs useQueryState("id"))

// web/features/projects/components/project-task-stats.tsx
export function ProjectTaskStats(props: { counts: TaskCounts }): React.JSX.Element;

// web/features/projects/components/delete-project-dialog.tsx
export function DeleteProjectDialog(props: { project: Project; open: boolean; onOpenChange: (open: boolean) => void; onDeleted?: () => void }): React.JSX.Element;

// web/features/projects/components/task-status-badges.tsx
export const TASK_STATUS_BADGE: Record<TaskStatus, string>;   // upcoming chart-4, in-progress primary, completed chart-2
export function TaskStatusBadges(props: { counts: TaskCounts }): React.JSX.Element;

// web/features/projects/components/project-icon.tsx (final)
export function ProjectIcon(props: { project: { id: string }; className?: string }): React.JSX.Element;
```
The layout, classes and copy stay as they are (D10); the bullets below say what changes.
- `ProjectsList`: SCR-020. URL state is the nuqs `useQueryStates` above (`clearOnDefault`, so defaults stay out of the URL); rows come from `useProjects({ q, sort, page, pageSize: 25 })`; loading = `isPending`, error = `isError` (Retry → `refetch`). The search input keeps local text, and writes `q` (trimmed, and `page: 1`) from `useDebouncedValue(text, 300)`. Sort select labels: "Recently updated", "Recently created", "Title A–Z". Pagination (`pageSize` 25) only when `total > 25`, with Previous/Next and page links. Counts: three `Badge`s with `title` attributes naming the status (`TASK_STATUS_LABELS`); Completed: `<Progress value={percent} />` + `${percent} %`. "New project" opens `ProjectFormDialog`.
- `ProjectDetail`: SCR-021, the header (back link, icon, title, Edit/Delete), **Details** and **Statistics** cards, no **Tasks** card. `useProject(id, !leaving)`; `onDeleted` sets `leaving`, after which it renders `null` (D13). `ApiError` 404 slug `in-trash` → the trash state with **Restore** (`useRestoreProject`; failure → `toast.error("Couldn't restore the project.")`); other 404 → not found; other errors → error + **Retry** (`refetch`). Links: external link `target="_blank" rel="noopener noreferrer"`, "Back to projects" → `routes.app.projects`.
- `DeleteProjectDialog`: SCR-021's confirmation (`AlertDialog`); confirm → `useDeleteProject` (the Delete button disabled while pending) → on success `onDeleted?.()`, `router.push(routes.app.projects)`, `toast("Moved to trash")`; failure → `toast.error("Couldn't delete the project.")`, dialog stays.
- `TaskStatusBadges` and `ProjectTaskStats` read counts through `taskCount` (D14).
- Pages: `projects/page.tsx` → `<Suspense fallback={null}><ProjectsList /></Suspense>` (metadata title "Projects"); `project/page.tsx` keeps `ViewIdGuard` and renders `<ProjectDetail />` instead of the placeholder.

## Acceptance criteria
Tests mock `@/lib/api/client` (`apiClient.GET/POST/PATCH/DELETE`) and `next/navigation`, and wrap renders in a fresh `QueryClient` and nuqs's testing adapter.

| AC | Case → expected | Test | Task |
| --- | --- | --- | --- |
| AC-1 | `unwrap`: 2xx → data; 404 with `type …/errors/in-trash` → `ApiError` `status 404`, `slug "in-trash"`, `problem.detail`; 500 with a non-JSON body → `ApiError` `problem null`; `unwrapVoid` 204 → no throw | `web/lib/api/problem.ac.test.ts` | T1 |
| AC-2 | `applyFieldErrors` with `errors [{field:"title"},{field:"projectLeadName"},{field:"other"}]` and `PROJECT_FIELD_MAP` → `setError("title")`, `setError("lead")`, returns `true`; a non-`ApiError` → `false`, nothing set | `web/lib/api/problem.ac.test.ts` | T1 |
| AC-3 | `completionPercent`: `{completed 1,total 4}` → 25; `{2,3}` → 67; `{0,0}` → 0. `taskCount({upcoming 3, inProgress 1, completed 4, total 8}, "in-progress")` → 1 | `web/features/projects/stats.ac.test.ts` | T1 |
| AC-4 | `leadToInput`: user → `{projectLeadUserId: id, projectLeadName: null}`; text `" Ana "` → `{null, "Ana"}`; text `"  "` and `null` → both `null`. `fromProjectLead` round-trips user and text leads; `isHttpUrl`: `https://x.dev/a` true, `ftp://x`, `x.dev` false | `web/features/users/lead.ac.test.ts` | T1 |
| AC-5 | `useProjects({q:"",sort:"title:asc",page:2,pageSize:25})` → `GET /api/v1/projects` with query `{sort, page, pageSize}` and no `q`; `useProject` on a 404 → error after one request (no retry) | `web/features/projects/api.ac.test.tsx` | T1 |
| AC-6 | `useCreateProject` success → detail cache set, `projectKeys.lists()` invalidated; `useDeleteProject("p1")` → detail `p1` removed, lists and `["tasks"]` invalidated; `useRestoreProject` → detail, lists and `["tasks"]` invalidated | `web/features/projects/api.ac.test.tsx` | T1 |
| AC-7 | `ProjectLeadField`: empty input → one option, the signed-in user, with "(me)"; typing `a` → only `Use "a"`; typing `an` → after 300 ms one search request `q=an`, options: the users (name and email), then `Use "an"` | `web/features/users/components/project-lead-field.ac.test.tsx` | T2 |
| AC-8 | Picking a user → `onChange({kind:"user", user})`; picking `Use "an"` → text lead; blur with typed `Bob` → `onChange({kind:"text", name:"Bob"})`; blur with the input cleared → `onChange(null)`; the clear button → `onChange(null)`; a user value shows its name in the input | `web/features/users/components/project-lead-field.ac.test.tsx` | T2 |
| AC-9 | `ProjectFormDialog` create: opens with the lead = me; empty title → "Enter a title." and no request; link `x.dev` → the link error; valid submit → `POST` body `{title, description:null, externalLink:null, projectLeadUserId: me.id, projectLeadName:null}`, then toast "Project created" and `router.push("/app/project?id=<new id>")` | `web/features/projects/components/project-form-dialog.ac.test.tsx` | T2 |
| AC-10 | Edit: opens with the project's values (text lead shown as text); clearing the lead and saving → `PATCH` with both lead fields `null`; a `400` with `errors [{field:"projectLeadUserId"}]` → the error under Project lead, dialog open; a `500` → toast "Couldn't save the project.", dialog open; the submit button is disabled while pending | `web/features/projects/components/project-form-dialog.ac.test.tsx` | T2 |
| AC-11 | `ProjectsList`: rows show title (link `/app/project?id=…`), lead (`ProjectLeadLabel`), the three counts and `25 %`; clicking a row outside the link → `router.push("/app/project?id=…")`; no projects → "No projects yet" with **New project**; `q` set and no items → "No projects match your search"; error → "Couldn't load projects." and Retry refetches | `web/features/projects/components/projects-list.ac.test.tsx` | T3 |
| AC-12 | Typing `web` → one request with `q=web` after 300 ms and `page` back to 1; choosing "Title A–Z" → `sort=title:asc`, `page` 1; `total 30` → pagination shown, Next → `page=2`; `total 10` → no pagination | `web/features/projects/components/projects-list.ac.test.tsx` | T3 |
| AC-13 | `ProjectDetail` (`?id=p1`): shows title, description, the link with `target="_blank"` and `rel="noopener noreferrer"`, the lead, and stats Upcoming 3 / In progress 1 / Completed 4 / Total 8 / `50 %` | `web/features/projects/components/project-detail.ac.test.tsx` | T3 |
| AC-14 | 404 `not-found` → "Project not found" + "Back to projects" (`/app/projects`); 404 `in-trash` → "This project is in the trash" + Restore → `POST /api/v1/projects/p1/restore`, then the project shows; 500 → "Couldn't load the project." + Retry | `web/features/projects/components/project-detail.ac.test.tsx` | T3 |
| AC-15 | Delete → the confirmation text from SCR-021; Cancel → no request; Delete → `DELETE /api/v1/projects/p1`, toast "Moved to trash", `router.push("/app/projects")`, and no further `GET /api/v1/projects/p1` (D13) | `web/features/projects/components/project-detail.ac.test.tsx` | T3 |
| AC-16 | `npm run build` succeeds and `web/out/app/projects.html` and `web/out/app/project.html` exist | `check` | T3 |
| AC-17 | Signed in locally against the API: create a project with lead = me, see it in the list with 0 %, edit its lead to another user via search, delete it (lands on the list with the toast), open its old URL → in the trash → Restore | `manual` | T3 |

Typed stubs (created with the tests, so lint and typecheck pass while the tests fail): each listed
signature from *Interfaces* in `lib/api/problem.ts`, `features/projects/stats.ts`, `features/users/lead.ts`,
`features/projects/api.ts` (`projectKeys` and the types real), each body
`throw new Error("not implemented (feat-prj-web)")`. The component tests fail until T2 and T3 connect the
components to the hooks.

## Checks
```bash
# AC-16: the static export still has both project pages
cd web && npm run build >/dev/null && test -f out/app/projects.html && test -f out/app/project.html
```

## Tasks
| # | Task | App | Size | Tier | Why this tier | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | Dependencies, providers, API error helpers, project and user-search hooks, lead helpers | web | M | opus | First `ApiError`/`unwrap`/`applyFieldErrors` and first domain mutations with invalidations; new deps | — (feat-prj-api and T-0021 done) |
| T2 | `ProjectLeadField`, `ProjectLeadLabel` and the project create/edit dialog | web | M | opus | First form (rhf + zod + API field errors) and a non-trivial combobox, both reused by tasks | T1 |
| T3 | Projects list page and project detail page (stats, delete, restore, not found) | web | M | sonnet | Connects the components to T1's hooks; layout, behavior and copy fully stated | T2 |

## Open questions
None. OQ-076…OQ-078, OQ-083, OQ-085, OQ-086, OQ-089, OQ-090, OQ-092 and OQ-093 are resolved.

## Changelog
- 2026-10-03: Initial draft.
- 2026-10-03: Approved by the owner.
- 2026-10-04: Owner layout review (D10–D15): project icon, status badges, clickable rows, `taskCount`, no refetch after delete, no Tasks card. Back to `review`.
- 2026-10-04: Approved by the owner.
