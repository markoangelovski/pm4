---
id: feat-int-followups
title: "PMSPA follow-ups: log limits in the preview, created-in-PMSPA dates, a token per connection, cheaper Expand all, error lines"
status: approved
owner: Marko Angelovski
last_updated: 2026-10-24
milestone: M6
requirements: [FR-INT-003, FR-INT-007, FR-INT-008, FR-INT-010, FR-INT-011, FR-INT-014, FR-INT-015, SCR-021, SCR-030, SCR-031, SCR-060, SCR-061, SCR-062]
related: [req-integrations, api-endpoints, web-screens, feat-int-conn-api, feat-int-time-api, feat-int-web, feat-int-budget, OQ-197, OQ-198, OQ-199, OQ-206, OQ-207, OQ-208, OQ-209, OQ-221]
prototype: b3d9093
---

# PMSPA follow-ups: log limits in the preview, created-in-PMSPA dates, a token per connection, cheaper Expand all, error lines

## Goal
The time import preview warns about every log the import will reject (FR-INT-011, SCR-061). The project and task views
show when PMSPA created the linked record (FR-INT-010; SCR-021, SCR-030, SCR-031, SCR-062). A PMSPA call that outlives a
Save or Test that changed the URL or email can't revive the old connection, and a re-login as another PMSPA account
counts as invalid credentials (FR-INT-003). **Expand all** on Projects & tasks reads the cheaper way (FR-INT-015,
SCR-060). The task list's error and the dialog's commit failure use the PMSPA problem lines (FR-INT-014). The UI is
prototype `b3d9093`; this spec lists the delta.

## Decisions
| # | Decision | Source |
| --- | --- | --- |
| D1 | The import preview warns, in the event row, for each log the commit's `logFailure` will reject, in its order: off-step (as today), then outside 0.25…24 h, then a text over 1000 characters; each log once. No warning for a log with no text. | OQ-197 (owner, 2026-10-17); prototype `b3d9093` |
| D2 | `PmspaLink.pmspaCreatedAt` (API-INT-012, every link type) = the creation second in the first 4 bytes of the link's `pmspa_id` (ObjectId), ISO 8601 UTC. No column, no migration, no PMSPA call. Checked against PMSPA's `createdAt` on 3 real projects (equal to the second). | OQ-207 (owner, 2026-10-18) |
| D3 | Shown: the project and task header date line ("Created in PMSPA <d MMMM yyyy, HH:mm>"), a **Created in PMSPA** column on the task lists while a connection is saved ("—" when not linked), and in the sync-flag popover after the lead / column / event (", created in PMSPA on …"), for logs too. | Owner, prototype `b3d9093` |
| D4 | The cached PMSPA token and account carry the connection's URL and email they were cached for; a read with another URL or email is a miss. `PmspaClient.request` writes the status only while the row still has the URL and email it read (a conditional update), and clears the cache on invalid credentials only when that write matched. After a successful re-login it reads the row again and caches the token and account only while the row still has that URL and email (no row → nothing cached); the call itself goes on either way. No locking. | OQ-208 (owner, 2026-10-18: token, account and status); OQ-221 (owner, 2026-10-24: the re-check before caching) |
| D5 | `request`'s re-login enforces feat-int-conn-api D8 as Test does: another account than the row's `pmspa_user_id` → status `invalid-credentials`, cache cleared, 409 `pmspa-invalid-credentials`, nothing cached. | OQ-209 (owner, 2026-10-18) |
| D6 | **Expand all** on Projects & tasks (`useLoadAllPmspaTasks({ shown, all })`): per project (API-INT-006) costs `Σ max(1, ⌈taskCount/50⌉)` over the shown lists not cached and fresh; all tasks (API-INT-017) costs `max(1, ⌈Σ taskCount/50⌉)` over every project. Per project only when strictly cheaper; a tie reads all tasks and fills every project's list. Nothing is read when every shown list is fresh. Replaces feat-int-budget D4's Projects half. | OQ-206 (owner, 2026-10-18); prototype `b3d9093` |
| D7 | The per-project task list error (`pmspa-projects-tab.tsx`) is `PmspaProblemLine` with the fallback "Couldn't read the tasks." (adds a row to feat-int-web *Error lines*). | OQ-198 (owner, 2026-10-18) |
| D8 | The dialog's commit failure drops "Some records may have been written: …" for 409 `pmspa-sync-running` only (the API rejects it before writing anything). Changes feat-int-web AC-8. | OQ-199 (owner, 2026-10-18) |
| D9 | Promotion = the twin copy, as feat-int-web D2: `sed -e 's#@/proto/mock/client#@/lib/api/client#' -e 's#@/proto/#@/#g' web/proto/features/x > web/features/x`, then Prettier. | feat-int-web D2 |

Existing Redis entries after the deploy: a token or account cached before D4 has no URL and email, so it reads as a miss;
each user logs in once more on their next PMSPA call, and Settings shows the account again after that call or a Test.

## Scope
**In:** D1 in `pmspa-time-preview.ts`; D2 in the links DTO and service; D4 and D5 in the store, the connection repository,
`PmspaClient` and the connection service; the prototype's type switch (`proposed-types.ts` removed) and the twins of the
prototype files changed by `b3d9093`.

**Non-goals** (implementers must not touch these):
- The import commit (`logFailure`, OQ-194): unchanged. API-INT-014 (`PmspaLinkDetail`): no date.
- The Time tab's **Expand all** (feat-int-budget D4, Time half): unchanged.
- Markup, copy or layout of the prototype files; the prototype's `mock/`.
- `*.ac.*` test files.

## Read first
| Path | Why / copy this |
| --- | --- |
| `specs/03-api/endpoints.md#shared-pmspa-shapes` | `PmspaLink.pmspaCreatedAt`; API-INT-012 |
| `api/src/integrations/pmspa/pmspa-time-preview.ts` (`importTimeRows`, the `offStep` warning) | D1: the warnings to add after it |
| `api/src/integrations/pmspa/pmspa-time-sync.service.ts` (`logFailure`) | D1: the order the warnings follow |
| `api/src/integrations/pmspa/pmspa-links.service.ts` (`list`), `api/src/integrations/pmspa/dto/pmspa-links.dto.ts` | D2 |
| `api/src/integrations/pmspa/pmspa-store.ts`, `api/src/integrations/pmspa/pmspa-client.ts`, `api/src/integrations/pmspa/pmspa-connection.service.ts`, `api/src/integrations/pmspa/pmspa-connection.repository.ts` (`setStatus`) | D4, D5 |
| `web/proto/features/integrations/api.ts` | `useLoadAllPmspaTasks`, `usePmspaLinks`; production `api.ts` is its twin |
| `web/proto/features/integrations/proposed-types.ts`, `web/proto/features/integrations/types.ts` | The type T3 switches |

## Files
| App | File | C/M | Task | Notes |
| --- | --- | --- | --- | --- |
| api | `api/test/pmspa-followups.ac.e2e-spec.ts` | C | tests | AC-1…AC-3 |
| api | `api/src/integrations/pmspa/pmspa-client.ac.spec.ts` | C | tests | AC-4, AC-5 (unit, fakes) |
| api | `api/test/pmspa-sync.ac.e2e-spec.ts` | M | tests | Its AC-3: each link has `pmspaCreatedAt` |
| api | `api/src/integrations/pmspa/dto/pmspa-links.dto.ts` | M | tests | `pmspaCreatedAt` (complete in the test step) |
| api | `api/src/integrations/pmspa/pmspa-links.service.ts` | M | tests, T1 | Stub `pmspaCreatedAt`, used in `list`; then D2 |
| api | `api/src/integrations/pmspa/pmspa-time-preview.ts` | M | T1 | D1 |
| api | `api/src/integrations/pmspa/pmspa-links.service.spec.ts`, `api/src/integrations/pmspa/pmspa-time-preview.spec.ts` | M | T1 | Ordinary tests, as needed |
| api | `api/src/integrations/pmspa/pmspa-store.ts`, `api/src/integrations/pmspa/pmspa-connection.repository.ts` | M | tests, T2 | Stubs: `PmspaOwner`, the `owner` parameters, `setStatusFor`; then D4 |
| api | `api/src/integrations/pmspa/pmspa-client.ts`, `api/src/integrations/pmspa/pmspa-connection.service.ts` | M | tests, T2 | Stub: the callers pass `owner`; then D4, D5 |
| api | `api/src/integrations/pmspa/pmspa-store.spec.ts`, `api/src/integrations/pmspa/pmspa-client.spec.ts`, `api/src/integrations/pmspa/pmspa-connection.service.spec.ts`, `api/src/integrations/pmspa/pmspa-connection.repository.spec.ts` | M | tests, T2 | The new signatures where typecheck needs them; then ordinary tests, as needed |
| api | `api/openapi.json` | M | tests | `npm run openapi:export` |
| web | `web/lib/api/schema.d.ts` | M | tests | `npm run api:types` |
| web | `web/features/integrations/followups.ac.test.tsx` | C | tests | AC-6, AC-7, AC-9 |
| web | `web/features/integrations/budget.ac.test.tsx` | M | tests | Its AC-13: `useLoadAllPmspaTasks().mutate({ shown, all })` (D6) |
| web | `web/features/integrations/components/sync-preview-dialog.ac.test.tsx` | M | tests | Its AC-8 (D8) |
| web | `web/features/integrations/api.ts` | M | tests, T3 | Stub: `useLoadAllPmspaTasks` with the `{ shown, all }` input; then the twin |
| web | `web/features/integrations/components/pmspa-created-stamp.tsx` | C | tests, T3 | Stub `PmspaCreatedStamp({ type, id, timeZone })`; then the twin |
| web | `web/features/integrations/components/pmspa-projects-tab.tsx` | M | tests, T3 | Stub: the `{ shown, all }` call so typecheck passes; then the twin |
| web | `web/proto/features/integrations/types.ts` | M | T3 | `PmspaLinkDto = S["PmspaLinkDto"]` |
| web | `web/proto/features/integrations/proposed-types.ts` | D | T3 | `rm` |
| web | `web/features/integrations/types.ts`, `web/features/integrations/components/pmspa-record-note.tsx`, `web/features/integrations/components/sync-preview-dialog.tsx`, `web/features/projects/components/project-detail.tsx`, `web/features/tasks/components/task-detail.tsx`, `web/features/tasks/components/tasks-list.tsx` | M | T3 | The twins (D9) |

## Interfaces

### Preview warnings and created dates (T1)
`importTimeRows`, right after the `offStep` warning (D1; `plural` and `isQuarterHours` are already there):
```ts
const outOfRange = e.logs.filter(
  (l) => isQuarterHours(l.duration) && (l.duration < 0.25 || l.duration > 24)
);
if (outOfRange.length)
  warnings.push(
    `${plural(outOfRange.length, "log")} of ${outOfRange.map((l) => `${l.duration} h`).join(", ")} isn't between 0.25 h and 24 h and will fail.`
  );
const tooLong = e.logs.filter(
  (l) =>
    isQuarterHours(l.duration) && l.duration >= 0.25 && l.duration <= 24 &&
    l.title.trim().length > 1000
);
if (tooLong.length)
  warnings.push(`${plural(tooLong.length, "log")} with a text over 1000 characters will fail.`);
```
```ts
// dto/pmspa-links.dto.ts (written in the test step). PmspaLinkDto gains, last:
/** ISO 8601 UTC: when PMSPA created the linked record, from its ObjectId (OQ-207). */
pmspaCreatedAt: string;

// pmspa-links.service.ts
/** OQ-207: a PMSPA ObjectId's first 4 bytes are its creation time in seconds. */
export function pmspaCreatedAt(pmspaId: string): string {
  return new Date(parseInt(pmspaId.slice(0, 8), 16) * 1000).toISOString();
}
// list(): each item gains `pmspaCreatedAt: pmspaCreatedAt(row.pmspaId)`.
```

### A token per connection (T2)
```ts
// pmspa-store.ts
/** Whose cached token or account it is: the connection's URL and email when it was cached (OQ-208). */
export interface PmspaOwner { url: string; email: string }
/** Null when missing, not decryptable (deleted, as today), not `{ url, email, token }` JSON, or `owner` differs. */
async getToken(userId: string, owner: PmspaOwner): Promise<string | null>;
/** Encrypts `JSON.stringify({ url, email, token })`; same key and TTL as today. */
async setToken(userId: string, token: string, owner: PmspaOwner): Promise<void>;
/** Null when missing, not `{ url, email, account }` JSON, or `owner` differs. */
async getAccount(userId: string, owner: PmspaOwner): Promise<PmspaAccountDto | null>;
/** Stores `JSON.stringify({ url, email, account })`; no expiry, as today. */
async setAccount(userId: string, account: PmspaAccountDto, owner: PmspaOwner): Promise<void>;
```
`owner` matches when `url` and `email` are equal strings. A mismatch returns null and deletes nothing (the reader may be
the stale one).

```ts
// pmspa-connection.repository.ts
/** `setStatus` (status, `last_checked_at = now()`) only while the row still has `owner`'s URL and email; true when it did. */
async setStatusFor(userId: string, owner: PmspaOwner, status: PmspaStatus): Promise<boolean>;
// UPDATE … WHERE user_id = $1 AND url = $2 AND email = $3, `.returning({ userId })`, `rows.length > 0`.
```

`PmspaClient.request` (D4, D5), changes only:
1. `owner = { url: row.url, email: row.email }` from the row it reads once. `let stale = false`.
2. Its `setStatus(next)`: when `status !== next`, `stale = !(await this.repo.setStatusFor(userId, owner, next))`, then
   `status = next`.
3. `invalid()`: `await setStatus("invalid-credentials")`; `if (!stale) await this.store.clear(userId)`; throw
   `pmspaProblems.invalidCredentials()`.
4. `login()`, after `check.status === "connected"`: when `row.pmspaUserId !== null && check.account.id !== row.pmspaUserId`
   → `return invalid()` (D5, nothing cached). Else, when `(await this.repo.find(userId))` still has `owner`'s URL and email (OQ-221), `setToken(userId, check.token, owner)`, `setAccount(userId, check.account, owner)`; otherwise neither. It returns `check.token` either way.
5. `getToken(userId, owner)`.

`PmspaConnectionService`: `save` caches with `{ url: dto.url, email: dto.email }`; `test` with the row's; `toDto` reads
`getAccount(userId, { url: row.url, email: row.email })`. Their `repo.setStatus` calls and `store.clear` stay as they are.

### Web (T3)
- After the test step, `schema.d.ts` has `PmspaLinkDto.pmspaCreatedAt`.
- In `web/proto/features/integrations/types.ts`: drop the `PmspaLinkCreatedAtDto` import; `export type PmspaLinkDto =
  S["PmspaLinkDto"];`. `rm web/proto/features/integrations/proposed-types.ts`. `npm run typecheck` passes before the copy.
- Then the twin copy (D9) of: `features/integrations/types.ts`, `features/integrations/api.ts`, and under
  `features/integrations/components/`: `pmspa-created-stamp.tsx`, `pmspa-projects-tab.tsx`, `pmspa-record-note.tsx`,
  `sync-preview-dialog.tsx`; `features/projects/components/project-detail.tsx`; `features/tasks/components/task-detail.tsx`
  and `features/tasks/components/tasks-list.tsx`. The test step's stubs are replaced whole.
- Hooks as the prototype has them: `useLoadAllPmspaTasks()` takes `{ shown: PmspaTaskListSize[]; all: PmspaTaskListSize[] }`
  (D6) and per project reads through `pmspaTasksQuery(id)` (`queryClient.fetchQuery`, the same key and `PMSPA_READ` as
  `usePmspaTasks`); `PmspaTaskListSize = { id: string; taskCount: number }`.

## Acceptance criteria
"Calls" = requests the fake PMSPA records, with a cached token (no login).

| AC | Case → expected | Test | Task |
| --- | --- | --- | --- |
| AC-1 | Import preview with `dates` of a day with one event whose logs are 0.3 h, 0 h, 25 h, 1 h with a 1001-character text, and 1.5 h "Fixed." → the event row's `warnings` start with, in order: "1 log of 0.3 h isn't in 0.25 h steps and will fail.", "2 logs of 0 h, 25 h isn't between 0.25 h and 24 h and will fail.", "1 log with a text over 1000 characters will fail."; an event with a 1 h log with an empty text (event titled) → none of these | `api/test/pmspa-followups.ac.e2e-spec.ts` | T1 |
| AC-2 | API-INT-012 `type=project`, `task` and `time-log` with links whose `pmspa_id` is `651fffb0…` → each item `pmspaCreatedAt: "2023-10-06T12:38:08.000Z"`; no PMSPA call | `api/test/pmspa-followups.ac.e2e-spec.ts` | T1 |
| AC-3 | Connected as account X with links; PMSPA now answers account Y for the saved email and the token expired → API-INT-005 → 409 `pmspa-invalid-credentials`; API-INT-001 `status: "invalid-credentials"`, `account: null`; no token or account in Redis; the links stay | `api/test/pmspa-followups.ac.e2e-spec.ts` | T2 |
| AC-4 | `PmspaStore` (fake Redis): a token and account set for `{url: A, email: a}` → read back with it; null with `{A, b}` and `{B, a}`, and the key still exists; a value in the old form (an encrypted bare token, account JSON without `url`) → null | `api/src/integrations/pmspa/pmspa-client.ac.spec.ts` | T2 |
| AC-5 | `PmspaClient.request` (fakes), row `{url: A, email: a, status: "unreachable", pmspaUserId: X}`, no cached token: login + who-am-I X + the call succeed → `setToken`/`setAccount` with owner `{A, a}`, `setStatusFor(user, {A, a}, "connected")`. `setStatusFor` answering false on a 422 login → throws 409 `pmspa-invalid-credentials`, `store.clear` not called. Who-am-I answers Y → 409 `pmspa-invalid-credentials`, `setStatusFor(…, "invalid-credentials")`, `store.clear` called, no `setToken`. Row `pmspaUserId: null`, who-am-I Y → the call goes on | `api/src/integrations/pmspa/pmspa-client.ac.spec.ts` | T2 |
| AC-6 | `useLoadAllPmspaTasks().mutate` with `all` p1 60, p2 100, p3 40 tasks: `shown` [p1] → one `GET …/projects/{id}/tasks` for p1, no `GET …/pmspa/tasks`, `tasks("p1")` filled; `shown` [p1, p2] (2 + 2 = 4 = ⌈200/50⌉, a tie) → one `GET …/pmspa/tasks`, `tasks("p3")` filled too; `shown` [p1, p2] with p1 cached and fresh → one per-project read for p2; every shown list fresh → no request; a project with 0 tasks counts 1 | `web/features/integrations/followups.ac.test.tsx` | T3 |
| AC-7 | `PmspaProjectsTab`, an opened row whose task read fails with 503 `pmspa-rate-limited` (`retryAfterSeconds` 600) → the row reads "PMSPA is busy. Try again in 10 minutes." and **Retry**; a 500 → "Couldn't read the tasks." and **Retry** | `web/features/integrations/followups.ac.test.tsx` | T3 |
| AC-8 | feat-int-web's AC-8 as updated in the test step: a commit rejected with 409 `pmspa-sync-running` → "Another import, sync or push is still running." without "Some records may have been written"; with 502 `pmspa-unreachable` → "PMSPA couldn't be reached. Some records may have been written: open the preview again to see where things stand." | `web/features/integrations/components/sync-preview-dialog.ac.test.tsx` | T3 |
| AC-9 | Links answering `pmspaCreatedAt` "2023-10-06T12:38:08.000Z", user time zone Europe/Zagreb: `PmspaCreatedStamp` of a linked task → "Created in PMSPA 6 October 2023, 14:38"; unlinked, or no connection → nothing. `TasksList` with a saved connection → a **Created in PMSPA** column, "6 Oct 2023" on the linked task, "—" on the other; not configured → no such column. `PmspaRecordNote` of the linked task → "…, Upcoming, created in PMSPA on 6 October 2023, 14:38" | `web/features/integrations/followups.ac.test.tsx` | T3 |
| AC-10 | No `proposed-types.ts`; nothing imports it; `pm4 twins` reports no failure; feat-int-budget's AC-13 as updated passes; the build passes | `check` | T3 |
| AC-11 | Locally against the API and the owner's PMSPA: a search leaving one project, then **Expand all** → one per-project read; created-in-PMSPA dates on a linked project, task and log; an import preview of a day with a 0 h log warns | `manual` | T3 |

Typed stubs (created with the tests, so lint and typecheck pass while the tests fail; `throw new Error("not implemented (feat-int-followups)")`):
- api: `PmspaLinkDto.pmspaCreatedAt`; `pmspaCreatedAt()` (the stub throws) used in `list`; `PmspaOwner` and the `owner`
  parameter on `getToken`, `setToken`, `getAccount`, `setAccount` (bodies unchanged, `owner` unused), every caller passing
  it as in *A token per connection*; `setStatusFor` (throws). Then `npm run openapi:export` and, in `web/`, `npm run api:types`.
- web: `useLoadAllPmspaTasks()` typed with the `{ shown, all }` input (throws in `mutationFn`), the production
  `pmspa-projects-tab.tsx` passing `{ shown: expandable, all: query.data ?? [] }`; `PmspaCreatedStamp({ type, id, timeZone })`.

## Checks
```bash
# AC-10: types switched, twins equal
test ! -e web/proto/features/integrations/proposed-types.ts
! grep -rn "proposed-types" web/proto web/features
node scripts/pm4.mjs twins
```

## Tasks
| # | Task | App | Size | Tier | Why this tier | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | Preview warnings (D1) and `pmspaCreatedAt` on the link list (D2) | api | S | haiku | Both spelled out as code under *Preview warnings and created dates* | — |
| T2 | A token per connection: store owner, `setStatusFor`, `request`'s stale and account checks, the connection service callers | api | S | sonnet | Tokens and a race between overlapping requests (task-routing: auth, tokens, concurrency) | T1 |
| T3 | Type switch in the prototype, then the twins: Expand all, task list error line, commit failure line, created-in-PMSPA stamp, column and popover | web | S | haiku | Twin copy (D9); the switch is listed line by line | T2 |

## Open questions
None.

## Changelog
- 2026-10-18: Initial draft (prototype `b3d9093`; OQ-197, OQ-198, OQ-199, OQ-206, OQ-207, OQ-208, OQ-209). OQ-208
  widened by the owner to the cached account and the status writes. Ready for review.
- 2026-10-18: Approved by the owner.
