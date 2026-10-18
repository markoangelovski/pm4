---
id: feat-int-budget
title: "PMSPA call budget: the requests line, fewer PMSPA calls, integrations on the profile"
status: approved
owner: Marko Angelovski
last_updated: 2026-10-18
milestone: M6
requirements: [FR-INT-007, FR-INT-008, FR-INT-011, FR-INT-012, FR-INT-015, FR-INT-016, SCR-051, SCR-052, SCR-060, SCR-061]
related: [req-integrations, api-endpoints, web-screens, feat-int-sync-api, feat-int-time-api, feat-int-web, OQ-200, OQ-201, OQ-202, OQ-203, OQ-204, OQ-205]
prototype: 9fe7adb
---

# PMSPA call budget: the requests line, fewer PMSPA calls, integrations on the profile

## Goal
The user sees how much of PMSPA's shared 100 requests per 15 minutes is left (*PMSPA requests*, FR-INT-015) in Settings →
Integrations (SCR-052) and on the connector page (SCR-060), and the connector spends PMSPA calls only on what the user
opens: a task list reads one project, a Time week is one call, a Time day's events are read when it opens or is imported,
**Expand all** is one request on both tabs, sync and push read only linked PMSPA records while **Link to existing ▾**
reads its PMSPA list when it opens (OQ-204), and the web reuses PMSPA answers. The time import dialog lists projects and
tasks before days, and import and push event rows show their PMSPA project and task with icons (SCR-061). The profile
(SCR-051) lists the connected integrations (FR-INT-016). The UI is the prototype `072da99` and, for the lazy **Link to
existing ▾**, `9fe7adb`; this spec lists the delta.

## Decisions
| # | Decision | Source |
| --- | --- | --- |
| D1 | The rate limit is PMSPA's `X-RateLimit-*` of its last answer, one Redis key per PMSPA host (`pmspa:rate:<host>`) expiring at the reset; `PmspaConnection.rateLimit`. Last answer written wins (two overlapping answers can store the older count; the next answer corrects it). While the host is paused (`pmspa:pause:<host>`) the rate limit is stored and read as `remaining: 0` with `resetAt` no earlier than the pause's end, so the requests line and a PMSPA read's "PMSPA is busy" agree (an answer that overlapped the 429 can't revive it, and PMSPA's `Retry-After` is its whole window, often past its `X-RateLimit-Reset`). A Redis failure there is logged and never fails the PMSPA call. | OQ-200 (owner, 2026-10-18); agent for the write order; owner (2026-10-18, AC-17) for the pause |
| D2 | API-INT-006 drops the all-projects read: PMSPA's `tasks?project=` is owner-scoped, so another account's project answers `[]`, not 404. | OQ-201 (1) |
| D3 | API-INT-007 is one PMSPA range call answering day summaries (date, start, event count). API-INT-018 reads given days, then one `tasks.getOne` per referenced task and one `projects.getOne` per project of those tasks across all of them. The time import preview reads the selected days the same way. No `stats/*` route. | OQ-201 (2), OQ-202, OQ-203, OQ-205 (owner, 2026-10-18) |
| D4 | **Expand all** on Projects & tasks = one API-INT-017 read filling each expandable project's task list in the query cache; on Time = one API-INT-018 read of the week's days not cached and fresh, filling each day's query. The rows open when it's in, stay closed with a toast if it fails; nothing is read when all are cached and fresh. | OQ-201 (3), OQ-205 |
| D5 | PMSPA reads in the web: `staleTime` 5 min, `refetchOnWindowFocus: false`, `retry: false` (`PMSPA_READ`). A closed Time day shows **Logged** and **In PM4** only while its read is fresh, else "—". | OQ-201 (4), OQ-205 |
| D6 | The API makes at most 2 PMSPA calls at a time per PM4 request (`inParallel`). | OQ-201 (5) |
| D7 | The connection is read again (a PM4 read) when the PMSPA reads and mutations settle, so the requests line follows the user's calls. | Owner, prototype `072da99` |
| D8 | Promotion = the twin copy, as feat-int-web D2: `sed -e 's#@/proto/mock/client#@/lib/api/client#' -e 's#@/proto/#@/#g' web/proto/features/x > web/features/x`, then Prettier. The test step's stubs are replaced whole. | feat-int-web D2 |
| D9 | Sync (API-INT-015/016) and day push (API-INT-010/011) read only linked PMSPA records, by id (*Linked-only reads*). A project sync: the linked project and its tasks as one `tasks?project=` list, then each linked task of its PM4 tasks not in that list. A task sync: its linked task and its project's linked project. A day push: the day, its logs' linked tasks, and the linked projects of their PM4 projects and of those PMSPA tasks. Unlinked rows get `candidates: null`, except a project sync's unlinked tasks under its linked project (that project's unlinked tasks, read anyway). The commit reads the same plus each record a `link` choice picks, by id; one PMSPA doesn't answer or that is already linked fails its row with `CANT_LINK`. | OQ-204 (owner, 2026-10-18) |
| D10 | API-INT-008/009 with `dates` answer `days` (the selected days they read, as API-INT-018; the import's with links as after it) from reads they already make; the web fills the Time tab's day queries from them. Every project and task row comes before every day row; an event's unlinked task reads "Parent of an imported event from <d MMM yyyy>". | OQ-205 (owner, 2026-10-18) |
| D11 | Import and day-push event rows with a PMSPA task carry `taskPath: { projectTitle, taskTitle }` and `detail` only the logs; the dialog shows the path with the project and task icons. | OQ-205 (owner, 2026-10-18) |
| D12 | API-INT-019 `POST /integrations/pmspa/candidates` lists the **Link to existing** PMSPA records for many PM4 records at once: the account's projects, or one PMSPA project's tasks (⌈n/50⌉ calls), unlinked ones only, same title first, differences against each PM4 record. The web reads it when a row's dropdown opens (`usePmspaCandidates`, `PMSPA_READ`, key under `remote()`); a task's list follows its parent's linked or picked PMSPA project (none while the parent is **Create new**); skeleton rows, then the list, or the error with **Retry**. | OQ-204 (owner, 2026-10-18), prototype `9fe7adb` |
| D13 | An on-screen "PMSPA is busy. Try again in N minutes." line (`PmspaProblemLine`: the Projects and Time tabs, a day's events, the record note, the dialog's commit failure and **Link to existing** read) counts down with the requests line: one shared PMSPA clock (`usePmspaNow`, 15 s), the same `minutesUntil`, to the connection's `rateLimit.resetAt` while it shows the limit reached, else `retryAfterSeconds` after the error. Once that time has passed it reads "PMSPA calls have resumed. Try again." and nothing is retried (OQ-177). Toasts and the sync dialog's preview error keep the static line (`pmspaProblemText`; feat-int-web AC-8 renders the dialog without a QueryClient). | Owner (2026-10-18, AC-17; the "resumed" copy confirmed) |

## Scope
**In:** the rate limit in the transport, store, DTO and service; the browse reads (D2, D3, D6), API-INT-017 and API-INT-018;
the time import snapshot, row order, `days` and `taskPath` (D3, D10, D11); `taskPath` on push event rows; the prototype's
linked-only reads of sync and push previews and commits, nullable `candidates` and API-INT-019 (D9, D12); the prototype's
proposed types switched to the generated ones; the promoted rate-limit line, account badge, connector header, both tabs'
Expand all and lazy Time days, the dialog's event icons and lazy **Link to existing ▾**, and Profile → Integrations.

**Non-goals** (implementers must not touch these):
- The project-only import's reads beyond D6. The import's PM4 candidates (no PMSPA call; they stay arrays).
- Markup, copy or layout of the prototype files beyond the type switch in T5.
- `*.ac.*` test files, `api/test/support/fake-pmspa.ts` (written in the test step).

## Read first
| Path | Why / copy this |
| --- | --- |
| `specs/03-api/endpoints.md#shared-pmspa-shapes` | `PmspaRateLimit`, `PmspaDaySummary`, `SyncPreviewItem.taskPath` and `candidates`, `days`, `PmspaCandidates*`, *Linked-only reads*; API-INT-006…011, API-INT-015…019 |
| `api/src/integrations/pmspa/pmspa-transport.ts` | Where D1 observes each answer; `DEFAULT_PAUSE_SECONDS` |
| `api/src/integrations/pmspa/pmspa-store.ts` | The Redis key and get/set pattern to copy |
| `api/src/integrations/pmspa/pmspa-remote.ts` | `listDays`, `getDay`, `listTasks`, `getTask`, `getProject`, `listAllTasks` |
| `api/src/integrations/pmspa/pmspa-browse.controller.ts` | API-INT-005…007; the `days` mapping that moves to `dayItems` |
| `api/src/integrations/pmspa/dto/pmspa-browse.dto.ts`, `api/src/integrations/pmspa/dto/sync.dto.ts` | `PmspaDaysQueryDto` and `PmspaImportSelectionDto.dates` (validation to copy) |
| `api/src/integrations/pmspa/pmspa-sync.service.ts` (`load`, `importPreview`, `importRun`, `commit`), `api/src/integrations/pmspa/pmspa-time-sync.service.ts` (`loadTime`) | The snapshot D3 narrows; where `days` is answered |
| `api/src/integrations/pmspa/pmspa-time-preview.ts` | `importTimeRows`, `pushDayRows`: row order, reason, `taskPath` |
| `api/src/integrations/pmspa/pmspa-preview.ts` (`pmspaCandidates`, `syncBuilder`, `syncRows`, `usableLinks`), `api/src/integrations/pmspa/pmspa-run.ts` (`RunLinks`, `CANT_LINK`) | Where D9's `candidates: null` and the pick check go |
| `api/src/integrations/pmspa/pmspa-sync.controller.ts` (`syncPreview`) | The route to copy for API-INT-019 |
| `web/proto/features/integrations/api.ts` | The mock hooks (`usePmspaCandidates`, `integrationKeys.candidates`); production `api.ts` is its twin |
| `web/proto/features/integrations/proposed-types.ts`, `web/features/integrations/types.ts` | The names T5 switches |

## Files
| App | File | C/M | Task | Notes |
| --- | --- | --- | --- | --- |
| api | `api/test/pmspa-budget.ac.e2e-spec.ts` | C | tests | AC-1…AC-10, AC-18…AC-22 |
| api | `api/test/support/fake-pmspa.ts` | M | tests | `rateLimitHeaders`, `maxInFlight` |
| api | `api/test/pmspa-sync.ac.e2e-spec.ts` | M | tests | Its AC-2: another account's project → 200 `[]` (D2); its AC-13: the preview row `candidates: null`, the PMSPA projects from API-INT-019 (D9, D12) |
| api | `api/test/pmspa-time.ac.e2e-spec.ts` | M | tests | Its AC-1 (API-INT-007 summaries; events via API-INT-018), AC-2 (reason with the date, `taskPath`, detail without the path), AC-3 (the day's link state via API-INT-018), AC-8 (`taskPath`) |
| api | `api/test/pmspa-connection.ac.e2e-spec.ts` | M | tests | `rateLimit: null` in its connection bodies |
| api | `api/src/integrations/pmspa/dto/pmspa-connection-response.dto.ts` | M | tests, T1 | Stub: the DTO (complete in the test step) |
| api | `api/src/integrations/pmspa/pmspa-store.ts`, `api/src/integrations/pmspa/pmspa-transport.ts`, `api/src/integrations/pmspa/pmspa-connection.service.ts` | M | tests, T1 | Stub: `rateLimit: null` in the service |
| api | `api/src/integrations/pmspa/pmspa-store.spec.ts`, `api/src/integrations/pmspa/pmspa-transport.spec.ts`, `api/src/integrations/pmspa/pmspa-connection.service.spec.ts` | M | T1 | Ordinary tests, as needed |
| api | `api/src/integrations/pmspa/dto/pmspa-browse.dto.ts`, `api/src/integrations/pmspa/dto/sync.dto.ts` | M | tests | The new DTOs in full (*Reads*, *Import*, *Linked-only reads*) |
| api | `api/src/integrations/pmspa/pmspa-day-items.ts` | C | tests, T2 | Stub `dayItems`, then the mapping |
| api | `api/src/integrations/pmspa/pmspa-remote.ts`, `api/src/integrations/pmspa/pmspa-browse.controller.ts` | M | tests, T2 | Stubs: `inParallel`, the remote methods, the `tasks` and `days/details` routes |
| api | `api/src/integrations/pmspa/pmspa-remote.spec.ts`, `api/src/integrations/pmspa/pmspa-browse.controller.spec.ts` | M | T2 | Ordinary tests, as needed |
| api | `api/src/integrations/pmspa/pmspa-day-items.spec.ts` | C | T2 | Ordinary tests, as needed |
| api | `api/src/integrations/pmspa/pmspa-sync.service.ts` | M | tests, T3, T4 | Stubs: `candidates()`, `row.candidates ?? []` in `syncPair`. T3: D3, D6, D10, D11. T4: D9, D12 |
| api | `api/src/integrations/pmspa/pmspa-time-sync.service.ts` | M | T3 | D3, D10 |
| api | `api/src/integrations/pmspa/pmspa-time-preview.ts` | M | T3, T4 | T3: D10, D11. T4: `syncBuilder(s, null)` in `pushDayRows` |
| api | `api/src/integrations/pmspa/pmspa-sync.service.spec.ts`, `api/src/integrations/pmspa/pmspa-time-sync.service.spec.ts`, `api/src/integrations/pmspa/pmspa-time-preview.spec.ts` | M | T3, T4 | Ordinary tests, as needed (the preview spec's reason and `›` details) |
| api | `api/src/integrations/pmspa/pmspa-sync.controller.ts` | M | tests, T4 | Stub: the `candidates` route (API-INT-019) |
| api | `api/src/integrations/pmspa/pmspa-preview.ts` | M | T4 | `pmspaCandidateList`, `syncBuilder(s, listed)`, `syncRows` (D9) |
| api | `api/src/integrations/pmspa/pmspa-preview.spec.ts` | M | tests, T4 | Stub: `!` on `.candidates` where typecheck needs it; then ordinary tests, as needed |
| api | `api/src/integrations/pmspa/pmspa-sync.controller.spec.ts` | M | T4 | Ordinary tests, as needed |
| api | `api/openapi.json` | M | tests, T1, T2, T3, T4 | `npm run openapi:export` |
| web | `web/lib/api/schema.d.ts` | M | tests | `npm run api:types` |
| web | `web/features/integrations/budget.ac.test.tsx` | C | tests | AC-12…AC-15, AC-24, AC-25 |
| web | `web/features/integrations/api.ac.test.tsx`, `web/app/(dashboard-layout)/layout/vertical/sidebar/connectors-nav.ac.test.tsx` | M | tests | `rateLimit: null` in their connection fixtures |
| web | `web/features/users/components/user-profile.ac.test.tsx` | M | tests | Mock `ProfileIntegrations` (no query client there) |
| web | `web/features/integrations/components/pmspa-rate-limit.tsx`, `web/features/integrations/components/profile-integrations.tsx` | C | tests, T5 | Stubs, then the twins (D8) |
| web | `web/features/integrations/api.ts` | M | tests, T5 | Stubs `useLoadAllPmspaTasks`, `usePmspaDay`, `useLoadPmspaDays`, `usePmspaCandidates`, then the twin |
| web | `web/features/integrations/components/sync-preview-dialog.tsx` | M | tests, T5 | Stub: `item.candidates ?? []` in `candidatesFor`; then the twin (D8) |
| web | `web/proto/features/integrations/types.ts` | M | T5 | `PmspaRateLimitDto`, `PmspaDaySummaryDto`, `PmspaCandidatesInputDto`, `PmspaCandidatesDto` |
| web | `web/proto/features/integrations/proposed-types.ts` | M, D | tests, T5 | Test step: `"/api/v1/integrations/pmspa/candidates"` added to `PmspaChangedPaths`. T5: `rm` |
| web | `web/proto/features/integrations/api.ts`, `web/proto/mock/client.ts`, `web/proto/mock/pmspa.ts`, `web/proto/features/integrations/components/pmspa-time-tab.tsx`, `web/proto/features/integrations/components/sync-preview-dialog.tsx` | M | T5 | The type switch |
| web | `web/proto/features/integrations/components/profile-integrations.tsx`, `web/proto/features/integrations/components/pmspa-connector.tsx` | M | T5 | Review finding: a link styled as a button uses `buttonVariants`, not `Button render`; the twins follow |
| web | `web/features/integrations/types.ts`, `web/features/integrations/components/pmspa-account.tsx`, `web/features/integrations/components/pmspa-connection-card.tsx`, `web/features/integrations/components/pmspa-connector.tsx`, `web/features/integrations/components/pmspa-projects-tab.tsx`, `web/features/integrations/components/pmspa-time-tab.tsx`, `web/features/users/components/user-profile.tsx` | M | T5 | The twins (D8) |

## Interfaces

### Rate limit (T1)
```ts
// dto/pmspa-connection-response.dto.ts (written in the test step)
/** `PmspaRateLimit` (OQ-200): PMSPA's X-RateLimit-* of its last answer to any PM4 user, per host. */
export class PmspaRateLimitDto {
  limit: number;            // requests per window
  remaining: number;        // 0 after a 429
  /** ISO 8601 UTC */ resetAt: string;
  /** ISO 8601 UTC */ observedAt: string;
}
// PmspaConnectionResponseDto gains, after lastSyncAt:
@ApiProperty({ type: PmspaRateLimitDto, nullable: true }) rateLimit: PmspaRateLimitDto | null;

// pmspa-store.ts: keys.rate = (host) => `pmspa:rate:${host}`
/** PMSPA's last rate-limit answer for `host`, or null (none, expired, or not JSON); through `withPause` (D1). */
async getRateLimit(host: string): Promise<PmspaRateLimitDto | null>;
/** `withPause`, then kept until `resetAt`: `SET key JSON PX (Date.parse(resetAt) − Date.now())`; nothing when that's ≤ 0. */
async setRateLimit(host: string, rateLimit: PmspaRateLimitDto): Promise<void>;
/** While `PTTL pmspa:pause:<host>` > 0: `remaining: 0`, `resetAt = max(resetAt, now + PTTL)`; as is otherwise. */
private async withPause(host: string, rateLimit: PmspaRateLimitDto): Promise<PmspaRateLimitDto>;
```
`PmspaTransport.send`, right after the redirect check, calls `private async observe(host, res)`; on a 429 it pauses the host
first (`store.pause`, then `observe`, then the throw), so an overlapping answer stored after it is kept as spent:
1. `int(name)` = the header as a non-negative integer, else null. `limit` = `X-RateLimit-Limit`, `remaining` =
   `X-RateLimit-Remaining`, `reset` = `X-RateLimit-Reset` (epoch **seconds**), `retry` = `Retry-After`; `now = Date.now()`.
2. `resetAt` = `reset * 1000`, or null. On a 429: `remaining = 0`, `resetAt = max(resetAt ?? 0, now + (retry ?? DEFAULT_PAUSE_SECONDS) * 1000)`,
   and when `limit` is null, `limit = (await store.getRateLimit(host))?.limit ?? null` (the stored answer's; only on a 429,
   inside step 4's `try`).
3. Return without writing when `limit` is null or 0, `remaining` is null, or `resetAt` is null or ≤ `now`.
4. `store.setRateLimit(host, { limit, remaining: min(remaining, limit), resetAt: ISO(resetAt), observedAt: ISO(now) })`
   inside `try`; on error `this.logger.warn("Couldn't keep the PMSPA rate limit for <host>.")` and go on (D1).

`PmspaConnectionService`: `notConfigured()` adds `rateLimit: null`; `toDto` adds `rateLimit: await this.rateLimitOf(row.url)`,
where `rateLimitOf(url)` = `store.getRateLimit(new URL(url).host.toLowerCase())`, null when the URL doesn't parse.

### Reads (T2, T3)
```ts
// pmspa-remote.ts
/** At most this many PMSPA calls at a time for one PM4 request (OQ-201 (5)). */
export const PMSPA_PARALLEL = 2;
/** `fn` over `items`, PMSPA_PARALLEL at a time, results in `items` order; the first rejection rejects. */
export async function inParallel<T, R>(items: readonly T[], fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(PMSPA_PARALLEL, items.length) }, worker));
  return out;
}
/** A day as PMSPA's range lookup answers it: no events, only how many ids it lists. */
export interface RemoteDaySummary { date: string; start: number | null; eventCount: number }
// PmspaRemote. The `ids` methods dedupe first (first occurrence order) and drop what PMSPA answers 404 for.
async getTasks(userId: string, ids: Iterable<string>): Promise<RemoteTask[]>;       // inParallel(getTask)
async getProjects(userId: string, ids: Iterable<string>): Promise<RemoteProject[]>; // inParallel(getProject)
async listTasksOf(userId: string, projectIds: Iterable<string>): Promise<RemoteTask[]>; // inParallel(listTasks), flattened
/** GET /v1/days/event.find?start=&end=, one call; `eventCount` = `events.length`; days with 0 left out; 404 → []. */
async listDaySummaries(userId: string, from: string, to: string): Promise<RemoteDaySummary[]>;
async getDays(userId: string, dates: Iterable<string>): Promise<RemoteDay[]>;       // inParallel(getDay), nulls dropped
// `listDays` and `dayById` go (nothing else calls them).

// pmspa-day-items.ts: the mapping of today's `days` route, unchanged, moved here
/** `PmspaDay`s, newest first; a day without events left out. `linked` = PMSPA log ids with an active time-log link. */
export function dayItems(days: RemoteDay[], tasks: RemoteTask[], projects: RemoteProject[], linked: ReadonlySet<string>): PmspaDayDto[];

// dto/pmspa-browse.dto.ts (written in the test step)
export class PmspaDaySummaryDto {
  @ApiProperty({ type: String, format: "date" }) date: string;
  @ApiProperty({ type: Number, nullable: true }) startMinute: number | null;
  eventCount: number;
}
export class PmspaDaySummaryListDto { @ApiProperty({ type: [PmspaDaySummaryDto] }) items: PmspaDaySummaryDto[]; }
/** `GET /integrations/pmspa/days/details` query (API-INT-018). */
export class PmspaDayDetailsQueryDto {
  @ApiProperty({ type: [String] })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(7) @ArrayUnique()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { each: true }) @IsISO8601({ strict: true }, { each: true })
  dates: string[];
}
```
`PmspaBrowseController` (T2):
- `tasks` (API-INT-006): no `listProjects`; `this.remote.listTasks(user.id, params.id)` straight away. The item mapping moves
  to `private async taskItems(userId, remote: RemoteTask[]): Promise<PmspaTaskListDto>`, shared with `allTasks`.
- `@Get("tasks") @ApiProblemResponses(401, 409, 502, 503) allTasks(user)` (API-INT-017): `taskItems(user.id, await this.remote.listAllTasks(user.id))`.
- `days` (API-INT-007) → `PmspaDaySummaryListDto`: `assertWeek`, then `listDaySummaries(user.id, from, to)` mapped to
  `{ date, startMinute: startToMinute(start), eventCount }`, sorted by `date` descending. No other read.
- `@Get("days/details") @ApiProblemResponses(400, 401, 409, 502, 503) dayDetails(user, @Query() query: PmspaDayDetailsQueryDto)`
  (API-INT-018) → `PmspaDayListDto`: `days = await getDays(user.id, query.dates)`; `tasks = await getTasks(user.id, <every
  event's non-null taskId>)`; `projects = await getProjects(user.id, tasks.map((t) => t.projectId))`; `{ items: dayItems(days,
  tasks, projects, new Set((await this.activeLinks(user.id, "time-log")).keys())) }`.

`PmspaSyncService.load(userId, sel)` (T3): read the user first (its `timeZone` is needed). With `sel?.dates?.length` (D3):
1. `days = await this.timeSync.readDays(userId, user.timeZone, sel.dates)`.
2. `selected = await this.remote.getProjects(userId, sel.projects.map((p) => p.id))`.
3. `tasks = await this.remote.listTasksOf(userId, selected.map((p) => p.id))`.
4. `tasks.push(...await this.remote.getTasks(userId, <every day's event taskId, non-null, not already in tasks>))`.
5. `projects = [...selected, ...await this.remote.getProjects(userId, <tasks' projectIds not in selected>)]`.
6. The PM4 records and links as today; `remoteProjects: projects`, `remoteTasks: tasks`; `return this.timeSync.loadTime(userId, base, sel.dates, days)`.

Without `dates`, as today except `Promise.all(... listTasks ...)` → `this.remote.listTasksOf(userId, selected)`.
`PmspaTimeSyncService`: the `getDay` loop leaves `loadTime` for `async readDays(userId, timeZone, dates): Promise<RemoteDay[]>` (dates
after `todayIn(timeZone)` skipped, one `getDay` at a time, missing days left out); `loadTime(userId, base, dates, remoteDays)` takes them.

### Import (T3)
```ts
// dto/sync.dto.ts (written in the test step)
/** The PMSPA project and task an event row sits under (OQ-205). */
export class SyncTaskPathDto { projectTitle: string; taskTitle: string; }
// SyncPreviewItemDto gains, last:
@ApiPropertyOptional({ type: SyncTaskPathDto, description: "An import's or a day push's event row with a PMSPA task (OQ-205)." })
taskPath?: SyncTaskPathDto;
// SyncPreviewDto and SyncResultDto gain, last:
@ApiPropertyOptional({ type: [PmspaDayDto], description: "API-INT-008/009 with `dates`: the selected days read (OQ-205)." })
days?: PmspaDayDto[];
```
- `PmspaSyncService.importPreview` with `dates`: `{ items: importTimeRows(s, sel), days: await this.dayItemsOf(userId, s) }`.
- `private async dayItemsOf(userId, s: TimeSnapshot): Promise<PmspaDayDto[]>` = `dayItems(s.remoteDays, s.remoteTasks,
  s.remoteProjects, <pmspaIds of this.links.active(userId, pmspaUserId, "time-log")>)`; `[]` without a `pmspaUserId`.
- `commit` gains a last parameter `after?: (snapshot: SyncSnapshot) => Promise<Partial<SyncResultDto>>`, awaited after
  `setLastSyncAt` inside the lock and spread into the result. `importRun` passes `(s) => this.dayItemsOf(userId, s as TimeSnapshot).then((days) => ({ days }))` when `dates` is set.
- `importTimeRows`: after `selectProjects`, one pass over every date (sorted, not after `s.today`) and its events collects
  each event task not linked (`taskLinks`) with its event count and its dates in order; then for each such task
  `b.addTask(t, \`Parent of ${n === 1 ? "an imported event" : "imported events"} from ${and(dates.map(formatWorkDate))}\`)`
  (`and`: "a", "a and b", "a, b and c"). Only then the per-date loop: the future-day row, or the day row and its event rows,
  without the parent loop.
- Event rows (import): `...(t ? { taskPath: { projectTitle: <t's project title, "?" when missing>, taskTitle: t.title } } : {})`,
  `detail` = `eventDetail(…)` with a task, else `"No task → Unsorted[, excluded from statistics]" · eventDetail(…)` as today.
- Event rows (push, `pushDayRows`): `pushedTaskPath(g)` returns `{ projectTitle, taskTitle } | null` (null without a task or
  for the excluded nonprod group; the linked PMSPA task's names, else the PM4 names as today); with a path `taskPath` is set and
  `detail` = `eventDetail(…)`, else `detail` = `"No task" | "No task · Excluded from statistics"` + ` · ` + `eventDetail(…)`.

### Linked-only reads and candidates (T4)
```ts
// dto/sync.dto.ts (written in the test step)
// SyncPreviewItemDto.candidates becomes:
@ApiProperty({ type: [SyncCandidateDto], nullable: true, description: "Null: a sync or push row whose PMSPA candidates weren't read (OQ-204, API-INT-019)." })
candidates: SyncCandidateDto[] | null;
/** `PmspaCandidatesInput` (API-INT-019, OQ-204). */
export class PmspaCandidatesInputDto {
  @ApiProperty({ enum: ["project", "task"] }) @IsIn(["project", "task"]) type: "project" | "task";
  /** A 24-hex PMSPA project id; required for `task`, ignored for `project`. */
  @ApiProperty({ type: String, required: false })
  @ValidateIf((o: PmspaCandidatesInputDto) => o.type === "task")
  @Matches(/^[0-9a-f]{24}$/, { message: "Must be a 24-character hex id." })
  projectId?: string;
  @ApiProperty({ type: [String], format: "uuid" })
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(500) @ArrayUnique() @IsUUID("all", { each: true })
  for: string[];
}
export class PmspaCandidatesItemDto {
  @ApiProperty({ format: "uuid" }) pm4Id: string;
  @ApiProperty({ type: [SyncCandidateDto] }) candidates: SyncCandidateDto[];
}
export class PmspaCandidatesDto { @ApiProperty({ type: [PmspaCandidatesItemDto] }) items: PmspaCandidatesItemDto[]; }

// pmspa-preview.ts: `pmspaCandidates` becomes, exported (the remote records passed in, no `remoteProjects` filter)
export const pmspaCandidateList = {
  project: (remote: RemoteProject[], p: Pm4Project, linked: ReadonlySet<string>): SyncCandidateDto[],
  task: (remote: RemoteTask[], t: Pm4Task, linked: ReadonlySet<string>, timeZone: string): SyncCandidateDto[]
}; // same mapping and `sortByMatch` as today
export function syncBuilder(s: SyncSnapshot, listed: string | null): { … as today };
```
- `syncBuilder(s, listed)`: an unlinked project row → `candidates: null`. An unlinked task row → when `listed` and its PM4
  project's link (`links.project.byPm4`) points at `listed`, `pmspaCandidateList.task(s.remoteTasks.filter((r) => r.projectId
  === listed), t, linkedPmspa.task, s.timeZone)`; else `null`. Linked rows keep `[]`.
- `syncRows(s, target)`: `listed` = for a project target, the PMSPA id of its usable link (`usableLinks(s)`), else null.
  `pushDayRows` calls `syncBuilder(s, null)`.

`PmspaSyncService` (T4):
```ts
/** D9: the snapshot of a sync or day push. `picks`: a commit's choices; each `link` choice's record is read by id too. */
private async loadLinked(userId: string, target: PmspaSyncTargetDto | PmspaPushTargetDto, picks: SyncChoiceDto[] = []): Promise<SyncSnapshot>;
/** API-INT-019 (D12). */
async candidates(userId: string, input: PmspaCandidatesInputDto): Promise<PmspaCandidatesDto>;
```
`loadLinked`:
1. The user (401 when missing), `pmspaUserId`, the active project and task links, `pm4Projects`, `pm4Tasks`, as `load`; no
   PMSPA call. `linked(type, pm4Ids)` = the PMSPA ids of the links of `type` whose `pm4Id` is in `pm4Ids`.
2. The PM4 records the rows need: a project target `P` → projects `{P}`, tasks = P's PM4 tasks; a task target `T` → tasks
   `{T}`, projects `{T.projectId}`; a day → 400 `{ field: "id", message: "The date is in the future." }` when it's after
   `todayIn(user.timeZone)`, as today, then `day = await this.timeSync.loadTime(userId, base, [date], await this.timeSync.readDays(userId, user.timeZone, [date]))`
   (base without PMSPA records), tasks = the date's `pm4Logs` groups' (`groupDay`) task ids, projects = the project ids of
   those tasks (a group without a task builds no row, so its project isn't read). Nothing of the target is the user's →
   no PMSPA call (`syncRows` answers null → 404, as today).
3. `listed` = a project target's linked PMSPA project, else null. `tasks = listed ? await remote.listTasks(userId, listed) : []`;
   `tasks.push(...await remote.getTasks(userId, <linked("task", tasks) not in tasks>))`.
4. `projects = await remote.getProjects(userId, [...linked("project", projects), ...(a day ? tasks.map((t) => t.projectId) : [])])`
   (`getProjects` dedupes).
5. Picks: for each `link` choice with an `id`, by its key's type (`project:` / `task:`), not already read:
   `projects.push(...await remote.getProjects(…))`, `tasks.push(...await remote.getTasks(…))`.
6. `{ ...base, remoteProjects: projects, remoteTasks: tasks }`, for a day on `day` (a `TimeSnapshot`).

Callers: `pushPreview` and `syncPreview` → `loadLinked(userId, target)`. `commit` loses `pushDate` for
`target: PmspaSyncTargetDto | PmspaPushTargetDto | null` (null = an import): `snapshot = target ? await
this.loadLinked(userId, target, choices) : await this.load(userId, sel)`; `logLinks` keys on `target?.type === "day"`
where it used `pushDate`; `syncRun` passes `dto.target`, `pushRun` `dto.target`. `load` then always has a `sel`
(`load(userId, sel: PmspaImportSelectionDto)`).

`syncPair`, a row not linked with a `link` choice: valid when `row.candidates` is an array and has `choice.id` (as today),
or when `row.candidates` is null and the snapshot has that PMSPA record (`remoteProjects` / `remoteTasks`) and
`run.links.pm4Of(type, choice.id)` is undefined; else `result(row, "failed", CANT_LINK)`. The D9 re-read (`chosenPmspa`)
goes: the record was read inside the lock. `saveLink` gets the snapshot's record as `remoteKnown` unless `direction` is
`to-pmspa`.

`candidates(userId, input)`: the user (401 when missing, its `timeZone`), the PM4 records of `input.type` whose id is in
`input.for`, in `for` order; none → `{ items: [] }` without a PMSPA call. `linked` = the PMSPA ids of the active links of
`input.type` (`links.active(userId, pmspaUserId, input.type)`; empty without a `pmspaUserId`). `remote` =
`remote.listProjects(userId)` or `remote.listTasks(userId, input.projectId!)`. `items` = each PM4 record with
`pmspaCandidateList[input.type](remote, record, linked[, timeZone])`.

`PmspaSyncController` (T4): `@Post("candidates") @HttpCode(HttpStatus.OK) @ApiProblemResponses(400, 401, 409, 502, 503)
candidates(user, @Body() dto: PmspaCandidatesInputDto): Promise<PmspaCandidatesDto>` → `service.candidates(user.id, dto)`.

### Web (T5)
- After the test step, `schema.d.ts` has `PmspaRateLimitDto`, `PmspaConnectionResponseDto.rateLimit`, `PmspaDaySummaryDto`,
  `SyncTaskPathDto`, `SyncPreviewItemDto.taskPath`, `SyncPreviewDto.days`, `SyncResultDto.days`, `/api/v1/integrations/pmspa/tasks`,
  `/api/v1/integrations/pmspa/days/details` and API-INT-007 answering `PmspaDaySummaryListDto`; and (D9, D12)
  `SyncPreviewItemDto.candidates` nullable, `PmspaCandidatesInputDto`, `PmspaCandidatesDto` and `/api/v1/integrations/pmspa/candidates`.
- In `web/proto/features/integrations/types.ts` add `export type PmspaRateLimitDto = S["PmspaRateLimitDto"];`,
  `export type PmspaDaySummaryDto = S["PmspaDaySummaryDto"];`, `export type PmspaCandidatesInputDto = S["PmspaCandidatesInputDto"];`
  and `export type PmspaCandidatesDto = S["PmspaCandidatesDto"];`. Then, everywhere under `web/proto` (`grep -rn proposed-types web/proto`):
  `PmspaConnectionWithRateLimitDto` → `PmspaConnectionDto`; `PmspaPreviewItemDto` → `SyncPreviewItemDto`; `PmspaPreviewDto` and
  `PmspaImportPreviewDto` → `SyncPreviewDto`; `PmspaImportResultDto` → `SyncResultDto`; `PmspaRateLimitDto`, `PmspaDaySummaryDto`,
  `PmspaCandidatesInputDto` and `PmspaCandidatesDto` imported from `./types` / `@/proto/features/integrations/types` / `../types`. In `api.ts`: `export type PmspaConnection = PmspaConnectionDto;`
  and drop every `as PmspaConnection`, `as SyncPreviewDto`, `as SyncResultDto` cast left by the renames. The generated
  `PmspaCandidatesInputDto` is one object type (`projectId?`), not the prototype's union; the prototype's uses compile with it. In `web/proto/mock/client.ts`:
  drop the `PmspaChangedPaths, PmspaPaths` import; `createClient<Omit<paths, PmspaChangedPaths> & PmspaPaths>` → `createClient<paths>`.
  `rm web/proto/features/integrations/proposed-types.ts`. `npm run typecheck` passes before the copy.
- Then the twin copy (D8) of: `features/integrations/types.ts`, `features/integrations/api.ts`, and under
  `features/integrations/components/`: `pmspa-rate-limit.tsx`, `profile-integrations.tsx`, `pmspa-account.tsx`,
  `pmspa-connection-card.tsx`, `pmspa-connector.tsx`, `pmspa-projects-tab.tsx`, `pmspa-time-tab.tsx`, `sync-preview-dialog.tsx`;
  and `features/users/components/user-profile.tsx`.
- Hooks as the prototype has them: `PMSPA_READ` on `usePmspaProjects`, `usePmspaTasks`, `usePmspaDays`, `usePmspaDay`,
  `usePmspaLinkDetail` (D5); `useLoadAllPmspaTasks()` and `useLoadPmspaDays()` (D4); `useImportPreview` and `useImport` filling
  `integrationKeys.day(date)` from `days`, `useImport` not invalidating those (D10); `useRefreshPmspaRateLimit()` (D7), called by `PmspaRateLimit`;
  `usePmspaCandidates(input | null)` with `PMSPA_READ` and `integrationKeys.candidates(input)` (sorted `for`), `useSyncPreview`
  answering `SyncPreviewDto` (D12); the dialog's lazy `LinkChoice` as the prototype has it.

## Acceptance criteria
"Calls" = requests the fake PMSPA records, with a cached token (no login).

| AC | Case → expected | Test | Task |
| --- | --- | --- | --- |
| AC-1 | A PMSPA answer with `X-RateLimit-Limit: 100`, `-Remaining: 63`, `-Reset: <now + 540 s>` → API-INT-001 `rateLimit` = `{limit: 100, remaining: 63, resetAt: <that ISO>, observedAt: <ISO within the test>}`, also for another PM4 user connected to the same host; a later answer without the headers leaves it | `api/test/pmspa-budget.ac.e2e-spec.ts` | T1 |
| AC-2 | A 429 with `Retry-After: 600` and no other header after AC-1's answer → `limit: 100`, `remaining: 0`, `resetAt` ≈ now + 600 s; not configured, or no answer yet for the host → `rateLimit: null` | `api/test/pmspa-budget.ac.e2e-spec.ts` | T1 |
| AC-3 | API-INT-006 of a project with 3 tasks → 1 call (`GET /v1/tasks?project=`), no `/v1/projects` call; another account's project → 200 `{items: []}` | `api/test/pmspa-budget.ac.e2e-spec.ts` | T2 |
| AC-4 | API-INT-017 with `pageSize` 2 and 5 tasks over 2 projects (+ 1 of another account) → the 5 tasks with their links, 3 calls | `api/test/pmspa-budget.ac.e2e-spec.ts` | T2 |
| AC-5 | API-INT-007, a week with 2 days of 3 and 2 events, start 8.5 on the first → 1 call (the range); items newest first `{date, startMinute: 510, eventCount: 3}`, `{…, eventCount: 2}`; no `events` field | `api/test/pmspa-budget.ac.e2e-spec.ts` | T2 |
| AC-6 | API-INT-018 for those 2 dates, events referencing tasks A, B (project P), A again, a deleted task D, and one event without a task → calls: 2 days + 3 `tasks?task=` + 1 `projects/P`; A and B have `projectTitle` P's title, D's event `task: null`; `dates` missing, 8 dates, a repeat or `2026-02-30` → 400; a date without a day → left out | `api/test/pmspa-budget.ac.e2e-spec.ts` | T2 |
| AC-7 | With `latencyMs` 30, API-INT-018 for dates referencing 5 distinct tasks → `maxInFlight` ≤ 2 | `api/test/pmspa-budget.ac.e2e-spec.ts` | T2 |
| AC-8 | Import preview with `dates` 16 and 17 Oct, events on both referencing unlinked task A (project P, unlinked) and one on 17 Oct referencing unlinked task C → no project or task list call; `project:<P>`, `task:<A>`, `task:<C>` come before both day rows; A's reason "Parent of imported events from 16 Oct 2026 and 17 Oct 2026", C's "Parent of an imported event from 17 Oct 2026"; A's event row `taskPath` `{projectTitle: P's title, taskTitle: A's title}` and `detail` "1 log · 1h"; `days` = API-INT-018's answer for those dates | `api/test/pmspa-budget.ac.e2e-spec.ts` | T3 |
| AC-9 | Importing AC-8's selection → `days` with `linkState: "linked"` and each log `linked: true`; calls during the import = the preview's reads (no extra read for `days`) | `api/test/pmspa-budget.ac.e2e-spec.ts` | T3 |
| AC-10 | A day push preview with a log on linked task A → its event row `taskPath` = PMSPA's A and project titles, `detail` "1 log · 1h"; a log without a task → no `taskPath`, `detail` "No task · 1 log · 30m" | `api/test/pmspa-budget.ac.e2e-spec.ts` | T3 |
| AC-11 | feat-int-sync-api's AC-2 with D2, and feat-int-time-api's AC-1, AC-2 and AC-8 as updated in the test step, pass | `api/test/pmspa-sync.ac.e2e-spec.ts`, `api/test/pmspa-time.ac.e2e-spec.ts` | T3 |
| AC-18 | Sync preview of PM4 project P linked to PMSPA X (3 tasks, one linked to P's task T1), P's tasks T1, T2 (unlinked) and T3 (linked to Y1 of PMSPA project Y) → calls: `projects/X`, `tasks?project=X`, `tasks?task=Y1` (any order); no projects list and no all-tasks list; P's row `candidates: []`; T2's row `candidates` = X's 2 unlinked tasks, the closest title first, `groupId` X | `api/test/pmspa-budget.ac.e2e-spec.ts` | T4 |
| AC-19 | Sync preview of an unlinked PM4 project with an unlinked task → no call, both rows `candidates: null`. Of a task linked to Y1 whose project is linked to Y → 2 calls (`tasks?task=Y1`, `projects/Y`). Of an unlinked task whose project is linked to Y → 1 call (`projects/Y`), the task row `candidates: null`, no parent row | `api/test/pmspa-budget.ac.e2e-spec.ts` | T4 |
| AC-20 | Day push preview with logs on task A (linked to PMSPA A′ of project P′) and unlinked task B whose PM4 project Q is linked to R → calls: the day's read, `tasks?task=A′`, `projects/P′`, `projects/R`; B's row `candidates: null` with Q's row linked as its parent; A's event row `taskPath` from A′ and P′ | `api/test/pmspa-budget.ac.e2e-spec.ts` | T4 |
| AC-21 | Sync of an unlinked PM4 project without tasks with a `link` choice to PMSPA project K, Link only → `linked`, 1 call (`projects/K`), no PMSPA write; to a project PMSPA answers 404 for, or one already linked to another PM4 project → `failed` "The chosen record can't be linked.", no link written | `api/test/pmspa-budget.ac.e2e-spec.ts` | T4 |
| AC-22 | API-INT-019 `{type: "project", for: [P1, another user's project, a random uuid]}` with 4 PMSPA projects (1 linked) → 1 call; `items` = `[{pm4Id: P1, candidates: <the 3 unlinked, closest title first, with differences>}]`. `{type: "task", projectId: X, for: [T2]}` (X with 3 tasks, 1 linked) → 1 call (`tasks?project=X`), 2 candidates with `groupId` X; another account's project → `candidates: []`; `for` with nothing of the user's → `{items: []}`, no call. 400: no `type`, `task` without `projectId`, a bad `projectId`, `for` empty, 501 ids, a repeat or a non-uuid. No connection → 409 | `api/test/pmspa-budget.ac.e2e-spec.ts` | T4 |
| AC-23 | feat-int-sync-api's AC-13 as updated in the test step (preview `candidates: null`, the candidates via API-INT-019) passes | `api/test/pmspa-sync.ac.e2e-spec.ts` | T4 |
| AC-12 | `usePmspaProjects`, `usePmspaTasks`, `usePmspaDays`, `usePmspaDay` queries have `staleTime` 300000, `refetchOnWindowFocus` false, `retry` false | `web/features/integrations/budget.ac.test.tsx` | T5 |
| AC-13 | `useLoadAllPmspaTasks().mutate(["p1", "p2"])` → one `GET …/pmspa/tasks`; `tasks("p1")` = p1's tasks, `tasks("p2")` = `[]`; again right after → no request. `useLoadPmspaDays().mutate(["2026-10-16", "2026-10-17"])` with 16 Oct cached → one `GET …/pmspa/days/details?dates=2026-10-17`; `day("2026-10-17")` = its day, or `null` when not answered; again → no request. `useImportPreview` answering `days` → `day(<date>)` = that day | `web/features/integrations/budget.ac.test.tsx` | T5 |
| AC-14 | `PmspaRateLimit`: `rateLimit` null → "All available"; 63 left of 100, reset in 9 min → "37 of 100 used, resets at <HH:mm> (in 9 min)"; 0 left → "Limit reached, PMSPA calls resume at …"; `resetAt` passed → "All 100 available"; after a `remote` query settles, the connection is fetched again | `web/features/integrations/budget.ac.test.tsx` | T5 |
| AC-15 | `ProfileIntegrations`: not configured → "No PMSPA account connected." and a link to `/app/settings?tab=integrations`; connected → the account's email and "Admin" | `web/features/integrations/budget.ac.test.tsx` | T5 |
| AC-24 | `usePmspaCandidates(null)` → no request; `{type: "task", projectId: "x", for: ["b", "a"]}` → one `POST …/pmspa/candidates` with that body, key `[...remote(), "candidates", "task", "x", ["a", "b"]]`, `staleTime` 300000, `retry` false; again with `for: ["a", "b"]` → no request | `web/features/integrations/budget.ac.test.tsx` | T5 |
| AC-25 | `SyncPreviewDialog` (sync) on project P (`candidates: null`) with unlinked tasks T1, T2 (`candidates: null`): no candidates request on open. Opening P's **Link to existing ▾** → one request `{type: "project", for: [P]}`, skeleton rows (`aria-label` "Reading PMSPA projects") until it answers, then its options. T1's dropdown while P is **Create new** → no request, "No existing task to link to.". P linked to X under Link to existing, then T1's dropdown → one request `{type: "task", projectId: X, for: [T1, T2]}`; T2's dropdown then → no request. A failed read → the error text and **Retry**, which reads again. A row with `candidates` an array → no request | `web/features/integrations/budget.ac.test.tsx` | T5 |
| AC-16 | No `proposed-types.ts`; nothing imports it; `pm4 twins` reports no failure; the build passes | `check` | T5 |
| AC-17 | Locally against the API and the owner's PMSPA: the requests line moves after a browse; a Time week is one PMSPA call and a closed day shows "—"; opening a day fills it; **Expand all** makes one API call on each tab; an import preview fills the checked days; the profile shows the PMSPA account; a sync of an unlinked project spends no PMSPA request until **Link to existing ▾** opens | `manual` | T5 |

Typed stubs (created with the tests, so lint and typecheck pass while the tests fail; `throw new Error("not implemented (feat-int-budget)")`):
- api: the DTOs in full (`PmspaRateLimitDto` and `rateLimit`, `PmspaDaySummaryDto`, `PmspaDaySummaryListDto`, `PmspaDayDetailsQueryDto`,
  `SyncTaskPathDto`, `taskPath`, `days`); `rateLimit: null` in `notConfigured()` and `toDto()`; `getRateLimit`/`setRateLimit`;
  `PMSPA_PARALLEL`, `inParallel`, `RemoteDaySummary`, `getTasks`, `getProjects`, `listTasksOf`, `listDaySummaries`, `getDays`; `dayItems`;
  the `allTasks` and `dayDetails` routes, and the `days` route's new return type; `SyncPreviewItemDto.candidates` nullable,
  `PmspaCandidatesInputDto`, `PmspaCandidatesItemDto`, `PmspaCandidatesDto`, `PmspaSyncService.candidates` and the `candidates`
  route; `row.candidates ?? []` in `syncPair` and `!` in `pmspa-preview.spec.ts` where typecheck needs them. Then
  `npm run openapi:export` and, in `web/`, `npm run api:types`.
- web: `useLoadAllPmspaTasks`, `usePmspaDay`, `useLoadPmspaDays`, `usePmspaCandidates` in `features/integrations/api.ts`;
  `item.candidates ?? []` in the production `sync-preview-dialog.tsx`'s `candidatesFor`; `"/api/v1/integrations/pmspa/candidates"`
  added to `PmspaChangedPaths` in `web/proto/features/integrations/proposed-types.ts`; `PmspaRateLimit({ connection, tz, className })`
  and `ProfileIntegrations()` in their files.

## Checks
```bash
# AC-16: types switched, twins equal, build
test ! -e web/proto/features/integrations/proposed-types.ts
! grep -rn "proposed-types" web/proto web/features
node scripts/pm4.mjs twins
```

## Tasks
| # | Task | App | Size | Tier | Why this tier | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | Rate limit: store, transport `observe`, connection service; `openapi:export` | api | S | haiku | Every step is spelled out under *Rate limit*; copies the store's key pattern | — |
| T2 | Browse reads: `inParallel` and the remote methods, `dayItems`, API-INT-006/007/017/018 | api | M | sonnet | Concurrency (bounded parallel calls) and the day mapping moved out of the controller | T1 |
| T3 | Import: the snapshot for `dates`, the time preview's order, reasons and `taskPath`, push `taskPath`, `days` on preview and import | api | M | sonnet | A reordered snapshot load and row order across three files, plus a commit hook inside the lock | T2 |
| T4 | Linked-only reads: `loadLinked` for sync and push previews and commits, the pick check, `candidates: null`, API-INT-019 | api | M | sonnet | A new snapshot loader for three targets and the commit's link check inside the lock | T3 |
| T5 | Type switch in the prototype, then the twins: hooks, rate-limit line, account badge, connector header, both Expand alls, lazy Time days, dialog icons and lazy Link to existing, Profile → Integrations | web | M | haiku | Twin copy (D8); the switch is listed line by line | T4 |

## Open questions
None.

## Changelog
- 2026-10-18: Initial draft (OQ-200…OQ-203; OQ-204 left for a later feature). Approved by the owner.
- 2026-10-18: Prototype `072da99`. OQ-205: API-INT-007 day summaries from one range call, API-INT-018 days with events, Time Expand all in one request, `days` on import preview and import, projects and tasks before days with the dated parent reason, `taskPath` on import and push event rows. The API work splits into T2 (browse) and T3 (import); web is T4. Back to `review`.
- 2026-10-18: Prototype `9fe7adb`. OQ-204: D9 (sync and push previews and commits read only linked PMSPA records; the
  commit also reads the picked records) replaces "out of scope"; D12 API-INT-019 and the lazy **Link to existing ▾**. New
  api task T4 (linked-only reads, API-INT-019); web becomes T5. AC-18…AC-25. Still `review`.
- 2026-10-18: Approved by the owner. Test step: on a 429 without `X-RateLimit-Limit`, `observe` keeps the stored
  answer's `limit` (AC-2; owner, 2026-10-18). *Files* lists the other acceptance tests the test step adjusts
  (`rateLimit: null` fixtures, feat-int-time-api's AC-3).
- 2026-10-18: Review findings (owner): a day push's `projects` are the projects of the groups' tasks, and `loadLinked` gets
  the 4-argument `loadTime`. Time-log hashes key a group's task on any of its links, read or not, or made earlier in the same run (`mappedGroup`,
  `saveTimeLink` and the push alike), so a narrowed snapshot doesn't make a log look changed in PM4. The links styled as buttons in Profile → Integrations
  and the connector header use `buttonVariants` (proto first, then the twins).
- 2026-10-18: AC-17 (owner): the requests line said "All available" while a read said "PMSPA is busy". D1: the rate limit follows an active pause (`withPause` in the store); a 429 pauses before `observe`.
- 2026-10-18: AC-17 (owner): the lists' "PMSPA is busy" minutes didn't move while the requests line counted down. D13: one shared PMSPA clock and the same reset time for both.
