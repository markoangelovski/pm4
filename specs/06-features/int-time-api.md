---
id: feat-int-time-api
title: "PMSPA time API: PMSPA days, time import and day push"
status: approved
owner: Marko Angelovski
last_updated: 2026-10-17
milestone: M6
requirements: [FR-INT-007, FR-INT-010, FR-INT-011, FR-INT-012, API-INT-007, API-INT-008, API-INT-009, API-INT-010, API-INT-011, API-INT-014]
related: [req-integrations, api-endpoints, api-data-model, feat-int-conn-api, feat-int-sync-api, feat-int-web, OQ-158, OQ-162, OQ-167, OQ-168, OQ-169, OQ-176, OQ-179, OQ-180]
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
| D2 | A log moved to another event in PMSPA's terms is deleted from its old event and created in the new one (PMSPA has no move); the link then points at the new PMSPA log id. An old event left without logs is deleted. | OQ-162 (owner); PMSPA API |
| D3 | `days.createLog` returns no id: after writing an event's logs the push reads that day once (one-day form) and links the new logs by their position at the end of the event's `logs[]`. | PMSPA docs (E14) |
| D4 | Every `days.createEvent` sends the PM4 day's `start` (minutes ÷ 60) and the first log; the other logs follow with `days.createLog`. | OQ-179 (owner) |
| D5 | A PMSPA log that isn't linked to a PM4 log is never touched by a push; PM4 logs deleted in PM4 leave their PMSPA logs (the link went with the cascade). | Design principle 8 |
| D6 | Import writes PM4 logs through `TimeLogsService` and the start through `WorkdaysService` (TimeModule exports both). A day row comes before its event rows, so the workday exists before its first log. | Agent, as feat-int-sync-api D5 |
| D7 | The import's day row takes the push's rule (all linked → update if any changed, else skip; some → update; none → create), where the prototype said `skip` for a partly linked day. | Agent: the prototype's rule skipped days with new logs |
| D8 | A selected date after today in the user's zone: its day row is `skip` "In the future: PM4 doesn't log future time." and its events are left out. | Agent |
| D9 | API-INT-007 and `dates` cover at most 7 days (the Time tab's week): one range call plus one call per day found. | Agent: PMSPA's 100-requests budget |

## Scope
**In:** the PMSPA days client, the time mapping (groups, titles, nonprod, hours), API-INT-007, `dates` on API-INT-008/009, API-INT-010/011,
the `time-log` case of API-INT-014, the OpenAPI export.

**Before the tests are written:** feat-int-sync-api is done.

**Non-goals** (implementers must not touch these):
- Anything in `web/`. Projects and tasks rules (feat-int-sync-api), except calling its row builders for parent rows.
- `time/*` other than exporting `TimeLogsService` and `WorkdaysService` from `time.module.ts`. Bookings.
- `api/test/*` files written in the test step.

## Read first
| Path | Why / copy this |
| --- | --- |
| `specs/03-api/endpoints.md#shared-pmspa-shapes`, API-INT-007…011, API-INT-014 | Contract |
| `specs/01-requirements/integrations.md` *Entity mapping → Time*, FR-INT-011, FR-INT-012 | The rules |
| `web/proto/mock/pmspa.ts` | The reference: `listDays`, `importPreview` (dates), `runImport` (day and event rows), `groupDay`, `eventTitle`, `pushedTaskPath`, `pushPreview` (day), `runPush` (day and event rows), every user-visible string |
| `api/src/integrations/pmspa/pmspa-sync.service.ts`, `api/src/integrations/pmspa/pmspa-fields.ts`, `api/src/integrations/pmspa/pmspa-remote.ts`, `api/src/integrations/pmspa/pmspa-links.repository.ts` (from feat-int-sync-api) | The engine to extend: row builders, commit loop, lock, links |
| `api/src/time/time-logs.service.ts`, `api/src/time/workdays.service.ts` | D6 |
| `docs-pmspa/connector/01-discovery/modules/days.yaml` (local, git-ignored, in the main checkout) | `days.findByRange`, `findByDay`, `createEvent`, `updateEvent`, `deleteEvent`, `createLog`, `updateLog`, `deleteLog` bodies and answers |

## Files
| App | File | C/M | Task | Notes |
| --- | --- | --- | --- | --- |
| api | `api/test/pmspa-time.ac.e2e-spec.ts` | C | tests | Days, time import, day push |
| api | `api/test/support/fake-pmspa.ts` | M | tests | Days, events and logs in the fake |
| api | `api/src/integrations/pmspa/pmspa-time-fields.ac.spec.ts` | C | tests | The pure mapping |
| api | `api/src/integrations/pmspa/pmspa-time-fields.ts` | C/M | tests, T1 | Typed stubs in the test step, implemented in T1 |
| api | `api/src/integrations/pmspa/pmspa-remote.ts`, `api/src/integrations/pmspa/pmspa-remote.spec.ts` | M | T1 | Days, events, logs |
| api | `api/src/integrations/pmspa/pmspa-browse.controller.ts`, `api/src/integrations/pmspa/pmspa-browse.controller.spec.ts`, `api/src/integrations/pmspa/pmspa-links.service.ts`, `api/src/integrations/pmspa/pmspa-links.service.spec.ts`, `api/src/integrations/pmspa/dto/pmspa-browse.dto.ts` | M | T1 | API-INT-007, the `time-log` detail, `PmspaDayDto` and friends |
| api | `api/src/time/time.module.ts` | M | T2 | Export `TimeLogsService`, `WorkdaysService` |
| api | `api/src/integrations/pmspa/pmspa-time-sync.service.ts`, `api/src/integrations/pmspa/pmspa-time-sync.service.spec.ts` | C | T2 | `npx nest g service integrations/pmspa/pmspa-time-sync --flat` |
| api | `api/src/integrations/pmspa/pmspa-sync.service.ts`, `api/src/integrations/pmspa/pmspa-sync.service.spec.ts`, `api/src/integrations/pmspa/pmspa-sync.controller.ts`, `api/src/integrations/pmspa/pmspa-sync.controller.spec.ts`, `api/src/integrations/pmspa/pmspa-sync.repository.ts`, `api/src/integrations/pmspa/pmspa-sync.repository.spec.ts`, `api/src/integrations/pmspa/dto/sync.dto.ts` | M | T2 | `dates`, the push endpoints, `pm4Day` |
| api | `api/src/integrations/pmspa/pmspa.module.ts` | M | T2 | Imports `TimeModule` |
| api | `api/openapi.json` | M | T1, T2 | `npm run openapi:export` |

## Interfaces

### Time fields (T1)
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
export function plural(n: number, one: string, many?: string): string;  // "1 log", "3 logs"
export function pm4LogTuple(l: Pm4LogForPush, group: string): (string | number | boolean | null)[];   // D1
export function pmspaLogTuple(log: RemoteLog, e: RemoteEvent): (string | number | boolean | null)[];  // D1
```

### PMSPA days (T1)
```ts
// pmspa-remote.ts, added
export interface RemoteLog { id: string; title: string; duration: number }   // hours
export interface RemoteEvent { id: string; dayId: string; date: string; title: string; taskId: string | null; booked: boolean; logs: RemoteLog[] }
export interface RemoteDay { id: string; date: string; start: number | null; events: RemoteEvent[] }
listDays(userId, from, to): Promise<RemoteDay[]>;   // D9: findByRange (start+end) → ids; then findByDay(id) each; 404 → []
getDay(userId, date): Promise<RemoteDay | null>;    // one-day form `?start=<date>`; 404 → null
createEvent(userId, e: { day: string; start: number; title: string; task: string | null; first: { title: string; duration: number } }): Promise<void>;
updateEvent(userId, eventId, f: { booked?: boolean; title?: string }): Promise<void>;
deleteEvent(userId, dayId, eventId): Promise<void>;
createLog(userId, eventId, l: { title: string; duration: number }): Promise<void>;
updateLog(userId, logId, l: { title: string; duration: number }): Promise<void>;
deleteLog(userId, logId): Promise<void>;
```
API-INT-007 (`pmspa-browse.controller.ts`): `from`, `to` `YYYY-MM-DD`, `from ≤ to`, at most 7 days → else 400; `listDays`, mapped per endpoints.md
(`linkState` from `byPmspa` of each log, `task {id, title, projectTitle}` from `listAllTasks` / `listProjects` of the same request).
API-INT-014 `time-log`: the active log link → `getDay(<PM4 log's work date>)` → the event holding `pmspa_id` → `{type: "time-log", title: log.title, eventTitle}`, else `pmspa: null`.

### Engine (T2)
```ts
// dto/sync.dto.ts: PmspaImportSelectionDto gains `@IsOptional() dates?: string[]` (≤ 7, YYYY-MM-DD, unique);
// PmspaPushTargetDto { type: "day"; id: string (YYYY-MM-DD) }, PmspaPushDto { target; choices ≤ 500 }
// pmspa-time-sync.service.ts
importDayRows(userId, dates: string[], rows: RowBuilder): Promise<SyncPreviewItemDto[]>;   // appended after the project/task rows
pushPreview(userId, target): Promise<SyncPreviewDto>;  pushRun(userId, dto): Promise<SyncResultDto>;
// PmspaSyncService.importPreview/importRun call importDayRows / its commit; the controller adds POST push/preview, push
// pmspa-sync.repository.ts, added
pm4Day(userId, date): Promise<{ startMinute: number | null; logs: Pm4LogForPush[] }>;   // logs in entry order; booked = booking_date set
```
Rows and their strings are the prototype's, with production inputs:
- **Import, per date** (sorted; D8): the day's PMSPA events from `listDays`; an event's unlinked task first as a parent row (feat-int-sync-api's task
  row, reason "Parent of an imported event"); the day row (D7) and one event row per PMSPA event (action, detail, warnings as the prototype,
  plus OQ-180's "N log(s) also changed in PM4 since the last sync: PM4's version is overwritten." for linked logs changed on both sides).
  *Changed in PMSPA* for a log = `fingerprint(pmspaLogTuple)` ≠ `pmspa_hash`; *in PM4* = `fingerprint(pm4LogTuple)` ≠ `pm4_hash`.
- **Import commit:** day row → `WorkdaysService` start from PMSPA's (`startToMinute`, 0 when PMSPA has none) when PM4 has no workday. Event row →
  per log the prototype's `runImport` rules: off-step durations fail (reason as the prototype, the others imported); nonprod (OQ-168); a linked log
  is updated (text, duration, task and project from the event's task link, OQ-168's keep rule) and keeps its title (OQ-169); a new log gets the
  event title cut to 100 as its title. Logs are never booked by an import. Link origin `imported`, hashes per D1.
- **Push preview** (target date not in the future → else 400): `pm4Day`, `groupDay`; the parent task rows (reason "Parent of the day's logs") for
  groups whose task isn't linked; the day row with OQ-179's warning when no event will be created and PMSPA's start differs ("PMSPA keeps
  <HH:mm>: a day's start changes only when an event is added."); one event row per group (`event:<group key>`): action, detail
  (`pushedTaskPath` · logs · duration), warnings (cut text, moved logs, the group note, OQ-180's "N log(s) also changed in PMSPA since the last
  sync: PMSPA's version is overwritten."). A day without logs → `{items: []}`.
- **Push commit** per event row: the target event = the PMSPA day's event with the group's PMSPA task (a task group) or with no task and the
  same title; a task group whose task has no link → `failed` "Its task isn't in PMSPA (it was left out)."; no target event → `createEvent` (D4)
  with the first log, then `createLog` for the rest; else per log: linked here and changed → `updateLog`; linked elsewhere → D2; unlinked →
  `createLog`. Then `updateEvent {booked}` when it differs (booked = every log of the group has a booking date), D3 for new log ids, D2's
  empty-event deletes. Link origin `pushed`, hashes per D1. Day row: `created` / `updated` / `skipped` as its action.

## Acceptance criteria
Signed in as user A (zone `Europe/Zagreb`, today 2026-10-17), connected to X through `FakePmspa`, with feat-int-sync-api's projects and links.
PMSPA X days: 2026-10-16 (start 9.0: event "Release 4.2 rollout" on Nvidia › Release 4.2 rollout with logs 1.5 h and 0.75 h; event "Homepage
redesign" on Acme › Homepage redesign, 1.5 h), 2026-10-14 (start 8.0: "Internal" without a task, 1 h; "Meetings" on Tesla › Meetings, 0.5 h,
booked; "nonprod" without a task, 0.5 h), 2026-10-13 (start 9.25: "Development" on Nvidia › Development, logs 2 h and 0.3 h).

| AC | Case → expected | Test | Task |
| --- | --- | --- | --- |
| AC-1 | `GET /days?from=2026-10-12&to=2026-10-18` → three days, newest first, `startMinute` 540 / 480 / 555, events with `task {id, title, projectTitle}` or null, `booked`, logs in minutes (0.3 h → 18), `linkState "not-linked"`; `to-from` over 7 days, `from > to`, a bad date → `400` | `api/test/pmspa-time.ac.e2e-spec.ts` | T1 |
| AC-2 | Import preview `{projects: [], dates: ["2026-10-16"]}` → the unlinked tasks Release 4.2 rollout and Homepage redesign (with their projects) as parent rows, the day row `create` with "3 logs · 3h 45m", two event rows | `api/test/pmspa-time.ac.e2e-spec.ts` | T2 |
| AC-3 | Import `{dates: ["2026-10-14"]}` → PM4 2026-10-14 starts 08:00; "Internal" → an Unsorted log titled "Internal"; "Meetings" → a log on PM4 Tesla › Meetings, not booked; "nonprod" → an Unsorted log excluded from statistics; every log linked `imported`; `GET /days` shows the day `linked` | `api/test/pmspa-time.ac.e2e-spec.ts` | T2 |
| AC-4 | Import 2026-10-13 → "Development" `failed` "A log of 0.3 h isn't in 0.25 h steps (the other 1 log were imported)." and the 2 h log exists | `api/test/pmspa-time.ac.e2e-spec.ts` | T2 |
| AC-5 | Importing 2026-10-14 again → day and events `skip` "Already imported"; after the fake changes a log's title and the PM4 log's text is edited too → that event `update` with the OQ-180 warning, and the run sets the PM4 text to PMSPA's; the PM4 log title stays | `api/test/pmspa-time.ac.e2e-spec.ts` | T2 |
| AC-6 | The fake moves the imported "Meetings" event to task Tesla › QA (linked) → import preview warns "1 PM4 log moves to “QA” (its task changed in PMSPA)."; the run moves the PM4 log to QA | `api/test/pmspa-time.ac.e2e-spec.ts` | T2 |
| AC-7 | `{dates: ["2026-10-20"]}` → the day row `skip` "In the future: PM4 doesn't log future time."; `dates` with 8 entries or a repeat → `400` | `api/test/pmspa-time.ac.e2e-spec.ts` | T2 |
| AC-8 | PM4 2026-10-17 (start 08:00): Anthropic › PM 60 min, Anthropic › Meetings 30 min, PM Internal (no task) 45 min, Unsorted "AI" 15 min, Unsorted untitled 15 min, one excluded 30 min on Nvidia › PM → push preview: event rows titled "Anthropic" (task PM), "Anthropic" (task Meetings), "PM Internal", "AI · Time", "Unsorted", "nonprod"; Nvidia › PM isn't a parent row | `api/test/pmspa-time.ac.e2e-spec.ts` | T2 |
| AC-9 | Push that day → PMSPA has those six events, each `createEvent` sent `start: 8`, the nonprod event without a task, every PM4 log linked `pushed` to its PMSPA log | `api/test/pmspa-time.ac.e2e-spec.ts` | T2 |
| AC-10 | Push again → day and events `skip` "No changes since the last sync", no PMSPA write; book the PM Internal log, push → that event `update` and `booked: true` in PMSPA | `api/test/pmspa-time.ac.e2e-spec.ts` | T2 |
| AC-11 | Move the Anthropic › PM log to Anthropic › Meetings in PM4, push → the PMSPA log is gone from the PM event, which is deleted (no logs left), and a log with its text is in the Meetings event; the link points at the new PMSPA log | `api/test/pmspa-time.ac.e2e-spec.ts` | T2 |
| AC-12 | A push that creates no event while PMSPA's start for the day is 9.0 and PM4's 08:00 → the day row warns "PMSPA keeps 09:00: a day's start changes only when an event is added." | `api/test/pmspa-time.ac.e2e-spec.ts` | T2 |
| AC-13 | A log changed in PM4 and in PMSPA since the last push → the event row warns "1 log also changed in PMSPA since the last sync: PMSPA's version is overwritten."; the push writes PM4's text | `api/test/pmspa-time.ac.e2e-spec.ts` | T2 |
| AC-14 | A PMSPA log the user added to a pushed event in PMSPA stays after a push; a PM4 log deleted in PM4 leaves its PMSPA log | `api/test/pmspa-time.ac.e2e-spec.ts` | T2 |
| AC-15 | `GET /links/time-log/{pushed log}` → `pmspa {type: "time-log", title: <PMSPA log title>, eventTitle: "Anthropic"}`; the log deleted in the fake → `pmspa: null` | `api/test/pmspa-time.ac.e2e-spec.ts` | T1 |
| AC-16 | Push preview of a future date → `400`; of a day without logs → `{items: []}`; push while an import runs → `409 pmspa-sync-running` | `api/test/pmspa-time.ac.e2e-spec.ts` | T2 |
| AC-17 | `groupDay`, `eventTitle`, `isNonprod`, `startToMinute`, the tuples: the prototype's cases (" · Time" under 3 characters, cut over 150, nonprod whatever the task, deleted task notes, " NonProd " is nonprod) | `api/src/integrations/pmspa/pmspa-time-fields.ac.spec.ts` | T1 |
| AC-18 | `api/openapi.json` has `GET /days`, `POST /push/preview` and `POST /push` with `bearer`; `PmspaImportSelectionDto` has `dates` | `check` | T2 |

Typed stubs (created with the tests): `pmspa-time-fields.ts` with every export of *Time fields*, each function body
`throw new Error("not implemented (feat-int-time-api)")`. The e2e test is written against *Interfaces* and runs once T2 is done.

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
| T2 | Time import and day push: preview and commit (API-INT-008/009 `dates`, API-INT-010/011) | api | L | opus | Ordering and moves across PMSPA events, writes on two systems with partial failure | T1 |

## Open questions
None.

## Changelog
- 2026-10-17: Initial draft (prototype `eefe787`; OQ-158, OQ-162, OQ-167…OQ-169, OQ-176, OQ-179, OQ-180). Ready for review.
- 2026-10-17: Approved by the owner.
