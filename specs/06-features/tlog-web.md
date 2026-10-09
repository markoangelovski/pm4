---
id: feat-tlog-web
title: "Time logging web: the Logs day view, the log dialog, charts and settings"
status: approved
owner: Marko Angelovski
last_updated: 2026-10-09
milestone: M4
requirements: [FR-TLOG-001, FR-TLOG-002, FR-TLOG-003, FR-TLOG-004, FR-TLOG-006, FR-TLOG-008, FR-TLOG-009, FR-TLOG-010, FR-TLOG-011, FR-TLOG-014, FR-TLOG-015, FR-TLOG-016, FR-TLOG-017, FR-TLOG-018, SCR-040, SCR-041, SCR-042, SCR-043, SCR-050]
related: [req-time-logs, web-screens, web-routing, web-conventions, ADR-0009, feat-tlog-api, feat-tsk-web, OQ-103, OQ-104, OQ-105, OQ-107, OQ-108, OQ-109, OQ-110, OQ-111, OQ-112, OQ-113, OQ-114, OQ-115, OQ-116, OQ-117, OQ-118, OQ-119, OQ-120, OQ-121]
---

# Time logging web: the Logs day view, the log dialog, charts and settings

## Goal
A signed-in user logs time from a dialog (also from the header on any screen), sees a day on `/app/time` with its header
(start, logged, start + logged, % billable, overtime, now, unlogged), charts and logs in three views, browses past days with a
calendar, edits and deletes logs, and sets the daily target and time zone in Settings.
Behavior: [screens.md](../04-web/screens.md) SCR-040…043, SCR-050 and [req-time-logs](../01-requirements/time-logs.md). API: feat-tlog-api.
Patterns: feat-tsk-web.

## Decisions
| # | Decision | Source |
| --- | --- | --- |
| D1 | The pure logic is plain functions, final before the implementation (test step): `parseDurationInput`, `formatClock`, `roundToQuarter`, `nowMinute`, `dayFigures`, `groupLogs`, `rowFields`, `pieSlices`, `barBars`. | Agent: as `dueState` in feat-tsk-web |
| D2 | The day is fetched with one `useDay(date)` (`GET /workdays/{date}`); the log dialog reuses it to learn whether the chosen date has a start (shows *Day started at*). | OQ-103 (owner) |
| D3 | Every log mutation (create, update, delete) invalidates `timeKeys.all`; setting the start invalidates `timeKeys.day(date)` and every `workdays` query. | Agent |
| D4 | "Now" = `nowMinute(me.timeZone)`, re-read every 15 s by `useNowMinute`, only when the viewed date is today. | OQ-112 (owner) |
| D5 | `view` ∈ `project` (default, omitted from the URL), `task`, `sequential`; `date` omitted when today. Invalid or future `date` → today. | OQ-113, OQ-120 (owner) |
| D6 | The calendar loads `useWorkdays(monthRange(visibleMonth))` and marks the dates whose `totalMinutes` > 0 with a dot. | OQ-113 (owner) |
| D7 | The dialog's pickers load once and filter in the browser: projects with `useProjects` (100, A–Z), tasks with `useTasks` (100, every status, `title:asc`, `projectId` when a project is chosen), listed A–Z by "Project · Task". | OQ-116, OQ-118 (owner) |
| D8 | After the day view's dialog saves a log for another date, the view moves to that date; the header's dialog doesn't navigate. | Agent |
| D9 | Editing sends `projectId` and `taskId` only when the project or task picker changed, so a link to a purged item survives an edit. | endpoints.md *Link input* |
| D10 | Settings is a tabbed page (`?tab=`) with one section, **User settings**; the daily target is entered in hours (0.25 steps), the time zone with a select. | OQ-115 (owner) |
| D11 | Log colours come from a fixed palette by the log's position in the day; the row dot and the pie slice share it. | OQ-121 (owner) |

## Scope
**In:** `features/time/` (helpers, types, hooks, schema, components); the pages `/app/time` and `/app/settings`; `features/settings/`;
the header **Log time** button; `useUpdateMe`.

**Before the tests are written:** feat-tlog-api is done (its `openapi.json`). The test writer runs `npm run api:types`.

**Non-goals** (implementers must not touch these):
- `api/`. The dashboard, reports, bookings and the trash page. The logged time on the project and task pages and lists (a later feature).
- The sidebar (`layout/vertical/sidebar/*`), `lib/routes.ts`.
- `lib/api/*` (except the generated `schema.d.ts`), `lib/auth/*`, `web/components/ui/*` (add shadcn components only with the CLI, if one is missing).
- `parseDuration` / `formatDuration` in `lib/time/index.ts` stay as they are (the new parser lives in `features/time/duration.ts`).

## Read first
| Path | Why / copy this |
| --- | --- |
| `specs/04-web/screens.md` (SCR-040…043, SCR-050) | Screen behavior and copy |
| `specs/03-api/endpoints.md#shared-time-capture-shapes`, API-WD-001…003, API-TLOG-002/004/006, API-USR-002 | Contract |
| `web/features/tasks/api.ts` | Hooks, keys, `unwrap`, invalidations to copy; `useTasks` for the task picker |
| `web/features/tasks/schemas.ts`, `web/features/tasks/components/task-form-dialog.tsx` | The form/dialog pattern (`applyFieldErrors`, submit errors, mounts only while open) |
| `web/features/tasks/components/project-picker.tsx`, `due-date-field.tsx` | Project combobox, date picker in a popover |
| `web/features/tasks/components/tasks-list.tsx`, `delete-task-dialog.tsx` | States (loading, error + Retry), delete dialog |
| `web/features/users/api.ts`, `web/features/users/components/user-profile.tsx` | `useMe`, `userKeys`, a read-only screen's states |
| `web/features/projects/components/project-icon.tsx` | The gradient icon (also used with a task id) |
| `web/lib/time/index.ts`, `web/lib/api/problem.ts` | `today`, `monthRange`, `formatDuration`, `formatWorkDate`; `applyFieldErrors`, `isApiError` |
| `web/components/ui/chart.tsx`, `calendar.tsx`, `tabs.tsx`, `accordion.tsx`, `empty.tsx`, `combobox.tsx` | Chart container, calendar, line tabs, groups, empty state, pickers |
| `web/app/(dashboard-layout)/layout/vertical/header/index.tsx` | The disabled **Log time** button to replace |

## Files
| App | File | C/M | Task | Notes |
| --- | --- | --- | --- | --- |
| web | `web/features/time/duration.ac.test.ts` | C | tests | Acceptance tests |
| web | `web/features/time/day.ac.test.ts` | C | tests | Acceptance tests |
| web | `web/features/time/api.ac.test.tsx` | C | tests | Acceptance tests |
| web | `web/features/time/components/log-form-dialog.ac.test.tsx` | C | tests | Acceptance tests |
| web | `web/features/time/components/day-view.ac.test.tsx` | C | tests | Acceptance tests |
| web | `web/features/settings/components/user-settings.ac.test.tsx` | C | tests | Acceptance tests |
| web | `web/lib/api/schema.d.ts` | M | tests | `npm run api:types` |
| web | `web/features/time/types.ts` | C | tests | Types from the schema, final |
| web | `web/features/time/duration.ts` | C | tests | `parseDurationInput`, final (D1) |
| web | `web/features/time/day.ts` | C | tests | Pure day logic, final (D1) |
| web | `web/lib/time/clock.ts` | C | tests | `formatClock`, `roundToQuarter`, `nowMinute`, final (D1) |
| web | `web/features/time/api.ts` | C | tests, T1 | Stub from the test writer (`timeKeys` real) |
| web | `web/features/users/api.ts` | M | T1 | `useUpdateMe` |
| web | `web/features/time/schemas.ts` | C | T2 | Log form schema |
| web | `web/features/time/components/log-form-dialog.tsx` | C | tests, T2 | SCR-041 |
| web | `web/features/time/components/date-field.tsx` | C | T2 | Date picker, future disabled |
| web | `web/features/time/components/log-project-picker.tsx` | C | T2 | D7 |
| web | `web/features/time/components/task-picker.tsx` | C | T2 | D7 |
| web | `web/features/time/components/log-time-button.tsx` | C | T2 | Header button + its own dialog state |
| web | `web/app/(dashboard-layout)/layout/vertical/header/index.tsx` | M | T2 | Renders `LogTimeButton` |
| web | `web/features/time/components/day-view.tsx` | C | tests, T3 | SCR-040 |
| web | `web/features/time/components/day-header.tsx` | C | T3 | The figures, editable start |
| web | `web/features/time/components/day-picker.tsx` | C | T3 | Prev / calendar / next / Today |
| web | `web/features/time/components/day-charts.tsx` | C | T3 | SCR-043 |
| web | `web/features/time/components/log-row.tsx` | C | T3 | SCR-042 |
| web | `web/features/time/components/delete-log-dialog.tsx` | C | T3 | |
| web | `web/app/(dashboard-layout)/app/time/page.tsx` | M | T3 | Renders `DayView` |
| web | `web/features/settings/components/settings-view.tsx` | C | T4 | Tabs |
| web | `web/features/settings/components/user-settings.tsx` | C | tests, T4 | SCR-050 |
| web | `web/app/(dashboard-layout)/app/settings/page.tsx` | M | T4 | Renders `SettingsView` |

## Interfaces

### Types and pure logic (final in the test step, D1)
```ts
// web/features/time/types.ts
export type TimeLog = components["schemas"]["TimeLogResponseDto"];   // { id, workDate, durationMinutes, text, title, project: Ref | null, task: Ref | null, excludeFromStats }
export type Ref = NonNullable<TimeLog["project"]>;                     // { id: string | null; title: string; deleted: boolean }
export type Day = components["schemas"]["DayResponseDto"];
export type ProjectRef = { id: string; title: string };
export type TaskRef = { id: string; title: string; project: ProjectRef };
export interface TimeLogInput { workDate: string; durationMinutes: number; text: string; title: string | null;
  excludeFromStats: boolean; projectId?: string | null; taskId?: string | null; dayStartMinute?: number }
export type DayView = "project" | "task" | "sequential";

// web/features/time/duration.ts
export type DurationParse = { ok: true; minutes: number } | { ok: false; error: string };
/** FR-TLOG-010 table. Error text: "Use 15-minute steps, from 15 min to 24 h." for every failure (empty → "Enter a duration."). */
export function parseDurationInput(value: string): DurationParse;

// web/lib/time/clock.ts
export function formatClock(minute: number): string;              // 540 → "09:00"; 1530 → "01:30 (+1 day)"; < 1440 has no suffix
export function roundToQuarter(minute: number): number;            // nearest 15, capped at 1425
export function nowMinute(tz: string): number;                     // minutes since midnight now in tz

// web/features/time/day.ts
export interface DayFigures { start: string | null; logged: number; startPlusLogged: string | null; unlogged: number | null;
  billable: number; percentBillable: number; overtime: number }
/** logged = all logs; billable = logs without excludeFromStats; percentBillable = round(billable / target × 100) (0 when target is 0);
 *  overtime = max(0, billable − target); unlogged only when nowMinute !== null (today), start set, and nowMinute − (start + logged) > 0. */
export function dayFigures(startMinute: number | null, logs: TimeLog[], nowMinute: number | null, targetMinutes: number): DayFigures;
export interface LogGroup { key: string; project: string | null; task: string | null; totalMinutes: number; logs: TimeLog[] }
/** First-appearance order of the project (or task) ref; then key "unsorted" (no ref, not excluded); then key "nonprod" (excludeFromStats,
 *  whatever the ref). A group's key is ref.id ?? `deleted:${title}`; for by "task", `project` is the log's project title. */
export function groupLogs(logs: TimeLog[], by: "project" | "task"): LogGroup[];
/** What a row shows (FR-TLOG-003/015): sequential → all; else title = !log[view], project = group is "unsorted" or "nonprod",
 *  task = view === "project" || group is "nonprod". */
export function rowFields(log: TimeLog, view: DayView, groupKey: string | null): { title: boolean; project: boolean; task: boolean };
export interface PieSlice { key: string; label: string; minutes: number; kind: "log" | "remaining" }
/** One slice per log in order (key = log id, label = [project, task, text] present parts joined by " - "),
 *  then { key "remaining", label "Remaining" } of target − all logged when positive. */
export function pieSlices(logs: TimeLog[], targetMinutes: number): PieSlice[];
export interface Bar { key: string; label: string; minutes: number }
/** One bar per groupLogs(logs, by) group: "Project · Task" for by "task", the project for by "project", "Unsorted", "Non-prod". */
export function barBars(logs: TimeLog[], by: "project" | "task"): Bar[];
```

### Data (T1)
```ts
// web/features/time/api.ts (re-exports the types)
export const timeKeys = {
  all: ["time"] as const,
  days: () => [...timeKeys.all, "day"] as const,
  day: (date: string) => [...timeKeys.days(), date] as const,
  workdays: () => [...timeKeys.all, "workdays"] as const,
  workdayRange: (from: string, to: string) => [...timeKeys.workdays(), from, to] as const,
};
export function useDay(date: string): UseQueryResult<Day, Error>;                                          // API-WD-003
export function useWorkdays(from: string, to: string): UseQueryResult<{ items: { workDate: string; startMinute: number; totalMinutes: number }[] }, Error>; // API-WD-001, keepPreviousData
export function useCreateLog(): UseMutationResult<TimeLog, Error, TimeLogInput>;                           // API-TLOG-002, D3
export function useUpdateLog(id: string): UseMutationResult<TimeLog, Error, TimeLogInput>;                 // API-TLOG-004, D3; sends projectId/taskId only when present in the input (D9)
export function useDeleteLog(): UseMutationResult<void, Error, TimeLog>;                                   // API-TLOG-006, D3
export function useSetDayStart(date: string): UseMutationResult<void, Error, number>;                      // API-WD-002, then invalidate day(date) and workdays()
export function useNowMinute(tz: string, enabled: boolean): number | null;                                 // D4; null when !enabled
// web/features/users/api.ts: useUpdateMe(): UseMutationResult<Me, Error, { timeZone?: string; dailyTargetMinutes?: number }> — PATCH /me, setQueryData(userKeys.me()).
```

### Log dialog (T2)
```ts
// web/features/time/schemas.ts
export const logFormSchema = z.object({
  date: z.string(),                                  // YYYY-MM-DD, not after today (message "Pick today or an earlier date.", checked on submit)
  dayStart: z.number().nullable(),                   // required (message "Enter when you started working.") only while the date has no start, checked on submit
  text: z.string().trim().min(1, "Describe what you worked on.").max(1000),
  duration: z.string(),                              // superRefine with parseDurationInput (its error text)
  title: z.string().trim().max(100),
  project: z.custom<ProjectRef | null>(),
  task: z.custom<TaskRef | null>(),
  excludeFromStats: z.boolean(),
});
export type LogFormValues = z.infer<typeof logFormSchema>;
/** Edit: the log's values (duration as formatDuration, e.g. "1h 15m"; project/task only when their id is set). Create: empty, unchecked. dayStart = nowQuarter. */
export function logFormDefaults(log: TimeLog | undefined, date: string, nowQuarter: number | null): LogFormValues;
/** projectId = task?.project.id ?? project?.id ?? null, taskId = task?.id ?? null — both omitted when !linkChanged (D9); dayStartMinute only when needsDayStart. */
export function toLogInput(values: LogFormValues, needsDayStart: boolean, linkChanged: boolean): TimeLogInput;
export const LOG_FIELD_MAP = { workDate: "date", dayStartMinute: "dayStart", text: "text", durationMinutes: "duration", title: "title",
  projectId: "project", taskId: "task", excludeFromStats: "excludeFromStats" } as const;
```
```tsx
// web/features/time/components/log-form-dialog.tsx (mounts its form only while open)
export const START_OPTIONS: { value: number; label: string }[];   // 96 options, 0…1425, label formatClock(value); also used by DayHeader
export function LogFormDialog(props: { open: boolean; onOpenChange: (open: boolean) => void; log?: TimeLog; defaultDate: string; onSaved?: (date: string) => void }): React.JSX.Element;
// web/features/time/components/date-field.tsx
export function DateField(props: { id?: string; value: string; onChange: (date: string) => void; max: string; invalid?: boolean }): React.JSX.Element;
// web/features/time/components/log-project-picker.tsx — copies ProjectPicker (icon in the box and options, "No projects found") without "All projects"
export function LogProjectPicker(props: { id?: string; value: ProjectRef | null; onChange: (p: ProjectRef | null) => void; disabled?: boolean }): React.JSX.Element;
// web/features/time/components/task-picker.tsx — D7; label `${project.title} · ${title}`, the project part dimmed in the options
export function TaskPicker(props: { id?: string; value: TaskRef | null; onChange: (t: TaskRef | null) => void; projectId: string | null }): React.JSX.Element;
// web/features/time/components/log-time-button.tsx: outline, small, clock icon, label hidden below `sm`; opens LogFormDialog with defaultDate = today(me.timeZone), no onSaved.
export function LogTimeButton(): React.JSX.Element;
```
- Layout, order and copy: SCR-041. `useDay(values.date)` decides `needsDayStart = data.startMinute === null` (the field shows only then; while the day is
  loading it is hidden and submit waits). Changing the date clears the date and day-start errors and sets `dayStart` to `roundToQuarter(nowMinute(tz))`
  for today, else `null`. The **Duration** box shows `= formatDuration(minutes)` under it when valid and there is no error.
- Pickers: choosing a task sets `project = task.project` (the project picker is then disabled and shows the task's project); choosing a project that
  differs from the task's clears the task; clearing the project clears the task. Edit starts with the log's own project and task.
- Submit with `useCreateLog` / `useUpdateLog(log.id)` (`mutateAsync`): create → `toast.success("Log added")`; edit → `toast.success("Log saved")`; then close
  and `onSaved(values.date)`. Failure → `applyFieldErrors(error, setError, LOG_FIELD_MAP)`; a `404` (the task or project was deleted meanwhile) →
  `setError("task", { message: "This item no longer exists." })`; else `toast.error("Couldn't save the log.")`. The dialog stays open on any failure.

### Day view (T3)
```tsx
// web/features/time/components/day-view.tsx (reads ?date=&view= with nuqs useQueryStates, history "replace", clearOnDefault)
export function DayView(): React.JSX.Element;
export function DayHeader(props: { day: Day; isToday: boolean; timeZone: string; targetMinutes: number }): React.JSX.Element; // figures via dayFigures; Start: <Select items={START_OPTIONS}> → useSetDayStart(day.workDate).mutate(minute), toast.error("Couldn't save the start time.") on failure
export function DayPicker(props: { date: string; today: string; timeZone: string; onChange: (date: string) => void }): React.JSX.Element; // D6
export function DayCharts(props: { logs: TimeLog[]; targetMinutes: number; by: "project" | "task" }): React.JSX.Element; // SCR-043; ChartContainer + recharts PieChart / BarChart; Remaining `var(--muted)`, Unsorted/Non-prod bars `var(--muted-foreground)`, other bars `var(--chart-2)`
export function logColors(logs: TimeLog[]): Record<string, string>;  // D11: log id → colour; palette oklch(L 0.15 H), H cycling [250,160,25,320,85,205,355,120], L [0.68,0.55,0.8] per cycle
export function LogRow(props: { log: TimeLog; color?: string; nested?: boolean; show?: { title: boolean; project: boolean; task: boolean } }): React.JSX.Element; // SCR-042; `show` from rowFields, default all
export function DeleteLogDialog(props: { log: TimeLog; open: boolean; onOpenChange: (open: boolean) => void }): React.JSX.Element; // SCR-042 copy; useDeleteLog, toast "Log deleted", failure → toast.error("Couldn't delete the log.")
```
- `DayView`: `today = today(me.timeZone)`; `date = valid && ≤ today ? param : today`; `useMe` + `useDay(date)`; `isError` → "Couldn't load the day." + **Retry**;
  pending → skeletons; else, in order: the heading with **Log time**, `DayPicker`, `DayHeader`, then the two columns: the logs (empty state, or the tabs with the
  expand/collapse button and the views) and `DayCharts` (`by` = `task` for `view=task`, else `project`). Grouped views: `<Accordion multiple>` with the
  `groupLogs` groups, open keys held per view in state; each row gets `show={rowFields(log, view, group.key)}` and `color={logColors(day.logs)[log.id]}`.
  `LogFormDialog` from the heading or the empty state has `defaultDate = date` and `onSaved = setDate` (D8). A row's **Edit** opens its own `LogFormDialog`.
- The page `time/page.tsx` renders `<DayView />` in `Suspense`, with `metadata.title` "Logs".

### Settings (T4)
```tsx
// web/features/settings/components/settings-view.tsx — SECTIONS = [{ id: "user", label: "User settings", icon: UserRound, content: <UserSettings /> }];
// `?tab=` with parseAsStringLiteral(ids).withDefault(first), history "replace", clearOnDefault; <Tabs orientation="vertical"> with line tabs
export function SettingsView(): React.JSX.Element;
// web/features/settings/components/user-settings.tsx — SCR-050; useMe; local state for hours (string) and zone; valid = 0.25 ≤ n ≤ 24 and n × 4 is an integer
export function UserSettings(): React.JSX.Element;   // Save → useUpdateMe().mutateAsync({ only changed fields; dailyTargetMinutes = n × 60 }), toast "Settings saved"; failure → toast.error("Couldn't save the settings.")
```
The page `settings/page.tsx` renders `<SettingsView />` in `Suspense`, with `metadata.title` "Settings".

## Acceptance criteria
Tests mock `@/lib/api/client`, `next/navigation` and `useMe` (time zone `Europe/Zagreb`, `dailyTargetMinutes` 420), wrap in `NuqsTestingAdapter`, and use fake
timers (2026-10-07 09:17 in Zagreb). "The owner's logs": "Specs review" 30 min (project Manhatan, task Specifications 01), "Specs audit" 1 h 45 min
(Manhatan, Specifications 02), "Chat with coworker" 15 min (no link), "Commute" 1 h (Manhatan, excluded from statistics).

| AC | Case → expected | Test | Task |
| --- | --- | --- | --- |
| AC-1 | `parseDurationInput`: `0.25`→15, `0,25`→15, `15`→15, `1`→60, `8`→480, `1.5`→90, `45`→45, `90`→90, `1h`→60, `1h 15m`→75, `45m`→45, `1:15`→75, `24h`→1440 | `web/features/time/duration.ac.test.ts` | tests |
| AC-2 | `parseDurationInput` errors (the 15-minute message): `20`, `0.3`, `0`, `0h`, `25h`, `1441`, `abc`, `-15`; `""` → "Enter a duration." | `web/features/time/duration.ac.test.ts` | tests |
| AC-3 | `formatClock(540)` "09:00", `formatClock(0)` "00:00", `formatClock(1530)` "01:30 (+1 day)"; `roundToQuarter(538)` 540, `roundToQuarter(1438)` 1425, `roundToQuarter(547)` 540, `roundToQuarter(548)` 555 | `web/features/time/day.ac.test.ts` | tests |
| AC-4 | `dayFigures(480, [1h], 557, 420)` → start "08:00", logged 60, startPlusLogged "09:00", unlogged 17; `nowMinute` null → unlogged null; start null → start, startPlusLogged null; now before start+logged → unlogged null; the owner's logs, target 420 → logged 210, billable 150, percentBillable 36, overtime 0; 8 h 15 min with 1 h excluded, target 420 → percentBillable 104, overtime 15 | `web/features/time/day.ac.test.ts` | tests |
| AC-5 | `groupLogs` of the owner's logs: by project → "Manhatan" (135 min, 2 logs), "unsorted" (15), "nonprod" (60); by task → "Specifications 01" (30, project "Manhatan"), "Specifications 02" (105), "unsorted" (15), "nonprod" (60); a project-only log is unsorted by task; first-appearance order; a purged ref (`id: null`) groups by its title | `web/features/time/day.ac.test.ts` | tests |
| AC-6 | `rowFields`: sequential → all true; project view, a Manhatan group row → title false, project false, task true; unsorted → title true, project true; nonprod row with a project → title false, project true, task true; task view, a task group row → all false; an unsorted project-only row → title true, project true, task false | `web/features/time/day.ac.test.ts` | tests |
| AC-7 | `pieSlices` with target 420 and the owner's logs → four log slices (labels "Manhatan - Specifications 01 - Specs review", …, "Chat with coworker", "Manhatan - Commute") and a remaining slice of 210; with 480 logged → no remaining slice; `barBars` by project → Manhatan 135, Unsorted 15, Non-prod 60; by task → "Manhatan · Specifications 01" 30, … | `web/features/time/day.ac.test.ts` | tests |
| AC-8 | `useDay`/`useWorkdays` call the right URLs and params; log mutations invalidate `timeKeys.all` (D3); `useSetDayStart` invalidates the day and the workdays; `useUpdateLog` without `projectId`/`taskId` in the input sends neither; `useUpdateMe` PATCHes and updates the `me` cache | `web/features/time/api.ac.test.tsx` | T1 |
| AC-9 | Log dialog, a date without a start (`day.startMinute null`): *Day started at* shown, prefilled `09:15` (now 09:17 rounds to the nearest quarter); a past date → empty; submit without it → "Enter when you started working."; a date with a start → no such field and no `dayStartMinute` sent | `web/features/time/components/log-form-dialog.ac.test.tsx` | T2 |
| AC-10 | Validation: empty text → "Describe what you worked on."; duration `20` → the 15-minute message; both block the request; valid `1h 15m` + text → `POST /time-logs` with `durationMinutes 75`, `title null`, `projectId null`, `taskId null`, `excludeFromStats false`, toast "Log added", dialog closed; ticking *Exclude from statistics* sends `true` | `web/features/time/components/log-form-dialog.ac.test.tsx` | T2 |
| AC-11 | Picking the task "Manhatan · Specifications 01" fills and disables the project and sends both ids; clearing the task enables the project again; clearing the project clears the task; picking a project requests tasks with its `projectId`; typing "manh" in the task picker lists Manhatan's tasks; the task request has no `status` filter | `web/features/time/components/log-form-dialog.ac.test.tsx` | T2 |
| AC-12 | A `400` with `dayStartMinute` / `text` / `durationMinutes` field errors shows them under the fields; a `404` → "This item no longer exists." under Task; any other failure → toast "Couldn't save the log." and the dialog stays | `web/features/time/components/log-form-dialog.ac.test.tsx` | T2 |
| AC-13 | Edit mode starts with the log's values and title **Edit log**; changing only the text sends `PATCH` without `projectId`/`taskId` (D9); clearing the project sends `projectId null`, `taskId null`; toast "Log saved" | `web/features/time/components/log-form-dialog.ac.test.tsx` | T2 |
| AC-14 | The header **Log time** button is enabled and opens the dialog with today's date; saving there doesn't navigate | `web/features/time/components/log-form-dialog.ac.test.tsx` | T2 |
| AC-15 | Day view (today, start 08:00, the owner's logs): the header shows `08:00`, `3h 30m`, `11:30`, `36%`, `0h` and `09:17`; with start 08:00 and 1 h logged it shows `Unlogged 17m`; for a past `?date=` there is no Now and no Unlogged; the heading names the date in full | `web/features/time/components/day-view.ac.test.tsx` | T3 |
| AC-16 | The default URL shows the By Project tab with the groups of AC-5 (with "N logs" and subtotals), all collapsed; **Expand all** opens them all and turns into **Collapse all**; `?view=task` shows the task groups; `?view=sequential` lists the four logs in API order with the "Excluded from statistics" badge on "Commute"; clicking a tab sets `view` (none for By Project) | `web/features/time/components/day-view.ac.test.tsx` | T3 |
| AC-17 | Rows: in the Manhatan group a row shows the text and its task link (`/app/task?id=`) but no title and no project; in sequential a row shows title, text, project link (`/app/project?id=`) and task link; a deleted project is plain text with "(deleted)"; **Delete** asks "Delete log?", confirms, `DELETE`, toast "Log deleted"; failure → toast, dialog stays | `web/features/time/components/day-view.ac.test.tsx` | T3 |
| AC-18 | Empty day → "No logs for this day" with **Log time**, no tabs, and "Nothing logged yet." for the charts; error → "Couldn't load the day." with **Retry**; picking a past calendar date sets `?date=`; Next and Today are disabled on today; **Today** returns; a future `?date=` renders today; days with `totalMinutes > 0` are marked | `web/features/time/components/day-view.ac.test.tsx` | T3 |
| AC-19 | Changing the start in the header sends `PUT /workdays/{date}` with the chosen minute; a day without a start shows `—` and no select; saving a log for another date from the heading's dialog moves the view to that date (D8) | `web/features/time/components/day-view.ac.test.tsx` | T3 |
| AC-20 | Charts: the legend lists the four slice labels of AC-7 and "Remaining" `3h 30m`, the middle shows `3h 30m` and "of 7h"; the bar card is titled "Time by project", "Time by task" for `?view=task`; **Expand** opens a dialog with the chart | `web/features/time/components/day-view.ac.test.tsx` | T3 |
| AC-21 | Settings: `/app/settings` shows the **User settings** tab with `7` (target 420 from `useMe`) and the zone; Save changes and Reset are disabled until a change; `20` or `0.3` shows "Enter a value between 0.25 and 24, in steps of 0.25." and keeps Save disabled; `7.5` → `PATCH /me {dailyTargetMinutes: 450}` only, toast "Settings saved"; Reset restores the saved values; a failure → toast "Couldn't save the settings." | `web/features/settings/components/user-settings.ac.test.tsx` | T4 |
| AC-22 | The build has the pages `/app/time` and `/app/settings` | `check` | T4 |

Typed stubs (created with the tests, so lint and typecheck pass while the tests fail):
- `web/features/time/api.ts`: the exports above, hooks throwing `new Error("not implemented (feat-tlog-web)")` (`timeKeys` and the type re-exports real).
- `web/features/time/components/log-form-dialog.tsx` (with `START_OPTIONS` real), `day-view.tsx`, `web/features/settings/components/user-settings.tsx`: the signatures above, each body `throw new Error("not implemented (feat-tlog-web)")`.

## Checks
```bash
# AC-22: the build has the time and settings pages
test -f web/out/app/time.html && test -f web/out/app/settings.html
```

## Tasks
| # | Task | App | Size | Tier | Why this tier | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | Data hooks (`features/time/api.ts`) and `useUpdateMe` | web | S | haiku | Copies `features/tasks/api.ts`; every key, URL and invalidation is stated | — (feat-tlog-api done) |
| T2 | Log dialog, date field, project and task pickers, header **Log time** button | web | M | sonnet | Cascading pickers, a date-dependent required field, partial PATCH and field-error mapping | T1 |
| T3 | Day view: header, day picker with calendar, charts, rows, grouped views, delete | web | L | sonnet | Several interacting pieces (URL state, accordion state per view, calendar marks, charts) | T1, T2 |
| T4 | Settings page with the User settings tab | web | S | haiku | One form with local state; validation and copy are spelled out | T1 |

## Open questions
None.

## Changelog
- 2026-10-07: Initial draft.
- 2026-10-09: Follows the owner's layout: By project default and collapsible groups, *Exclude from statistics* and Non-prod, `rowFields`, header *% billable* / *Overtime*,
  pie labels and full-screen charts, task search by title or project name, settings tabs with the target in hours (OQ-115…OQ-121). The logged-time sections of the
  project and task pages move to a later feature. Ready for review.
- 2026-10-09: Approved by the owner.
