---
id: feat-tlog-api
title: "Time logging API: workdays, time logs and the daily target"
status: approved
owner: Marko Angelovski
last_updated: 2026-10-09
milestone: M4
requirements: [FR-TLOG-001, FR-TLOG-004, FR-TLOG-006, FR-TLOG-008, FR-TLOG-009, FR-TLOG-014, FR-TLOG-017, FR-TLOG-018, FR-TRASH-006, FR-TRASH-007, API-USR-002, API-WD-001, API-WD-002, API-WD-003, API-TLOG-002, API-TLOG-004, API-TLOG-006]
related: [req-time-logs, req-trash, api-endpoints, api-data-model, api-conventions, sec, feat-tsk-api, feat-tlog-web, OQ-103, OQ-105, OQ-108, OQ-110, OQ-111, OQ-114, OQ-115, OQ-119]
---

# Time logging API: workdays, time logs and the daily target

## Goal
The API lets a signed-in user record a day's start time and time logs (text, 15-minute duration, optional
title, project and task, and *exclude from statistics*), read a whole day, edit and delete logs, and keep a daily
target. Contract: [endpoints.md → Shared time-capture shapes](../03-api/endpoints.md#shared-time-capture-shapes),
API-WD-001…003, API-TLOG-002/004/006, API-USR-002. Tables: [data-model.md](../03-api/data-model.md#workdays).
The web side is feat-tlog-web.

## Decisions
| # | Decision | Source |
| --- | --- | --- |
| D1 | A log's project is derived from its task; a differing `projectId` → `400`. A task or project in the trash can't be newly linked (`404 not-found`), but a log keeps its current link on edit. | OQ-108 (owner) |
| D2 | The first log of a date creates the workday in the same transaction (`dayStartMinute`); later `dayStartMinute` values are ignored. | OQ-103 (owner) |
| D3 | The day view returns all logs of the date in `id` order; no pagination, no order field. | OQ-114 (owner) |
| D4 | A log with a task carries the task's `project_id`; moving a task updates its logs in the same transaction, inside `TasksRepository.update` (no module dependency from tasks to time). | data-model.md *time_logs* |
| D5 | "Today" is computed from the caller's `users.time_zone`; a `workDate` after it → `400`. | OQ-110 (owner) |
| D6 | `PATCH /me` is added here, for `dailyTargetMinutes` (default 420) and `timeZone`, which the settings screen edits together. | OQ-106, OQ-115 (owner) |
| D7 | `excludeFromStats` is stored and returned as is; the API computes no statistics from it in this feature. | OQ-119 (owner) |
| D8 | `GET /time-logs?projectId=&taskId=` (API-TLOG-001) is not built here; it comes with the logged-time sections of the project and task pages. | Owner (2026-10-09): features documented one screen at a time |

## Scope
**In:** schema and migration for `workdays`, `time_logs`, `users.daily_target_minutes`; the `time` module (workdays and
time logs); `PATCH /me` and `Me.dailyTargetMinutes`; moving a task's logs in `PATCH /tasks/{id}`; the OpenAPI export.

**Before the tests are written:** feat-tsk-api is done.

**Non-goals** (implementers must not touch these):
- Anything in `web/`. API-TLOG-001 (D8). The trash list, the purge and the retained-name `UPDATE` (M6; only the read model is built here).
- Reports (`/reports/*`), the dashboard, bookings.
- `projects/*`, auth, the Problem Details filter, `common/validation/*` beyond adding to them.
- `api/test/*` files written in the test step.

## Read first
| Path | Why / copy this |
| --- | --- |
| `specs/03-api/endpoints.md#shared-time-capture-shapes` and API-WD-001…003, API-TLOG-002/004/006, API-USR-002 | Contract |
| `specs/03-api/data-model.md#workdays`, `#time_logs`, `#retained-names-fr-trash-006` | Tables, invariants, read model |
| `api/src/tasks/` (module, controller, service, repository, `dto/`) | The pattern to copy: layering, `findOwned`, Drizzle style, `@ApiProblemResponses` |
| `api/src/database/schema/projects.ts`, `api/src/database/schema/users.ts` | Column style, `index`, `check`, FKs |
| `api/src/users/users.controller.ts`, `users.service.ts`, `users.repository.ts`, `dto/me-response.dto.ts` | `/me` to extend |
| `api/src/common/dto/ref.dto.ts`, `api/src/common/validation/transforms.ts` | `RefDto`, `Trim`, `TrimToNull` |
| `api/test/support/auth-test-utils.ts`, `api/test/support/project-test-utils.ts` | Test sign-in and seeding |

## Files
| App | File | C/M | Task | Notes |
| --- | --- | --- | --- | --- |
| api | `api/test/time-logs.ac.e2e-spec.ts` | C | tests | API-TLOG-*, API-WD-* |
| api | `api/test/me-settings.ac.e2e-spec.ts` | C | tests | API-USR-002 |
| api | `api/test/me.ac.e2e-spec.ts` | M | tests | AC-3 of feat-auth-api-session: `Me` now has `dailyTargetMinutes` |
| api | `api/src/database/schema/time.ts` | C | T1 | `workdays`, `timeLogs` |
| api | `api/src/database/schema/users.ts` | M | T1 | `dailyTargetMinutes` |
| api | `api/src/database/schema/index.ts` | M | T1 | Export `time.js` |
| api | `api/drizzle/0003_*.sql`, `api/drizzle/meta/*` | C/M | T1 | `npm run db:generate` |
| api | `api/src/users/dto/me-response.dto.ts` | M | T1 | `dailyTargetMinutes` |
| api | `api/src/users/dto/update-me.dto.ts` | C | T1 | Hand-written |
| api | `api/src/common/validation/minutes.ts` | C | T1 | `MultipleOf15`, `IanaTimeZone` |
| api | `api/src/users/users.controller.ts`, `users.service.ts`, `users.repository.ts` (+ their `.spec.ts`) | M | T1 | `PATCH /me` |
| api | `api/src/time/time.module.ts` | C | T2 | `npx nest g module time` |
| api | `api/src/time/workdays.controller.ts`, `workdays.service.ts` (+ `.spec.ts`) | C | T2 | `npx nest g controller time/workdays --flat`, `g service time/workdays --flat` |
| api | `api/src/time/time-logs.controller.ts`, `time-logs.service.ts` (+ `.spec.ts`) | C | T2 | same, `time-logs` |
| api | `api/src/time/time.repository.ts` (+ `.spec.ts`) | C | T2 | `npx nest g provider time/time.repository --flat` |
| api | `api/src/time/dto/*.ts` | C | T2 | Hand-written |
| api | `api/src/app.module.ts` | M | T2 | The CLI adds `TimeModule` |
| api | `api/src/tasks/tasks.repository.ts` (+ `.spec.ts`) | M | T2 | Move a task's logs (D4) |
| api | `api/openapi.json` | M | T1, T2 | `npm run openapi:export` |

## Interfaces

### Database (T1)
```ts
// api/src/database/schema/time.ts (data-model.md: column order 8 B → 4 B → 2 B → 1 B → uuid/varchar)
export const workdays = pgTable("workdays", {
  workDate: date("work_date").notNull(),
  startMinute: smallint("start_minute").notNull(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.userId, t.workDate] }), check("workdays_start_minute", sql`${t.startMinute} BETWEEN 0 AND 1425 AND ${t.startMinute} % 15 = 0`)]);
export const timeLogs = pgTable("time_logs", {
  workDate: date("work_date").notNull(),
  durationMinutes: smallint("duration_minutes").notNull(),
  excludeFromStats: boolean("exclude_from_stats").notNull().default(false),
  id: uuid("id").primaryKey().default(sql`uuidv7()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  taskId: uuid("task_id").references(() => tasks.id, { onDelete: "set null" }),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  text: varchar("text", { length: 1000 }).notNull(),
  title: varchar("title", { length: 100 }),
  deletedTaskTitle: varchar("deleted_task_title", { length: 200 }),
  deletedProjectTitle: varchar("deleted_project_title", { length: 200 }),
}, (t) => [
  index("time_logs_user_date").on(t.userId, t.workDate, t.id),
  index("time_logs_task").on(t.taskId).where(sql`${t.taskId} IS NOT NULL`),
  index("time_logs_project").on(t.projectId).where(sql`${t.projectId} IS NOT NULL`),
  check("time_logs_duration", sql`${t.durationMinutes} BETWEEN 15 AND 1440 AND ${t.durationMinutes} % 15 = 0`),
]);
// users.ts: dailyTargetMinutes: smallint("daily_target_minutes").notNull().default(420), with a check 15–1440, % 15 = 0
```
The migration is generated, never hand-written; it must apply on top of `0002_projects_tasks`.

### `/me` (T1)
```ts
// api/src/users/dto/update-me.dto.ts
export class UpdateMeDto {
  @IsOptional() @Trim() @IsString() @MaxLength(64) @Validate(IanaTimeZone) timeZone?: string;  // null → 400 (ValidateIf !== undefined)
  @IsOptional() @IsInt() @Min(15) @Max(1440) @Validate(MultipleOf15) dailyTargetMinutes?: number;
}
// users.controller.ts: @Patch() update(@CurrentUser() user, @Body() dto: UpdateMeDto): Promise<MeResponseDto>
// users.service.ts: updateMe(userId, dto); MeResponseDto gains `dailyTargetMinutes: number`.
```
`IanaTimeZone` accepts a value when `new Intl.DateTimeFormat("en", { timeZone: value })` doesn't throw. `MultipleOf15` and `IanaTimeZone` are
class-validator constraints in `api/src/common/validation/minutes.ts`, reused by T2 (`@Validate(MultipleOf15)`).

### DTOs (T2)
```ts
// api/src/time/dto/
export class CreateTimeLogDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/) @IsISO8601({ strict: true }) workDate: string;
  @IsInt() @Min(15) @Max(1440) @Validate(MultipleOf15) durationMinutes: number;
  @Trim() @IsString() @Length(1, 1000) text: string;
  @IsOptional() @TrimToNull() @IsString() @MaxLength(100) title?: string | null;
  @IsOptional() @IsUUID() projectId?: string | null;
  @IsOptional() @IsUUID() taskId?: string | null;
  @IsOptional() @IsBoolean() excludeFromStats?: boolean;           // absent → false; null → 400 (ValidateIf !== undefined)
  @IsOptional() @IsInt() @Min(0) @Max(1425) @Validate(MultipleOf15) dayStartMinute?: number;
}
export class UpdateTimeLogDto { /* the same fields, all optional; workDate, durationMinutes, text, excludeFromStats: @ValidateIf(o => o.x !== undefined) so null → 400 */ }
export class SetWorkdayDto { @IsInt() @Min(0) @Max(1425) @Validate(MultipleOf15) startMinute: number }
export class WorkdaysQueryDto { @Matches(date) @IsISO8601({ strict: true }) from: string; @Matches(date) @IsISO8601({ strict: true }) to: string }
export class TimeLogResponseDto { id: string; workDate: string; durationMinutes: number; text: string;
  @ApiProperty({ type: String, nullable: true }) title: string | null;
  @ApiProperty({ type: RefDto, nullable: true }) project: RefDto | null; @ApiProperty({ type: RefDto, nullable: true }) task: RefDto | null;
  excludeFromStats: boolean }
export class DayResponseDto { workDate: string; @ApiProperty({ type: Number, nullable: true }) startMinute: number | null; totalMinutes: number; logs: TimeLogResponseDto[] }
export class WorkdayResponseDto { workDate: string; startMinute: number }
export class WorkdaySummaryDto { workDate: string; startMinute: number; totalMinutes: number }
export class WorkdayListResponseDto { items: WorkdaySummaryDto[] }
```
A date that matches the regex but isn't real (`2026-02-30`), or a path `{date}` that isn't a date → `400`.

### Repository and services (T2)
```ts
// api/src/time/time.repository.ts (every method scoped by userId; one DrizzleDb transaction where noted)
export interface TimeLogRow { id; workDate; durationMinutes; excludeFromStats; text; title; taskId; projectId; deletedTaskTitle; deletedProjectTitle;
  taskTitle: string | null; taskDeletedAt: Date | null; taskProjectDeletedAt: Date | null; projectTitle: string | null; projectDeletedAt: Date | null }
getWorkday(userId, date): Promise<number | null>;                               // startMinute
upsertWorkday(userId, date, startMinute): Promise<void>;                        // INSERT … ON CONFLICT (user_id, work_date) DO UPDATE
insertLog(userId, values, dayStart: { date: string; startMinute: number } | null): Promise<string>; // transaction: insert the workday ON CONFLICT DO NOTHING when dayStart, then the log
findLog(userId, id): Promise<TimeLogRow | null>;
updateLog(userId, id, values, dayStart: { date: string; startMinute: number } | null): Promise<void>; // transaction, as insertLog
deleteLog(userId, id): Promise<void>;
listDay(userId, date): Promise<TimeLogRow[]>;                                   // ORDER BY l.id ASC
listWorkdays(userId, from, to): Promise<{ workDate: string; startMinute: number; totalMinutes: number }[]>; // LEFT JOIN + SUM, ORDER BY work_date
```
Rows `LEFT JOIN tasks` (and the task's project, for `taskProjectDeletedAt`) and `projects`, including trashed ones. `Ref` mapping (`toRef`): a task/project row
present → `{ id, title, deleted: deletedAt !== null }` (a task is `deleted` also when its **project** is trashed: `taskDeletedAt || taskProjectDeletedAt`);
no row but a `deleted…Title` snapshot → `{ id: null, title: snapshot, deleted: true }`; else `null`.

```ts
// api/src/time/time-logs.service.ts
create(userId, dto): Promise<TimeLogResponseDto>;  update(userId, id, dto): Promise<TimeLogResponseDto>;  remove(userId, id): Promise<void>;
// api/src/time/workdays.service.ts
getDay(userId, date): Promise<DayResponseDto>;     list(userId, query): Promise<WorkdayListResponseDto>;
setStart(userId, date, startMinute): Promise<WorkdayResponseDto>;
```
- `today(tz)`: the date string in the caller's `users.time_zone` (`UsersRepository.findById`); `date > today` → `BadRequestException` naming `workDate` (D5). The same check serves `PUT /workdays/{date}`.
- Link resolution (`create`, `update` when `projectId` or `taskId` is present): per endpoints.md *Link input*. Use `TasksService.findOwned(userId, taskId)` and `ProjectsService.findOwned`;
  `NotFoundException` or `InTrashException` from them → `NotFoundException("Task not found.")` / `("Project not found.")`. `update` skips the check for a link equal to the log's current one (D1).
  `TimeModule` imports `TasksModule`, `ProjectsModule`, `UsersModule`.
- Day start: after resolving the target date, `existing = getWorkday(userId, date)`. `existing === null` and no `dayStartMinute` → `400` (field `dayStartMinute`); else `dayStart = existing === null ? { date, startMinute } : null` (D2). In `update`, only when `workDate` is present and differs.
- `create`: `excludeFromStats ?? false`. `update`: sets `excludeFromStats` only when present.
- `getDay`: `startMinute = getWorkday ?? null`, `logs = listDay`, `totalMinutes = sum` (all logs, excluded ones too). `list`: range > 366 days or `from > to` → `400`.
- `update` of a missing/foreign/non-UUID id and `remove` → `404 not-found` ("Time log not found.").
- `TasksRepository.update` (D4): when `values.projectId` is set, run `UPDATE tasks …` and `UPDATE time_logs SET project_id = <new> WHERE user_id = … AND task_id = <id>` in one `db.transaction`.
- Controllers: `@ApiBearerAuth('bearer')`, `@Controller('workdays')` (`GET`, `GET :date`, `PUT :date`) and `@Controller('time-logs')` (`POST`, `PATCH :id`, `DELETE :id` → 204), `@ApiProblemResponses(...)` per endpoints.md *Errors*. Run `npm run openapi:export` at the end.

## Acceptance criteria
Signed in as user A (zone `Europe/Zagreb`; "today" = 2026-10-07) unless stated; B is another user. P, Q are A's projects, T a task of P, U a task of Q.

| AC | Case → expected | Test | Task |
| --- | --- | --- | --- |
| AC-1 | `GET /me` has `dailyTargetMinutes 420`; `PATCH /me {dailyTargetMinutes:480}` → `200` with 480, `GET /me` shows it; `{timeZone:"Europe/London"}` → `200`; `{}` → `200` | `api/test/me-settings.ac.e2e-spec.ts` | T1 |
| AC-2 | `PATCH /me` `400` for `dailyTargetMinutes` `10`, `20`, `1455`, `1.5`, `null`; `timeZone` `"Nope/Zone"`, `null`; without a token → `401` | `api/test/me-settings.ac.e2e-spec.ts` | T1 |
| AC-3 | `POST /time-logs {workDate:"2026-10-07", durationMinutes:15, text:" Specs review ", dayStartMinute:540}` → `201`: `text "Specs review"`, `title null`, `project null`, `task null`, `excludeFromStats false`; `GET /workdays/2026-10-07` → `startMinute 540`, `totalMinutes 15`, one log | `api/test/time-logs.ac.e2e-spec.ts` | T2 |
| AC-4 | A second log on the same date without `dayStartMinute` → `201`; with a different `dayStartMinute` → `201` and the start stays `540` (D2) | `api/test/time-logs.ac.e2e-spec.ts` | T2 |
| AC-5 | First log of a date with no workday and no `dayStartMinute` → `400` naming `dayStartMinute`, nothing created; `dayStartMinute` `500`, `1440`, `-15` → `400` | `api/test/time-logs.ac.e2e-spec.ts` | T2 |
| AC-6 | `400` with the named field for: no/blank/1001-char `text`; `title` 101 chars; `durationMinutes` `0`, `10`, `20`, `1455`, `"1h"`, missing; `workDate` `2026-02-30`, `07.10.2026`, missing; `workDate` `2026-10-08` (future); `excludeFromStats` `"yes"`, `null` | `api/test/time-logs.ac.e2e-spec.ts` | T2 |
| AC-7 | `durationMinutes` `15` and `1440` → `201`; blank `title` → stored `null`; `title " Review "` → `"Review"`; `excludeFromStats:true` → `201` with `true`, and it is counted in `totalMinutes` of `GET /workdays/{date}` | `api/test/time-logs.ac.e2e-spec.ts` | T2 |
| AC-8 | `taskId:T` → `201` with `task {id:T, title, deleted:false}` and `project {id:P, …}`; `taskId:T, projectId:P` → `201`; `taskId:T, projectId:Q` → `400` naming `projectId` | `api/test/time-logs.ac.e2e-spec.ts` | T2 |
| AC-9 | `projectId:P` only → `project` set, `task null`; B's, random or trashed project/task → `404 not-found`, nothing created; a completed task → `201` | `api/test/time-logs.ac.e2e-spec.ts` | T2 |
| AC-10 | `GET /workdays/2026-10-07` lists logs in the order created (3 logs → same order), `totalMinutes` = their sum; a date with nothing → `{startMinute:null, totalMinutes:0, logs:[]}`; `2026-13-01` → `400`; B's logs never appear | `api/test/time-logs.ac.e2e-spec.ts` | T2 |
| AC-11 | `PUT /workdays/2026-10-07 {startMinute:480}` → `200`, then `GET` shows 480; `PUT` for `2026-10-08` → `400`; `startMinute` `485` → `400` | `api/test/time-logs.ac.e2e-spec.ts` | T2 |
| AC-12 | `GET /workdays?from=2026-10-01&to=2026-10-31` → one item per workday with `startMinute` and `totalMinutes`; a workday whose logs were all deleted → `totalMinutes 0`; range over 366 days or `from > to` → `400` | `api/test/time-logs.ac.e2e-spec.ts` | T2 |
| AC-13 | `PATCH` changes `durationMinutes`, `text`, `title` (`null` clears it), `excludeFromStats` (true → false); `text:null`, `durationMinutes:null`, `workDate:null`, `excludeFromStats:null` → `400`; `{}` → `200` | `api/test/time-logs.ac.e2e-spec.ts` | T2 |
| AC-14 | `PATCH {taskId:U}` → project becomes Q; `PATCH {projectId:P}` (no task) → task cleared; `PATCH {projectId:null}` → both cleared; neither field → link unchanged; B's task → `404` | `api/test/time-logs.ac.e2e-spec.ts` | T2 |
| AC-15 | `PATCH {workDate:"2026-10-05"}` where that date has no workday and no `dayStartMinute` → `400` (`dayStartMinute`); with it → `200` and the date has that start; to a future date → `400`; to a date that has a workday → `200` (no `dayStartMinute` needed), and the log is listed among that date's logs by `id` (entry) order | `api/test/time-logs.ac.e2e-spec.ts` | T2 |
| AC-16 | A log linked to a task that is later trashed: `PATCH {text:"x"}` with no link fields → `200`; `PATCH {taskId:<same task>}` → `200`; the day shows `task.deleted true`; a different trashed task → `404` | `api/test/time-logs.ac.e2e-spec.ts` | T2 |
| AC-17 | `DELETE /time-logs/{id}` → `204`, gone from `GET /workdays/{date}`, the workday stays; again → `404`; B's → `404`; `abc` → `404` | `api/test/time-logs.ac.e2e-spec.ts` | T2 |
| AC-18 | `PATCH /tasks/T {projectId:Q}` → T's logs now have `project` Q in `GET /workdays/{date}`; a log of P without a task keeps P | `api/test/time-logs.ac.e2e-spec.ts` | T2 |
| AC-19 | A log of a trashed project or task is still returned in its day, with `deleted: true` and its title, and still counts in `totalMinutes` | `api/test/time-logs.ac.e2e-spec.ts` | T2 |
| AC-20 | Every `/workdays` and `/time-logs` endpoint, without a token → `401` | `api/test/time-logs.ac.e2e-spec.ts` | T2 |
| AC-21 | `api/openapi.json` has the paths of API-WD-001…003, API-TLOG-002/004/006 and `PATCH /api/v1/me`, all requiring `bearer`; `MeResponseDto` has `dailyTargetMinutes` and `TimeLogResponseDto` has `excludeFromStats` | `check` | T2 |

No typed stubs: the e2e tests only call HTTP endpoints.

## Checks
```bash
# AC-21: the contract has the time-capture endpoints, all protected, the daily target on Me and the exclude flag on TimeLog
node -e "
const d=require('./api/openapi.json'), p=d.paths, s=d.components?.schemas??{}, need=[['/api/v1/workdays','get'],['/api/v1/workdays/{date}','get'],['/api/v1/workdays/{date}','put'],['/api/v1/time-logs','post'],['/api/v1/time-logs/{id}','patch'],['/api/v1/time-logs/{id}','delete'],['/api/v1/me','patch']];
for (const [u,m] of need) { const op=p[u]?.[m]; if(!op){console.error('missing',m,u);process.exit(1)} if(!JSON.stringify(op.security??[]).includes('bearer')){console.error('not protected',u);process.exit(1)} }
if (!s.MeResponseDto?.properties?.dailyTargetMinutes) { console.error('missing dailyTargetMinutes'); process.exit(1) }
if (!s.TimeLogResponseDto?.properties?.excludeFromStats) { console.error('missing excludeFromStats'); process.exit(1) }"
```

## Tasks
| # | Task | App | Size | Tier | Why this tier | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | Schema + migration (`workdays`, `time_logs`, `users.daily_target_minutes`) and `PATCH /me` | api | S | haiku | Table definitions are spelled out above; `/me` follows the existing controller/service | — (feat-tsk-api done) |
| T2 | `time` module: workdays, time logs, link and day-start rules, moving a task's logs | api | L | sonnet | Transactions across two tables, link and day-start rules, time-zone "today" and a cross-module change in `TasksRepository` | T1 |

## Open questions
None.

## Changelog
- 2026-10-07: Initial draft.
- 2026-10-09: `excludeFromStats` (OQ-119); daily target default 420 (OQ-115); API-TLOG-001 moved to the project/task logged-time feature (D8); moving a task's logs lives in `TasksRepository.update` (D4). Ready for review.
- 2026-10-09: Approved by the owner.
- 2026-10-09: Test step: the existing `me.ac.e2e-spec.ts` (exact `Me` fields) gains `dailyTargetMinutes`.
