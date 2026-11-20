---
id: feat-tlog-logged-range
title: Date range on the Logged time section
status: approved
owner: Marko Angelovski
last_updated: 2026-11-20
milestone: M4
requirements: [FR-TLOG-012, SCR-044, API-TLOG-001]
related: [api-endpoints, web-screens, web-prototype, ADR-0012, OQ-286, feat-rpt-web, feat-shell-form-drafts]
prototype: b2d6976
---

# Date range on the Logged time section

## Goal
The **Logged time** card on the project and task pages gets the Statistics range control, so a long-running project or task
loads only the logs of a range (FR-TLOG-012, SCR-044, OQ-286). API-TLOG-001 takes a required `from`/`to`.

## Decisions
| # | Decision | Source |
| --- | --- | --- |
| D1 | The control is SCR-010's range picker with `STATS_PRESETS` (default **So far**), in the URL as `from`/`to` (`history: "replace"`, absent = So far); changing it resets `logsPage`. No **All time**: every range is bounded, at most 366 days. | OQ-286 (owner, prototype `b2d6976`) |
| D2 | The range filters everything in the card: `total`, `totalMinutes`, `bookedMinutes`, `days` and the page. The chart covers every date of the range, not only logged ones. Empty → "No time logged in this range." | OQ-286 (owner, prototype `b2d6976`) |
| D3 | The **Logged** columns of SCR-020 and SCR-030 stay all-time (they come from API-PRJ-002 / API-TSK-002, unchanged). | OQ-286 (owner, prototype `b2d6976`) |
| D4 | API-TLOG-001: `from`, `to` required work dates, `from` ≤ `to` ≤ `from` + 366 days, else `400` with API-RPT-001's errors (missing or malformed → its own field; order or length → field `to`, "must not be before from and at most 366 days after it"). A log counts when its `work_date` is in the range, whatever its bookings' dates (as `ReportDay`, OQ-127). | Agent, from the prototype's `proposed-types.ts` and API-RPT-001 |
| D5 | The test step adds the contract: `from`/`to` on `ListTimeLogsQueryDto`, `openapi.json`, `schema.d.ts`. The service ignores them until T1. | Agent |
| D6 | T2 copies the whole `features/time/api.ts` twin, which also carries feat-shell-form-drafts' `forgetDraftsOf` in `useDeleteLog`; so T2 depends on that feature's T1. | Agent (one branch for both, owner 2026-11-20) |

## Scope
**In:** `from`/`to` in `api/src/time` (DTO, service, repository); the web twins of `features/time/api.ts`, the Logged time section and chart.

**Test step (main session, before T1):** the stubs of D5, then:
- `api/test/logged-time.ac.e2e-spec.ts`: every `GET /time-logs` gets `&from=2026-10-01&to=2026-10-31` (results unchanged); the new ACs below.
  `api/test/bookings.ac.e2e-spec.ts` AC-10: the same range on both requests.
- `web/features/time/logged-time.ac.test.tsx` and `web/features/bookings/api.ac.test.tsx`: `timeKeys.logList(filter, range, page)` and
  `useTimeLogs(filter, range, page)` with an October 2026 range.
- `web/features/time/components/logged-time-section.ac.test.tsx`: the router also answers `/api/v1/me` (`timeZone: "UTC"`),
  the system time is 2026-10-20; "No time logged in this range."; the by-week case sets `?from=2026-10-01&to=2026-12-15`; the new ACs below.
  `web/features/projects/components/project-detail.ac.test.tsx` and `web/features/tasks/components/task-detail.ac.test.tsx`: only where
  they assert the time-logs query. Then `pm4 hash`.

**Non-goals** (implementers must not touch these):
- `web/features/dashboard/**` (`RangePicker`, `parseRange`, `presetRange`, `STATS_PRESETS` are reused as they are), `web/lib/**`
  (except the generated `schema.d.ts`), `web/proto/mock/**`, and every prototype file except T2's two below.
- API-PRJ-002, API-TSK-002 and the Logged columns (D3); the database schema, migrations and indexes.
- Any acceptance test (`*.ac.*`).

## Read first
| Path | Why / copy this |
| --- | --- |
| `specs/03-api/endpoints.md#api-tlog-001-list-the-logs-of-a-project-or-task` | Contract (T1) |
| `api/src/time/reports.service.ts` → `dashboard` | The range check and its error, to copy (T1) |
| `api/src/time/time.repository.ts` → `listLogs` | Where the range goes (T1) |
| `web/proto/features/time/api.ts` | The hooks the promoted section calls; production keeps the names (T2) |
| `specs/04-web/prototype.md#twin-check` | What "equals its twin" means (T2) |

## Files
| App | File | C/M | Task | Notes |
| --- | --- | --- | --- | --- |
| api | `api/test/logged-time.ac.e2e-spec.ts`, `api/test/bookings.ac.e2e-spec.ts` | M | tests | Scope |
| api | `api/src/time/dto/list-time-logs-query.dto.ts` | M | tests | `from`, `to` (D5) |
| api | `api/openapi.json` | M | tests | `npm run openapi:export` |
| api | `api/src/time/time-logs.service.ts`, `api/src/time/time.repository.ts` | M | T1 | Range check and filter |
| api | `api/src/time/*.spec.ts` | M | T1 | Ordinary tests, adjust only for the range |
| web | `web/lib/api/schema.d.ts` | M | tests | `npm run api:types` |
| web | `web/features/time/logged-time.ac.test.tsx`, `web/features/bookings/api.ac.test.tsx`, `web/features/time/components/logged-time-section.ac.test.tsx` | M | tests | Scope |
| web | `web/features/projects/components/project-detail.ac.test.tsx`, `web/features/tasks/components/task-detail.ac.test.tsx` | M | tests | Scope |
| web | `web/proto/features/time/api.ts` | M | T2 | Drops `proposed-types` |
| web | `web/proto/features/time/proposed-types.ts` | D | T2 | `rm` |
| web | `web/features/time/api.ts`, `web/features/time/components/logged-time-section.tsx`, `web/features/time/components/logged-time-chart.tsx` | M | T2 | Replaced by their twins |

## Interfaces

### Contract stubs (test step; T1, T2)
```ts
// api/src/time/dto/list-time-logs-query.dto.ts — after taskId (copy WorkdaysQueryDto's decorators; import ApiProperty, IsISO8601, Matches)
/** First work date of the range (`YYYY-MM-DD`). */
@ApiProperty({ type: String, format: "date" })
@Matches(/^\d{4}-\d{2}-\d{2}$/)
@IsISO8601({ strict: true })
from: string;

/** Last work date of the range, inclusive: from ≤ to ≤ from + 366 days. */
@ApiProperty({ type: String, format: "date" })
@Matches(/^\d{4}-\d{2}-\d{2}$/)
@IsISO8601({ strict: true })
to: string;
```
Then `npm run openapi:export` (api) and `npm run api:types` (web). The now-required `from`/`to` break `useTimeLogs`' typecheck, so
the test step casts its query in `web/features/time/api.ts` (one comment-marked cast); T2 replaces that file with its twin.

### API (T1)
`api/src/time/time-logs.service.ts`: `const MAX_RANGE_DAYS = 366;` at the top. In `list`, after the `projectId`/`taskId` check:
```ts
assertDate(query.from, "from");
assertDate(query.to, "to");
const span = daysBetween(query.from, query.to);
if (span < 0 || span > MAX_RANGE_DAYS) {
  throw new BadRequestException({
    errors: [{ field: "to", message: `must not be before from and at most ${MAX_RANGE_DAYS} days after it` }]
  });
}
```
and pass `{ from: query.from, to: query.to }` to `listLogs`, between `filter` and `query.page`.

`api/src/time/time.repository.ts` `listLogs(userId, filter, range: { from: string; to: string }, page, pageSize)`:
- `const where = and(eq(timeLogs.userId, userId), link, between(timeLogs.workDate, range.from, range.to));` (`between` from `drizzle-orm`), so
  the page, `total`, `totalMinutes` and `bookedMinutes` cover the range.
- the `days` query's inner `WHERE` gains `AND work_date BETWEEN ${range.from} AND ${range.to}`.

Then `npm run openapi:export` (no diff after the test step's export).

### Web (T2)
In `web/proto/features/time/api.ts`, delete `import type { TimeLogListQuery } from "./proposed-types";` and inline the query:
```ts
    queryFn: async ({ signal }) =>
      unwrap(
        await apiClient.GET("/api/v1/time-logs", {
          params: {
            query: { ...filter, from: range.from, to: range.to, page, pageSize: TIME_LOG_PAGE_SIZE }
          },
          signal
        })
      ),
```
Then, from `web/`:
```bash
rm proto/features/time/proposed-types.ts
for f in features/time/api.ts features/time/components/logged-time-section.tsx features/time/components/logged-time-chart.tsx; do
  sed 's#@/proto/mock/client#@/lib/api/client#; s#@/proto/#@/#g' "proto/$f" > "$f"
done
npx prettier --write features/time proto/features/time
node ../scripts/pm4.mjs twins
```
`features/time/api.ts` then imports `@/features/system/form-drafts` (feat-shell-form-drafts T1) and `@/features/dashboard/range`.

## Acceptance criteria
API fixtures (the existing seed): user A, project P with tasks T1, T2. P's logs: 60 min direct on 2026-10-06, booked to 2026-10-07;
30 min on T1 on 2026-10-07, unbooked; 15 min on T2 on 2026-10-06, excluded. User B's log on B's project.
Web: system time 2026-10-20, `me.timeZone` "UTC".

| AC | Case → expected | Test | Task |
| --- | --- | --- | --- |
| AC-1 | `?projectId=P&from=2026-10-07&to=2026-10-07` → `items` `[onT1]`, `total` 1, `totalMinutes` 30, `bookedMinutes` 0, `days` `[{2026-10-07, 30, 0}]` | `api/test/logged-time.ac.e2e-spec.ts` | T1 |
| AC-2 | `?projectId=P&from=2026-10-06&to=2026-10-06` → the direct and T2 logs, `total` 2, `totalMinutes` 75, `bookedMinutes` 60 (the booking dated 2026-10-07 counts on the log's date), `days` `[{2026-10-06, 75, 60}]` | `api/test/logged-time.ac.e2e-spec.ts` | T1 |
| AC-3 | `?taskId=T1&from=2026-11-01&to=2026-11-30` → `items: []`, totals 0, `days: []` | `api/test/logged-time.ac.e2e-spec.ts` | T1 |
| AC-4 | No `from` → `400` field `from`; no `to` → field `to`; `from=2026-02-30` → field `from`; `from=2026-10-08&to=2026-10-07` → field `to`; `from=2026-01-01&to=2027-01-03` (367 days) → field `to`; `to=2027-01-02` (366) → `200` | `api/test/logged-time.ac.e2e-spec.ts` | T1 |
| AC-5 | `useTimeLogs({ projectId: "p1" }, { from: "2026-10-01", to: "2026-10-31" }, 1)` → GET `/api/v1/time-logs` with `{ projectId: "p1", from: "2026-10-01", to: "2026-10-31", page: 1, pageSize: 25 }`, key `timeKeys.logList(filter, range, 1)`; a log mutation invalidates it | `web/features/time/logged-time.ac.test.tsx` | T2 |
| AC-6 | Section without `from`/`to` in the URL → requests `from` "2026-10-01", `to` "2026-10-20"; the select shows **So far** | `web/features/time/components/logged-time-section.ac.test.tsx` | T2 |
| AC-7 | `?from=2026-01-01&to=2026-03-31&logsPage=2` → that range is requested; choosing **Last 7 days** → the URL gets `from=2026-10-14&to=2026-10-20` and loses `logsPage`; choosing **So far** again → the URL has no `from`/`to` | `web/features/time/components/logged-time-section.ac.test.tsx` | T2 |
| AC-8 | `total` 0 → "No time logged in this range." and no totals | `web/features/time/components/logged-time-section.ac.test.tsx` | T2 |
| AC-9 | `?from=2026-10-01&to=2026-12-15` with logs on two dates → the chart goes "· by week" (the range, not the logged dates, sets the buckets) | `web/features/time/components/logged-time-section.ac.test.tsx` | T2 |
| AC-10 | `npm run dev`: a project page → **This year** and a custom range change the totals, chart and table; the Projects list's **Logged** column doesn't change | manual | T2 |

Typed stubs: *Contract stubs* above.

## Tasks
| # | Task | App | Size | Tier | Why this tier | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | `from`/`to` on `GET /time-logs` (API-TLOG-001): the range check and the filter, `openapi:export` | api | S | haiku | Check copied from `ReportsService.dashboard`; the filter is spelled out | — |
| T2 | Web from the prototype: `useTimeLogs` with the range, the Logged time section's range control and chart; drop `proposed-types.ts` | web | S | haiku | Copy commands spelled out; one inline edit | T1, feat-shell-form-drafts T1 |

## Agents
| Step | Agent | Date |
| --- | --- | --- |
| Prototype | `claude-code/claude-opus-5-5` | 2026-11-20 |
| Spec | `claude-code/claude-opus-5-5` | 2026-11-20 |
| Tasks (`pm4 tasks`) | `claude-code/claude-opus-5-5` | 2026-11-20 |
| Acceptance tests | `claude-code/claude-opus-5-5` | 2026-11-20 |

## Open questions
None. OQ-286 is resolved.

## Changelog
- 2026-11-20: Initial draft from prototype `b2d6976` (OQ-286). Ready for review.
- 2026-11-20: Approved by the owner.
