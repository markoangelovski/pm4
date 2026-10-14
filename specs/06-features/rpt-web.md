---
id: feat-rpt-web
title: "Dashboard web: the dashboard page"
status: approved
owner: Marko Angelovski
last_updated: 2026-10-09
milestone: M5
requirements: [FR-RPT-001, FR-RPT-002, FR-RPT-003, FR-RPT-004, FR-RPT-005, FR-RPT-006, SCR-010]
related: [req-reporting, web-screens, web-routing, feat-rpt-api, feat-tlog-web, OQ-126, OQ-127, OQ-128, OQ-129, OQ-130]
---

# Dashboard web: the dashboard page

## Goal
A signed-in user opens the dashboard (`/app`), picks a date range, and sees the project and task counts, the workdays' start times and hours, the
worked / target / booked totals, the running totals and the hours per project. Behavior: [screens.md](../04-web/screens.md) SCR-010 and
[req-reporting](../01-requirements/reporting.md). API: feat-rpt-api. Patterns: feat-tlog-web, feat-book-web.

## Decisions
| # | Decision | Source |
| --- | --- | --- |
| D1 | The range and chart logic is plain functions, final before the implementation (test step): `range.ts` and `stats.ts`. | Agent: as feat-book-web D1 |
| D2 | The range is `?from=&to=`; absent, invalid or over 366 days apart → this month (the whole month). Applying this month removes both parameters. | OQ-130 (owner) |
| D3 | Up to 62 days → one bar per day, else one per Monday–Sunday week. Per day, a weekend day with no start and no logs is left out. | OQ-128 (owner) |
| D4 | `reportKeys` live under `timeKeys.all`, so log mutations (header **Log time**) refresh the dashboard; `staleTime: 0`, so bookings, renames and deletions made elsewhere show on the next visit. | Agent |
| D5 | Series colours: worked `#2a78d6` / dark `#3987e5`, booked `#1baf7a` / dark `#199e70`, start `#eb6834` / dark `#d95926`, as CSS variables `--dash-worked`, `--dash-booked`, `--dash-start` on the page root. | Owner's screen (2026-10-09) |

## Scope
**In:** `features/dashboard/` (logic, hooks, components) and the page `/app`.

**Before the tests are written:** feat-rpt-api, feat-tlog-web and feat-book-web are done. The test writer runs `npm run api:types`.

**Non-goals** (implementers must not touch these):
- `api/`. `features/time/*`, `features/bookings/*`, `features/projects/*`, `features/tasks/*`, the sidebar and routes (`/app` exists).
- `lib/api/*` (except the generated `schema.d.ts`), `lib/auth/*`, `web/components/ui/*` (add shadcn components only with the CLI, if one is missing).

## Read first
| Path | Why / copy this |
| --- | --- |
| `specs/04-web/screens.md` (SCR-010) | Screen behavior and copy |
| `specs/03-api/endpoints.md#api-rpt-001-dashboard-report` | Contract |
| `web/features/bookings/api.ts` | Keys under `timeKeys.all`, a query hook, `unwrap` |
| `web/features/bookings/components/bookings-view.tsx`, `range-field.tsx` | `useMe`, nuqs query state, states (skeletons, error + Retry); the range calendar in a popover |
| `web/features/time/components/day-charts.tsx` | `ChartContainer` + recharts, custom tooltips |
| `web/features/projects/api.ts`, `web/features/tasks/api.ts`, `web/features/tasks/status.ts` | `useProjects`, `useTasks`; `TASK_STATUSES`, `TASK_STATUS_LABELS` |
| `web/features/projects/components/project-icon.tsx` | The project icon |
| `web/lib/time/index.ts`, `web/lib/time/clock.ts`, `web/lib/routes.ts` | `today`, `formatDuration`, `formatWorkDate`; `formatClock`; `routes.app.*` |
| `web/components/ui/chart.tsx`, `select.tsx`, `calendar.tsx`, `popover.tsx`, `tabs.tsx`, `table.tsx`, `card.tsx`, `skeleton.tsx` | The building blocks |

## Files
| App | File | C/M | Task | Notes |
| --- | --- | --- | --- | --- |
| web | `web/features/dashboard/stats.ac.test.ts` | C | tests | Acceptance tests (`range.ts` and `stats.ts`) |
| web | `web/features/dashboard/api.ac.test.tsx` | C | tests | Acceptance tests |
| web | `web/features/dashboard/components/dashboard-view.ac.test.tsx` | C | tests | Acceptance tests |
| web | `web/lib/api/schema.d.ts` | M | tests | `npm run api:types` |
| web | `web/features/dashboard/range.ts` | C | tests | Pure logic, final (D1) |
| web | `web/features/dashboard/stats.ts` | C | tests | Pure logic, final (D1) |
| web | `web/features/dashboard/api.ts` | C | tests, T1 | Stub from the test writer (`reportKeys` real) |
| web | `web/features/dashboard/components/dashboard-view.tsx` | C | tests, T2 | The page body (stub from the test writer) |
| web | `web/features/dashboard/components/range-picker.tsx` | C | tests, T2 | Preset select + range calendar |
| web | `web/features/dashboard/components/kpi-tiles.tsx` | C | tests, T2 | The four count tiles |
| web | `web/features/dashboard/components/workday-chart.tsx` | C | tests, T2 | Start line + hours bars, table tab |
| web | `web/features/dashboard/components/hours-summary.tsx` | C | tests, T2 | Worked · target · booked |
| web | `web/features/dashboard/components/running-totals.tsx` | C | tests, T2 | Cumulative lines |
| web | `web/features/dashboard/components/project-hours.tsx` | C | tests, T2 | Hours by project |
| web | `web/app/(dashboard-layout)/app/page.tsx` | M | tests, T2 | Renders `DashboardView` |

## Interfaces

### Range (final in the test step, D1)
```ts
// web/features/dashboard/range.ts — dates are YYYY-MM-DD calendar strings; no time zone arithmetic
export interface DateRange { from: string; to: string }
export const RANGE_PRESETS = ["this-month", "last-month", "last-7", "last-30", "last-90", "this-year"] as const;
export type RangePreset = (typeof RANGE_PRESETS)[number];
export const PRESET_LABELS: Record<RangePreset, string>;   // "This month", "Last month", "Last 7 days", "Last 30 days", "Last 90 days", "This year"
export const MAX_RANGE_DAYS = 366;
/** this-month: 1st–last of today's month; last-month: the previous month; last-7/30/90: today−6/29/89..today; this-year: 1 Jan..today. */
export function presetRange(preset: RangePreset, today: string): DateRange;
export function matchPreset(range: DateRange, today: string): RangePreset | null;
/** to − from > 366 days. */
export function isRangeTooLong(range: DateRange): boolean;
/** Real dates, from ≤ to, not too long → that range; anything else (also a missing value) → presetRange("this-month", today). Future dates are allowed. */
export function parseRange(from: string | null, to: string | null, today: string): DateRange;
export function eachDay(range: DateRange): string[];          // oldest first
/** 1st to last day of one month → "October 2026"; else "1 Sep 2026 – 9 Oct 2026" (formatWorkDate, an en dash with spaces). */
export function rangeLabel(range: DateRange): string;
/** Monday–Friday dates of the range that are ≤ today. */
export function weekdaysSoFar(range: DateRange, today: string): number;
```

### Stats (final in the test step, D1)
```ts
// web/features/dashboard/stats.ts
export type DashboardReport = components["schemas"]["DashboardReportResponseDto"];
export type ReportDay = components["schemas"]["ReportDayDto"];
export type ReportProject = components["schemas"]["ReportProjectDto"];
export interface DayStat { workDate: string; startMinute: number | null; worked: number; booked: number }
/** One per date of the range, oldest first; a date missing from `days` → { startMinute: null, worked: 0, booked: 0 }. */
export function dayStats(range: DateRange, days: ReportDay[]): DayStat[];
export interface Totals { worked: number; booked: number; target: number; workdays: number;
  avgStart: number | null; earliestStart: number | null; latestStart: number | null }
/** workdays = days with a start; target = workdays × targetMinutes; avgStart = Math.round(mean of the starts). */
export function totals(days: DayStat[], targetMinutes: number): Totals;
export interface Bucket { key: string; date: string; tick: string; title: string; startMinute: number | null;
  worked: number; booked: number; unbooked: number; target: number; workdays: number }
export function buckets(days: DayStat[], targetMinutes: number): { by: "day" | "week"; items: Bucket[] };
export interface RunningPoint { workDate: string; tick: string; worked: number | null; booked: number | null; target: number | null }
export function running(days: DayStat[], targetMinutes: number, today: string): RunningPoint[];
/** Axis ticks in minutes at whole-hour steps (1, 2, 4, 5, 10, 20, 25, 50, 100, 200, 250, 500 h, else 1000), at most 5 intervals, from 0 to cover maxMinutes (at least 1 h). */
export function hourTicks(maxMinutes: number): number[];
```
- `buckets`, ≤ 62 days → `by: "day"`: one item per day, leaving out a Saturday or Sunday with `startMinute === null` and `worked === 0` (D3); `key` = `date` = the
  work date; `tick` `d` when the first and last day are in the same month, else `d MMM`; `title` `EEE, d MMM yyyy`; `target` = `targetMinutes`; `workdays` 1 or 0.
- `buckets`, > 62 days → `by: "week"`: one item per ISO week (Monday start); `key` = its Monday; `date` = its first day in the range; `tick` `d MMM` of `date`;
  `title` "Week of `d MMM` (Monday) – `d MMM yyyy` (Sunday)"; `startMinute` = `totals(its days).avgStart`; `target` = its workdays × `targetMinutes`.
- Both: `worked`, `booked` = sums; `unbooked` = `worked − booked`.
- `running`: cumulative `worked`, `booked`, and `target` (+ `targetMinutes` per day with a start); all three `null` after `today`; `tick` `d MMM`.

### Data (T1)
```ts
// web/features/dashboard/api.ts (re-exports DashboardReport)
export const reportKeys = {
  all: [...timeKeys.all, "reports"] as const,                                              // D4
  dashboard: (from: string, to: string) => [...reportKeys.all, "dashboard", from, to] as const,
};
export function useDashboardReport(from: string, to: string): UseQueryResult<DashboardReport, Error>;
// GET /api/v1/reports/dashboard?from=&to= (API-RPT-001); staleTime 0; placeholderData: keepPreviousData
export interface TaskCounts { upcoming: number; "in-progress": number; completed: number }
export function useProjectCount(): { count: number | undefined; isError: boolean };
// useProjects({ q: "", sort: "updatedAt:desc", page: 1, pageSize: 1 }).data?.total
export function useTaskCounts(): { counts: TaskCounts | undefined; isError: boolean };
// one useTasks({ statuses: [s], q: "", sort: "updatedAt:desc", page: 1, pageSize: 1 }) per status; counts once all three have data; isError if any failed
```

### Page and components (T2)
```tsx
// web/features/dashboard/components/dashboard-view.tsx — ?from=&to= with nuqs useQueryStates (parseAsString), history "replace"
export function DashboardView(): React.JSX.Element;
// web/features/dashboard/components/range-picker.tsx
export function RangePicker(props: { value: DateRange; today: string; onChange: (range: DateRange) => void }): React.JSX.Element;
// web/features/dashboard/components/kpi-tiles.tsx — undefined = loading (skeleton); the matching *Error flag = "—"
export function KpiTiles(props: { projects: number | undefined; projectsError: boolean; tasks: TaskCounts | undefined; tasksError: boolean;
  projectsWithTime: number | undefined; totals: Totals | undefined; reportError: boolean; weekdays: number }): React.JSX.Element;
// web/features/dashboard/components/workday-chart.tsx
export function WorkdayChart(props: { items: Bucket[]; by: "day" | "week"; targetMinutes: number; avgStart: number | null; today: string }): React.JSX.Element;
// web/features/dashboard/components/hours-summary.tsx
export function HoursSummary(props: { totals: Totals; targetMinutes: number }): React.JSX.Element;
// web/features/dashboard/components/running-totals.tsx
export function RunningTotals(props: { points: RunningPoint[] }): React.JSX.Element;
// web/features/dashboard/components/project-hours.tsx
export function ProjectHours(props: { rows: ReportProject[] }): React.JSX.Element;
```
- `DashboardView`: `useMe` (`timeZone`, `dailyTargetMinutes`; while it loads, the heading and skeletons); `today = today(me.timeZone)`;
  `range = parseRange(q.from, q.to, today)`; `useDashboardReport(range.from, range.to)`; `days = dayStats(range, data.days)`, then `totals`, `buckets`,
  `running` (memoised); `useProjectCount`, `useTaskCounts`. `onChange` → `setQuery(equal to presetRange("this-month", today) ? { from: null, to: null } : range)` (D2).
  Layout, labels and states per SCR-010: heading and `rangeLabel(range)` with `RangePicker` on the right; `KpiTiles` (`projectsWithTime` = the `project`
  rows of `data.projects`, `weekdays = weekdaysSoFar(range, today)`); a 12-column grid on `xl` (WorkdayChart 8 + HoursSummary 4, RunningTotals 7 +
  ProjectHours 5), one column below. Report pending → skeleton cards; error → "Couldn't load the dashboard." + **Retry** (`refetch`) in place of the cards. D5's
  variables are set on the root element.
- `RangePicker`: a `Select` (`aria-label="Time range"`) with the presets and **Custom range**, showing `matchPreset(value, today) ?? "custom"`; a preset →
  `onChange(presetRange(p, today))`; Custom range → opens the calendar. A `Popover` whose trigger is an outline `Button` (`aria-label="Pick dates"`, calendar icon,
  `formatWorkDate(from)` – `formatWorkDate(to)`); opening it sets the draft to `value`. `<Calendar mode="range" numberOfMonths={2}>`, then a footer with the draft's
  dates ("Start date" / "End date" while unset), "Pick at most 366 days." while `isRangeTooLong(draft)`, and **Apply** (disabled while there's no start or the draft
  is too long) → `onChange({ from, to: to ?? from })` and closes.
- `KpiTiles`: the four tiles of SCR-010 in a grid (2 columns, 4 on `xl`); Projects and Tasks are links (`routes.app.projects`, `routes.app.tasks`); the task bar's
  segments grow with each status's count (`bg-chart-4`, `bg-primary`, `bg-chart-2`); starts with `formatClock`.
- `WorkdayChart`: SCR-010's card. Tabs **Chart** / **Table** (local state). Chart: two `ChartContainer`s with one `syncId`: a `LineChart` of `startMinute`
  (`connectNulls={false}`; y domain = whole hours from the floor of the earliest to the ceil of the latest start, at least one hour, `[480, 600]` with none;
  a `ReferenceLine` at `avgStart`) above a `BarChart` with two stacked `Bar`s, `booked` then `unbooked`, y ticks `hourTicks(max(worked of any item, targetMinutes in
  day mode))`, a dashed `ReferenceLine` at `targetMinutes` in day mode. Bar click, by day and `date ≤ today` → `router.push(\`${routes.app.time}?date=${date}\`)`.
  Values: `formatDuration`, `0h` for 0; starts `formatClock`, none `—`.
- `HoursSummary`: SCR-010's card; percentages `Math.floor(part / whole × 100)`, 0 when `whole` is 0; the meter bars cap at 100 %.
- `RunningTotals`: SCR-010's card; the legend's totals are the last point that isn't `null`; y ticks `hourTicks` of the largest value.
- `ProjectHours`: SCR-010's card; rows in API order; a bar's width is `worked / max(worked)` of the card, at least `2.5rem`. Project link `${routes.app.project}?id=`;
  `project.deleted` → plain text and "(deleted)", no link.
- `page.tsx`: `<Suspense><DashboardView /></Suspense>`, `metadata.title` "Dashboard".

## Acceptance criteria
Tests mock `@/lib/api/client`, `next/navigation` and `useMe` (time zone `Europe/Zagreb`, `dailyTargetMinutes` 420), wrap in `NuqsTestingAdapter`, and use fake
timers (2026-10-09 12:00 in Zagreb). "The report" for 1–31 Oct 2026: `days` 1 Oct `{480, 0, 0}`, 6 Oct `{510, 315, 120}`, 7 Oct `{555, 375, 240}`; `projects` Anthropic
`{project, 255, 120}`, Nvidia `{project, 240, 240}`, PM Internal `{project, deleted: true, 60, 0}`, `{unsorted, null, 45, 0}`, `{nonprod, null, 90, 0}`. Project total 12;
tasks 2 upcoming, 3 in progress, 4 completed.

| AC | Case → expected | Test | Task |
| --- | --- | --- | --- |
| AC-1 | `presetRange` (today 2026-10-09): this-month 10-01..10-31, last-month 09-01..09-30, last-7 10-03..10-09, last-30 09-10..10-09, last-90 07-12..10-09, this-year 01-01..10-09; `matchPreset` finds each and returns `null` for 10-02..10-09; `parseRange` keeps 2025-10-08..2026-10-09 and 2026-11-01..2026-11-30, and gives this month for a missing value, `2026-02-30`, from > to, 2025-10-07..2026-10-09; `rangeLabel` → "October 2026", "1 Sep 2026 – 9 Oct 2026", and "1 Oct 2026 – 9 Oct 2026" for part of a month; `weekdaysSoFar(1–31 Oct)` → 7 | `web/features/dashboard/stats.ac.test.ts` | tests |
| AC-2 | `dayStats` of the report → 31 days, 2 Oct `{null, 0, 0}`; `totals` → worked 690, booked 360, workdays 3, target 1260, average 515, earliest 480, latest 555 | `web/features/dashboard/stats.ac.test.ts` | tests |
| AC-3 | `buckets` for October → by day, 22 items (the 9 weekend days without work left out), ticks `1`…, 6 Oct title "Tue, 6 Oct 2026", booked 120, unbooked 195; with 2h worked on Sat 10 Oct → 23 items; 2026-08-01..2026-10-01 (62 days) → by day with ticks `d MMM`; 2026-08-01..2026-10-02 → by week | `web/features/dashboard/stats.ac.test.ts` | tests |
| AC-4 | `buckets` for 2026-01-01..2026-06-30 → by week, 27 items; the first: key `2025-12-29`, date `2026-01-01`, tick "1 Jan", title "Week of 29 Dec – 4 Jan 2026"; a week with starts 08:00 and 09:00 → start 510, target 840 | `web/features/dashboard/stats.ac.test.ts` | tests |
| AC-5 | `running` for October (today 9 Oct): 7 Oct and 9 Oct → worked 690, booked 360, target 1260; 10 Oct → all `null`; `hourTicks(0)` → [0, 60]; `hourTicks(450)` → [0, 120, 240, 360, 480] | `web/features/dashboard/stats.ac.test.ts` | tests |
| AC-6 | `useDashboardReport` calls `GET /api/v1/reports/dashboard` with `from`/`to` and returns the body; `reportKeys.all` starts with `timeKeys.all`; `useProjectCount` requests projects with `pageSize` 1 and returns `total`; `useTaskCounts` makes one request per status with `pageSize` 1 and returns the three counts | `web/features/dashboard/api.ac.test.tsx` | T1 |
| AC-7 | `/app` without parameters: heading **Dashboard**, "October 2026", *Time range* shows "This month", the report is requested for 2026-10-01..2026-10-31; tiles: Projects `12`, "3 with time logged in this range"; Tasks `9` with Upcoming 2, In progress 3, Completed 4; Workdays `3`, "Days with a start time, of 7 weekdays so far"; Average start `08:35`, "Earliest 08:00 · latest 09:15" | `web/features/dashboard/components/dashboard-view.ac.test.tsx` | T2 |
| AC-8 | Choosing *Last 7 days* sets `?from=2026-10-03&to=2026-10-09` and requests that range; choosing *This month* clears both; `?from=2025-01-01&to=2026-10-09` requests 1–31 Oct; picking 1 Sep and 9 Oct in *Pick dates* and **Apply** sets `?from=2026-09-01&to=2026-10-09` and the select shows "Custom range" | `web/features/dashboard/components/dashboard-view.ac.test.tsx` | T2 |
| AC-9 | Worked · target · booked shows `11h 30m`, `21h` with "3 days × 7h", `6h`, "9h 30m under target", Worked of target `54%`, Booked of worked `52%`, "5h 30m still to book"; Running totals' legend shows `11h 30m`, `21h`, `6h` | `web/features/dashboard/components/dashboard-view.ac.test.tsx` | T2 |
| AC-10 | Hours by project lists Anthropic, Nvidia, PM Internal, Unsorted, Non-prod in that order; Anthropic links to `/app/project?id=…` and shows `4h 15m` and "2h booked"; PM Internal is plain text with "(deleted)"; Unsorted and Non-prod show `—`; a report with no projects → "Nothing logged in this range." | `web/features/dashboard/components/dashboard-view.ac.test.tsx` | T2 |
| AC-11 | Workdays card shows "by day"; its **Table** tab has 22 rows, the 6 Oct row "Tue, 6 Oct 2026", `08:30`, `5h 15m`, `2h`, `7h` | `web/features/dashboard/components/dashboard-view.ac.test.tsx` | T2 |
| AC-12 | Report pending → no card content, skeletons; report error → "Couldn't load the dashboard." and **Retry** requests it again; the project count failing → `—` in Projects while the rest shows | `web/features/dashboard/components/dashboard-view.ac.test.tsx` | T2 |
| AC-13 | In the browser: the start line and the stacked bars share one hover with SCR-010's tooltip; a bar of a past day opens Logs on that date; 1 Jan–30 Jun shows weekly bars; a custom range over 366 days disables **Apply** with "Pick at most 366 days."; the colours read in light and dark | manual | T2 |

Typed stubs (created with the tests, so lint and typecheck pass while the tests fail):
- `web/features/dashboard/api.ts`: the exports above, hooks throwing `new Error("not implemented (feat-rpt-web)")` (`reportKeys` and the type re-export real).
- `web/features/dashboard/components/dashboard-view.tsx`: `DashboardView`, its body `throw new Error("not implemented (feat-rpt-web)")`.

## Tasks
| # | Task | App | Size | Tier | Why this tier | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | Dashboard hooks (`features/dashboard/api.ts`): the report and the counts | web | S | haiku | Copies `features/bookings/api.ts`; the keys, URLs and params are stated | — (feat-rpt-api, feat-tlog-web, feat-book-web done) |
| T2 | Dashboard page: range picker in the URL, count tiles, workday chart and table, worked / target / booked, running totals, hours by project | web | L | sonnet | Two synced recharts panels with custom tooltips and click-through, a range picker with a draft and URL state, loading and error states across six components | T1 |

## Open questions
None.

## Changelog
- 2026-10-09: Initial draft from the owner's Dashboard screen (OQ-126…OQ-130). Ready for review.
