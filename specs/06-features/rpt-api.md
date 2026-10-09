---
id: feat-rpt-api
title: "Dashboard API: the dashboard report"
status: approved
owner: Marko Angelovski
last_updated: 2026-10-09
milestone: M5
requirements: [FR-RPT-002, FR-RPT-003, FR-RPT-004, FR-RPT-005, FR-RPT-006, API-RPT-001]
related: [req-reporting, api-endpoints, api-data-model, feat-tlog-api, feat-book-api, feat-rpt-web, OQ-127, OQ-129]
---

# Dashboard API: the dashboard report

## Goal
`GET /reports/dashboard?from=&to=` returns, for a date range, the worked and booked minutes and the start time per date, and the worked and booked
minutes per project, so the dashboard never downloads the logs themselves. Contract: [endpoints.md](../03-api/endpoints.md) API-RPT-001.
The web side is feat-rpt-web.

## Decisions
| # | Decision | Source |
| --- | --- | --- |
| D1 | One aggregate endpoint; the project and task counts reuse API-PRJ-002 and API-TSK-002. | OQ-129 (owner) |
| D2 | A booked log counts on its work date, whatever its booking date. | OQ-127 (owner) |
| D3 | The endpoint lives in the `time` module (a `reports` controller and service), reusing `TimeRepository`, `WorkdaysQueryDto` and the `Ref` mapping. | Agent: the data is the time module's |
| D4 | No new column or index: both queries scan `(user_id, work_date, id)` and the `workdays` primary key. | Agent |

## Scope
**In:** `ReportsController` and `ReportsService` in `api/src/time/`, their DTOs, two `TimeRepository` methods, the OpenAPI export.

**Before the tests are written:** feat-tlog-api and feat-book-api are done.

**Non-goals** (implementers must not touch these):
- Anything in `web/`. The existing time, booking, project and task endpoints and DTOs. The database schema and migrations.
- `api/test/*` files written in the test step.

## Read first
| Path | Why / copy this |
| --- | --- |
| `specs/03-api/endpoints.md#api-rpt-001-dashboard-report` | Contract |
| `api/src/time/bookings.controller.ts`, `bookings.service.ts` | The controller and service to copy: `WorkdaysQueryDto`, the 366-day check, `@ApiProblemResponses` |
| `api/src/time/time.repository.ts` | `listWorkdays` (an aggregate with `sql`), the `Ref` mapping (`toRef`) |
| `api/src/common/dto/ref.dto.ts` | `RefDto` |
| `api/test/bookings.ac.e2e-spec.ts`, `api/test/support/*` | Seeding, booking and sign-in in e2e tests; `testDb()` for raw SQL |

## Files
| App | File | C/M | Task | Notes |
| --- | --- | --- | --- | --- |
| api | `api/test/reports.ac.e2e-spec.ts` | C | tests | Acceptance tests |
| api | `api/src/time/reports.controller.ts`, `reports.service.ts` (+ `.spec.ts`) | C | T1 | `npx nest g controller time/reports --flat`, `npx nest g service time/reports --flat` |
| api | `api/src/time/time.module.ts` | M | T1 | The CLI adds the controller and service |
| api | `api/src/time/dto/dashboard-report-response.dto.ts` | C | T1 | Hand-written |
| api | `api/src/time/time.repository.ts` (+ `.spec.ts`) | M | T1 | Two methods; export `toRef` if it is private |
| api | `api/openapi.json` | M | T1 | `npm run openapi:export` |

## Interfaces

### DTOs
```ts
// api/src/time/dto/dashboard-report-response.dto.ts
export const REPORT_PROJECT_KINDS = ["project", "unsorted", "nonprod"] as const;
export type ReportProjectKind = (typeof REPORT_PROJECT_KINDS)[number];
export class ReportDayDto {
  @ApiProperty({ example: "2026-10-06" }) workDate: string;
  @ApiProperty({ type: Number, nullable: true, example: 540 }) startMinute: number | null;
  @ApiProperty({ example: 315 }) workedMinutes: number;
  @ApiProperty({ example: 120 }) bookedMinutes: number;
}
export class ReportProjectDto {
  @ApiProperty({ enum: REPORT_PROJECT_KINDS, enumName: "ReportProjectKind" }) kind: ReportProjectKind;
  @ApiProperty({ type: RefDto, nullable: true }) project: RefDto | null;
  @ApiProperty() workedMinutes: number;
  @ApiProperty() bookedMinutes: number;
}
export class DashboardReportResponseDto {
  @ApiProperty({ type: [ReportDayDto] }) days: ReportDayDto[];
  @ApiProperty({ type: [ReportProjectDto] }) projects: ReportProjectDto[];
}
```

### Repository
```ts
// api/src/time/time.repository.ts (both scoped by userId, dates inclusive)
reportDays(userId, from, to): Promise<{ workDate: string; startMinute: number | null; workedMinutes: number; bookedMinutes: number }[]>;
export interface ReportProjectRow { kind: ReportProjectKind; projectId: string | null; projectTitle: string | null; projectDeletedAt: Date | null;
  deletedProjectTitle: string | null; workedMinutes: number; bookedMinutes: number }
reportProjects(userId, from, to): Promise<ReportProjectRow[]>;
```
```sql
-- reportDays
WITH l AS (SELECT work_date, SUM(duration_minutes)::int AS worked,
                  COALESCE(SUM(duration_minutes) FILTER (WHERE booking_date IS NOT NULL), 0)::int AS booked
           FROM time_logs WHERE user_id = $user AND work_date BETWEEN $from AND $to GROUP BY work_date),
     w AS (SELECT work_date, start_minute FROM workdays WHERE user_id = $user AND work_date BETWEEN $from AND $to)
SELECT COALESCE(w.work_date, l.work_date) AS work_date, w.start_minute, COALESCE(l.worked, 0) AS worked, COALESCE(l.booked, 0) AS booked
FROM w FULL JOIN l ON l.work_date = w.work_date ORDER BY 1;

-- reportProjects
SELECT g.kind, g.project_id, g.deleted_project_title, p.title AS project_title, p.deleted_at AS project_deleted_at,
       SUM(g.duration_minutes)::int AS worked,
       COALESCE(SUM(g.duration_minutes) FILTER (WHERE g.booking_date IS NOT NULL), 0)::int AS booked
FROM (SELECT duration_minutes, booking_date,
             CASE WHEN exclude_from_stats THEN 'nonprod'
                  WHEN project_id IS NULL AND deleted_project_title IS NULL THEN 'unsorted' ELSE 'project' END AS kind,
             CASE WHEN NOT exclude_from_stats THEN project_id END AS project_id,
             CASE WHEN NOT exclude_from_stats AND project_id IS NULL THEN deleted_project_title END AS deleted_project_title
      FROM time_logs WHERE user_id = $user AND work_date BETWEEN $from AND $to) g
LEFT JOIN projects p ON p.id = g.project_id
GROUP BY g.kind, g.project_id, g.deleted_project_title, p.title, p.deleted_at;
```
Dates come back as `YYYY-MM-DD` strings, as in `listWorkdays`.

### Service and controller
```ts
// api/src/time/reports.service.ts
dashboard(userId, query: WorkdaysQueryDto): Promise<DashboardReportResponseDto>;   // from > to or more than 366 days apart → 400, as BookingsService.list
// api/src/time/reports.controller.ts: @ApiBearerAuth('bearer') @Controller('reports'): @Get('dashboard') dashboard(@CurrentUser() user, @Query() q);
// @ApiOkResponse({ type: DashboardReportResponseDto }), @ApiProblemResponses per endpoints.md
```
- `days` = `reportDays` as is.
- `projects`: each row → `{ kind, project, workedMinutes, bookedMinutes }`, `project` = `kind === "project"` ? the `toRef` rule (a project row → `{ id, title,
  deleted: projectDeletedAt !== null }`; none but `deletedProjectTitle` → `{ id: null, title: deletedProjectTitle, deleted: true }`) : `null`.
  Order: `project` rows by `workedMinutes` descending, then `project.title` ascending (`localeCompare`), then `unsorted`, then `nonprod`.

## Acceptance criteria
Signed in as user A (zone `Europe/Zagreb`; "today" = 2026-10-09) unless stated; B is another user with logs on the same dates. Anthropic (task Meetings),
Nvidia (tasks Development, PM) and PM Internal are A's projects. Workdays: 30 Sep 09:00, 1 Oct 08:00 (`PUT /workdays/2026-10-01`, no logs), 6 Oct 08:30,
7 Oct 09:15. Logs (then booked with `PUT /bookings`): *a* 6 Oct 120 min Anthropic/Meetings booked 7 Oct; *b* 6 Oct 60 min PM Internal unbooked; *c* 6 Oct
45 min unsorted; *d* 6 Oct 90 min Anthropic, excluded; *e* 7 Oct 240 min Nvidia/Development booked 7 Oct; *f* 7 Oct 135 min Anthropic/Meetings unbooked;
*g* 30 Sep 60 min Nvidia/PM booked 1 Oct; *h* 30 Sep 30 min Nvidia/PM unbooked.

| AC | Case → expected | Test | Task |
| --- | --- | --- | --- |
| AC-1 | `GET /reports/dashboard?from=2026-10-01&to=2026-10-09` → `200`, `days` = 1 Oct `{startMinute 480, worked 0, booked 0}`, 6 Oct `{510, 315, 120}`, 7 Oct `{555, 375, 240}`; g, booked to 1 Oct, adds nothing to 1 Oct (D2) | `api/test/reports.ac.e2e-spec.ts` | T1 |
| AC-2 | The same range → `projects` = Anthropic `{kind "project", worked 255, booked 120}`, Nvidia `{240, 240}`, PM Internal `{60, 0}`, then `{kind "unsorted", project null, 45, 0}`, `{kind "nonprod", project null, 90, 0}` (d, although it has a project) | `api/test/reports.ac.e2e-spec.ts` | T1 |
| AC-3 | `?from=2026-09-30&to=2026-09-30` → `days` [30 Sep `{540, 90, 60}`], `projects` [Nvidia `{90, 60}`] | `api/test/reports.ac.e2e-spec.ts` | T1 |
| AC-4 | A project Alpha with a 60-min log on 8 Oct → in 1–9 Oct, Alpha comes right before PM Internal (same minutes, title order) | `api/test/reports.ac.e2e-spec.ts` | T1 |
| AC-5 | PM Internal moved to the trash → its row is `project {id, title "PM Internal", deleted: true}`, 60 min; after a simulated purge (raw SQL: `project_id = NULL, deleted_project_title = 'Old'` on b, and on a new 30-min log of another project) → one row `project {id: null, title "Old", deleted: true}` with 90 min | `api/test/reports.ac.e2e-spec.ts` | T1 |
| AC-6 | B's logs and workdays never appear; `?from=2026-11-01&to=2026-11-30` (nothing there, in the future) → `{days: [], projects: []}` | `api/test/reports.ac.e2e-spec.ts` | T1 |
| AC-7 | `400` for `from > to`, 2025-10-07..2026-10-09 (367 days apart), `from=2026-02-30`, a missing `to`; 2025-10-08..2026-10-09 (366) → `200` | `api/test/reports.ac.e2e-spec.ts` | T1 |
| AC-8 | Without a token → `401` | `api/test/reports.ac.e2e-spec.ts` | T1 |
| AC-9 | `api/openapi.json` has `GET /api/v1/reports/dashboard` requiring `bearer`, returning `DashboardReportResponseDto` with `days` and `projects` | `check` | T1 |

No typed stubs: the e2e tests only call HTTP endpoints.

## Checks
```bash
# AC-9: the contract has the dashboard report, protected
node -e "
const d=require('./api/openapi.json'), g=d.paths['/api/v1/reports/dashboard']?.get, s=d.components?.schemas??{};
if(!g){console.error('missing GET /reports/dashboard');process.exit(1)}
if(!JSON.stringify(g.security??[]).includes('bearer')){console.error('not protected');process.exit(1)}
const r=s.DashboardReportResponseDto?.properties; if(!r?.days||!r?.projects){console.error('missing DashboardReportResponseDto.days/projects');process.exit(1)}"
```

## Tasks
| # | Task | App | Size | Tier | Why this tier | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | Dashboard report: `GET /reports/dashboard`, its DTOs and two repository queries | api | M | haiku | Both queries and the mapping are spelled out; the controller and service copy `bookings.controller.ts` / `bookings.service.ts` | — (feat-tlog-api, feat-book-api done) |

## Open questions
None.

## Changelog
- 2026-10-09: Initial draft from the owner's Dashboard screen (OQ-127, OQ-129). Ready for review.
