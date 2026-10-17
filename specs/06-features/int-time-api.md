---
id: feat-int-time-api
title: "PMSPA time API: PMSPA days, time import and day push"
status: approved
owner: Marko Angelovski
last_updated: 2026-10-17
milestone: M6
requirements: [FR-INT-007, FR-INT-010, FR-INT-011, FR-INT-012, API-INT-007, API-INT-008, API-INT-009, API-INT-010, API-INT-011, API-INT-014]
related: [req-integrations, api-endpoints, api-data-model, feat-int-conn-api, feat-int-sync-api, feat-int-web, OQ-158, OQ-162, OQ-167, OQ-168, OQ-169, OQ-176, OQ-179, OQ-180, OQ-189, OQ-191, OQ-192]
prototype: eefe787
---

# PMSPA time API: PMSPA days, time import and day push

## Goal
The API lists a week of the connected account's PMSPA days with their events and logs, imports selected days into PM4
logs, pushes one PM4 day's logs to PMSPA as events, and reads a linked log's PMSPA counterpart.
Contract: [endpoints.md → Shared PMSPA shapes](../03-api/endpoints.md#shared-pmspa-shapes), API-INT-007…011, API-INT-014.
Rules: *Entity mapping → Time*, FR-INT-011 (*Time*), FR-INT-012 (*Push a day*) in [integrations.md](../01-requirements/integrations.md).
Reference engine: `web/proto/mock/pmspa.ts` (`listDays`, the `dates` part of `importPreview` and `runImport`, `groupDay`, `eventTitle`,
`pushPreview` and `runPush` for a day target).

## Decisions
| # | Decision | Source |
| --- | --- | --- |
| D1 | A log's fingerprint tuples (feat-int-sync-api D1): PM4 `[cut(text, 350), durationMinutes, <group key mapped to PMSPA>, booked]`, PMSPA `[log title, minutes, event task id or null, event title, event booked]`. Group key mapped: the linked PMSPA task id for a task group, else `"title:" + event title`. | OQ-176 (owner) |
| D2 | A log moved to another event in PMSPA's terms is deleted from its old event and created in the new one (PMSPA has no move); the link then points at the new PMSPA log id. An old event on the pushed day left without logs is deleted. | OQ-162 (owner); PMSPA API |
| D3 | `days.createLog` returns no id: after writing an event's logs the push reads that day once (one-day form) and links the new logs by their position at the end of the event's `logs[]`. | PMSPA docs (E14) |
| D4 | Every `days.createEvent` sends the PM4 day's `start` (minutes ÷ 60) and the first log's duration; the other logs follow with `days.createLog`. PMSPA titles an event's first log after the event, so after the re-read (D3) the push renames that log to its PM4 text. | OQ-179, OQ-192 (owner); PMSPA docs (`days.createEvent`) |
| D5 | A PMSPA log that isn't linked to a PM4 log is never touched by a push; PM4 logs deleted in PM4 leave their PMSPA logs (the link went with the cascade). | Design principle 8 |
| D6 | Import writes PM4 logs through `TimeLogsService` and the start through `WorkdaysService` (TimeModule exports both). A day row comes before its event rows, so the workday exists before its first log. | Agent, as feat-int-sync-api D5 |
| D7 | The import's day row takes the push's rule (all linked → update if any changed, else skip; some → update; none → create), where the prototype said `skip` for a partly linked day. | Agent: the prototype's rule skipped days with new logs |
| D8 | A selected date after today in the user's zone: its day row is `skip` "In the future: PM4 doesn't log future time." and its events are left out. | Agent |
| D9 | API-INT-007 and `dates` cover at most 7 days (the Time tab's week): one range call plus one call per day found (API-INT-007), one `getDay` per date (import). | Agent: PMSPA's 100-requests budget |
| D10 | A pushed PM4 log whose PMSPA log isn't in the pushed day (its date changed in PM4, or it was deleted in PMSPA): the push deletes the old PMSPA log by id (404 = already gone), creates it in the day's event and re-links it. The other day's event, if left empty, stays. The event row warns. | OQ-191 (owner) |
| D11 | A time-log link counts only when both its records are in the snapshot (as feat-int-sync-api's `usableLinks`); the commit seeds its links from the same rule as the preview. On push, the PMSPA side of a link to a PM4 log of the day may be outside the day (D10). | Opus review of feat-int-sync-api (F2) |
| D12 | Tasks run on haiku or sonnet; the engine splits into pure rows (sonnet), loader and preview endpoints (haiku), import commit (haiku) and push commit (sonnet), each commit spelled out step by step. | OQ-189 (owner) |

## Scope
**In:** the PMSPA days client, the time mapping (groups, titles, nonprod, hours), API-INT-007, `dates` on API-INT-008/009, API-INT-010/011,
the `time-log` case of API-INT-014, the OpenAPI export.

**Before the tests are written:** feat-int-sync-api is done.

**Non-goals** (implementers must not touch these):
- Anything in `web/`. Projects and tasks rules (feat-int-sync-api): the project and task rows and `syncPair` stay as they are; T2 only
  moves the row builders of `pmspa-preview.ts` into exported factories without changing their output.
- `time/*` other than exporting `TimeLogsService` and `WorkdaysService` from `time.module.ts`. Bookings.
- `api/test/*` files written in the test step.

## Read first
| Path | Why / copy this |
| --- | --- |
| `specs/03-api/endpoints.md#shared-pmspa-shapes`, API-INT-007…011, API-INT-014 | Contract |
| `specs/01-requirements/integrations.md` *Entity mapping → Time*, FR-INT-011, FR-INT-012 | The rules |
| `web/proto/mock/pmspa.ts` | The reference: `listDays`, `importPreview` (dates), `runImport` (day and event rows), `groupDay`, `eventTitle`, `pushedTaskPath`, `pushPreview` (day), `runPush` (day and event rows), every user-visible string |
| `api/src/integrations/pmspa/pmspa-preview.ts` | `SyncSnapshot`, `row`, `usableLinks`, `importRows`, `syncRows`, `choiceFor`: the pure row pattern T2 copies |
| `api/src/integrations/pmspa/pmspa-sync.service.ts` | `load`, `commit` (lock, row loop, `RowFailure`, `PmspaWriteError`), `RunLinks`, `saveLink`, `result`: the commit pattern T3–T5 extend |
| `api/src/integrations/pmspa/pmspa-fields.ts`, `api/src/integrations/pmspa/pmspa-remote.ts`, `api/src/integrations/pmspa/pmspa-links.repository.ts`, `api/src/integrations/pmspa/pmspa-sync.repository.ts`, `api/src/integrations/pmspa/dto/sync.dto.ts` | `fingerprint`, the remote client, links, PM4 reads, the sync DTOs |
| `api/src/time/time-logs.service.ts`, `api/src/time/workdays.service.ts`, `api/src/time/time.repository.ts` (`selectRows`, `listDay`) | D6; T3's `pm4Logs` copies `listDay`'s select |
| `docs-pmspa/connector/01-discovery/modules/days.yaml` (local, git-ignored, in the main checkout) | `days.findByRange`, `findByDay`, `createEvent`, `updateEvent`, `deleteEvent`, `createLog`, `updateLog`, `deleteLog` bodies and answers |

## Files
| App | File | C/M | Task | Notes |
| --- | --- | --- | --- | --- |
| api | `api/test/pmspa-time.ac.e2e-spec.ts` | C | tests | Days, time import, day push |
| api | `api/test/support/fake-pmspa.ts` | M | tests | Days, events and logs in the fake |
| api | `api/src/integrations/pmspa/pmspa-time-fields.ac.spec.ts` | C | tests | The pure mapping |
| api | `api/src/integrations/pmspa/pmspa-time-fields.ts` | C/M | tests, T1 | Typed stubs in the test step, implemented in T1 |
| api | `api/src/integrations/pmspa/pmspa-remote.ts`, `api/src/integrations/pmspa/pmspa-remote.spec.ts` | M | tests, T1 | `RemoteLog`, `RemoteEvent`, `RemoteDay` in the test step; the days client in T1 |
| api | `api/src/integrations/pmspa/pmspa-fields.ts` | M | T1 | Widen `fingerprint`'s tuple type |
| api | `api/src/integrations/pmspa/pmspa-browse.controller.ts`, `api/src/integrations/pmspa/pmspa-browse.controller.spec.ts`, `api/src/integrations/pmspa/pmspa-links.service.ts`, `api/src/integrations/pmspa/pmspa-links.service.spec.ts`, `api/src/integrations/pmspa/dto/pmspa-browse.dto.ts` | M | T1 | API-INT-007, the `time-log` detail, `PmspaDayDto` and friends |
| api | `api/src/integrations/pmspa/pmspa-time-preview.ts`, `api/src/integrations/pmspa/pmspa-time-preview.spec.ts` | C | T2 | Hand-written (pure, no schematic) |
| api | `api/src/integrations/pmspa/pmspa-preview.ts`, `api/src/integrations/pmspa/pmspa-preview.spec.ts` | M | T2 | Export the row builders |
| api | `api/src/time/time.module.ts` | M | T3 | Export `TimeLogsService`, `WorkdaysService` |
| api | `api/src/integrations/pmspa/dto/sync.dto.ts` | M | T3 | `dates`, push DTOs |
| api | `api/src/integrations/pmspa/pmspa-sync.repository.ts`, `api/src/integrations/pmspa/pmspa-sync.repository.spec.ts` | M | T3 | `pm4Logs`, `pm4Starts` |
| api | `api/src/integrations/pmspa/pmspa-links.repository.ts`, `api/src/integrations/pmspa/pmspa-links.repository.spec.ts` | M | T3 | `logLinks` |
| api | `api/src/integrations/pmspa/pmspa-time-sync.service.ts`, `api/src/integrations/pmspa/pmspa-time-sync.service.spec.ts` | C/M | T3, T4, T5 | `npx nest g service integrations/pmspa/pmspa-time-sync --flat` (T3); loader T3, import commit T4, push commit T5 |
| api | `api/src/integrations/pmspa/pmspa-sync.service.ts`, `api/src/integrations/pmspa/pmspa-sync.service.spec.ts`, `api/src/integrations/pmspa/pmspa-sync.controller.ts`, `api/src/integrations/pmspa/pmspa-sync.controller.spec.ts` | M | T3, T4, T5 | Previews T3, import dispatch T4, push commit and endpoint T5 |
| api | `api/src/integrations/pmspa/pmspa.module.ts` | M | T3 | Imports `TimeModule`; provides `PmspaTimeSyncService` |
| api | `api/openapi.json` | M | T1, T3, T5 | `npm run openapi:export` |

## Interfaces

### Time fields (T1, T2)
```ts
// api/src/integrations/pmspa/pmspa-time-fields.ts: pure
export const NONPROD = "nonprod";
export function isNonprod(eventTitle: string): boolean;            // trim + lower-case === "nonprod"
export function eventTitle(projectTitle: string | null, logTitle: string | null): string;  // OQ-167, the prototype's eventTitle
export interface Pm4LogForPush { id: string; text: string; title: string | null; durationMinutes: number; excludeFromStats: boolean;
  booked: boolean; task: { id: string | null; title: string; deleted: boolean } | null; project: { id: string | null; title: string; deleted: boolean } | null }
export interface PushGroup { key: string; title: string; taskId: string | null; projectId: string | null; logs: Pm4LogForPush[]; note: string | null }
export function groupDay(logs: Pm4LogForPush[]): PushGroup[];     // the prototype's groupDay: keys task:<id> | project:<id> | unsorted:<title>, "nonprod", notes
export function hoursToMinutes(h: number): number;                 // Math.round(h * 60)
export function isQuarterHours(h: number): boolean;               // Number.isInteger(h * 4)
export function startToMinute(start: number | null): number | null;// × 60, rounded to the nearest 15
export function minuteToStart(minute: number): number;             // ÷ 60
export function formatDuration(minutes: number): string;          // as web/lib/time: "3h 45m", "45m", "2h"
export function formatWorkDate(date: string): string;              // as web/lib/time: "16 Oct 2026" (English month abbreviations, no library)
export function plural(n: number, one: string, many?: string): string;  // "1 log", "3 logs"
export function pm4LogTuple(l: Pm4LogForPush, group: string): (string | number | boolean | null)[];   // D1
export function pmspaLogTuple(log: RemoteLog, e: RemoteEvent): (string | number | boolean | null)[];  // D1
// pmspa-fields.ts, changed: the time tuples hold numbers and booleans; the hash of a string tuple is unchanged (JSON.stringify)
export function fingerprint(tuple: (string | number | boolean | null)[]): Buffer;
```

### PMSPA days (T1)
```ts
// pmspa-remote.ts, added
export interface RemoteLog { id: string; title: string; duration: number }   // hours
export interface RemoteEvent { id: string; dayId: string; date: string; title: string; taskId: string | null; booked: boolean; logs: RemoteLog[] }
export interface RemoteDay { id: string; date: string; start: number | null; events: RemoteEvent[] }
listDays(userId, from, to): Promise<RemoteDay[]>;   // D9: findByRange (start+end) → ids; then findByDay(id) each; 404 → []
getDay(userId, date): Promise<RemoteDay | null>;    // one-day form `?start=<date>`; 404 → null
createEvent(userId, e: { day: string; start: number; title: string; task: string | null; duration: number }): Promise<void>;  // the first log: PMSPA titles it after the event (D4)
updateEvent(userId, eventId, f: { booked?: boolean; title?: string }): Promise<void>;
deleteEvent(userId, dayId, eventId): Promise<void>;
createLog(userId, eventId, l: { title: string; duration: number }): Promise<void>;
updateLog(userId, logId, l: { title: string; duration: number }): Promise<void>;
deleteLog(userId, logId): Promise<void>;           // 404 → resolves (already gone, D10)
```
API-INT-007 (`pmspa-browse.controller.ts`): `from`, `to` `YYYY-MM-DD`, `from ≤ to`, at most 7 days → else 400; `listDays`, mapped per endpoints.md
(`linkState` from `byPmspa` of each log, `task {id, title, projectTitle}` from `listAllTasks` / `listProjects` of the same request).
API-INT-014 `time-log`: the active log link → `getDay(<PM4 log's work date>)` → the event holding `pmspa_id` → `{type: "time-log", title: log.title, eventTitle}`, else `pmspa: null`.

### Time snapshot (T2, T3, T4, T5)
```ts
// pmspa-time-preview.ts
export interface Pm4DayLog extends Pm4LogForPush { workDate: string }
export interface TimeSnapshot extends SyncSnapshot {
  today: string;                              // the user's today (YYYY-MM-DD, user zone)
  remoteDays: RemoteDay[];                    // import: getDay of each selected date not in the future; push: getDay(date) (or none)
  pm4Logs: Pm4DayLog[];                       // PM4 logs on the snapshot's dates + every PM4 log linked by logLinks; entry order (id)
  pm4Starts: Record<string, number | null>;   // the PM4 workday start of each snapshot date
  logLinks: LinkRow[];                        // active time-log links whose pm4Id is in pm4Logs or pmspaId is a log of remoteDays
}
export function usableLogLinks(s: TimeSnapshot, mode: "import" | "push"): LinkRow[];
// import: pm4Id in s.pm4Logs AND pmspaId a log of s.remoteDays. push: pm4Id in s.pm4Logs (the PMSPA side may be elsewhere, D10).
```

### Time preview rows (T2)
Pure, no I/O. A port of the prototype's day parts over a `TimeSnapshot`. Every string, detail and warning is the prototype's.
```ts
// pmspa-preview.ts: the closures of importRows / syncRows become exported factories; importRows / syncRows keep their output
export function importBuilder(s: SyncSnapshot): { items: SyncPreviewItemDto[];
  addProject(p: RemoteProject, parentOf?: string): string; addTask(t: RemoteTask, parentOf?: string): string | null };
  // addTask(t, parentOf): as today, plus the prototype's `parentOf ? {reason: parentOf, parent: true}` on the task row
export function selectProjects(b: ReturnType<typeof importBuilder>, s: SyncSnapshot, sel: PmspaImportSelectionDto): void; // importRows' loop
export function syncBuilder(s: SyncSnapshot): { items: SyncPreviewItemDto[];
  projectRow(p: Pm4Project, parentOf?: string): string; taskRow(t: Pm4Task, opts: { optional?: boolean; parentOf?: string }): string };
  // taskRow(t, {parentOf}): as today, plus `parentOf && !pair ? {reason: parentOf, parent: true}` on the task row
// importRows(s, sel) = { const b = importBuilder(s); selectProjects(b, s, sel); return b.items }
// pmspa-time-preview.ts
export function mappedGroup(g: PushGroup, s: TimeSnapshot): string;  // D1: g.taskId's usable task link → its pmspaId, else "title:" + g.title
export function importTimeRows(s: TimeSnapshot, sel: PmspaImportSelectionDto): SyncPreviewItemDto[];
export function pushDayRows(s: TimeSnapshot, date: string): SyncPreviewItemDto[];
```
Definitions used below: `links` = `usableLogLinks(s, mode)` indexed by `pm4Id` and by `pmspaId`. A PM4 log's group = `groupDay([log])[0]`.
*PMSPA changed* for a linked PMSPA log = `!fingerprint(pmspaLogTuple(log, event)).equals(link.pmspaHash)`. *PM4 changed* for a linked PM4 log
= `!fingerprint(pm4LogTuple(l, mappedGroup(group, s))).equals(link.pm4Hash)`. `taskPath(t)` = `<PMSPA project title> › <task title>`.

**`importTimeRows`:** `b = importBuilder(s)`, `selectProjects(b, s, sel)`, then for each date of `sel.dates ?? []`, sorted:
1. `date > s.today` → push the day row `{key: "day:<date>", type: "day", title: formatWorkDate(date), action: "skip", reason: "In the future: PM4 doesn't log future time."}`; next date.
2. `day` = the remote day of the date (none → no events). For each event whose `taskId` is a task of `s.remoteTasks` without a usable task
   link: `b.addTask(task, "Parent of an imported event")`.
3. The day row (`key "day:<date>"`, `title` `formatWorkDate(date)`, `detail` the prototype's `eventDetail` over all its logs): D7 over all its logs (*linked* =
   in `links`, *changed* = PMSPA changed); `reason` "Already imported" when all are linked and none changed.
4. One row per event, `key "event:<event id>"`, `parentKey "day:<date>"`, `title` the event title, `detail` and action as the prototype
   (`importPreview`), warnings in this order: off-step logs, moved PM4 logs (a linked PM4 log whose `task.id` isn't the event task's usable PM4
   counterpart, when it has one), OQ-180 ("N log(s) also changed in PM4 since the last sync: PM4's version is overwritten." for linked logs
   with PMSPA changed and PM4 changed), "Booked in PMSPA: imported logs aren't booked." when `booked`.

**`pushDayRows`:** `logs` = `s.pm4Logs` of `date`, `groups = groupDay(logs)`; no groups → `[]`. `b = syncBuilder(s)`:
1. For each group with a `taskId` whose PM4 task has no usable task link: `b.taskRow(task, {parentOf: "Parent of the day's logs"})`.
2. The day row (`key "day:<date>"`, `title` `formatWorkDate(date)`): detail, action and reason as the prototype's (*linked* = in `links`, *changed* = PM4 changed,
   or its PMSPA log isn't in the remote day: D10). Warning
   (OQ-179) when no event row will be `create` and the remote day's `start` ≠ `minuteToStart(s.pm4Starts[date])`:
   "PMSPA keeps <HH:mm of the PMSPA start>: a day's start changes only when an event is added.".
3. One row per group, `key "event:<group key>"`, `title` the group title, `detail` = `<pushedTaskPath> · <eventDetail>`, action and reason as
   the prototype's (*changed* as in step 2). Warnings in this order: cut text ("N log text(s) over 350 characters: cut to 349 + “…”."); moved
   within the day (a linked log whose PMSPA log is in an event of the day other than the group's target event, see *Push commit* step 2):
   "N log(s) moves here in PMSPA from another event; an event left empty is deleted."; D10 (a linked log whose PMSPA log isn't in the
   day): "N log(s) moves here in PMSPA from another day; an event left empty there stays."; the group note; OQ-180 ("N log(s) also changed in
   PMSPA since the last sync: PMSPA's version is overwritten." for linked logs in the day with PM4 changed and PMSPA changed).
4. Return `b.items` followed by the day row and the event rows.

### Loader, DTOs, preview endpoints (T3)
```ts
// dto/sync.dto.ts
// PmspaImportSelectionDto gains: @IsOptional() @IsArray() @ArrayMaxSize(7) @ArrayUnique() @Matches(/^\d{4}-\d{2}-\d{2}$/, {each: true})
//   @IsISO8601({strict: true}, {each: true}) dates?: string[]
export class PmspaPushTargetDto { @IsIn(["day"]) type: "day"; @Matches(/^\d{4}-\d{2}-\d{2}$/) @IsISO8601({ strict: true }) id: string }
export class PmspaPushDto { @IsDefined() @ValidateNested() @Type(() => PmspaPushTargetDto) target: PmspaPushTargetDto;
  choices: SyncChoiceDto[] /* ≤ 500, as PmspaSyncDto */ }
// pmspa-sync.repository.ts (copy TimeRepository.listDay's select; every query scoped by userId)
pm4Logs(userId, q: { dates: string[]; ids: string[] }): Promise<Pm4DayLog[]>;  // work_date in dates OR id in ids, order by id;
  // booked = booking_date not null; task = taskId ? {id, title: taskTitle, deleted: false} : deletedTaskTitle ? {id: null, title, deleted: true} : null; project likewise
pm4Starts(userId, dates: string[]): Promise<Record<string, number | null>>;     // workdays.start_minute, null when none
// pmspa-links.repository.ts
logLinks(userId, pmspaUserId, q: { pm4Ids: string[]; pmspaIds: string[] }): Promise<LinkRow[]>;  // time-log links, pm4Id in OR pmspaId in
// pmspa-time-sync.service.ts
loadTime(userId: string, base: SyncSnapshot, dates: string[]): Promise<TimeSnapshot>;
// pmspa-sync.service.ts
pushPreview(userId, target: PmspaPushTargetDto): Promise<SyncPreviewDto>;
// export RunLinks, RowFailure, Run and result() for the time service (no behavior change)
```
- **`loadTime`:** `today` = `today(<user zone>)` as `time-logs.service.ts` computes it; `remoteDays` = `getDay` of each date ≤ today
  (null → none); `logLinks` first by the PMSPA ids of those days' logs; then `pm4Logs({dates, ids: <pm4Ids of those links>})`; then the links
  again with `pm4Ids` = all `pm4Logs` ids too (one `logLinks` call with both lists); `pm4Starts(dates)`. No connection account → `logLinks = []`.
- **`load(userId, sel)`** with `sel.dates?.length`: `remoteTasks = listAllTasks` (an event's task may be outside the selected projects), then
  `loadTime(userId, base, sel.dates)`. `importPreview` returns `importTimeRows(snapshot, sel)` when `dates` is non-empty, else as today.
- **`pushPreview`:** `date > today` → 400 (`BadRequestException`, field `id`, "The date is in the future."); `snapshot = loadTime(userId,
  await this.load(userId, null), [date])`; `{items: pushDayRows(snapshot, date)}`.
- Controller: `POST push/preview` (`@HttpCode(200)`, the same decorators as `sync/preview`). `pmspa.module.ts` imports `TimeModule`
  and provides `PmspaTimeSyncService`; `time.module.ts` exports `TimeLogsService` and `WorkdaysService`.

### Import commit (T4)
```ts
// pmspa-time-sync.service.ts
importDayRow(run: Run, row: SyncPreviewItemDto): Promise<SyncResultItemDto>;
importEventRow(run: Run, row: SyncPreviewItemDto): Promise<SyncResultItemDto>;
```
`importRun` uses `load(userId, dto.selection)` (with dates) and `importTimeRows`. In `commit`'s loop, a row of type `day` or `event` goes to
`importDayRow` / `importEventRow` instead of `syncPair` (same `skip` handling, same `RowFailure` / `PmspaWriteError` handling). The run keeps
`logLinks: Map<pmspaLogId, LinkRow>` seeded from `usableLogLinks(snapshot, "import")` (D11); every link saved below is added to it.
- **Day row** (`date` = the key's date): when `snapshot.pm4Starts[date]` is null and the remote day has a start, `workdays.setStart(userId,
  date, startToMinute(start) ?? 0)`. Result `created` for a `create` row, else `updated`.
- **Event row** (`event` = the remote event of the key; none → `failed` "The chosen record can't be linked."):
  1. `task` = the event's `taskId` → its PM4 task through the run's task links (`run.links.pm4Of("task", taskId)`), else none;
     `nonprod` = `isNonprod(event.title)`.
  2. For each log in order: not `isQuarterHours(duration)` → count it as failed and continue. Fields: `workDate` date, `durationMinutes`
     `hoursToMinutes(duration)`, `text` log title, `excludeFromStats` nonprod, `taskId` task (or null), `projectId` that task's project (or null).
  3. Linked (`logLinks` has the PMSPA log id): `timeLogs.update(userId, pm4Id, fields)`, except: `title` is never sent (OQ-169); when nonprod
     and the PM4 log is already excluded from statistics, `taskId` / `projectId` aren't sent (OQ-168). Not linked: `timeLogs.create(userId,
     {...fields, title: cut(event.title, 100)})`. Never a booking.
  4. After each write: `links.save` type `time-log`, `pm4Id` the PM4 log, `pmspaId` the log id, origin `imported`, `syncedAt` run.now,
     `pm4Hash` = fingerprint of `pm4LogTuple` of the PM4 log re-read with `pm4Logs({dates: [], ids: [id]})` and its mapped group, `pmspaHash` =
     fingerprint of `pmspaLogTuple(log, event)`.
  5. Result: any failed log → `failed` "A log of <duration> h isn't in 0.25 h steps (the other <plural(n − 1, "log")> were imported)." (the
     first off-step log's duration); else `created` for a `create` row, else `updated`.

### Push commit (T5)
```ts
// pmspa-time-sync.service.ts
pushDayRow(run: Run, row: SyncPreviewItemDto): Promise<SyncResultItemDto>;
pushEventRow(run: Run, row: SyncPreviewItemDto, date: string): Promise<SyncResultItemDto>;
// pmspa-sync.service.ts
pushRun(userId, dto: PmspaPushDto): Promise<SyncResultDto>;   // commit(from "pm4"), rows = pushDayRows; date > today → 400 as pushPreview
// pmspa-sync.controller.ts: POST push, @HttpCode(200), the same decorators as sync
```
The commit loop is `commit`'s (lock first → 409 `pmspa-sync-running`; `try … finally unlock`; `setLastSyncAt` at the end). Rows of type
`project` / `task` go to `syncPair` as today; `day` → `pushDayRow`; `event` → `pushEventRow`. The run keeps `logLinks: Map<pm4LogId, LinkRow>`
seeded from `usableLogLinks(snapshot, "push")` (D11) and `day` = the snapshot's remote day of the date (updated after every re-read below).
- **Day row:** result `created` for a `create` row, else `updated`. Writes nothing (the start goes with `createEvent`, D4).
- **Event row**, step by step (`g` = the group of `groupDay(<the day's PM4 logs>)` whose `event:<key>` is the row key; none → `failed` "The
  chosen record can't be linked."):
  1. `taskId` = `g.taskId` → `run.links.pmspaOf("task", g.taskId)`; a group with a `taskId` and no PMSPA task → `failed` "Its task isn't in
     PMSPA (it was left out).".
  2. Target event = the first event of `day` with `taskId === taskId` and, when `taskId` is null, `title === g.title`; else none.
  3. Moves out (D2, D10): for each log of `g` with a link whose PMSPA log isn't in the target event: when the PMSPA log is in another event of
     `day`, `deleteLog` it and remember that event; when it isn't in `day`, `deleteLog` it (404 resolves). Those logs count as unlinked below.
  4. No target event: `createEvent({day: date, start: minuteToStart(snapshot.pm4Starts[date] ?? 0), title: g.title, task: taskId, duration:
     <the first log's minutes> / 60})`, then `createLog` for each other log, in order. Target event: per log, linked here and PM4 changed → `updateLog(id,
     {title: cut(text, 350), duration: minutes / 60})`; linked here and unchanged → nothing; unlinked → `createLog`.
  5. `booked` = every log of `g` is booked; target event's `booked` differs (or a new event and `booked`) → `updateEvent(eventId, {booked})`.
  6. Re-read `day = getDay(date)` once (D3). The event = as in step 2 over the new `day`. The new PMSPA logs are the last `<count of
     createEvent's first + createLog calls>` entries of its `logs[]`, in the order they were sent; pair them with the PM4 logs in that order.
     When the event was created in step 4 and its first log's title ≠ `cut(text, 350)` of its PM4 log: `updateLog(id, {title: cut(text, 350),
     duration: minutes / 60})`, and that log counts with that title below (D4).
  7. For each log of `g` written in steps 4–5 (created, updated, or booked change): `links.save` type `time-log`, origin `pushed`, `syncedAt`
     run.now, `pm4Hash` = fingerprint of `pm4LogTuple(l, mappedGroup(g, snapshot))`, `pmspaHash` = fingerprint of `pmspaLogTuple(<its PMSPA
     log>, <the event>)` from the re-read day.
  8. Each event remembered in step 3 that has no logs in the re-read `day` → `deleteEvent(day.id, eventId)`.
  9. Result `created` for a `create` row, else `updated`.
- `PmspaWriteError` → that row `failed` with its message (feat-int-sync-api D10); any other error aborts the run; links already saved stay.

## Acceptance criteria
Signed in as user A (zone `Europe/Zagreb`, today 2026-10-17), connected to X through `FakePmspa`, with feat-int-sync-api's projects and links.
PMSPA X days: 2026-10-16 (start 9.0: event "Release 4.2 rollout" on Nvidia › Release 4.2 rollout with logs 1.5 h and 0.75 h; event "Homepage
redesign" on Acme › Homepage redesign, 1.5 h), 2026-10-14 (start 8.0: "Internal" without a task, 1 h; "Meetings" on Tesla › Meetings, 0.5 h,
booked; "nonprod" without a task, 0.5 h), 2026-10-13 (start 9.25: "Development" on Nvidia › Development, logs 2 h and 0.3 h).

| AC | Case → expected | Test | Task |
| --- | --- | --- | --- |
| AC-1 | `GET /days?from=2026-10-12&to=2026-10-18` → three days, newest first, `startMinute` 540 / 480 / 555, events with `task {id, title, projectTitle}` or null, `booked`, logs in minutes (0.3 h → 18), `linkState "not-linked"`; `to-from` over 7 days, `from > to`, a bad date → `400` | `api/test/pmspa-time.ac.e2e-spec.ts` | T1 |
| AC-2 | Import preview `{projects: [], dates: ["2026-10-16"]}` → the unlinked tasks Release 4.2 rollout and Homepage redesign (with their projects) as parent rows, the day row `create` with "3 logs · 3h 45m", two event rows | `api/test/pmspa-time.ac.e2e-spec.ts` | T3 |
| AC-3 | Import `{dates: ["2026-10-14"]}` → PM4 2026-10-14 starts 08:00; "Internal" → an Unsorted log titled "Internal"; "Meetings" → a log on PM4 Tesla › Meetings, not booked; "nonprod" → an Unsorted log excluded from statistics; every log linked `imported`; `GET /days` shows the day `linked` | `api/test/pmspa-time.ac.e2e-spec.ts` | T4 |
| AC-4 | Import 2026-10-13 → "Development" `failed` "A log of 0.3 h isn't in 0.25 h steps (the other 1 log were imported)." and the 2 h log exists | `api/test/pmspa-time.ac.e2e-spec.ts` | T4 |
| AC-5 | Importing 2026-10-14 again → day and events `skip` "Already imported"; after the fake changes a log's title and the PM4 log's text is edited too → that event `update` with the OQ-180 warning, and the run sets the PM4 text to PMSPA's; the PM4 log title stays | `api/test/pmspa-time.ac.e2e-spec.ts` | T4 |
| AC-6 | The fake moves the imported "Meetings" event to task Tesla › QA (linked) → import preview warns "1 PM4 log moves to “QA” (its task changed in PMSPA)."; the run moves the PM4 log to QA | `api/test/pmspa-time.ac.e2e-spec.ts` | T4 |
| AC-7 | `{dates: ["2026-10-20"]}` → the day row `skip` "In the future: PM4 doesn't log future time."; `dates` with 8 entries or a repeat → `400` | `api/test/pmspa-time.ac.e2e-spec.ts` | T3 |
| AC-8 | PM4 2026-10-17 (start 08:00): Anthropic › PM 60 min, Anthropic › Meetings 30 min, PM Internal (no task) 45 min, Unsorted "AI" 15 min, Unsorted untitled 15 min, one excluded 30 min on Nvidia › PM → push preview: event rows titled "Anthropic" (task PM), "Anthropic" (task Meetings), "PM Internal", "AI · Time", "Unsorted", "nonprod"; Nvidia › PM isn't a parent row | `api/test/pmspa-time.ac.e2e-spec.ts` | T3 |
| AC-9 | Push that day → PMSPA has those six events, each `createEvent` sent `start: 8`, the nonprod event without a task, every PM4 log linked `pushed` to its PMSPA log | `api/test/pmspa-time.ac.e2e-spec.ts` | T5 |
| AC-10 | Push again → day and events `skip` "No changes since the last sync", no PMSPA write; book the PM Internal log, push → that event `update` and `booked: true` in PMSPA | `api/test/pmspa-time.ac.e2e-spec.ts` | T5 |
| AC-11 | Move the Anthropic › PM log to Anthropic › Meetings in PM4, push → the PMSPA log is gone from the PM event, which is deleted (no logs left), and a log with its text is in the Meetings event; the link points at the new PMSPA log | `api/test/pmspa-time.ac.e2e-spec.ts` | T5 |
| AC-12 | A push that creates no event while PMSPA's start for the day is 9.0 and PM4's 08:00 → the day row warns "PMSPA keeps 09:00: a day's start changes only when an event is added." | `api/test/pmspa-time.ac.e2e-spec.ts` | T5 |
| AC-13 | A log changed in PM4 and in PMSPA since the last push → the event row warns "1 log also changed in PMSPA since the last sync: PMSPA's version is overwritten."; the push writes PM4's text | `api/test/pmspa-time.ac.e2e-spec.ts` | T5 |
| AC-14 | A PMSPA log the user added to a pushed event in PMSPA stays after a push; a PM4 log deleted in PM4 leaves its PMSPA log | `api/test/pmspa-time.ac.e2e-spec.ts` | T5 |
| AC-15 | `GET /links/time-log/{pushed log}` → `pmspa {type: "time-log", title: <PMSPA log title>, eventTitle: "Anthropic"}`; the log deleted in the fake → `pmspa: null` | `api/test/pmspa-time.ac.e2e-spec.ts` | T1 |
| AC-16 | Push preview of a future date → `400`; of a day without logs → `{items: []}` | `api/test/pmspa-time.ac.e2e-spec.ts` | T3 |
| AC-17 | `groupDay`, `eventTitle`, `isNonprod`, `startToMinute`, the tuples: the prototype's cases (" · Time" under 3 characters, cut over 150, nonprod whatever the task, deleted task notes, " NonProd " is nonprod) | `api/src/integrations/pmspa/pmspa-time-fields.ac.spec.ts` | T1 |
| AC-18 | `api/openapi.json` has `GET /days`, `POST /push/preview` and `POST /push` with `bearer`; `PmspaImportSelectionDto` has `dates` | `check` | T5 |
| AC-19 | Push while an import holds the lock → `409 pmspa-sync-running`; `POST /push` without `target` → `400` | `api/test/pmspa-time.ac.e2e-spec.ts` | T5 |
| AC-20 | A pushed log moved to 2026-10-16 in PM4, then 2026-10-16 pushed → its event row warns "1 log moves here in PMSPA from another day; an event left empty there stays."; the old PMSPA log is gone, the log is in 2026-10-16's event and linked to it; the old event (now empty) stays | `api/test/pmspa-time.ac.e2e-spec.ts` | T5 |

Typed stubs (created with the tests): `pmspa-time-fields.ts` with every export of *Time fields*, each function body
`throw new Error("not implemented (feat-int-time-api)")`, and the `RemoteLog`, `RemoteEvent`, `RemoteDay` interfaces in `pmspa-remote.ts`. The e2e test is written against *Interfaces*; each AC passes once its task is done.

## Checks
```bash
# AC-18: the time endpoints are in the contract and protected
node -e "
const d=require('./api/openapi.json'), b='/api/v1/integrations/pmspa';
for (const [p,m] of [['/days','get'],['/push/preview','post'],['/push','post']]) { const o=d.paths[b+p]?.[m]; if(!o){console.error('missing',m,p);process.exit(1)} if(!JSON.stringify(o.security??[]).includes('bearer')){console.error('not protected',m,p);process.exit(1)} }
if (!d.components?.schemas?.PmspaImportSelectionDto?.properties?.dates) { console.error('dates missing'); process.exit(1) }"
```

## Tasks
| # | Task | App | Size | Tier | Why this tier | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | Time mapping (`pmspa-time-fields.ts`), the PMSPA days client, API-INT-007 and the `time-log` link detail | api | M | haiku | Pure functions copied from the prototype; each PMSPA call is one documented request; the browse controller exists | — (feat-int-sync-api done) |
| T2 | Time preview rows (`pmspa-time-preview.ts`), pure, and the exported row builders of `pmspa-preview.ts` | api | M | sonnet | A large port of the prototype's day previews onto the snapshot, plus a refactor of existing row builders that must keep their output | T1 |
| T3 | Time DTOs, the time snapshot loader, the import preview with `dates`, the push preview (API-INT-008 `dates`, API-INT-010) | api | M | haiku | DTOs copy `dto/sync.dto.ts`; queries copy `TimeRepository.listDay` and `PmspaLinksRepository.active`; `loadTime` and the endpoint are spelled out | T2 |
| T4 | The import commit of day and event rows (API-INT-009 `dates`) | api | M | haiku | Each step is spelled out in *Import commit* and calls an existing service or helper; the commit loop and its failure handling exist | T3 |
| T5 | The push commit: event writes, moves, D3 linking, empty-event deletes, the push endpoint (API-INT-011) | api | L | sonnet | Owner ceiling (OQ-189) instead of opus: writes on two systems with partial failure and ordering, spelled out in *Push commit* | T4 |

## Open questions
None.

## Changelog
- 2026-10-17: Initial draft (prototype `eefe787`; OQ-158, OQ-162, OQ-167…OQ-169, OQ-176, OQ-179, OQ-180). Ready for review.
- 2026-10-17: Approved by the owner.
- 2026-10-17: Re-split under OQ-189 (no opus task): T2 (opus) → T2 preview rows (sonnet), T3 loader and previews (haiku), T4 import
  commit (sonnet), T5 push commit (sonnet), each commit step by step. D10 (OQ-191: a log pushed from another day), D11 (usable time-log
  links, from feat-int-sync-api's review F2), `@IsDefined` on the push target; AC-16 split (AC-19), AC-20 added. Back to review.
- 2026-10-17: T1 widens `fingerprint`'s tuple type to take the time tuples' numbers and booleans. Approved by the owner.
- 2026-10-17: T4 (import commit) haiku instead of sonnet: every step is spelled out (owner).
- 2026-10-17: `createEvent` sends the first log's duration only; the push renames that log after the re-read, since PMSPA titles it after the event (OQ-192, owner).
- 2026-10-17: Push rows: a linked log whose PMSPA log isn't in the pushed day counts as changed, so D10's move runs (a date change leaves the fingerprint as it was).
