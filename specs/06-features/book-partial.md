---
id: feat-book-partial
title: "Partial bookings: a log's time booked in parts to several dates"
status: approved
owner: Marko Angelovski
last_updated: 2026-10-23
milestone: M4
requirements: [FR-BOOK-001, FR-BOOK-002, FR-BOOK-003, FR-BOOK-004, FR-BOOK-005, FR-BOOK-006, FR-TLOG-012, FR-TLOG-019, FR-RPT-003, FR-RPT-004, FR-RPT-006, FR-INT-011, FR-INT-012, API-BOOK-001, API-BOOK-002, API-TLOG-001, API-TLOG-004, API-RPT-001, API-INT-018, SCR-044, SCR-045]
related: [req-bookings, req-reporting, req-integrations, api-endpoints, api-data-model, web-screens, feat-book-api, feat-book-web, feat-hard-delete, OQ-212, OQ-213, OQ-214, OQ-215, OQ-216, OQ-217, OQ-218, OQ-219, OQ-220]
prototype: f3851c1
---

# Partial bookings: a log's time booked in parts to several dates

## Goal
On Bookings the user books all or part of a log's time, to one or more dates, with a **Booking time** per line; **Book all** books what is left.
The Logged time section lists each booking, the dashboard counts booked minutes, a log can't be shortened below its booked time, and PMSPA no
longer syncs the booked flag. Behavior: [req-bookings](../01-requirements/bookings.md) FR-BOOK-001…006, FR-TLOG-012, [req-reporting](../01-requirements/reporting.md)
*Booked*, FR-INT-011/012, SCR-044, SCR-045. Contract: [endpoints.md → Shared booking shapes](../03-api/endpoints.md#shared-booking-shapes),
API-BOOK-001/002, API-TLOG-001/004, API-RPT-001, `PmspaEvent`. Table: [data-model.md → bookings](../03-api/data-model.md#bookings).

## Decisions
| # | Decision | Source |
| --- | --- | --- |
| D1 | Bookings move to a `bookings` table, one row per log and date. Prod has no bookings, so nothing is copied from `time_logs.booking_date`. | OQ-212, OQ-216 (owner) |
| D2 | One release. T1–T3 add migration `0008` (creates `bookings`), T4 drops `booking_date` and its index (`0009`); all four ship in one push. No data step and no deploy precautions: prod has no bookings (owner), and an old API instance failing on the dropped column during the swap is accepted. | OQ-216 (owner) |
| D3 | `PUT /bookings` replaces each listed log's whole list; the web computes the new list (add to a date, remove one, edit one, Book all). | Owner, prototype `f3851c1` (`proposed-types.ts`) |
| D4 | Every write to a log's bookings or duration locks the log row (`FOR UPDATE`) in its transaction, so the booked-time rules hold under concurrent requests. | Agent |
| D5 | A shorter duration than the booked time → `400` on `durationMinutes` (OQ-213), unless the same update makes the log unbookable, which removes its bookings. | OQ-213 (owner) · prototype mock |
| D6 | Bookings aren't synced with PMSPA: the push never writes `booked`, `booked` leaves both log fingerprints (stored hashes change once, OQ-217) and `PmspaEvent` (OQ-219), and the import's "Booked in PMSPA" warning goes. | OQ-215, OQ-217, OQ-219 (owner) |
| D7 | An import that would shorten a linked log below its booked time fails that log only (OQ-220), and the preview warns about it on the event row: the snapshot's PM4 logs carry their booked minutes. The import still checks under the row lock (D4), so a booking made after the preview fails the same way. | OQ-220 (owner) |
| D8 | The test step makes the final contract (DTOs, controller, `pmspa-browse.dto.ts`), with typed stubs, runs `npm run openapi:export` and `npm run api:types`, and makes production web the prototype's twin except the booking hooks (stubs), so both apps typecheck while the tests fail. | Agent, as feat-hard-delete D7 |
| D9 | A changed production web file becomes its prototype twin: `sed -e 's#@/proto/mock/client#@/lib/api/client#' -e 's#@/proto/#@/#g'`, then Prettier. | as feat-hard-delete D5 |

## Scope
**In:** `api/`: the `bookings` table and migrations `0008`/`0009` (no data step); the booking read model on API-BOOK-001/002, API-TLOG-001; the booked-time rule and the
clearing in API-TLOG-004; booked minutes in API-RPT-001; PMSPA: no `booked` in push, fingerprints, browse and import warnings, and the import's
booked-time failure. `web/`: the prototype's twins of Bookings, the Logged time section and the PMSPA time tab; the booking hooks; the prototype
moves from `proposed-types.ts` to the generated types.

**Before the tests are written:** the working tree is clean (prototype `f3851c1` committed).

**Non-goals** (implementers must not touch these):
- The Logs day view, the log dialog (its field-error mapping already shows a `durationMinutes` error), the dashboard components, projects, tasks, workdays.
- `web/lib/api/*` (except the generated `schema.d.ts`), `web/lib/auth/*`, `web/components/ui/*`.
- Any `*.ac.*` test, `api/openapi.json` and the files the test step writes (rows with `tests`).

## Read first
| Path | Why / copy this |
| --- | --- |
| `specs/03-api/endpoints.md#shared-booking-shapes`, API-BOOK-001/002, API-TLOG-001/004, API-RPT-001 | Contract |
| `specs/03-api/data-model.md#bookings`, `#migrations` | The table, its invariants and the migration |
| `api/src/time/time.repository.ts` | `setBookingDate` is the locking transaction to copy; `selectRows`, `listLogs`, `reportDays`, `reportProjects` change |
| `api/src/time/bookings.service.ts`, `api/src/time/time-logs.service.ts` | `assertDate`, `todayIn`, the D5 rule in `update`, `toTimeLogDto` |
| `api/src/database/schema/time.ts`, `api/drizzle/0005_permanent_delete.sql` | Where the table goes; a generated migration with a hand-added data step |
| `api/src/integrations/pmspa/pmspa-time-sync.service.ts`, `pmspa-time-fields.ts`, `pmspa-time-preview.ts` | The push, the tuples, the import loop (T2) |
| `api/test/bookings.ac.e2e-spec.ts`, `api/test/support/*` | Seeding and sign-in in e2e tests |
| `web/proto/features/bookings/`, `web/proto/mock/client.ts` (`bookings`, `timeLogs` PATCH) | The confirmed UI and the mock's rules (T3) |

## Files
| App | File | C/M | Task | Notes |
| --- | --- | --- | --- | --- |
| api | `api/test/bookings.ac.e2e-spec.ts` | M | tests | Rewritten for API-BOOK-*, API-TLOG-001/004, API-RPT-001 |
| api | `api/test/time-logs.ac.e2e-spec.ts`, `api/test/logged-time.ac.e2e-spec.ts`, `api/test/reports.ac.e2e-spec.ts`, `api/test/delete-day.ac.e2e-spec.ts` | M | tests | The new `PUT /bookings` body; `bookings` in place of `bookingDate` |
| api | `api/test/pmspa-time.ac.e2e-spec.ts`, `api/test/support/fake-pmspa.ts`, `api/src/integrations/pmspa/pmspa-time-fields.ac.spec.ts` | M | tests | D6, D7 |
| api | `api/src/time/dto/booking.dto.ts`, `api/src/time/dto/set-bookings.dto.ts` | C | tests | Final (D8) |
| api | `api/src/time/dto/set-booking.dto.ts` | D | tests | `rm` |
| api | `api/src/time/dto/booking-log-response.dto.ts`, `api/src/time/dto/time-log-list-response.dto.ts`, `api/src/time/bookings.controller.ts`, `api/src/integrations/pmspa/dto/pmspa-browse.dto.ts`, `api/src/integrations/pmspa/pmspa-day-items.ts` | M | tests | Final (D8); comments are OpenAPI descriptions (`introspectComments`) |
| api | `api/src/time/bookings.service.ts`, `api/src/time/time-logs.service.ts` | M | tests, T1 | Stubs (D8), then real |
| api | `api/openapi.json` | M | tests | `npm run openapi:export` |
| api | `api/src/database/schema/time.ts` | M | T1, T4 | T1: `bookings`; T4: no `bookingDate` |
| api | `api/drizzle/0008_*.sql`, `api/drizzle/meta/0008_snapshot.json`, `api/drizzle/meta/_journal.json` | C/M | T1, T4 | `npm run db:generate -- --name bookings`; T4 removes the data step T1 appended |
| api | `api/src/time/time.repository.ts`, `api/src/time/reports.service.ts` | M | T1 | |
| api | `api/src/common/duration.ts` | C | T1 | `formatDuration`, moved from `pmspa-time-fields.ts` |
| api | `api/src/time/bookings.service.spec.ts`, `api/src/time/time-logs.service.spec.ts` | M | T1 | Ordinary tests |
| api | `api/src/integrations/pmspa/pmspa-time-fields.ts` | M | T1, T2 | T1: re-exports `formatDuration`; T2: tuples, `booked` |
| api | `api/src/integrations/pmspa/pmspa-time-sync.service.ts`, `api/src/integrations/pmspa/pmspa-time-preview.ts`, `api/src/integrations/pmspa/pmspa-sync.repository.ts`, `api/src/integrations/pmspa/pmspa-remote.ts` | M | T2 | |
| api | `api/src/integrations/pmspa/*.spec.ts` (not `*.ac.spec.ts`) | M | T2 | Ordinary tests: no `booked` |
| api | `api/drizzle/0009_*.sql`, `api/drizzle/meta/0009_snapshot.json`, `api/drizzle/meta/_journal.json` | C/M | T4 | `npm run db:generate -- --name drop_booking_date`, as generated |
| web | `web/features/bookings/days.ac.test.ts`, `web/features/bookings/api.ac.test.tsx`, `web/features/bookings/components/bookings-view.ac.test.tsx` | M | tests | Acceptance tests |
| web | `web/features/time/logged-time.ac.test.tsx`, `web/features/time/components/logged-time-section.ac.test.tsx` | M | tests | `bookings` lines (SCR-044) |
| web | `web/lib/api/schema.d.ts` | M | tests | `npm run api:types` |
| web | `web/features/bookings/days.ts` | M | tests | Twin (D9), its type block from the schema (*Web*), final |
| web | `web/features/bookings/components/booking-cell.tsx`, `web/features/bookings/components/day-section.tsx` | M | tests | Twins (D9), final |
| web | `web/features/time/components/logged-time-section.tsx`, `web/features/integrations/components/pmspa-time-tab.tsx` | M | tests | Twins (D9), final |
| web | `web/proto/mock/pmspa.ts` | M | tests, T3 | Tests: its `PmspaEventDto` mapping loses `booked: e.booked`. T3: the import's booked-time warning and failure (*Web*) |
| web | `web/features/bookings/api.ts` | M | tests, T3 | Stubs (D8), then the twin |
| web | `web/proto/features/bookings/days.ts`, `web/proto/features/bookings/api.ts`, `web/proto/features/time/api.ts`, `web/proto/mock/client.ts`, `web/proto/mock/store.ts` | M | T3 | Generated types in place of `proposed-types.ts`, no casts |
| web | `web/proto/features/bookings/proposed-types.ts` | D | T3 | `rm` |

## Interfaces

### Contract (test step; T1)
```ts
// api/src/time/dto/booking.dto.ts — request and response shape. Validators as create-time-log.dto.ts durationMinutes.
/** `Booking`: part of a log's time booked to a date (endpoints.md *Shared booking shapes*). */
export class BookingDto {
  /** `YYYY-MM-DD`; not after today in the caller's zone (checked by the service). */
  @ApiProperty({ type: String, format: "date", example: "2026-10-07" }) @Matches(/^\d{4}-\d{2}-\d{2}$/) @IsISO8601({ strict: true }) date: string;
  /** 15–1440, a multiple of 15. */
  @ApiProperty({ type: Number, minimum: 15, maximum: 1440 }) @IsInt() @Min(15) @Max(1440) @Validate(MultipleOf15) minutes: number;
}
// api/src/time/dto/booking-log-response.dto.ts — bookingDate goes
export class BookingLogResponseDto extends TimeLogResponseDto {
  /** By date ascending; [] = not booked. */
  @ApiProperty({ type: [BookingDto] }) bookings: BookingDto[];
}
// BookingListResponseDto unchanged.
// api/src/time/dto/set-bookings.dto.ts — nested as pmspa/dto/sync.dto.ts (IsArray, ValidateNested({ each: true }), Type)
export class SetLogBookingsDto {
  @ApiProperty({ type: String, format: "uuid" }) @IsUUID() logId: string;
  /** The log's whole new list ([] = unbooked). */
  @ApiProperty({ type: [BookingDto], maxItems: 96 }) @IsArray() @ArrayMaxSize(96) @ValidateNested({ each: true }) @Type(() => BookingDto) bookings: BookingDto[];
}
/** `PUT /bookings` body (API-BOOK-002). */
export class SetBookingsDto {
  @ApiProperty({ type: [SetLogBookingsDto], minItems: 1, maxItems: 100 }) @IsArray() @ArrayMinSize(1) @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => SetLogBookingsDto) logs: SetLogBookingsDto[];
}
```
- `bookings.controller.ts`: `set(@CurrentUser() user, @Body() dto: SetBookingsDto)`; its doc comment "Replace the bookings of one or many logs (API-BOOK-002)."
- `time-log-list-response.dto.ts`: `bookedMinutes`' comment "Booked minutes of the matching logs (the sum of their bookings)."
- Doc comments of DTOs and controllers become OpenAPI descriptions, so T1 and T2 don't change them (`npm run openapi:export` must leave no diff).
- `pmspa-browse.dto.ts`: `PmspaEventDto` loses `booked`; `pmspa-day-items.ts` loses `booked: e.booked`.
- Stubs: `toBookingLogDto` and `BookingsService.set` bodies `throw new Error("not implemented (feat-book-partial)")`; `TimeLogsService.list` maps its
  items with `toBookingLogDto(row)`. Then `npm run openapi:export` (api) and `npm run api:types` (web).

### Database (T1, T4)
```ts
// api/src/database/schema/time.ts, after timeLogs (columns in this order, data-model.md storage rule 7)
/** Part of a log's time booked to a date (data-model.md *bookings*). */
export const bookings = pgTable("bookings", {
  bookingDate: date("booking_date", { mode: "string" }).notNull(),
  minutes: smallint("minutes").notNull(),
  timeLogId: uuid("time_log_id").notNull().references(() => timeLogs.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" })
}, (t) => [
  primaryKey({ columns: [t.timeLogId, t.bookingDate] }),
  index("bookings_user_date").on(t.userId, t.bookingDate),
  check("bookings_minutes", sql`${t.minutes} BETWEEN 15 AND 1440 AND ${t.minutes} % 15 = 0`)
]);
export type Booking = typeof bookings.$inferSelect;
```
T1 (done): `timeLogs.bookingDate` and `time_logs_user_booking` stayed, with the comment `// Unused since feat-book-partial (bookings table); dropped by T4 (D2).`,
and `npm run db:generate -- --name bookings` made `0008_bookings.sql`, to which T1 appended an `INSERT INTO "bookings" … SELECT … FROM "time_logs"` copy step.
T4 (D2: prod has no bookings): delete that copy step (the last `--> statement-breakpoint` and the `INSERT … SELECT` after it) from `0008_bookings.sql`;
remove `bookingDate`, its index `time_logs_user_booking` and the comment from `timeLogs`; then `npm run db:generate -- --name drop_booking_date` and keep
`0009_drop_booking_date.sql` as generated (it drops the index and the column).

### Repository (T1)
```ts
// api/src/time/time.repository.ts
export interface BookingValue { date: string; minutes: number }
export type BookingLogRow = TimeLogRow & { bookings: BookingValue[] };
// TimeLogRow and selectRows lose bookingDate; TimeLogValues loses bookingDate.
export type SetBookingsResult =
  | { status: "ok"; rows: BookingLogRow[] }
  | { status: "not-found" }
  | { status: "invalid"; index: number; message: "can't be booked" | "adds up to more than the log's duration" };
export type UpdateLogResult = { status: "ok" } | { status: "over-booked"; bookedMinutes: number };

/** The bookings of the given logs, by date ascending; [] for a log without any. */
private async withBookings(db: Pick<DrizzleDb, "select">, userId: string, rows: TimeLogRow[]): Promise<BookingLogRow[]>;
// one query (none for no rows): SELECT time_log_id, booking_date, minutes FROM bookings WHERE user_id = $user AND time_log_id = ANY($ids) ORDER BY booking_date

listBookingRange(userId, from, to): Promise<BookingLogRow[]>;
// WHERE l.user_id = $user AND (l.work_date BETWEEN $from AND $to
//   OR l.id IN (SELECT time_log_id FROM bookings WHERE user_id = $user AND booking_date BETWEEN $from AND $to)) ORDER BY l.work_date, l.id; then withBookings
listLogs(…): Promise<{ rows: BookingLogRow[]; total; totalMinutes; bookedMinutes }>;
// rows via withBookings; bookedMinutes = a third query in the Promise.all:
// SELECT coalesce(sum(b.minutes), 0) FROM bookings b JOIN time_logs ON time_logs.id = b.time_log_id WHERE <the same where>

setBookings(userId, entries: { logId: string; bookings: BookingValue[] }[]): Promise<SetBookingsResult>;
// The service guarantees distinct logIds. One db.transaction, as setBookingDate:
// 1. SELECT id, duration_minutes, exclude_from_stats, project_id, deleted_project_title FROM time_logs WHERE user_id = $user AND id = ANY($ids) FOR UPDATE;
//    fewer rows than entries → "not-found".
// 2. For each entry i in order: bookings non-empty and the log not bookable (exclude_from_stats, or project_id and deleted_project_title both null)
//    → { "invalid", i, "can't be booked" }; Σ minutes > duration_minutes → { "invalid", i, "adds up to more than the log's duration" }.
// 3. DELETE FROM bookings WHERE user_id = $user AND time_log_id = ANY($ids); INSERT every given booking (userId, timeLogId, bookingDate, minutes), if any.
// 4. Return the rows (selectRows(tx) WHERE id = ANY($ids) ORDER BY id) withBookings(tx). Delete setBookingDate and SetBookingResult.

updateLog(userId, id, values, dayStart, bookings: "keep" | "clear"): Promise<UpdateLogResult>;
// One db.transaction, in this order:
// 1. SELECT id FROM time_logs WHERE user_id = $user AND id = $id FOR UPDATE.
// 2. bookings "keep" and values.durationMinutes set: booked = SELECT coalesce(sum(minutes), 0) FROM bookings WHERE time_log_id = $id;
//    values.durationMinutes < booked → return { "over-booked", bookedMinutes: booked } (nothing written).
// 3. The day start (as now), then the UPDATE (as now), then for "clear": DELETE FROM bookings WHERE user_id = $user AND time_log_id = $id.

reportDays / reportProjects: replace each `SUM(duration_minutes) FILTER (WHERE booking_date IS NOT NULL)` by the sum of the logs' booked minutes:
// in the per-log rows (l's FROM, and g's inner SELECT) add `(SELECT SUM(bk.minutes) FROM bookings bk WHERE bk.time_log_id = time_logs.id) AS booked_minutes`
// (reportDays: aggregate over that subselect), and booked = COALESCE(SUM(booked_minutes), 0)::int. Drop booking_date from g.
```
`deleteDay` and `deleteLog` don't change (the FK cascade deletes the bookings).

### Services (T1)
```ts
// api/src/common/duration.ts — moved verbatim from pmspa-time-fields.ts, which then does `export { formatDuration } from "../../common/duration.js";`
/** As web/lib/time: "3h 45m", "45m", "2h". */
export function formatDuration(minutes: number): string;

// api/src/time/time-logs.service.ts
/** PATCH would leave the log shorter than its booked time (API-TLOG-004, OQ-213). */
export class BookedTimeException extends BadRequestException {
  constructor(readonly bookedMinutes: number) {
    const t = formatDuration(bookedMinutes);
    super({ errors: [{ field: "durationMinutes", message: `${t} of this log is booked. Remove bookings first, or keep at least ${t}.` }] });
  }
}
// update(): `clear = excluded || !hasProject` (the D5 rule as now) → updateLog(userId, id, values, dayStart, clear ? "clear" : "keep");
// "over-booked" → throw new BookedTimeException(result.bookedMinutes). values never carry bookingDate.
// list(): items = rows.map(toBookingLogDto).

// api/src/time/bookings.service.ts
export function toBookingLogDto(row: BookingLogRow): BookingLogResponseDto;   // { ...toTimeLogDto(row), bookings: row.bookings }
set(userId, dto: SetBookingsDto): Promise<BookingListResponseDto>;
// Checks in this order, each a BadRequestException({ errors: [{ field, message }] }) on the first failure:
// 1. a logId seen earlier in dto.logs → field `logs.<i>.logId`, "lists a log twice" (i = the repeat);
// 2. today = todayIn(user.timeZone) (usersRepository.findById once; no user → UnauthorizedException as assertNotFuture); a booking date > today →
//    `logs.<i>.bookings.<j>.date`, "must not be after today";
// 3. two bookings of one entry on one date → `logs.<i>.bookings`, "has two bookings on one date".
// Then repository.setBookings: "not-found" → NotFoundException("Time log not found."); "invalid" → field `logs.<index>.bookings`, its message.
```

### PMSPA (T2)
- `pmspa-time-fields.ts`: `Pm4LogForPush` loses `booked`; `pm4LogTuple` → `[cut(l.text, 350), l.durationMinutes, group]`; `pmspaLogTuple` →
  `[log.title, hoursToMinutes(log.duration), e.taskId, e.title]` (D6: stored hashes then differ once, OQ-217).
- `pmspa-sync.repository.ts` (`pm4Logs`): no `booked`, no `bookingDate` selected; selects
  `bookedMinutes: sql<number>`(SELECT coalesce(sum(b.minutes), 0) FROM bookings b WHERE b.time_log_id = time_logs.id)`.mapWith(Number)`;
  its doc comment says "with the booked minutes" in place of "the booked flag".
- `pmspa-time-preview.ts`: `Pm4DayLog` gains `/** Σ of the log's bookings (0 = none). */ bookedMinutes: number`.
- `pmspa-remote.ts`: `RemoteEvent` and the day mapping lose `booked`; `updateEvent` goes (nothing calls it any more).
- `pmspa-time-sync.service.ts` push: delete the `booked` computation and both `updateEvent(… { booked })` blocks (the `written` marks they added go too).
- `pmspa-time-preview.ts` (`importPreview`, an event row): delete the "Booked in PMSPA: imported logs aren't booked." warning. In its place, when the
  row's action isn't `skip`, the event has a task and isn't "nonprod" (otherwise the update makes the log unbookable and clears its bookings, D5):
  `overBooked` = the event's logs that pass the three checks above (0.25 h step, 0.25…24 h, text ≤ 1000) and are linked (`byPmspa`) to a PM4 log
  `l` with `hoursToMinutes(log.duration) < l.bookedMinutes`; if any, push
  `` `${plural(n, "log")} of ${durations} is shorter than the time booked in PM4 (${booked}) and will fail.` `` (`durations` as the other
  warnings, `${l.duration} h` joined by ", "; `booked` the PM4 logs' `formatDuration(l.bookedMinutes)` joined by ", "). The action is computed
  before the warnings for this.
- Import loop (`importEventRow`): wrap `this.timeLogs.update(…)` in `try`; on `BookedTimeException` → `firstFailure ??=` `` `${formatDuration(e.bookedMinutes)} of a log is booked in PM4: remove bookings first, or keep at least ${formatDuration(e.bookedMinutes)}` ``,
  `failedLogs += 1`, `continue` (no link saved); rethrow anything else. The row message is then built as for the other log failures.

### Web (test step; T3)
- **Test step:** `days.ts`, `booking-cell.tsx`, `day-section.tsx`, `logged-time-section.tsx`, `pmspa-time-tab.tsx` become their twins (D9). In
  `features/bookings/days.ts` replace the `proposed-types` import and the type lines under it by:
  ```ts
  import type { components } from "@/lib/api/schema";
  type S = components["schemas"];
  /** A time log with its bookings (API-BOOK-001). */
  export type BookingLog = S["BookingLogResponseDto"];
  export type BookingDto = S["BookingDto"];
  export type SetBookingsDto = S["SetBookingsDto"];
  ```
  `features/bookings/api.ts`: `bookingKeys` and the type re-export real; `useBookingRange` and `useSetBooking` with the signatures below, their
  `queryFn` / `mutationFn` `throw new Error("not implemented (feat-book-partial)")`.
- **T3** `web/features/bookings/api.ts`: the twin of the cleaned prototype `api.ts` (below), i.e.
  ```ts
  export function useBookingRange(from: string, to: string): UseQueryResult<BookingLog[], Error>;   // GET /bookings, returns data.items, no cast
  export function useSetBooking(): UseMutationResult<BookingLog[], Error, SetBookingsDto>;
  // PUT /bookings { body: input }, returns data.items; onSuccess invalidates bookingKeys.all and timeKeys.logs()
  ```
- **T3 prototype:** `proto/features/bookings/days.ts` gets the same type block (with `@/lib/api/schema`); `proto/features/bookings/api.ts` imports
  `SetBookingsDto` from `./days` and drops both casts and the "still SetBookingDto" comment; `proto/features/time/api.ts`:
  `export type TimeLogList = components["schemas"]["TimeLogListResponseDto"];` (its `components` import back); `proto/mock/client.ts` and
  `proto/mock/store.ts` import `BookingLog` / `BookingDto` / `SetBookingsDto` from `@/proto/features/bookings/days` (`BookingLogResponseDto` → `BookingLog`);
  then `rm proto/features/bookings/proposed-types.ts`. Afterwards `node scripts/pm4.mjs twins` shows these files as equal.
- **T3 mock import** (`proto/mock/pmspa.ts`, D7 as in the API):
  ```ts
  /** Minutes booked on a PM4 log, as client.ts `bookedOf` (0 while the log isn't bookable). */
  const bookedOf = (l: TimeLog): number;
  /** The booked-time failure of a linked log the import would update, or null (OQ-220). */
  function overBooked(e: RemoteEvent, log: RemoteLog): string | null;
  // null unless the event has a task, isn't "nonprod" and the log is linked (byPmspa("time-log", log.id)) to a PM4 log l with
  // hoursToMinutes(log.duration) < bookedOf(l); else `${formatDuration(b)} of a log is booked in PM4: remove bookings first, or keep at least ${formatDuration(b)}`
  ```
  - `importPreview`, an event row: after the "moves to" warning, when the row's action isn't `skip`, push
    `` `${plural(n, "log")} of ${durations} is shorter than the time booked in PM4 (${booked}) and will fail.` `` for the logs with no earlier
    warning and `overBooked(e, log) !== null` (the same text as the API's).
  - `runImport`, an event row: `reasons = e.logs.map((l) => logFailure(l) ?? overBooked(e, l))`, so such a log isn't updated, isn't linked
    again and fails the row as the API does ("… (1 other log was imported).").

## Acceptance criteria
API: signed in as A (`Europe/Zagreb`, today 2026-10-09) unless stated; B is another user. Seed as feat-book-api (*a*…*h*), booked with `PUT /bookings`:
*a* 6 Oct 120 Anthropic/Meetings [7 Oct 120]; *b* 6 Oct 60 PM Internal []; *c* 6 Oct 45 unsorted; *d* 6 Oct 90 Anthropic excluded; *e* 7 Oct 240
Nvidia/Development [7 Oct 240]; *f* 7 Oct 135 Anthropic/Meetings [6 Oct 30, 7 Oct 45]; *g* 30 Sep 60 Nvidia/PM [1 Oct 60]; *h* 30 Sep 30 Nvidia/PM [].
Web: as feat-book-web (mocked client, `NuqsTestingAdapter`, 2026-10-09 12:00 Zagreb, target 420), the same logs as `BookingLog`s.

| AC | Case → expected | Test | Task |
| --- | --- | --- | --- |
| AC-1 | `GET /bookings?from=2026-10-01&to=2026-10-09` → g, a, b, c, d, e, f, each with `bookings` (a `[{date:"2026-10-07",minutes:120}]`, b `[]`, f 6 Oct 30 then 7 Oct 45), no `bookingDate`; h absent; `?from=2026-09-01&to=2026-09-30` → g (with its 1 Oct booking) and h; B's logs never | `api/test/bookings.ac.e2e-spec.ts` | T1 |
| AC-2 | `GET /bookings` → `400` for `from > to`, over 366 days, `from=2026-02-30`, a missing `to`; `401` without a token (also `PUT`) | `api/test/bookings.ac.e2e-spec.ts` | T1 |
| AC-3 | `PUT {logs:[{logId:b, bookings:[{date:"2026-10-06",minutes:30}]}]}` → `200`, `items` [b] with that booking; `[{logId:f, bookings:[{date:"2026-10-07",minutes:135}]}]` → f has exactly `[7 Oct 135]`; `bookings: []` → `[]`; a date before the work date (`2026-09-01`) → `200`; bookings sent out of date order come back by date; two entries (f, b) → both, in `id` order | `api/test/bookings.ac.e2e-spec.ts` | T1 |
| AC-4 | `PUT` → `400` with the field: `logs` `[]`, 101 entries, missing; `logs.0.logId` `"abc"`; `logs.0.bookings` missing, 97 entries; `logs.0.bookings.0.date` `"2026-02-30"`, `"7.10.2026"`, `"2026-10-10"` ("must not be after today"); `logs.0.bookings.0.minutes` `0`, `20`, `1455`; `logs.1.logId` "lists a log twice"; `logs.0.bookings` "has two bookings on one date" and, for b `[6 Oct 45, 7 Oct 30]`, "adds up to more than the log's duration"; c or d with a booking → `logs.<i>.bookings` "can't be booked", with `[]` → `200`. After each, nothing changed (also the valid entry before a failing one) | `api/test/bookings.ac.e2e-spec.ts` | T1 |
| AC-5 | `PUT` with B's log or a random UUID among A's → `404 not-found`, A's bookings unchanged | `api/test/bookings.ac.e2e-spec.ts` | T1 |
| AC-6 | `PATCH /time-logs/{e}` with `durationMinutes 300`, with `text`, with `workDate "2026-10-05", dayStartMinute 540`, with Nvidia/PM's `taskId` → e keeps `[7 Oct 240]` | `api/test/bookings.ac.e2e-spec.ts` | T1 |
| AC-7 | `PATCH /time-logs/{e} {durationMinutes:180}` → `400` `durationMinutes` "4h of this log is booked. Remove bookings first, or keep at least 4h.", e still 240 min; f `60` → "1h 15m of this log is booked. …", f `75` → `200`; e `{durationMinutes:180, workDate:"2026-10-08", dayStartMinute:540}` → `400` and 8 Oct has no workday | `api/test/bookings.ac.e2e-spec.ts` | T1 |
| AC-8 | `PATCH /time-logs/{e} {excludeFromStats:true}` → e `bookings []`; also with `durationMinutes 15` in the same body → `200`, `[]`; a booked log `{projectId:null}` → `[]`; `{projectId:<PM Internal>}` → kept | `api/test/bookings.ac.e2e-spec.ts` | T1 |
| AC-9 | `DELETE /time-logs/{a}` → a gone from `GET /bookings` and no `bookings` row left for it; with a fresh seed, `DELETE /workdays/2026-10-07` → e and f gone with their `bookings` rows, and a still has `[7 Oct 120]` | `api/test/bookings.ac.e2e-spec.ts` | T1 |
| AC-10 | `GET /time-logs?projectId=<Anthropic>` → `totalMinutes 345`, `bookedMinutes 195` (a 120 + f 75), items with `bookings`; `?taskId=<Meetings>` → `bookedMinutes 195` | `api/test/bookings.ac.e2e-spec.ts` | T1 |
| AC-11 | `GET /reports/dashboard?from=2026-10-01&to=2026-10-09` → days 6 Oct `bookedMinutes 120`, 7 Oct `315` (e 240 + f 75: counted on the work day), and no 1 Oct day (g counts on 30 Sep); projects Anthropic `bookedMinutes 195`, Nvidia `240`; `?from=2026-09-30&to=2026-09-30` → `60` | `api/test/bookings.ac.e2e-spec.ts` | T1 |
| AC-12 | The other suites pass with the new body: `time-logs`, `logged-time`, `reports`, `delete-day` e2e | `api/test/time-logs.ac.e2e-spec.ts`, `api/test/logged-time.ac.e2e-spec.ts`, `api/test/reports.ac.e2e-spec.ts`, `api/test/delete-day.ac.e2e-spec.ts` | T1 |
| AC-13 | `npm run db:migrate` on a local database at `0007` → `\d bookings` shows the PK, `bookings_user_date` and `bookings_minutes` | manual | T1 |
| AC-14 | Push of a day whose logs are all booked → the PMSPA event's `booked` stays as it was (false on a new event, true when PMSPA had true); import of a PMSPA event with `booked: true` → no "Booked in PMSPA" warning, the imported logs have no bookings | `api/test/pmspa-time.ac.e2e-spec.ts` | T2 |
| AC-15 | `pm4LogTuple` / `pmspaLogTuple` have no booked element; a PMSPA event's `booked` toggled after a sync → its logs stay unchanged in the preview | `api/src/integrations/pmspa/pmspa-time-fields.ac.spec.ts`, `api/test/pmspa-time.ac.e2e-spec.ts` | T2 |
| AC-16 | Import where PMSPA shortened a linked 2 h PM4 log with 1 h 30 m booked to 1 h, and changed another log of the event → the row is `failed` with "1h 30m of a log is booked in PM4: remove bookings first, or keep at least 1h 30m (1 other log was imported)."; the booked log is unchanged, the other is updated. Its preview before that: the event row warns "1 log of 1 h is shorter than the time booked in PM4 (1h 30m) and will fail."; no such warning when the event is "nonprod", when PMSPA's 1 h is unchanged since the last sync (row `skip`), or for a 2 h PMSPA duration | `api/test/pmspa-time.ac.e2e-spec.ts` | T2 |
| AC-17 | `api/openapi.json`: `BookingLogResponseDto` has `bookings` (items `BookingDto`) and no `bookingDate`; `PUT /api/v1/bookings` takes `SetBookingsDto` with `logs`; `TimeLogResponseDto` has neither; `PmspaEventDto` has no `booked` | `check` | T2 |
| AC-18 | `bookingDays`: 6 Oct booked current 0, external 30, total 30; Anthropic worked 120, booked 30, `unbooked` [], entries a (one row: its 7 Oct booking, `booked 0`, `first` and `last`) then f incoming (6 Oct 30, worked 0, booked 30); PM Internal: b's one unbooked row of 60, `unbooked` [b]. 7 Oct booked current 285 (e 240 + f 45), external 120 (a), total 405; Anthropic worked 135, booked 165, `unbooked` [f], f's rows 6 Oct 30 (booked 0, worked 135, `first`), 7 Oct 45 (booked 45, worked 0), unbooked 60 (`booking` null, `last`), then a incoming 120; the groups' `booked` add up to the total | `web/features/bookings/days.ac.test.ts` | tests |
| AC-19 | `bookedMinutes` / `unbookedMinutes` (0 for an excluded or unsorted log), `addBooking` (adds to the same date, sorts), `removeBooking` | `web/features/bookings/days.ac.test.ts` | tests |
| AC-20 | Logged time section: f shows "6 Oct 2026 · 30m", "7 Oct 2026 · 45m", "1h unbooked"; b shows "-"; e no "unbooked" line; *Booked* is `bookedMinutes` | `web/features/time/components/logged-time-section.ac.test.tsx`, `web/features/time/logged-time.ac.test.tsx` | tests |
| AC-21 | `useBookingRange` returns the items; `useSetBooking` sends `PUT /bookings` with the `{logs}` body and invalidates `bookingKeys.all` and `timeKeys.logs()` | `web/features/bookings/api.ac.test.tsx` | T3 |
| AC-22 | Bookings page: b's unbooked row **Book** → `{logs:[{logId:b, bookings:[{date:"2026-10-06",minutes:60}]}]}`; Booking time `30m` → minutes 30; `1h 15m` → "At most 1h." and **Book** disabled; `20m` → "Use 15-minute steps."; **Book all** on Anthropic (7 Oct) → f `[6 Oct 30, 7 Oct 105]`; **Remove booking** on f's 6 Oct → f `[7 Oct 45]`; **Edit booking** on e, 8 Oct and `2h`, **Save booking** → e `[8 Oct 120]`; a failure → toast "Couldn't save the booking." | `web/features/bookings/components/bookings-view.ac.test.tsx` | T3 |
| AC-23 | The prototype has no `proposed-types.ts`, and `pm4 twins` reports no difference under `features/bookings`, `features/time` or `features/integrations` | `check` | T3 |
| AC-24 | `npm run db:migrate` on a local database at `0007` or `0008` → `\d time_logs` has no `booking_date` and no `time_logs_user_booking`; `0008_bookings.sql` has no `INSERT` | manual | T4 |
| AC-25 | The schema no longer declares `booking_date` on `time_logs` | `check` | T4 |
| AC-26 | Prototype (`/proto/app/connectors/pmspa`, mock): an event whose linked log was shortened in PMSPA below its PM4 booked time → the preview's event row has the AC-16 warning, and the import fails the row with the AC-16 message while the log keeps its duration and bookings | manual | T3 |

Typed stubs (D8): `toBookingLogDto`, `BookingsService.set`, and the hooks' `queryFn` / `mutationFn` in `web/features/bookings/api.ts`, each
`throw new Error("not implemented (feat-book-partial)")`.

## Checks
```bash
# AC-17: the contract carries bookings, the new body, and no booked flags
node -e "
const s=require('./api/openapi.json').components.schemas, p=require('./api/openapi.json').paths['/api/v1/bookings'];
const fail=(m)=>{console.error(m);process.exit(1)};
if(!s.BookingLogResponseDto?.properties?.bookings) fail('missing BookingLogResponseDto.bookings');
if(s.BookingLogResponseDto.properties.bookingDate) fail('BookingLogResponseDto.bookingDate still there');
if(!JSON.stringify(p.put.requestBody).includes('SetBookingsDto')||!s.SetBookingsDto?.properties?.logs) fail('PUT body is not SetBookingsDto');
if(s.TimeLogResponseDto.properties.bookings||s.TimeLogResponseDto.properties.bookingDate) fail('TimeLogResponseDto carries bookings');
if(s.PmspaEventDto.properties.booked) fail('PmspaEventDto.booked still there');"
```
```bash
# AC-23: no proposed types left, and every twin of this feature equals its prototype file
test ! -e web/proto/features/bookings/proposed-types.ts
! node scripts/pm4.mjs twins | grep -E '^(WARN|FAIL)\b.*features/(bookings|time|integrations)/'
```
```bash
# AC-25: time_logs no longer declares booking_date (the bookings table's column is .notNull()) nor its index
! grep -q 'date("booking_date", { mode: "string" }),' api/src/database/schema/time.ts
! grep -q 'time_logs_user_booking' api/src/database/schema/time.ts
```

## Tasks
| # | Task | App | Size | Tier | Why this tier | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | `bookings` table and migration `0008`, the booking read model, `PUT /bookings`, the booked-time rule in `PATCH /time-logs`, booked minutes in lists and reports | api | L | sonnet | Writes over two tables under row locks, with the order spelled out (D4) | — |
| T2 | PMSPA without the booked flag; the import's booked-time failure and its preview warning | api | M | haiku | Deletions, one `try` and one warning spelled out in *PMSPA* | T1 |
| T3 | Booking hooks (the twin), the prototype on the generated types, the mock import's booked-time warning and failure | web | S | haiku | A twin, import swaps (D9) and one mock rule spelled out in *Web* | T2 |
| T4 | Drop `booking_date` (migration `0009`) and the copy step from `0008`, in the same release as T1–T3 (D2) | api | S | haiku | A generated migration and one deletion from *Database* | T3 |

## Open questions
None.

## Changelog
- 2026-10-23: Initial draft from the owner's Partial Bookings prototype `f3851c1` (OQ-212…OQ-220). Ready for review.
- 2026-10-23: D7: the import preview warns about a log the import would fail for its booked time (owner); `pm4Logs` reads booked minutes (T2), AC-16. The mock import gets the same warning and failure (T3, AC-26; owner).
- 2026-10-23: D1, D2: one release, no data step. Prod has no bookings (owner), so `0008` loses its copy step and T4 drops `booking_date` in the same push (OQ-216); AC-13, AC-24 check the schema only.
