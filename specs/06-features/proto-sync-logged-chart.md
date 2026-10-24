---
id: feat-proto-sync-logged-chart
title: "Prototype sync: Logged time chart, billable hours, Statistics link and Bookings day links"
status: approved
owner: Marko Angelovski
last_updated: 2026-10-24
milestone: M4
requirements: [FR-TLOG-009, FR-TLOG-012, FR-TLOG-016, FR-BOOK-001, SCR-040, SCR-043, SCR-044, SCR-045, API-TLOG-001]
related: [web-prototype, ADR-0012, api-endpoints, web-screens, web-routing, feat-proto-sync-web, feat-rpt-web, OQ-127, OQ-222, OQ-223, OQ-224]
prototype: f0601be
---

# Prototype sync: Logged time chart, billable hours, Statistics link and Bookings day links

## Goal
Production catches up with the confirmed prototype (`f0601be`). The **Logged time** card on the project and task pages gets
**Chart** / **Table** tabs, a totals bar and a per-date chart (SCR-044), fed by `days` on API-TLOG-001 (OQ-222). The Logs header shows
billable hours as **Billable (%)** (SCR-040), the expanded pie fits narrow screens (SCR-043), Bookings day titles link to Logs (SCR-045),
and the sidebar's **Default** link reads **Statistics** ([routing.md#navigation](../04-web/routing.md#navigation)).

## Decisions
| # | Decision | Source |
| --- | --- | --- |
| D1 | API-TLOG-001 returns `days: LoggedDay[]` = `{ workDate, workedMinutes, bookedMinutes }`, one per date with a matching log (all of them, not only the page's), oldest first. `bookedMinutes` counts a log's bookings on its work date, whatever the bookings' dates, as `ReportDay` does. | OQ-222 (owner, 2026-10-24), OQ-127 |
| D2 | `days` covers excluded logs too, so it adds up to `totalMinutes` and `bookedMinutes` (as the prototype's mock). | Agent, prototype `f0601be` |
| D3 | The Chart / Table choice is component state (default Chart), not in the URL; paging shows on the Table tab only. | Owner, prototype `f0601be` |
| D4 | The web type is `LoggedDay = TimeLogList["days"][number]`, exported from both `features/time/api.ts` twins; `proto/features/time/proposed-types.ts` is deleted. | Agent |
| D5 | The Settings help keeps "Used for “% billable”"; the page heading and the sidebar group stay **Dashboard**. | OQ-223, OQ-224 (owner, 2026-10-24) |
| D6 | The test step adds the contract: `LoggedDayDto`, `days` on `TimeLogListResponseDto`, a stub `days: []` in `TimeLogsService.list`, `openapi.json`, `schema.d.ts`. It updates the existing acceptance tests the change breaks (Scope). | Agent |

## Scope
**In:** `days` in `api/src/time` (repository, service, DTO). The web twins of the Logged time section and chart, the Logs day header and
charts, the Bookings day section, from the prototype; the `LoggedDay` type in both `api.ts` twins; the sidebar link.

**Test step (main session, before T1):** the stubs of D6, then:
- `api/test/logged-time.ac.e2e-spec.ts`: the whole-body expectations of the earlier AC-1…AC-5 get their `days`; the new ACs below.
- `web/features/time/components/logged-time-section.ac.test.tsx`: AC-11, AC-12, AC-20 click **Table** before reading the table and paging,
  and read the new totals; the new ACs below. Every `TimeLogList` fixture there and in `web/features/time/logged-time.ac.test.tsx`,
  `web/features/projects/components/project-detail.ac.test.tsx` and `web/features/tasks/components/task-detail.ac.test.tsx` gets `days`.
- `web/features/time/components/day-view.ac.test.tsx` AC-15: the **Billable (%)** card (AC-6).
- `web/app/(dashboard-layout)/layout/vertical/sidebar/sidebaritems.ac.test.ts` and `…/nav-collapse/nav-collapse.ac.test.tsx`: "Statistics".
- `web/features/bookings/components/bookings-view.ac.test.tsx`: AC-7. Then `pm4 hash`.

**Non-goals** (implementers must not touch these):
- `web/proto/mock/*`, `web/proto/lib/*`, `web/app/proto/*`, and every prototype component except the import in `logged-time-chart.tsx` (T2).
- `web/features/dashboard/*` (`buckets`, `eachDay`, `hourTicks` are reused as they are), `web/components/ui/*`, `web/lib/*`
  (except the generated `schema.d.ts`), the Settings help text and the Dashboard heading (D5).
- The database schema and migrations (no new column or index).
- Any acceptance test (`*.ac.*`).

## Read first
| Path | Why / copy this |
| --- | --- |
| `specs/03-api/endpoints.md#api-tlog-001-list-the-logs-of-a-project-or-task` | Contract, `days` (T1) |
| `api/src/time/time.repository.ts` → `listLogs`, `reportDays` | Where `days` goes; the per-log booked subquery to copy (T1) |
| `api/src/time/time-logs.service.ts` → `list` | Maps the repository result (T1) |
| `web/proto/features/time/api.ts` | The mock hooks the promoted components call; production keeps the names (T2) |
| `specs/04-web/prototype.md#twin-check` | What "equals its twin" means (T2) |

## Files
| App | File | C/M | Task | Notes |
| --- | --- | --- | --- | --- |
| api | `api/test/logged-time.ac.e2e-spec.ts` | M | tests | New ACs; earlier bodies get `days` |
| api | `api/src/time/dto/time-log-list-response.dto.ts` | M | tests | `LoggedDayDto`, `days` (D6) |
| api | `api/src/time/time-logs.service.ts` | M | tests, T1 | `days: []` stub, then the repository's |
| api | `api/src/time/time.repository.ts` | M | T1 | `listLogs` returns `days` |
| api | `api/src/time/*.spec.ts` | M | T1 | Ordinary tests, adjust only for `days` |
| api | `api/openapi.json` | M | tests, T1 | `npm run openapi:export` |
| web | `web/lib/api/schema.d.ts` | M | tests | `npm run api:types` |
| web | `web/features/time/components/logged-time-section.ac.test.tsx`, `web/features/time/components/day-view.ac.test.tsx` | M | tests | Scope |
| web | `web/features/time/logged-time.ac.test.tsx`, `web/features/projects/components/project-detail.ac.test.tsx`, `web/features/tasks/components/task-detail.ac.test.tsx` | M | tests | `days` in fixtures |
| web | `web/features/bookings/components/bookings-view.ac.test.tsx` | M | tests | AC-7 |
| web | `web/app/(dashboard-layout)/layout/vertical/sidebar/sidebaritems.ac.test.ts`, `web/app/(dashboard-layout)/layout/vertical/sidebar/nav-collapse/nav-collapse.ac.test.tsx` | M | tests | "Statistics" |
| web | `web/proto/features/time/components/logged-time-chart.tsx` → `web/features/time/components/logged-time-chart.tsx` | P | T2 | Import `LoggedDay` (D4) |
| web | `web/proto/features/time/components/logged-time-chart.tsx` | M | T2 | Import `LoggedDay` from `../api` (D4) |
| web | `web/proto/features/time/proposed-types.ts` | D | T2 | Deleted with `rm` (D4) |
| web | `web/features/time/api.ts`, `web/proto/features/time/api.ts` | M | T2 | `LoggedDay`; the prototype twin from production |
| web | `web/features/time/components/logged-time-section.tsx`, `web/features/time/components/day-header.tsx`, `web/features/time/components/day-charts.tsx` | M | T2 | Replaced by the twins |
| web | `web/features/bookings/components/day-section.tsx` | M | T2 | Replaced by the twin |
| web | `web/app/(dashboard-layout)/layout/vertical/sidebar/sidebaritems.ts`, `web/app/(dashboard-layout)/layout/vertical/sidebar/sidebaritems.test.ts` | M | T2 | "Statistics", `ChartColumn` |

## Interfaces

### Contract stubs (test step; T1, T2)
```ts
// api/src/time/dto/time-log-list-response.dto.ts — above TimeLogListResponseDto (copy ReportDayDto's workDate decorator)
/** `LoggedDay`: one date with a matching log (API-TLOG-001 `days`). */
export class LoggedDayDto {
  @ApiProperty({ type: String, format: "date", example: "2026-10-06" })
  workDate: string;
  /** Minutes of that date's matching logs (excluded ones too). */
  @ApiProperty({ type: "integer", example: 315 })
  workedMinutes: number;
  /** Booked minutes of those logs, whatever the bookings' dates. */
  @ApiProperty({ type: "integer", example: 120 })
  bookedMinutes: number;
}
// TimeLogListResponseDto, after bookedMinutes:
/** Every date with a matching log (not only this page's), oldest first. */
@ApiProperty({ type: [LoggedDayDto] })
days: LoggedDayDto[];
```
`TimeLogsService.list` returns `days: [] // stub (feat-proto-sync-logged-chart)` until T1. Then `npm run openapi:export` (api) and
`npm run api:types` (web).

### API (T1)
```ts
// api/src/time/time.repository.ts — listLogs's result gains
//   days: { workDate: string; workedMinutes: number; bookedMinutes: number }[];
// a fourth query in its Promise.all (reportDays' per-log subquery, filtered like `where`):
this.db.execute<{ work_date: string; worked: number; booked: number }>(sql`
  SELECT work_date::text AS work_date, SUM(duration_minutes)::int AS worked,
         COALESCE(SUM(booked_minutes), 0)::int AS booked
  FROM (
    SELECT work_date, duration_minutes,
           (SELECT SUM(bk.minutes) FROM bookings bk WHERE bk.time_log_id = time_logs.id) AS booked_minutes
    FROM time_logs
    WHERE user_id = ${userId} AND ${"projectId" in filter ? sql`project_id = ${filter.projectId}` : sql`task_id = ${filter.taskId}`}
  ) per_log
  GROUP BY work_date
  ORDER BY work_date
`)
// days: result.rows.map((row) => ({ workDate: row.work_date, workedMinutes: row.worked, bookedMinutes: row.booked }))

// api/src/time/time-logs.service.ts list(): destructure `days` from listLogs and return it after bookedMinutes.
```
Then `npm run openapi:export` (must leave no diff after the test step's export).

### Web (T2)
`LoggedDay` in `web/features/time/api.ts`, after `TimeLogFilter`:
```ts
/** One date of API-TLOG-001 `days` (the Logged time chart). */
export type LoggedDay = TimeLogList["days"][number];
```
In `web/proto/features/time/components/logged-time-chart.tsx`, `import type { LoggedDay } from "../api";` replaces the
`../proposed-types` import, and `LoggedDayDto` becomes `LoggedDay` (both uses). Then, from `web/`:
```bash
rm proto/features/time/proposed-types.ts
# The prototype api.ts becomes production's twin (drops proposed-types and the cast):
sed 's#@/lib/api/client#@/proto/mock/client#; s#@/features/#@/proto/features/#g' features/time/api.ts > proto/features/time/api.ts
for f in features/time/components/logged-time-chart.tsx features/time/components/logged-time-section.tsx \
         features/time/components/day-header.tsx features/time/components/day-charts.tsx \
         features/bookings/components/day-section.tsx; do
  sed 's#@/proto/mock/client#@/lib/api/client#; s#@/proto/#@/#g' "proto/$f" > "$f"
done
npx prettier --write features/time features/bookings proto/features/time
node ../scripts/pm4.mjs twins
```
Sidebar (`sidebaritems.ts`): the `dashboard` item's `name` becomes `"Statistics"` and its `icon` `ChartColumn` (the lucide import replaces
`House`, kept in alphabetical order). `sidebaritems.test.ts`: `["Dashboard", ["Statistics"]]`.

## Acceptance criteria
API fixtures (the existing seed): user A, project P with tasks T1, T2. P's logs: 60 min direct on 2026-10-06, booked to 2026-10-07;
30 min on T1 on 2026-10-07, unbooked; 15 min on T2 on 2026-10-06, excluded. User B's log on B's project.
Web fixtures: the section's `projectLogs` (105 min, 60 booked) with `days` `[{2026-10-06, 75, 60}, {2026-10-07, 30, 0}]`.

| AC | Case → expected | Test | Task |
| --- | --- | --- | --- |
| AC-1 | `GET /time-logs?projectId=P` → `days` `[{workDate: "2026-10-06", workedMinutes: 75, bookedMinutes: 60}, {workDate: "2026-10-07", workedMinutes: 30, bookedMinutes: 0}]` (the booking counts on the work date; the excluded log counts) | `api/test/logged-time.ac.e2e-spec.ts` | T1 |
| AC-2 | `?taskId=T1` → `days` `[{2026-10-07, 30, 0}]` | `api/test/logged-time.ac.e2e-spec.ts` | T1 |
| AC-3 | `?projectId=P&pageSize=2&page=2` and `page=3` → the same `days` as AC-1 | `api/test/logged-time.ac.e2e-spec.ts` | T1 |
| AC-4 | B's project id or an unknown UUID → `days: []`; B's log never counts | `api/test/logged-time.ac.e2e-spec.ts` | T1 |
| AC-5 | Logged time section: the **Chart** tab is selected at first, no table is shown, the totals read **Total worked** `1h 45m`, **Booked** `1h`, **Not booked** `45m`, "57% booked · 45m still to book", the legend "· by day" and the hint "Click a bar to open that day in Logs."; **Table** shows the table (AC-11) and paging (AC-12); all booked → "Everything is booked"; no logs → "No time logged yet." and no totals; `days` spanning 2026-10-01…2026-12-15 → "· by week" and no hint | `web/features/time/components/logged-time-section.ac.test.tsx` | T2 |
| AC-6 | Logs header: the card **Billable (%)** shows the billable time and `(36%)` (the AC-15 fixture); no "% billable" label | `web/features/time/components/day-view.ac.test.tsx` | T2 |
| AC-7 | Bookings: each day title is a link to `/app/time?date=<workDate>` with the date in full | `web/features/bookings/components/bookings-view.ac.test.tsx` | T2 |
| AC-8 | Sidebar: the **Dashboard** section holds `["dashboard", "Statistics", "/app"]` with the `ChartColumn` icon; the collapsed nav shows "Statistics" | `web/app/(dashboard-layout)/layout/vertical/sidebar/sidebaritems.ac.test.ts`, `web/app/(dashboard-layout)/layout/vertical/sidebar/nav-collapse/nav-collapse.ac.test.tsx` | T2 |
| AC-9 | Dev server at 375 × 667: Logs → expand the pie → the dialog fits without page scroll, the legend scrolls; a project's Logged time chart → clicking a day's bar opens that day in Logs | manual | T2 |

Typed stubs: *Contract stubs* above.

## Tasks
| # | Task | App | Size | Tier | Why this tier | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | `days` on `GET /time-logs` (API-TLOG-001), `openapi:export` | api | S | haiku | The query is spelled out in *Interfaces*; copy `reportDays` | — |
| T2 | Web from the prototype: the Logged time chart and tabs, `LoggedDay` and the prototype `api.ts` twin, the Logs header and pie dialog, Bookings day links, the Statistics link | web | M | haiku | Copy commands spelled out; one import change and a two-line sidebar edit; no logic | T1 |

## Open questions
None. OQ-222…OQ-224 are resolved.

## Changelog
- 2026-10-24: Initial draft from prototype `f0601be` (OQ-222…OQ-224). Ready for review.
- 2026-10-24: Approved by the owner.
