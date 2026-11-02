---
id: feat-rpt-web
title: "Dashboard web: the dashboard page"
status: review
owner: Marko Angelovski
last_updated: 2026-11-02
milestone: M5
requirements: [FR-RPT-001, FR-RPT-002, FR-RPT-003, FR-RPT-004, FR-RPT-005, FR-RPT-006, SCR-010]
related: [req-reporting, web-screens, web-routing, feat-rpt-api, feat-tlog-web, OQ-126, OQ-127, OQ-128, OQ-129, OQ-130, OQ-250, OQ-251, OQ-258, OQ-259, OQ-260, OQ-261]
prototype: 570b9cc
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
| D6 | Running totals: before today, one point per day with time logged (`worked > 0`); days without logs are left out, so the past has no flat stretches. From today to the range's end, a point for every Monday–Friday and any day with `worked > 0` (as D3), so the lines run flat to the end of the range. A day with a start but no logs still adds `targetMinutes` to the running target, which shows on the next point. The legend shows the range's `Totals` (worked, target, booked, as HoursSummary), not the last point. `totals.worked === 0` → "Nothing logged in this range." in place of the chart; the legend stays. | Owner, 2026-10-31 (OQ-250, OQ-251); prototype `5546896` |
| D7 | Workdays: the start panel's x-axis uses `scale="band"`, as the bars' axis does, so the shared hover line, the start dot and the bar's centre line up. | Owner, 2026-10-31 (bug); prototype `f453800` |
| D8 | Target = the range's Monday–Friday dates × `targetMinutes`, future ones included (`Totals.weekdays`); a weekend day never adds to it, even with a start. Over / under target and *Worked of target* compare all worked minutes. A day bucket's target is `targetMinutes` on Monday–Friday, 0 on Saturday or Sunday; a week's is its weekdays × `targetMinutes` (`Bucket.weekdays`, the tooltip's "Target (N d)"). `running` adds `targetMinutes` on every Monday–Friday, so the target climbs to `totals.target` at the range's end. HoursSummary: "N days × Xh" with N = `weekdays`; target 0 → "No weekdays in this range." / "No weekdays in this range". The dashed daily-target line of the Workdays chart stays across all bars. | Owner, 2026-11-01 (OQ-258, OQ-259, OQ-260); prototype `bf93b65` |
| D9 | Logs excluded from statistics are out of *Worked* and of everything built on it (API-RPT-001's `workedMinutes`, feat-rpt-api D5). Each day carries `nonprod` (`nonprodMinutes`), stacked as a grey **Non-prod** segment on top of the Workdays bar (not part of worked), with a tooltip row (only when > 0), a legend item and a table column; the bars' axis covers worked + Non-prod. A weekend day with only Non-prod still gets a bar. Colour `--dash-nonprod`: `#a1a1aa` / dark `#71717a`. The project and task pages' Logged time chart (which reuses `buckets`) passes `nonprod: 0`. | Owner, 2026-11-02 (OQ-261); prototype `570b9cc` |

## Scope
**In:** `features/dashboard/` (logic, hooks, components) and the page `/app`. T3 (D6, D7): Running totals without empty days, its
legend and empty state, and the aligned Workdays hover, as twins of the prototype files. T4 (D8): the weekday target, as twins of the
prototype files `stats.ts`, `hours-summary.tsx` and `workday-chart.tsx`. T5 (D9): Non-prod out of worked, as twins of the prototype files
`stats.ts`, `dashboard-view.tsx`, `workday-chart.tsx` and `features/time/components/logged-time-chart.tsx`, and the prototype's `proposed-types.ts` removed.

**Test step (main session, before T3):** updates AC-5 in `web/features/dashboard/stats.ac.test.ts` to D6 and adds AC-14 to
`web/features/dashboard/components/dashboard-view.ac.test.tsx` (no stubs: the exports exist), then `pm4 hash`.

**Test step (main session, before T4):** updates AC-2…AC-5 in `web/features/dashboard/stats.ac.test.ts` and AC-9, AC-14 in
`web/features/dashboard/components/dashboard-view.ac.test.tsx` to D8 (no stubs: `weekdays` only adds a field to existing types), then `pm4 hash`.

**Test step (main session, before T5; after feat-rpt-api T2):** `npm run api:types`; adds `nonprodMinutes` to every `ReportDay` built in
`web/features/**/*.test.ts(x)` (0 unless stated); updates AC-2 and AC-3 in `web/features/dashboard/stats.ac.test.ts` and AC-11 in
`web/features/dashboard/components/dashboard-view.ac.test.tsx` to D9 and adds AC-19 there (no stubs: `nonprod` only adds a field), then `pm4 hash`.

**Before the tests are written:** feat-rpt-api, feat-tlog-web and feat-book-web are done. The test writer runs `npm run api:types`.

**Non-goals** (implementers must not touch these):
- `api/`. `features/time/*` (except T5's `logged-time-chart.tsx`), `features/bookings/*`, `features/projects/*`, `features/tasks/*`, the sidebar and routes (`/app` exists).
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
| web | `web/features/dashboard/stats.ac.test.ts` | M | tests | AC-5 to D6 |
| web | `web/features/dashboard/components/dashboard-view.ac.test.tsx` | M | tests | AC-14 (D6) |
| web | `web/features/dashboard/stats.ts` | M | T3 | The twin of the prototype file, with D6 (commands under *Web (T3)*) |
| web | `web/features/dashboard/components/running-totals.tsx` | M | T3 | The twin of the prototype file, with D6 |
| web | `web/features/dashboard/components/dashboard-view.tsx` | M | T3 | The twin of the prototype file, with D6 (passes `totals`) |
| web | `web/features/dashboard/components/workday-chart.tsx` | M | T3 | The twin of the prototype file, with D7 |
| web | `web/features/dashboard/stats.ac.test.ts` | M | tests | AC-2…AC-5 to D8 |
| web | `web/features/dashboard/components/dashboard-view.ac.test.tsx` | M | tests | AC-9, AC-14 to D8 |
| web | `web/features/dashboard/stats.ts` | M | T4 | The twin of the prototype file, with D8 (commands under *Web (T4)*) |
| web | `web/features/dashboard/components/hours-summary.tsx` | M | T4 | The twin of the prototype file, with D8 |
| web | `web/features/dashboard/components/workday-chart.tsx` | M | T4 | The twin of the prototype file, with D8 |
| web | `web/lib/api/schema.d.ts` | M | tests | `npm run api:types` after feat-rpt-api T2 (`nonprodMinutes`) |
| web | `web/features/dashboard/stats.ac.test.ts` | M | tests | AC-2, AC-3 to D9 |
| web | `web/features/dashboard/components/dashboard-view.ac.test.tsx` | M | tests | AC-11 to D9; AC-19 |
| web | `web/features/**/*.test.ts`, `web/features/**/*.test.tsx` | M | tests | `nonprodMinutes` on the `ReportDay`s they build |
| web | `web/proto/features/dashboard/stats.ts` | M | T5 | Types from the schema again (commands under *Web (T5)*) |
| web | `web/proto/features/dashboard/proposed-types.ts` | D | T5 | `rm` |
| web | `web/features/dashboard/stats.ts` | M | T5 | The twin of the prototype file, with D9 |
| web | `web/features/dashboard/components/dashboard-view.tsx` | M | T5 | The twin of the prototype file, with D9 (`--dash-nonprod`) |
| web | `web/features/dashboard/components/workday-chart.tsx` | M | T5 | The twin of the prototype file, with D9 |
| web | `web/features/time/components/logged-time-chart.tsx` | M | T5 | The twin of the prototype file (`nonprod: 0`) |

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
export interface Totals { worked: number; booked: number; target: number; weekdays: number; workdays: number;
  avgStart: number | null; earliestStart: number | null; latestStart: number | null }
/** Since T4 (D8): weekdays = Monday–Friday dates of the range; target = weekdays × targetMinutes; workdays = days with a start;
 *  avgStart = Math.round(mean of the starts). Before T4: target = workdays × targetMinutes, no `weekdays`. */
export function totals(days: DayStat[], targetMinutes: number): Totals;
export interface Bucket { key: string; date: string; tick: string; title: string; startMinute: number | null;
  worked: number; booked: number; unbooked: number; target: number; weekdays: number; workdays: number }   // `weekdays` since T4
export function buckets(days: DayStat[], targetMinutes: number): { by: "day" | "week"; items: Bucket[] };
export interface RunningPoint { workDate: string; tick: string; worked: number | null; booked: number | null; target: number | null }
export function running(days: DayStat[], targetMinutes: number, today: string): RunningPoint[];
/** Axis ticks in minutes at whole-hour steps (1, 2, 4, 5, 10, 20, 25, 50, 100, 200, 250, 500 h, else 1000), at most 5 intervals, from 0 to cover maxMinutes (at least 1 h). */
export function hourTicks(maxMinutes: number): number[];
```
- `buckets`, ≤ 62 days → `by: "day"`: one item per day, leaving out a Saturday or Sunday with `startMinute === null` and `worked === 0` (D3); `key` = `date` = the
  work date; `tick` `d` when the first and last day are in the same month, else `d MMM`; `title` `EEE, d MMM yyyy`; `target` = `targetMinutes`; `workdays` 1 or 0.
  Since T4 (D8): `target` = `targetMinutes` on Monday–Friday, 0 on Saturday or Sunday; `weekdays` 1 or 0 the same way.
- `buckets`, > 62 days → `by: "week"`: one item per ISO week (Monday start); `key` = its Monday; `date` = its first day in the range; `tick` `d MMM` of `date`;
  `title` "Week of `d MMM` (Monday) – `d MMM yyyy` (Sunday)"; `startMinute` = `totals(its days).avgStart`; `target` = its workdays × `targetMinutes`; since T4 (D8): `target` and
  `weekdays` = `totals(its days).target` and `.weekdays` (its Monday–Friday dates in the range).
- Both: `worked`, `booked` = sums; `unbooked` = `worked − booked`.
- `running`: cumulative `worked`, `booked`, and `target` (+ `targetMinutes` per day with a start); all three `null` after `today`; `tick` `d MMM`.
  Since T3 (D6): a day is a point when `worked > 0`, or when it is `≥ today` and Monday–Friday; none `null`; the totals still accumulate over the days left out.
  Since T4 (D8): `target` adds `targetMinutes` on every Monday–Friday (not per day with a start), so the last point's target is `totals.target`
  when the range ends on a weekday.

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
  `project.deleted` → plain text with the deleted marker, no link.
- `page.tsx`: `<Suspense><DashboardView /></Suspense>`, `metadata.title` "Dashboard".

### Web (T3)
The four files become their prototype twins (D6, D7), from the repo root:
```bash
for f in stats.ts components/running-totals.tsx components/dashboard-view.tsx components/workday-chart.tsx; do
  sed 's#@/proto/#@/#g' web/proto/features/dashboard/$f > web/features/dashboard/$f
done
cd web && npx prettier --write features/dashboard/stats.ts features/dashboard/components/running-totals.tsx features/dashboard/components/dashboard-view.tsx features/dashboard/components/workday-chart.tsx
```
The diff they bring is `git diff 7caf4a5 5546896 -- web/proto/features/dashboard/`. API changes: `running` as under *Stats*
(same signature and `RunningPoint` type); `RunningTotals` takes `{ points: RunningPoint[]; totals: Pick<Totals, "worked" | "booked" | "target"> }`
and `DashboardView` passes `stats.totals`. No new imports outside `features/dashboard/`.

### Web (T4)
The three files become their prototype twins (D8), from the repo root:
```bash
for f in stats.ts components/hours-summary.tsx components/workday-chart.tsx; do
  sed 's#@/proto/#@/#g' web/proto/features/dashboard/$f > web/features/dashboard/$f
done
cd web && npx prettier --write features/dashboard/stats.ts features/dashboard/components/hours-summary.tsx features/dashboard/components/workday-chart.tsx
```
The diff they bring is `git diff bf93b65~1 bf93b65 -- web/proto/features/dashboard/`. API changes: `Totals` and `Bucket` gain `weekdays`; `totals`,
`buckets` and `running` keep their signatures. `HoursSummary` and `WorkdayChart` keep their props. No new imports outside `features/dashboard/`.

### Web (T5)
First the prototype's `stats.ts` takes its types from the schema again: in `web/proto/features/dashboard/stats.ts`, remove the
`./proposed-types` import and set `export type DashboardReport = components["schemas"]["DashboardReportResponseDto"];` and
`export type ReportDay = components["schemas"]["ReportDayDto"];` (as before `570b9cc`), then `rm web/proto/features/dashboard/proposed-types.ts`.
Then the four files become their prototype twins (D9), from the repo root:
```bash
for f in dashboard/stats.ts dashboard/components/dashboard-view.tsx dashboard/components/workday-chart.tsx time/components/logged-time-chart.tsx; do
  sed -e 's#@/proto/mock/client#@/lib/api/client#' -e 's#@/proto/#@/#g' web/proto/features/$f > web/features/$f
done
cd web && npx prettier --write features/dashboard/stats.ts features/dashboard/components/dashboard-view.tsx features/dashboard/components/workday-chart.tsx features/time/components/logged-time-chart.tsx
```
The diff they bring is `git diff 570b9cc~1 570b9cc -- web/proto/features/dashboard/ web/proto/features/time/components/logged-time-chart.tsx`.
API changes: `DayStat`, `Totals` and `Bucket` gain `nonprod`; `dayStats`, `totals`, `buckets` and `running` keep their signatures; the components
keep their props. No new imports outside `features/dashboard/` (and `logged-time-chart.tsx`'s existing ones).

## Acceptance criteria
Tests mock `@/lib/api/client`, `next/navigation` and `useMe` (time zone `Europe/Zagreb`, `dailyTargetMinutes` 420), wrap in `NuqsTestingAdapter`, and use fake
timers (2026-10-09 12:00 in Zagreb). "The report" for 1–31 Oct 2026: `days` 1 Oct `{480, 0, 0}`, 6 Oct `{510, 315, 120}`, 7 Oct `{555, 375, 240}`; `projects` Anthropic
`{project, 255, 120}`, Nvidia `{project, 240, 240}`, PM Internal `{project, deleted: true, 60, 0}`, `{unsorted, null, 45, 0}`, `{nonprod, null, 90, 0}`. Project total 12;
tasks 2 upcoming, 3 in progress, 4 completed.

| AC | Case → expected | Test | Task |
| --- | --- | --- | --- |
| AC-1 | `presetRange` (today 2026-10-09): this-month 10-01..10-31, last-month 09-01..09-30, last-7 10-03..10-09, last-30 09-10..10-09, last-90 07-12..10-09, this-year 01-01..10-09; `matchPreset` finds each and returns `null` for 10-02..10-09; `parseRange` keeps 2025-10-08..2026-10-09 and 2026-11-01..2026-11-30, and gives this month for a missing value, `2026-02-30`, from > to, 2025-10-07..2026-10-09; `rangeLabel` → "October 2026", "1 Sep 2026 – 9 Oct 2026", and "1 Oct 2026 – 9 Oct 2026" for part of a month; `weekdaysSoFar(1–31 Oct)` → 7 | `web/features/dashboard/stats.ac.test.ts` | tests |
| AC-2 | `dayStats` of the report → 31 days, 2 Oct `{null, 0, 0}` (since T5, D9: `{null, 0, 0, nonprod 0}`; 6 Oct with `nonprodMinutes` 90 → `nonprod` 90 and `totals` nonprod 90, worked still 690); `totals` → worked 690, booked 360, workdays 3, target 1260, average 515, earliest 480, latest 555. Since T4 (D8): `totals` → worked 690, booked 360, weekdays 22, workdays 3, target 9240, average 515, earliest 480, latest 555; an empty October → weekdays 22, workdays 0, target 9240; with a start and 2h on Sat 10 Oct → workdays 4, worked 810, target still 9240 | `web/features/dashboard/stats.ac.test.ts` | tests, T4 |
| AC-3 | `buckets` for October → by day, 22 items (the 9 weekend days without work left out), ticks `1`…, 6 Oct title "Tue, 6 Oct 2026", booked 120, unbooked 195; with 2h worked on Sat 10 Oct → 23 items; 2026-08-01..2026-10-01 (62 days) → by day with ticks `d MMM`; 2026-08-01..2026-10-02 → by week. Since T4 (D8): 6 Oct and Fri 2 Oct → target 420, weekdays 1; Sat 10 Oct with 2h worked → target 0, weekdays 0. Since T5 (D9): Sat 10 Oct with only 1h Non-prod → 23 items, its bucket worked 0, nonprod 60 | `web/features/dashboard/stats.ac.test.ts` | tests, T4, T5 |
| AC-4 | `buckets` for 2026-01-01..2026-06-30 → by week, 27 items; the first: key `2025-12-29`, date `2026-01-01`, tick "1 Jan", title "Week of 29 Dec – 4 Jan 2026"; a week with starts 08:00 and 09:00 → start 510, target 840. Since T4 (D8): the first week (Thu 1 – Sun 4 Jan) → workdays 0, weekdays 2, target 840; the week of 5 Jan (starts 08:00, 09:00) → start 510, workdays 2, weekdays 5, target 2100 | `web/features/dashboard/stats.ac.test.ts` | tests, T4 |
| AC-5 | `running` for October (today Fri 9 Oct), since T3 (D6): 18 points: 6 Oct `{tick "6 Oct", worked 315, booked 120, target 840}` (1 Oct's start counted, 1 Oct itself left out), 7 Oct `{worked 690, booked 360, target 1260}`, then 9 Oct and every weekday 12–30 Oct, each `{690, 360, 1260}`; no point for 1, 2, 5, 8, 10, 11 or 31 Oct; with 2h logged on Sat 10 Oct → 19 points, 10 Oct worked 810; `hourTicks(0)` → [0, 60]; `hourTicks(450)` → [0, 120, 240, 360, 480]. Since T4 (D8), the same 18 points with the target per weekday: 6 Oct target 1680 (1, 2, 5, 6 Oct), 7 Oct 2100, 9 Oct 2940, then +420 per point to 30 Oct 9240; Sat 10 Oct with 2h logged → worked 810, target 2940 | `web/features/dashboard/stats.ac.test.ts` | tests, T3, T4 |
| AC-6 | `useDashboardReport` calls `GET /api/v1/reports/dashboard` with `from`/`to` and returns the body; `reportKeys.all` starts with `timeKeys.all`; `useProjectCount` requests projects with `pageSize` 1 and returns `total`; `useTaskCounts` makes one request per status with `pageSize` 1 and returns the three counts | `web/features/dashboard/api.ac.test.tsx` | T1 |
| AC-7 | `/app` without parameters: heading **Dashboard**, "October 2026", *Time range* shows "This month", the report is requested for 2026-10-01..2026-10-31; tiles: Projects `12`, "3 with time logged in this range"; Tasks `9` with Upcoming 2, In progress 3, Completed 4; Workdays `3`, "Days with a start time, of 7 weekdays so far"; Average start `08:35`, "Earliest 08:00 · latest 09:15" | `web/features/dashboard/components/dashboard-view.ac.test.tsx` | T2 |
| AC-8 | Choosing *Last 7 days* sets `?from=2026-10-03&to=2026-10-09` and requests that range; choosing *This month* clears both; `?from=2025-01-01&to=2026-10-09` requests 1–31 Oct; picking 1 Sep and 9 Oct in *Pick dates* and **Apply** sets `?from=2026-09-01&to=2026-10-09` and the select shows "Custom range" | `web/features/dashboard/components/dashboard-view.ac.test.tsx` | T2 |
| AC-9 | Worked · target · booked shows `11h 30m`, `21h` with "3 days × 7h", `6h`, "9h 30m under target", Worked of target `54%`, Booked of worked `52%`, "5h 30m still to book"; Running totals' legend shows `11h 30m`, `21h`, `6h`. Since T4 (D8): `154h` with "22 days × 7h", "142h 30m under target", Worked of target `7%`; the legend `11h 30m`, `154h`, `6h` | `web/features/dashboard/components/dashboard-view.ac.test.tsx` | T2, T4 |
| AC-10 | Hours by project lists Anthropic, Nvidia, PM Internal, Unsorted, Non-prod in that order; Anthropic links to `/app/project?id=…` and shows `4h 15m` and "2h booked"; PM Internal is plain text with the deleted marker (an element labelled "deleted"); Unsorted and Non-prod show `—`; a report with no projects → "Nothing logged in this range." | `web/features/dashboard/components/dashboard-view.ac.test.tsx` | T2 |
| AC-11 | Workdays card shows "by day"; its **Table** tab has 22 rows, the 6 Oct row "Tue, 6 Oct 2026", `08:30`, `5h 15m`, `2h`, `7h`. Since T5 (D9): with the Non-prod column, `5h 15m`, `2h`, `0h`, `7h` | `web/features/dashboard/components/dashboard-view.ac.test.tsx` | T2, T5 |
| AC-12 | Report pending → no card content, skeletons; report error → "Couldn't load the dashboard." and **Retry** requests it again; the project count failing → `—` in Projects while the rest shows | `web/features/dashboard/components/dashboard-view.ac.test.tsx` | T2 |
| AC-14 | Running totals (D6): with the report, the legend shows `11h 30m`, `21h`, `6h` (as AC-9); with a report whose only day is 9 Oct `{480, 0, 0}` (a start, no logs) → the legend shows Worked `0h`, Target `7h`, Booked `0h` and the card says "Nothing logged in this range." Since T4 (D8): Target `154h` there | `web/features/dashboard/components/dashboard-view.ac.test.tsx` | T3, T4 |
| AC-15 | `stats.ts`, `running-totals.tsx`, `dashboard-view.tsx` and `workday-chart.tsx` equal their prototype twins | check | T3 |
| AC-16 | In the browser (D7): hovering a Workdays bar puts the start panel's hover line through that day's start dot and the bar's centre; Running totals has no flat stretches before today and runs flat from today to the range's end | manual | T3 |
| AC-17 | `stats.ts`, `hours-summary.tsx` and `workday-chart.tsx` equal their prototype twins | check | T4 |
| AC-18 | In the browser (D8): this month shows the full Target ("N days × 7h", N = its Monday–Friday dates) from its first day; a weekend day's tooltip and Table row show Target `0h`; Running totals' target climbs on each weekday to the Target at the range's end | manual | T4 |
| AC-19 | D9: the report with `nonprodMinutes` 90 on 6 Oct and a day Sat 10 Oct `{null, 0, 0, nonprod 60}` → Workdays by day has 23 items; its **Table** has a Non-prod column, the 6 Oct row "Tue, 6 Oct 2026", `08:30`, `5h 15m`, `2h`, `1h 30m`, `7h` and the 10 Oct row Non-prod `1h`, Target `0h`; Worked · target · booked still shows `11h 30m`; Workdays tile `3` | `web/features/dashboard/components/dashboard-view.ac.test.tsx` | T5 |
| AC-20 | `stats.ts`, `dashboard-view.tsx`, `workday-chart.tsx` and `features/time/components/logged-time-chart.tsx` equal their prototype twins; no `web/proto/features/dashboard/proposed-types.ts` | check | T5 |
| AC-21 | In the browser (D9): a day with an excluded log shows a grey Non-prod segment on top of its bar, a "Non-prod" tooltip row and legend item, in light and dark; the excluded minutes are in no tile, total or running line | manual | T5 |
| AC-13 | In the browser: the start line and the stacked bars share one hover with SCR-010's tooltip; a bar of a past day opens Logs on that date; 1 Jan–30 Jun shows weekly bars; a custom range over 366 days disables **Apply** with "Pick at most 366 days."; the colours read in light and dark | manual | T2 |

Typed stubs (created with the tests, so lint and typecheck pass while the tests fail):
- `web/features/dashboard/api.ts`: the exports above, hooks throwing `new Error("not implemented (feat-rpt-web)")` (`reportKeys` and the type re-export real).
- `web/features/dashboard/components/dashboard-view.tsx`: `DashboardView`, its body `throw new Error("not implemented (feat-rpt-web)")`.

## Checks
```bash
# AC-17: twins equal
node scripts/pm4.mjs twins
```
```bash
# AC-20: twins equal, the proposed types gone (D9)
node scripts/pm4.mjs twins && test ! -e web/proto/features/dashboard/proposed-types.ts
```

## Tasks
| # | Task | App | Size | Tier | Why this tier | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | Dashboard hooks (`features/dashboard/api.ts`): the report and the counts | web | S | haiku | Copies `features/bookings/api.ts`; the keys, URLs and params are stated | — (feat-rpt-api, feat-tlog-web, feat-book-web done) |
| T2 | Dashboard page: range picker in the URL, count tiles, workday chart and table, worked / target / booked, running totals, hours by project | web | L | sonnet | Two synced recharts panels with custom tooltips and click-through, a range picker with a draft and URL state, loading and error states across six components | T1 |
| T3 | Running totals without empty days and the aligned Workdays hover (D6, D7): four prototype twins | web | S | haiku | Twin copy, the commands under *Web (T3)* | T2 |
| T4 | Weekday target (D8): three prototype twins | web | S | haiku | Twin copy, the commands under *Web (T4)* | T3 |
| T5 | Non-prod out of worked, shown as a Workdays segment (D9): four prototype twins, the proposed types removed | web | S | haiku | Twin copy, the commands under *Web (T5)* | T4, feat-rpt-api T2 |

## Open questions
None.

## Changelog
- 2026-10-09: Initial draft from the owner's Dashboard screen (OQ-126…OQ-130). Ready for review.
- 2026-10-31: D6 (owner, OQ-250, OQ-251): Running totals leaves out past days without logs and runs flat from today over the remaining weekdays, its legend shows the range totals, no logs → "Nothing logged in this range."; D7: the Workdays start panel uses a band x-axis so its hover lines up with the bars. Prototype `f453800` + `5546896`, T3, AC-5 updated, AC-14…AC-16. Back to `review`.
- 2026-10-31: Approved by the owner.
- 2026-11-01: D8 (owner, OQ-258…OQ-260): Target = the range's Monday–Friday dates × the daily target, future ones included; weekend days never add to it; all worked hours are compared; the running target climbs on every weekday. Prototype `bf93b65`, T4, AC-2…AC-5, AC-9, AC-14 updated, AC-17, AC-18. Back to `review`.
- 2026-11-01: Approved by the owner.
- 2026-11-02: D9 (owner, OQ-261): logs excluded from statistics leave *Worked* and every total; the Workdays chart shows them as a grey Non-prod segment, tooltip row, legend item and table column. Prototype `570b9cc`, T5, AC-2, AC-3, AC-11 updated, AC-19…AC-21. Back to `review`.
