---
id: feat-proto-sync-web
title: "Prototype sync: logged time on projects and tasks, Dashboard and Bookings from the prototype"
status: approved
owner: Marko Angelovski
last_updated: 2026-10-11
milestone: M4
requirements: [FR-PRJ-002, FR-TSK-002, FR-TSK-003, FR-TLOG-012, FR-BOOK-003, FR-BOOK-005, SCR-010, SCR-020, SCR-021, SCR-030, SCR-031, SCR-044, SCR-045, API-PRJ-002, API-PRJ-003, API-TSK-002, API-TSK-003, API-TLOG-001]
related: [web-prototype, ADR-0012, api-endpoints, web-screens, feat-rpt-web, feat-book-web, feat-tlog-web, OQ-131, OQ-132, OQ-133, OQ-134, OQ-135, OQ-136, OQ-137]
prototype: fa9a030
---

# Prototype sync: logged time on projects and tasks, Dashboard and Bookings from the prototype

## Goal
Production catches up with the confirmed prototype (`fa9a030`, OQ-131). The Projects and Tasks lists show each item's logged time
(SCR-020, SCR-030). The project and task pages get the **Logged time** section with the booked total and booking dates (SCR-044,
FR-TLOG-012). The Dashboard (SCR-010) and Bookings (SCR-045) screens become the prototype's. The API gains `loggedMinutes` and
`GET /time-logs` (API-TLOG-001).

## Decisions
| # | Decision | Source |
| --- | --- | --- |
| D1 | `loggedMinutes` is computed in the query on every `Project` and `Task` response, never stored. | OQ-132 (owner, 2026-10-11) |
| D2 | API-TLOG-001 items are `BookingLog`s, and the response adds `bookedMinutes`. | Owner, prototype `fa9a030` |
| D3 | Log create / update / delete also invalidate `["projects"]` and `["tasks"]`. `useSetBooking` and `useUpdateTask` also invalidate `["time", "logs"]`. | OQ-134 (owner, 2026-10-11) |
| D4 | The Log column shows the log text. The work date is the link to the day. The section's page is `?logsPage=` in the URL. | OQ-135 (owner) · Owner, prototype `fa9a030` |
| D5 | An existing production file becomes its prototype twin with `@/proto/` → `@/`, then Prettier (`pm4 promote` never overwrites). The prototype `api.ts` twins drop `proposed-types.ts` and equal production apart from the `apiClient` import. | OQ-131 (owner) · Agent |
| D6 | `format` / `format:check` also cover `features` and `proto`, and `features/` is formatted once. | OQ-137 (owner, 2026-10-11) |
| D7 | Specs and acceptance tests use the prototype seed's sample names; the old ones are replaced everywhere (the mapping is kept outside the repo, so it never reaches git). The test step does the tests. | OQ-136 (owner, 2026-10-11) |
| D8 | The test step adds the contract as typed stubs: the API DTOs, `openapi.json`, `schema.d.ts`, and stub `list` and `useTimeLogs`. It also promotes T2's `P` rows, so both apps typecheck while the tests fail. | Agent |

## Scope
**In:** `loggedMinutes` and API-TLOG-001 in `api/src/projects`, `api/src/tasks` and `api/src/time`. The web data layer for logged time and its
invalidations, and the prototype twins of those `api.ts` files. The Logged column, the Logged time section, the Dashboard and Bookings
components from the prototype. Prettier coverage of `features/` and `proto/`.

**Test step (main session, before T1):** the stubs of D8. It renames the sample names in every acceptance test (D7, including project ids and variable
names derived from them). It adds `loggedMinutes` to the Project/Task fixtures of the web acceptance tests. It changes book-web's
`bookings-view.ac.test.tsx` AC-8 to the new collapsed headers (AC-17). It updates the API acceptance tests that compare whole `Project`/`Task`
bodies, and runs Prettier on `features/dashboard/components/dashboard-view.ac.test.tsx`, `features/dashboard/stats.ac.test.ts` and
`features/users/components/project-lead-field.ac.test.tsx`. Then `pm4 hash`.

**Non-goals** (implementers must not touch these):
- `web/proto/mock/*`, `web/proto/lib/*`, `web/app/proto/*`, and the prototype components (they are the source).
- `web/lib/*` (except the generated `schema.d.ts`), `web/components/ui/*`, `web/features/dashboard/{api,range,stats}.ts`,
  `web/features/bookings/days.ts` (already identical to the prototype).
- The database schema and migrations (no new column or index: `(project_id)` and `(task_id)` on `time_logs` exist).
- Any acceptance test (`*.ac.*`).

## Read first
| Path | Why / copy this |
| --- | --- |
| `specs/03-api/endpoints.md#shared-project-and-task-shapes` | `loggedMinutes`, `Project`, `Task` |
| `specs/03-api/endpoints.md#api-tlog-001-list-the-logs-of-a-project-or-task` | Contract (T1, T2) |
| `api/src/projects/projects.repository.ts` → `selectRows`, `toRow` | Where the computed column goes (T1) |
| `api/src/time/time.repository.ts` → `listBookingRange`, `selectRows` | The log query, `TimeLogRow` (T1) |
| `api/src/time/bookings.service.ts` → `list`, `toBookingLogDto` | The `400` body shape, the `BookingLog` mapping (T1) |
| `api/src/common/dto/page-query.dto.ts`, `api/src/projects/dto/project-response.dto.ts` | `page`/`pageSize`; a list response DTO (T1) |
| `web/proto/features/time/api.ts`, `web/proto/features/bookings/api.ts`, `web/proto/features/tasks/api.ts` | The mock hooks the promoted components call: production keeps these names and shapes (T2) |
| `web/features/projects/api.ts` → `TASKS_KEY` | A key root written out to avoid an import cycle (T2) |

## Files
| App | File | C/M | Task | Notes |
| --- | --- | --- | --- | --- |
| api | `api/test/logged-time.ac.e2e-spec.ts` | C | tests | Acceptance tests (API-TLOG-001, `loggedMinutes`) |
| api | `api/test/projects.ac.e2e-spec.ts`, `api/test/tasks.ac.e2e-spec.ts` | M | tests | Whole-body assertions get `loggedMinutes` |
| api | `api/test/bookings.ac.e2e-spec.ts`, `api/test/reports.ac.e2e-spec.ts` | M | tests | Sample names (D7) |
| api | `api/src/time/dto/list-time-logs-query.dto.ts` | C | tests | Final (D8) |
| api | `api/src/time/dto/time-log-list-response.dto.ts` | C | tests | Final (D8) |
| api | `api/src/projects/dto/project-response.dto.ts`, `api/src/tasks/dto/task-response.dto.ts` | M | tests | `loggedMinutes` (D8) |
| api | `api/src/projects/projects.service.ts`, `api/src/tasks/tasks.service.ts` | M | tests, T1 | `toDto`: stub `0`, then the row's value |
| api | `api/src/time/time-logs.controller.ts`, `api/src/time/time-logs.service.ts` | M | tests, T1 | `list`: stub, then real |
| api | `api/src/projects/projects.repository.ts`, `api/src/tasks/tasks.repository.ts`, `api/src/time/time.repository.ts` | M | T1 | |
| api | `api/src/projects/*.spec.ts`, `api/src/tasks/*.spec.ts`, `api/src/time/*.spec.ts` | M | T1 | Ordinary tests, adjust only for the new field/method |
| api | `api/openapi.json` | M | tests, T1 | `npm run openapi:export` |
| web | `web/lib/api/schema.d.ts` | M | tests | `npm run api:types` |
| web | `web/features/time/logged-time.ac.test.tsx` | C | tests | Acceptance tests (hooks, invalidations) |
| web | `web/features/time/components/logged-time-section.ac.test.tsx` | C | tests | Acceptance tests |
| web | `web/features/projects/components/projects-list.ac.test.tsx`, `web/features/projects/components/project-detail.ac.test.tsx` | M | tests | Logged column; the section |
| web | `web/features/tasks/components/tasks-list.ac.test.tsx`, `web/features/tasks/components/task-detail.ac.test.tsx` | M | tests | Logged column; the section |
| web | `web/features/bookings/components/bookings-view.ac.test.tsx` | M | tests | AC-8 headers (AC-17), sample names |
| web | `web/features/**/*.ac.test.ts`, `web/features/**/*.ac.test.tsx` | M | tests | `loggedMinutes` in fixtures, sample names, Prettier (Scope) |
| web | `web/proto/features/time/components/logged-time-section.tsx` → `web/features/time/components/logged-time-section.tsx` | P | tests, T2 | Promoted in the test step (D8); nothing to change |
| web | `web/proto/features/time/components/logged-total.tsx` → `web/features/time/components/logged-total.tsx` | P | tests, T2 | Nothing to change |
| web | `web/features/time/api.ts` | M | tests, T2 | Types, keys, page size (test step); `useTimeLogs` stub, then real; invalidations |
| web | `web/features/bookings/api.ts`, `web/features/tasks/api.ts` | M | T2 | Invalidations (D3) |
| web | `web/proto/features/time/api.ts`, `web/proto/features/bookings/api.ts`, `web/proto/features/tasks/api.ts`, `web/proto/features/projects/api.ts` | M | T2 | Same changes; schema types (D5) |
| web | `web/proto/features/projects/proposed-types.ts`, `web/proto/features/tasks/proposed-types.ts`, `web/proto/features/time/proposed-types.ts` | D | T2 | Deleted with `rm` |
| web | `web/features/projects/components/projects-list.tsx`, `web/features/projects/components/project-detail.tsx` | M | T2 | Replaced by the twin (D5) |
| web | `web/features/tasks/components/tasks-list.tsx`, `web/features/tasks/components/task-detail.tsx` | M | T2 | Replaced by the twin (D5) |
| web | `web/features/dashboard/components/*.tsx` (not the acceptance tests) | M | T3 | Replaced by the twins (D5) |
| web | `web/features/bookings/components/bookings-view.tsx`, `web/features/bookings/components/day-section.tsx`, `web/features/bookings/components/booking-cell.tsx`, `web/features/bookings/components/range-field.tsx` | M | T3 | Replaced by the twins (D5) |
| web | `web/package.json` | M | T3 | `format`, `format:check` (D6) |
| web | `web/features/tasks/schemas.ts`, `web/features/time/duration.ts`, `web/features/users/lead.ts` | M | T3 | `npm run format` (whitespace only) |

## Interfaces

### API (T1)
```ts
// api/src/projects/projects.repository.ts — ProjectRow gets `loggedMinutes: number`; selectRows adds (toRow keeps it in ...rest):
loggedMinutes: sql<number>`(SELECT coalesce(sum(${timeLogs.durationMinutes}), 0) FROM ${timeLogs}
  WHERE ${timeLogs.userId} = ${userId} AND ${timeLogs.projectId} = ${projects.id})`.mapWith(Number),
// api/src/tasks/tasks.repository.ts — TaskRow gets `loggedMinutes: number`; selectRows adds the same with
//   `${timeLogs.taskId} = ${tasks.id}`.
// projects.service.ts / tasks.service.ts toDto: `loggedMinutes: row.loggedMinutes`.

// api/src/time/time.repository.ts (copy listBookingRange)
/** API-TLOG-001: one page of a project's or task's logs (workDate desc, then id asc) and the totals over all of them. */
async listLogs(userId: string, filter: { projectId: string } | { taskId: string }, page: number, pageSize: number):
  Promise<{ rows: TimeLogRow[]; total: number; totalMinutes: number; bookedMinutes: number }>;
// where = and(eq(timeLogs.userId, userId), "projectId" in filter ? eq(timeLogs.projectId, filter.projectId) : eq(timeLogs.taskId, filter.taskId))
// rows: this.selectRows(this.db).where(where).orderBy(desc(timeLogs.workDate), asc(timeLogs.id)).limit(pageSize).offset((page - 1) * pageSize)
// totals: this.db.select({ total: count(),
//   totalMinutes: sql<number>`coalesce(sum(${timeLogs.durationMinutes}), 0)`.mapWith(Number),
//   bookedMinutes: sql<number>`coalesce(sum(${timeLogs.durationMinutes}) FILTER (WHERE ${timeLogs.bookingDate} IS NOT NULL), 0)`.mapWith(Number)
// }).from(timeLogs).where(where)

// api/src/time/time-logs.service.ts
async list(userId: string, query: ListTimeLogsQueryDto): Promise<TimeLogListResponseDto>;
// both or neither of projectId/taskId → throw new BadRequestException({ errors: [{ field: "projectId",
//   message: "exactly one of projectId and taskId is required" }] });
// items: rows.map((row) => ({ ...toTimeLogDto(row), bookingDate: row.bookingDate })) — don't import bookings.service.ts (it imports this file)

// api/src/time/time-logs.controller.ts
@Get() @ApiProblemResponses(400, 401)
list(@CurrentUser() user: AuthUser, @Query() query: ListTimeLogsQueryDto): Promise<TimeLogListResponseDto>;
```

### Contract stubs (test step; T1, T2)
```ts
// api/src/time/dto/list-time-logs-query.dto.ts — `GET /time-logs` query (API-TLOG-001); `q` is rejected (forbidNonWhitelisted)
export class ListTimeLogsQueryDto extends PickType(PageQueryDto, ["page", "pageSize"] as const) {
  @IsOptional() @IsUUID() projectId?: string;
  @IsOptional() @IsUUID() taskId?: string;
}
// api/src/time/dto/time-log-list-response.dto.ts — as ProjectListResponseDto, integers via @ApiProperty({ type: "integer" })
export class TimeLogListResponseDto {
  @ApiProperty({ type: [BookingLogResponseDto] }) items: BookingLogResponseDto[];
  page: number; pageSize: number; total: number; totalMinutes: number; bookedMinutes: number;
}
// ProjectResponseDto / TaskResponseDto, after taskCounts / dueDate:
/** Minutes of all the project's (task's) logs, computed (OQ-132). */ @ApiProperty({ type: "integer" }) loggedMinutes: number;
```
The stubs are `toDto`'s `loggedMinutes: 0`, `TimeLogsService.list` and the controller handler as written in T1, with the service body
`throw new Error("not implemented (feat-proto-sync-web)")`. `useTimeLogs` gets the same body. Then `npm run openapi:export` and
`npm run api:types`, and `node scripts/pm4.mjs promote <T2>`.

### Web data layer (tests, T2)
```ts
// web/features/time/api.ts — additions (test step: all of this, useTimeLogs as a stub)
import type { components } from "@/lib/api/schema";
export type TimeLogList = components["schemas"]["TimeLogListResponseDto"];
export type TimeLogFilter = { projectId: string } | { taskId: string };
export const TIME_LOG_PAGE_SIZE = 25;                  // SCR-044
timeKeys.logs = () => [...timeKeys.all, "logs"] as const;
timeKeys.logList = (filter: TimeLogFilter, page: number) => [...timeKeys.logs(), filter, page] as const;
/** API-TLOG-001, TIME_LOG_PAGE_SIZE per page, keepPreviousData. */
export function useTimeLogs(filter: TimeLogFilter, page: number): UseQueryResult<TimeLogList, Error>;
//   GET "/api/v1/time-logs", params.query { ...filter, page, pageSize: TIME_LOG_PAGE_SIZE }, signal; unwrap; placeholderData: keepPreviousData
```
Invalidations (D3, T2). `features/time/api.ts` imports `projectKeys` from `@/features/projects/api` and `taskKeys` from `@/features/tasks/api`
(neither imports `features/time`):
- `useCreateLog`, `useUpdateLog`, `useDeleteLog` → `onSuccess` awaits `Promise.all` of `timeKeys.all`, `projectKeys.all` and `taskKeys.all`.
- `useSetBooking` (`features/bookings/api.ts`) → `bookingKeys.all` and `timeKeys.logs()`.
- `useUpdateTask` (`features/tasks/api.ts`) → also `TIME_LOGS_KEY`, declared as
  `const TIME_LOGS_KEY = ["time", "logs"] as const; // timeKeys.logs(); not imported: features/time/api imports this file`.

Prototype twins (D5): make the same changes in `web/proto/features/{time,bookings,tasks}/api.ts`. In `web/proto/features/{projects,tasks,time}/api.ts`,
take the types from `@/lib/api/schema` exactly as production does: drop the `proposed-types` imports, the `as Project`/`as ProjectList`
casts and the `GetTimeLogs` cast. Then delete the three `proposed-types.ts` with `rm`. Every `web/proto/features/<d>/api.ts` then equals
`web/features/<d>/api.ts` apart from `@/proto/mock/client` ↔ `@/lib/api/client` and `@/proto/` ↔ `@/` (AC-19).

### Components (T2, T3)
Promoted files need no change. Replace the existing production files with their twins, from `web/`:
```bash
# T2
for f in features/projects/components/projects-list.tsx features/projects/components/project-detail.tsx \
         features/tasks/components/tasks-list.tsx features/tasks/components/task-detail.tsx; do
  sed 's#@/proto/#@/#g' "proto/$f" > "$f"
done
npx prettier --write features/projects/components features/tasks/components features/time/components
# T3: the same loop over features/dashboard/components/{dashboard-view,hours-summary,kpi-tiles,project-hours,range-picker,
#     running-totals,workday-chart}.tsx and features/bookings/components/{bookings-view,day-section,booking-cell,range-field}.tsx
```
T3 also sets these scripts in `web/package.json`, then runs `npm run format`:
- `"format": "prettier --write app components features hooks lib proto \"*.ts\" \"*.mjs\""`
- `"format:check": "prettier --check app components features hooks lib proto \"*.ts\" \"*.mjs\""`

## Acceptance criteria
Fixtures: user A, project P with task T1 and T2, project Q. Logs on P: 60 min direct, booked; 30 min on T1, unbooked; 15 min on T2,
excluded from statistics. One log of user B on B's own project.

| AC | Case → expected | Test | Task |
| --- | --- | --- | --- |
| AC-1 | `GET /time-logs?projectId=P` → `200`, items are `BookingLog`s (with `bookingDate`), `workDate` descending, then `id` ascending, the logs of T1/T2 included; `totalMinutes` 105, `bookedMinutes` 60, `total` 3 | `api/test/logged-time.ac.e2e-spec.ts` | T1 |
| AC-2 | `?taskId=T1` → only T1's log, `totalMinutes` 30, `bookedMinutes` 0 | `api/test/logged-time.ac.e2e-spec.ts` | T1 |
| AC-3 | `?projectId=P&pageSize=2&page=2` → 1 item, totals unchanged; `page=3` → `items: []`, totals unchanged | `api/test/logged-time.ac.e2e-spec.ts` | T1 |
| AC-4 | Both ids, or neither → `400` field `projectId`; a non-UUID id, `pageSize=101` or `q=x` → `400` | `api/test/logged-time.ac.e2e-spec.ts` | T1 |
| AC-5 | B's project id, or an unknown UUID → `items: []`, `total` 0, both sums 0; no request → `401` | `api/test/logged-time.ac.e2e-spec.ts` | T1 |
| AC-6 | `GET /projects` and `GET /projects/P` → P `loggedMinutes` 105, Q `0`; after `DELETE /tasks/T1` P is still 105; `POST /projects` → `0`; B's log never counts | `api/test/logged-time.ac.e2e-spec.ts` | T1 |
| AC-7 | `GET /tasks?projectId=P` and `GET /tasks/T1` → T1 30, T2 15; `PATCH /tasks/T1 {projectId: Q}` → P 75, Q 30 | `api/test/logged-time.ac.e2e-spec.ts` | T1 |
| AC-8 | `useTimeLogs({projectId}, 2)` → `GET /api/v1/time-logs?projectId=…&page=2&pageSize=25`, key `["time","logs",{projectId},2]`; the previous page stays shown while the next loads | `web/features/time/logged-time.ac.test.tsx` | T2 |
| AC-9 | `useCreateLog` / `useUpdateLog` / `useDeleteLog` success → `["time"]`, `["projects"]` and `["tasks"]` invalidated | `web/features/time/logged-time.ac.test.tsx` | T2 |
| AC-10 | `useSetBooking` success → `["time","bookings"]` and `["time","logs"]` invalidated; `useUpdateTask` success → `["time","logs"]` invalidated | `web/features/time/logged-time.ac.test.tsx` | T2 |
| AC-11 | Logged time section with `projectId`: "Total worked: 1h 45m", "Booked: 1h"; headers Date worked / Log / Task / Booked date / Duration; the date links to `/app/time?date=<workDate>`, the task to `/app/task?id=…`; a booked row shows its date, an unbooked one `-` | `web/features/time/components/logged-time-section.ac.test.tsx` | T2 |
| AC-12 | With `taskId`: no Task column. 30 logs → "Page 1 of 2"; **Next** sets `logsPage=2` and requests page 2. No logs → "No time logged yet."; a failed request → "Couldn't load the logs." and **Retry** refetches | `web/features/time/components/logged-time-section.ac.test.tsx` | T2 |
| AC-13 | Projects list: a **Logged** column; `loggedMinutes` 105 → `1h 45m`, 0 → `—` | `web/features/projects/components/projects-list.ac.test.tsx` | T2 |
| AC-14 | Tasks list (both the project section and `/app/tasks`): a **Logged** column; 30 → `30m`, 0 → `—` | `web/features/tasks/components/tasks-list.ac.test.tsx` | T2 |
| AC-15 | The project page shows **Logged time** and requests `/api/v1/time-logs?projectId=<id>…`; not while the project is in the trash | `web/features/projects/components/project-detail.ac.test.tsx` | T2 |
| AC-16 | The task page shows **Logged time** and requests `?taskId=<id>…`; not while the task is in the trash | `web/features/tasks/components/task-detail.ac.test.tsx` | T2 |
| AC-17 | Bookings, all rows collapsed → headers `Projects`, `""`, `""`, `""`, `Hours worked`, `Hours booked`; expanding a row → `Project`, `Tasks`, `Logs`, `Booking date`, `Hours worked`, `Hours booked`; **Book all** stays in the row in both states | `web/features/bookings/components/bookings-view.ac.test.tsx` | T3 |
| AC-18 | The replaced production components equal their prototype twins apart from imports and Prettier | check | T2, T3 |
| AC-19 | The prototype `api.ts` twins equal production apart from the client import; no `proposed-types.ts` is left | check | T2 |
| AC-20 | `format:check` covers `features` and `proto`, and passes | check | T3 |
| AC-21 | No old sample name in specs or tests (D7): the test writer greps the old names (kept outside the repo) and finds none | manual | T1 |

Typed stubs: *Contract stubs* above.

## Checks
```bash
# AC-18: T2's components equal their prototype twins
cd web
for f in features/projects/components/projects-list.tsx features/projects/components/project-detail.tsx \
         features/tasks/components/tasks-list.tsx features/tasks/components/task-detail.tsx \
         features/time/components/logged-time-section.tsx features/time/components/logged-total.tsx; do
  diff <(sed 's#@/proto/#@/#g' "proto/$f" | npx prettier --stdin-filepath "$f") "$f"
done
# AC-18: T3's components equal their prototype twins
cd web
for f in features/dashboard/components/{dashboard-view,hours-summary,kpi-tiles,project-hours,range-picker,running-totals,workday-chart}.tsx \
         features/bookings/components/{bookings-view,day-section,booking-cell,range-field}.tsx; do
  diff <(sed 's#@/proto/#@/#g' "proto/$f" | npx prettier --stdin-filepath "$f") "$f"
done
# AC-19: prototype api.ts twins equal production apart from the client import
cd web
for d in time bookings tasks projects dashboard users; do
  diff <(sed -e 's#@/proto/mock/client#@/lib/api/client#' -e 's#@/proto/#@/#g' "proto/features/$d/api.ts" | npx prettier --stdin-filepath "features/$d/api.ts") "features/$d/api.ts"
done
! ls proto/features/*/proposed-types.ts 2>/dev/null
# AC-20: format:check covers features and proto
grep -q '"format:check": "prettier --check app components features hooks lib proto ' web/package.json
cd web && npm run format:check
```

## Tasks
| # | Task | App | Size | Tier | Why this tier | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | `loggedMinutes` on projects and tasks, `GET /time-logs` (API-TLOG-001), `openapi:export` | api | M | haiku | Queries spelled out in *Interfaces*. Copy `listBookingRange` and `BookingsService.list` | — |
| T2 | Logged time on the web: `useTimeLogs` and the invalidations (D3), the prototype `api.ts` twins without proposed types, the Logged column and Logged time section from the prototype | web | M | haiku | Hooks, keys and the copy commands spelled out. The components are prototype copies | T1 |
| T3 | Dashboard and Bookings components from the prototype; `format` / `format:check` cover `features` and `proto` | web | M | haiku | Copy commands and scripts spelled out; no logic | T2 |

## Open questions
None. OQ-131…OQ-137 are resolved.

## Changelog
- 2026-10-11: Initial draft from prototype `fa9a030` (OQ-131…OQ-137). Ready for review.
- 2026-10-11: Approved by the owner.
