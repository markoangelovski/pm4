---
id: feat-book-api
title: "Bookings API: booking dates on time logs"
status: approved
owner: Marko Angelovski
last_updated: 2026-10-10
milestone: M4
requirements: [FR-BOOK-001, FR-BOOK-002, FR-BOOK-003, FR-BOOK-004, FR-BOOK-005, FR-BOOK-006, API-BOOK-001, API-BOOK-002, API-TLOG-004]
related: [req-bookings, api-endpoints, api-data-model, feat-tlog-api, feat-book-web, OQ-122, OQ-123, OQ-124, OQ-125]
---

# Bookings API: booking dates on time logs

## Goal
The API stores a booking date on a time log, lists the logs of a booking range, and books, re-dates or unbooks one or many logs at once.
Contract: [endpoints.md → Shared booking shapes](../03-api/endpoints.md#shared-booking-shapes), API-BOOK-001/002, and the API-TLOG-004 rule that an
update which makes a log unbookable removes its booking. Column: [data-model.md → time_logs](../03-api/data-model.md#time_logs). The web side is feat-book-web.

## Decisions
| # | Decision | Source |
| --- | --- | --- |
| D1 | A booking is a nullable `booking_date` column on `time_logs`, not a table. | Agent: one date per log, 4 B, nothing to join |
| D2 | `TimeLog` and `Day` don't change. The booking endpoints return `BookingLog` (`TimeLog` + `bookingDate`). | Agent: the Logs screens don't show bookings, and their tests stay valid |
| D3 | One `PUT /bookings` books, re-dates and unbooks (`bookingDate: null`), for one log or many (Book all), all or nothing. | Agent |
| D4 | The booking date may be before the work date, never after today in the caller's zone. | OQ-123 (owner) |
| D5 | The booking stays through edits; `PATCH /time-logs/{id}` clears it only when the log becomes unbookable. | OQ-124 (owner) |
| D6 | The API returns the range's logs, and the web computes the per-day figures (feat-book-web). | Agent: as the Logs day view |

## Scope
**In:** the `booking_date` column and index with a migration; `GET /bookings` and `PUT /bookings` in the `time` module; clearing the booking in
`TimeLogsService.update`; the OpenAPI export.

**Before the tests are written:** feat-tlog-api is done.

**Non-goals** (implementers must not touch these):
- Anything in `web/`. `TimeLogResponseDto` and `DayResponseDto` (D2). Workdays, `/me`, `tasks/*`, `projects/*`.
- Reports, the dashboard, the logged-time sections of the project and task pages.
- `api/test/*` files written in the test step.

## Read first
| Path | Why / copy this |
| --- | --- |
| `specs/03-api/endpoints.md#shared-booking-shapes`, API-BOOK-001/002, API-TLOG-004 | Contract |
| `specs/03-api/data-model.md#time_logs` | The column, the invariant and the index |
| `api/src/time/` (module, `workdays.controller.ts`, `time-logs.service.ts`, `time.repository.ts`, `dto/`) | The pattern to copy: controllers, the "today in the caller's zone" check, `TimeLogRow` and its mapping to `TimeLogResponseDto` |
| `api/src/database/schema/time.ts` | Where the column and index go |
| `api/test/time-logs.ac.e2e-spec.ts`, `api/test/support/*` | Seeding and sign-in in e2e tests |

## Files
| App | File | C/M | Task | Notes |
| --- | --- | --- | --- | --- |
| api | `api/test/bookings.ac.e2e-spec.ts` | C | tests | API-BOOK-*, the API-TLOG-004 rule |
| api | `api/src/database/schema/time.ts` | M | T1 | `bookingDate`, index |
| api | `api/drizzle/0004_*.sql`, `api/drizzle/meta/*` | C/M | T1 | `npm run db:generate` |
| api | `api/src/time/bookings.controller.ts`, `api/src/time/bookings.service.ts`, `api/src/time/bookings.service.spec.ts` | C | T1 | `npx nest g controller time/bookings --flat`, `npx nest g service time/bookings --flat` |
| api | `api/src/time/time.module.ts` | M | T1 | The CLI adds the controller and service |
| api | `api/src/time/dto/booking-log-response.dto.ts`, `api/src/time/dto/set-booking.dto.ts` | C | T1 | Hand-written |
| api | `api/src/time/time.repository.ts`, `api/src/time/time.repository.spec.ts` | M | T1 | `bookingDate` in `TimeLogRow`, two methods |
| api | `api/src/time/time-logs.service.ts`, `api/src/time/time-logs.service.spec.ts` | M | T1 | D5; export the mapping and "today" helpers if they are private |
| api | `api/openapi.json` | M | T1 | `npm run openapi:export` |

## Interfaces

### Database
```ts
// api/src/database/schema/time.ts, in timeLogs (declared right after workDate: both are 4-byte dates)
bookingDate: date("booking_date"),
// and in the table's index list:
index("time_logs_user_booking").on(t.userId, t.bookingDate).where(sql`${t.bookingDate} IS NOT NULL`),
```
The migration is generated, never hand-written; it must apply on top of feat-tlog-api's migration.

### DTOs
```ts
// api/src/time/dto/booking-log-response.dto.ts
export class BookingLogResponseDto extends TimeLogResponseDto { @ApiProperty({ type: String, nullable: true, example: "2026-10-07" }) bookingDate: string | null }
export class BookingListResponseDto { @ApiProperty({ type: [BookingLogResponseDto] }) items: BookingLogResponseDto[] }
// api/src/time/dto/set-booking.dto.ts
export class SetBookingDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(100) @IsUUID(undefined, { each: true }) logIds: string[];
  @ValidateIf((o) => o.bookingDate !== null) @Matches(/^\d{4}-\d{2}-\d{2}$/) @IsISO8601({ strict: true })
  @ApiProperty({ type: String, nullable: true }) bookingDate: string | null;    // absent → 400; null → unbook
}
```
`GET /bookings` takes `WorkdaysQueryDto` (`from`, `to`) as its query.

### Repository
```ts
// api/src/time/time.repository.ts
// TimeLogRow gains: bookingDate: string | null (selected by every existing query too)
listBookingRange(userId, from, to): Promise<TimeLogRow[]>;
// WHERE l.user_id = $user AND (l.work_date BETWEEN $from AND $to OR l.booking_date BETWEEN $from AND $to) ORDER BY l.work_date, l.id; same joins as listDay
setBookingDate(userId, ids: string[], bookingDate: string | null): Promise<{ status: "ok"; rows: TimeLogRow[] } | { status: "not-found" } | { status: "not-bookable" }>;
// one db.transaction: SELECT id, exclude_from_stats, project_id, deleted_project_title FROM time_logs WHERE user_id = $user AND id = ANY($unique) FOR UPDATE;
// fewer rows than unique ids → "not-found"; bookingDate !== null and any row with exclude_from_stats or (project_id IS NULL AND deleted_project_title IS NULL) → "not-bookable";
// else UPDATE time_logs SET booking_date = $date WHERE user_id = $user AND id = ANY($unique), then return the rows as listDay maps them, ORDER BY id.
// updateLog(…): its `values` may now include bookingDate (D5).
```

### Services and controller
```ts
// api/src/time/bookings.service.ts
list(userId, query: WorkdaysQueryDto): Promise<BookingListResponseDto>;   // from > to or more than 366 days apart → 400, as WorkdaysService.list
set(userId, dto: SetBookingDto): Promise<BookingListResponseDto>;
// bookingDate after today in the caller's zone → BadRequestException naming bookingDate (the TimeLogsService check)
// "not-found" → NotFoundException("Time log not found."); "not-bookable" → BadRequestException naming logIds, "contains a log that can't be booked"
// api/src/time/bookings.controller.ts: @ApiBearerAuth('bearer') @Controller('bookings'): @Get() list(@CurrentUser() user, @Query() q), @Put() @HttpCode(200) set(@CurrentUser() user, @Body() dto); @ApiProblemResponses per endpoints.md
```
Each item = the `TimeLogResponseDto` mapping of the row plus `bookingDate`.

`TimeLogsService.update` (D5): after the link and the values are resolved, the log's next state is `excluded = dto.excludeFromStats ?? current.excludeFromStats`
and `hasProject` = the resolved `projectId !== null` when the link is replaced, else `current.projectId !== null || current.deletedProjectTitle !== null`.
When `excluded || !hasProject`, add `bookingDate: null` to the update values. `create` never sets a booking.

## Acceptance criteria
Signed in as user A (zone `Europe/Zagreb`; "today" = 2026-10-09) unless stated; B is another user. Anthropic (task Meetings), Nvidia (tasks Development, PM) and
PM Internal are A's projects. Seed (create, then book with `PUT /bookings`): *a* 6 Oct 120 min Anthropic/Meetings booked 7 Oct; *b* 6 Oct 60 min PM Internal
(no task) unbooked; *c* 6 Oct 45 min unsorted; *d* 6 Oct 90 min Anthropic, excluded; *e* 7 Oct 240 min Nvidia/Development booked 7 Oct; *f* 7 Oct 135 min
Anthropic/Meetings unbooked; *g* 30 Sep 60 min Nvidia/PM booked 1 Oct; *h* 30 Sep 30 min Nvidia/PM unbooked.

| AC | Case → expected | Test | Task |
| --- | --- | --- | --- |
| AC-1 | `GET /bookings?from=2026-10-01&to=2026-10-09` → `200`, `items` g, a, b, c, d, e, f (by `workDate`, then entry order), each a `TimeLog` plus `bookingDate` (a `2026-10-07`, b `null`, g `2026-10-01`); h is absent | `api/test/bookings.ac.e2e-spec.ts` | T1 |
| AC-2 | `GET /bookings?from=2026-09-01&to=2026-09-30` → g and h (g booked outside the range is listed by its work date); B's logs never appear; a range with nothing → `items: []` | `api/test/bookings.ac.e2e-spec.ts` | T1 |
| AC-3 | `GET /bookings` → `400` for `from > to`, a range over 366 days, `from=2026-02-30`, a missing `to` | `api/test/bookings.ac.e2e-spec.ts` | T1 |
| AC-4 | `PUT /bookings {logIds:[b], bookingDate:"2026-10-06"}` → `200`, `items` [b] with `bookingDate "2026-10-06"`; `GET` shows it | `api/test/bookings.ac.e2e-spec.ts` | T1 |
| AC-5 | `PUT {logIds:[f, b, f], bookingDate:"2026-10-07"}` → `200` with b and f once each, in `id` order, both `2026-10-07` | `api/test/bookings.ac.e2e-spec.ts` | T1 |
| AC-6 | `PUT {logIds:[a], bookingDate:null}` → `200`, a `bookingDate null`; `bookingDate:"2026-09-01"` (before the work date) → `200` | `api/test/bookings.ac.e2e-spec.ts` | T1 |
| AC-7 | `PUT` → `400` naming the field for: `bookingDate` `"2026-10-10"` (future), `"2026-02-30"`, `"7.10.2026"`, missing; `logIds` `[]`, 101 ids, `["abc"]`, missing | `api/test/bookings.ac.e2e-spec.ts` | T1 |
| AC-8 | `PUT {logIds:[b, c], bookingDate:"2026-10-06"}` (c unsorted) → `400` naming `logIds`, and b stays unbooked; the same with d (excluded); `{logIds:[c, d], bookingDate:null}` → `200` | `api/test/bookings.ac.e2e-spec.ts` | T1 |
| AC-9 | `PUT` with B's log, or a random UUID, among A's ids → `404 not-found`, and A's logs are unchanged | `api/test/bookings.ac.e2e-spec.ts` | T1 |
| AC-10 | `PATCH /time-logs/{e}` with `durationMinutes 180`, with `text`, with `workDate "2026-10-05", dayStartMinute 540`, with `taskId` of Nvidia/PM → e stays booked to `2026-10-07` | `api/test/bookings.ac.e2e-spec.ts` | T1 |
| AC-11 | `PATCH /time-logs/{e} {excludeFromStats:true}` → e's `bookingDate` becomes `null`; a booked log `PATCH {projectId:null}` → `null`; `PATCH {projectId:<another project>}` (no task) → stays booked | `api/test/bookings.ac.e2e-spec.ts` | T1 |
| AC-12 | `DELETE /time-logs/{a}` → a is gone from `GET /bookings`; `GET /workdays/2026-10-06` logs have no `bookingDate` field | `api/test/bookings.ac.e2e-spec.ts` | T1 |
| AC-13 | `GET /bookings` and `PUT /bookings` without a token → `401` | `api/test/bookings.ac.e2e-spec.ts` | T1 |
| AC-14 | `api/openapi.json` has `GET` and `PUT /api/v1/bookings`, both requiring `bearer`; `BookingLogResponseDto` has `bookingDate`; `TimeLogResponseDto` doesn't | `check` | T1 |

No typed stubs: the e2e tests only call HTTP endpoints.

## Checks
```bash
# AC-14: the contract has both booking endpoints, protected, and bookingDate only on BookingLog
node -e "
const d=require('./api/openapi.json'), p=d.paths['/api/v1/bookings'], s=d.components?.schemas??{};
for (const m of ['get','put']) { if(!p?.[m]){console.error('missing',m);process.exit(1)} if(!JSON.stringify(p[m].security??[]).includes('bearer')){console.error('not protected',m);process.exit(1)} }
if (!s.BookingLogResponseDto?.properties?.bookingDate) { console.error('missing BookingLogResponseDto.bookingDate'); process.exit(1) }
if (s.TimeLogResponseDto?.properties?.bookingDate) { console.error('TimeLogResponseDto must not have bookingDate'); process.exit(1) }"
```

## Tasks
| # | Task | App | Size | Tier | Why this tier | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | `booking_date` column and migration, `GET`/`PUT /bookings`, clearing the booking in `PATCH /time-logs` | api | M | haiku | One table; the queries, the transaction and the clearing rule are spelled out; controllers copy `workdays.controller.ts` | — (feat-tlog-api done) |

## Open questions
None.

## Changelog
- 2026-10-09: Initial draft from the owner's Bookings screen (OQ-122…OQ-125). Ready for review.
- 2026-10-10: Files table: every path spelled out in full so the scope check matches them (no behavior change).
