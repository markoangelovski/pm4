---
id: feat-int-sync-api
title: "PMSPA sync API: links, browsing, import and two-way sync of projects and tasks"
status: approved
owner: Marko Angelovski
last_updated: 2026-10-17
milestone: M6
requirements: [FR-INT-007, FR-INT-008, FR-INT-009, FR-INT-010, FR-INT-011, FR-INT-012, API-INT-005, API-INT-006, API-INT-008, API-INT-009, API-INT-012, API-INT-013, API-INT-014, API-INT-015, API-INT-016]
related: [req-integrations, api-endpoints, api-data-model, feat-int-conn-api, feat-int-time-api, feat-int-web, OQ-157, OQ-159, OQ-164, OQ-170, OQ-172, OQ-173, OQ-174, OQ-176, OQ-181, OQ-189]
prototype: eefe787
---

# PMSPA sync API: links, browsing, import and two-way sync of projects and tasks

## Goal
The API lists the connected account's PMSPA projects and tasks with their links, previews and runs an import of them,
previews and runs a two-way sync of a PM4 project or task (compare, Link only / Overwrite PMSPA / Overwrite PM4, create,
link to existing), lists and removes links, and reads a linked record's PMSPA counterpart.
Contract: [endpoints.md → Shared PMSPA shapes](../03-api/endpoints.md#shared-pmspa-shapes), API-INT-005/006/008/009/012…016.
Rules: FR-INT-008…012 and *Entity mapping* in [integrations.md](../01-requirements/integrations.md). The prototype's engine
(`web/proto/mock/pmspa.ts`: `importPreview`, `pushPreview` for project/task targets, `syncPair`, `runImport`, `runPush`) is the
reference for every row; this spec states where production differs.

## Decisions
| # | Decision | Source |
| --- | --- | --- |
| D1 | Fingerprint = the first 8 bytes of SHA-256 over `JSON.stringify` of the side's shared-field tuple (*Fields*). A link's hashes are set to both sides' current tuples whenever the pair is written or newly linked. | OQ-176 (owner) |
| D2 | A commit recomputes the preview (the same reads), then applies the choices row by row in preview order (parents come first). A child whose parent has no counterpart after its row fails with the prototype's reason. | Prototype `runImport` / `runPush` |
| D3 | **Link only** on an already linked row writes nothing and leaves the link as it was (outcome `skipped`, "Link only: both kept as they are"). A new link with Link only is created (outcome `linked`). | OQ-174 (owner); the prototype marked it synced |
| D4 | Import, sync and push take a per-user Redis lock `pmspa:lock:<userId>` (`SET NX PX 300000`), released in `finally`; held → `409 pmspa-sync-running`. | Agent: a double click must not create two PMSPA records |
| D5 | PM4 records are written through `ProjectsService` and `TasksService` (`create`, `update`), so lead, `updated_at` and the logs' project invariant hold. | Agent |
| D6 | Overwrite PM4 keeps the PM4 lead when its name already equals PMSPA's `pl` (a user lead isn't turned into a text lead). | Agent |
| D7 | Due dates: PM4 → PMSPA as the epoch ms of 12:00 UTC that day (a digit string); PMSPA → PM4 as the date of that instant in the user's time zone. | Agent: PMSPA's server zone is unknown; noon survives any offset |
| D8 | A PMSPA `kanboard` that isn't an `http(s)` URL of at most 500 characters counts as no value (compared, hashed and imported as null). | Agent: PM4's external link rule (OQ-079) |
| D9 | Before writing to a PMSPA project or task, the commit has read it through an owner-scoped call (`projects.getOne`, `tasks.getOne`) or listed it from the account; a task is only created in such a project. | Design principle 10 (PMSPA doesn't check ownership) |
| D10 | A PMSPA write rejected with 4xx/5xx → that row `failed`, reason `PMSPA rejected it: <body.message> (<body.error>)` (or the status when there's no body). Unreachable and rate limited abort the commit with their problem; rows already written stay written and the links say so. | Design principle 9 |
| D11 | Overwrite PMSPA sends only non-empty values (PMSPA ignores empty ones); a differing field PM4 has empty and PMSPA hasn't gets the row warning "PMSPA can't clear the <Field>: it keeps its value." | OQ-181 (owner) |

## Scope
**In:** the PMSPA projects/tasks client, the field mapping and fingerprints, the link repository and API-INT-012…014 (project and
task), browsing API-INT-005/006, import of projects and tasks (API-INT-008/009 without `dates`), sync API-INT-015/016, the lock,
the OpenAPI export.

**Before the tests are written:** feat-int-conn-api is done.

**Non-goals** (implementers must not touch these):
- Anything in `web/`. Days, events, logs, `dates` on import, the push endpoints, API-INT-007, the `time-log` case of API-INT-014 (feat-int-time-api).
- The connection endpoints and `PmspaClient`'s behavior (feat-int-conn-api), except `PmspaStore`'s lock methods and the connection repository's `setLastSyncAt`.
- `projects/*`, `tasks/*` other than injecting their exported services. The link tables' schema (it exists).
- `api/test/*` files written in the test step.

## Read first
| Path | Why / copy this |
| --- | --- |
| `specs/03-api/endpoints.md#shared-pmspa-shapes`, *PMSPA errors*, API-INT-005/006/008/009/012…016 | Contract |
| `specs/01-requirements/integrations.md` FR-INT-008, FR-INT-010…012, *Entity mapping* | The rules |
| `web/proto/mock/pmspa.ts` | The reference engine: `pairAction`, `createAction`, `projectDiff`, `taskDiff`, candidates, `importPreview`, `pushPreview` (project and task targets), `syncPair`, `overwrite`, `createPair`, every user-visible string |
| `web/proto/features/integrations/proposed-types.ts` | The DTO shapes (with doc comments) |
| `api/src/integrations/pmspa/` (from feat-int-conn-api) | `PmspaClient.request`, `pmspaProblems`, `PmspaStore`, module wiring |
| `api/src/projects/projects.service.ts`, `api/src/tasks/tasks.service.ts`, `api/src/projects/projects.repository.ts` | D5; the lead join to copy for the PM4 lists |
| `api/src/time/time-logs.service.ts` (`todayIn`) | Dates in the user's zone (D7) |
| `docs-pmspa/connector/01-discovery/modules/projects.yaml`, `docs-pmspa/connector/01-discovery/modules/tasks.yaml` (local, git-ignored, in the main checkout) | Request and response bodies of `projects.list/getOne/create/update`, `tasks.list/listByProject/getOne/create/update` |
| `api/test/support/fake-pmspa.ts` (from feat-int-conn-api) | The fake PMSPA the e2e tests use (extended in the test step) |

## Files
| App | File | C/M | Task | Notes |
| --- | --- | --- | --- | --- |
| api | `api/test/pmspa-sync.ac.e2e-spec.ts` | C | tests | Browse, links, import, sync |
| api | `api/test/support/fake-pmspa.ts` | M | tests | Projects and tasks in the fake |
| api | `api/src/integrations/pmspa/pmspa-fields.ac.spec.ts` | C | tests | The pure mapping |
| api | `api/src/integrations/pmspa/pmspa-fields.ts` | C/M | tests, T1 | Typed stubs in the test step, implemented in T1 |
| api | `api/src/integrations/pmspa/pmspa-remote.ts`, `api/src/integrations/pmspa/pmspa-remote.spec.ts` | C | T1 | Hand-written |
| api | `api/src/integrations/pmspa/pmspa-writes.ts`, `api/src/integrations/pmspa/pmspa-writes.spec.ts` | C | T1 | Hand-written |
| api | `api/src/integrations/pmspa/pmspa-preview.ts`, `api/src/integrations/pmspa/pmspa-preview.spec.ts` | C | T3 | Hand-written |
| api | `api/src/integrations/pmspa/pmspa-links.repository.ts`, `api/src/integrations/pmspa/pmspa-links.repository.spec.ts`, `api/src/integrations/pmspa/pmspa-sync.repository.ts`, `api/src/integrations/pmspa/pmspa-sync.repository.spec.ts` | C | T2 | Hand-written |
| api | `api/src/integrations/pmspa/pmspa-browse.controller.ts`, `api/src/integrations/pmspa/pmspa-browse.controller.spec.ts`, `api/src/integrations/pmspa/pmspa-links.controller.ts`, `api/src/integrations/pmspa/pmspa-links.controller.spec.ts`, `api/src/integrations/pmspa/pmspa-links.service.ts`, `api/src/integrations/pmspa/pmspa-links.service.spec.ts` | C | T2 | `npx nest g controller integrations/pmspa/pmspa-browse --flat`, the same for `pmspa-links` (controller and service) |
| api | `api/src/integrations/pmspa/dto/pmspa-browse.dto.ts`, `api/src/integrations/pmspa/dto/pmspa-links.dto.ts` | C | T2 | Hand-written |
| api | `api/src/integrations/pmspa/pmspa-sync.service.ts`, `api/src/integrations/pmspa/pmspa-sync.service.spec.ts`, `api/src/integrations/pmspa/pmspa-sync.controller.ts`, `api/src/integrations/pmspa/pmspa-sync.controller.spec.ts` | C/M | T4, T5 | T4: `npx nest g service integrations/pmspa/pmspa-sync --flat`, `npx nest g controller integrations/pmspa/pmspa-sync --flat`, the previews; T5: the commits |
| api | `api/src/integrations/pmspa/dto/sync.dto.ts` | C | T4 | Hand-written |
| api | `api/src/integrations/pmspa/pmspa-store.ts`, `api/src/integrations/pmspa/pmspa-store.spec.ts` | M | T5 | `lock`, `unlock` (D4) |
| api | `api/src/integrations/pmspa/pmspa-connection.repository.ts`, `api/src/integrations/pmspa/pmspa-connection.repository.spec.ts` | M | T5 | `setLastSyncAt` only |
| api | `api/src/integrations/pmspa/pmspa.module.ts` | M | T2, T4 | Controllers, providers; T4 imports `ProjectsModule`, `TasksModule` |
| api | `api/openapi.json` | M | T2, T4, T5 | `npm run openapi:export` |

## Interfaces

### Fields (T1)
```ts
// api/src/integrations/pmspa/pmspa-fields.ts: pure functions, no I/O
export type PmspaColumn = "Upcoming" | "In Progress" | "Completed";
export interface RemoteProject { id: string; userId: string; title: string; description: string | null; pl: string | null;
  kanboard: string | null; done: boolean; taskCount: number }
export interface RemoteTask { id: string; projectId: string; title: string; description: string | null; column: PmspaColumn;
  pl: string | null; kanboard: string | null; dueAt: number }   // epoch ms
export interface Pm4Project { id: string; title: string; description: string | null; externalLink: string | null; leadName: string | null }
export interface Pm4Task extends Pm4Project { projectId: string; status: TaskStatus; dueDate: string | null }
export interface SyncFieldDiff { field: string; pm4: string | null; pmspa: string | null }   // dto/sync.dto.ts's SyncFieldDiffDto implements it
export const COLUMN: Record<TaskStatus, PmspaColumn>;  export const STATUS: Record<PmspaColumn, TaskStatus>;
export function cut(s: string, max: number): string;            // over max → first max-1 chars + "…"
export function val(s: string | null | undefined): string | null; // trimmed-empty → null, else s
export function linkVal(s: string | null | undefined): string | null; // D8
export function dueDateOf(dueAt: number, timeZone: string): string;    // D7, "YYYY-MM-DD"
export function dueAtOf(date: string): string;                          // D7, epoch ms digits
export function formatDate(date: string): string;                       // "2026-10-18" → "18 Oct 2026" (English month abbreviations)
export function projectDiff(p: Pm4Project, r: RemoteProject): SyncFieldDiff[];
export function taskDiff(t: Pm4Task, r: RemoteTask, timeZone: string): SyncFieldDiff[];
// Exactly the prototype's projectDiff / taskDiff: fields "Title", "Description", "Lead", "External link" (+ "Status" after Description and
// "Due date" last, for tasks); PM4 text as PMSPA would store it (cut 150 / 350); val() on both sides; linkVal on links; status as COLUMN;
// due date only when the PM4 task has one, both sides as formatDate.
export function projectTuple(side: Pm4Project | RemoteProject): (string | null)[];   // [title, description, lead, link] as projectDiff compares them
export function taskTuple(side: Pm4Task | RemoteTask, timeZone: string): (string | null)[];  // + column, due date (PM4 none → null)
export function fingerprint(tuple: (string | null)[]): Buffer;          // D1
export function clearWarnings(diffs: SyncFieldDiff[]): string[];        // D11: a Description / Lead / External link diff with pm4 null and pmspa set
```

### PMSPA projects and tasks (T1)
```ts
// api/src/integrations/pmspa/pmspa-remote.ts: one method per PMSPA call, over PmspaClient.request(userId, …)
export class PmspaWriteError extends Error {}   // message = D10's reason
@Injectable() export class PmspaRemote {
  listProjects(userId): Promise<RemoteProject[]>;      // GET /v1/projects?skip=&limit=50&sort=title, every page; 404 → []
  getProject(userId, id): Promise<RemoteProject | null>;   // GET /v1/projects/{id}; 404 → null
  createProject(userId, f: PmspaProjectWrite): Promise<RemoteProject>;   // POST /v1/projects
  updateProject(userId, id, f: PmspaProjectWrite): Promise<void>;        // PATCH /v1/projects/{id} [{propName, propValue}], non-empty values only
  listTasks(userId, projectId): Promise<RemoteTask[]>; // GET /v1/tasks?project=&skip=&limit=50, every page; 404 → []
  listAllTasks(userId): Promise<RemoteTask[]>;         // GET /v1/tasks?skip=&limit=50, every page; 404 → []
  getTask(userId, id): Promise<RemoteTask | null>;     // GET /v1/tasks?task={id}; 404 → null
  createTask(userId, f: PmspaTaskWrite & { project: string }): Promise<RemoteTask>;  // POST /v1/tasks
  updateTask(userId, id, f: PmspaTaskWrite & { project?: string }): Promise<void>;   // PATCH /v1/tasks/{id} [{propName, propValue}]
}
export interface PmspaProjectWrite { title: string; description: string | null; pl: string | null; kanboard: string | null }
export interface PmspaTaskWrite extends PmspaProjectWrite { column: PmspaColumn; done: boolean; dueAt: string | null }
```
Reads: a status other than 2xx and 404 → `pmspaProblems.error()`. Writes: non-2xx (PMSPA answers 201 to some updates) → `PmspaWriteError`.
Writes send strings only (`done` as `"true"`/`"false"`), null fields left out. `taskCount` = `openTasksCount + closedTasksCount`.
Response bodies (from the yaml; no need to read it otherwise): lists `{ projects: [...] }` / `{ tasks: [...] }` with `stats.remaining`
(another page while `remaining > 0`); one record `{ project }` / `{ task }`; `GET /v1/tasks?task=` answers `{ task }`. Project fields:
`_id` → `id`, `owner` → `userId`, `title`, `description`, `pl`, `kanboard`, `done`, `openTasksCount`, `closedTasksCount` (absent text
fields → null). Task fields: `_id`, `project` → `projectId`, `title`, `description`, `column`, `pl`, `kanboard`, `dueDate` → `dueAt`.

### Writes (T1)
```ts
// api/src/integrations/pmspa/pmspa-writes.ts: pure, *Entity mapping* in both directions. Port of the prototype's
// pmspaProjectFields, pm4ProjectFields, pmspaTaskFields, pm4TaskFields (D6…D8, D11)
export function toPmspaProject(p: Pm4Project): PmspaProjectWrite;
//   title cut(150); description val → cut(350); pl = val(leadName); kanboard = linkVal(externalLink)
export function toPmspaTask(t: Pm4Task): PmspaTaskWrite;
//   the project fields + column COLUMN[status], done = status === "completed", dueAt = dueDate ? dueAtOf(dueDate) : null
export interface Pm4ProjectWrite { title: string; description: string | null; externalLink: string | null;
  projectLeadName?: string | null; projectLeadUserId?: null }     // structurally a CreateProjectDto / UpdateProjectDto
export interface Pm4TaskWrite extends Pm4ProjectWrite { status: TaskStatus; dueDate: string; projectId: string }  // Create/UpdateTaskDto
export function toPm4Project(r: RemoteProject, current: Pm4Project | null): Pm4ProjectWrite;
//   title = r.title; description = val(r.description); externalLink = linkVal(r.kanboard);
//   lead: current?.leadName === val(r.pl) → both lead keys left out (D6); else projectLeadName = val(r.pl) cut(100), projectLeadUserId null
export function toPm4Task(r: RemoteTask, current: Pm4Task | null, pm4ProjectId: string, timeZone: string): Pm4TaskWrite;
//   the project fields + status STATUS[r.column], dueDate = dueDateOf(r.dueAt, timeZone), projectId = pm4ProjectId
```

### Links (T2)
```ts
// pmspa-links.repository.ts: the three link tables behind one interface
export interface LinkRow { type: PmspaLinkType; pm4Id: string; pmspaId: string; pmspaUserId: string; origin: PmspaLinkOrigin;
  syncedAt: Date; pm4Hash: Buffer; pmspaHash: Buffer }
active(userId, pmspaUserId, type): Promise<LinkRow[]>;
byPm4(userId, type, pm4Id): Promise<LinkRow | null>;                     // any account
byPmspa(userId, pmspaUserId, type, pmspaId): Promise<LinkRow | null>;
/** Insert, or update the row of this PM4 id; first deletes another row with the same (user, account, pmspaId). Keeps an existing origin. */
save(userId, row: Omit<LinkRow, "syncedAt"> & { syncedAt: Date }): Promise<void>;
delete(userId, type, pm4Id): Promise<boolean>;
// pmspa-sync.repository.ts: PM4 records as the mapping needs them (lead name = the lead user's display_name, else project_lead)
pm4Projects(userId): Promise<Pm4Project[]>;   pm4Project(userId, id): Promise<Pm4Project | null>;
pm4Tasks(userId, projectId?: string): Promise<Pm4Task[]>;   pm4Task(userId, id): Promise<Pm4Task | null>;
titles(userId, type: "project" | "task", ids: string[]): Promise<Map<string, string>>;
```
`pmspa-links.service.ts`: `list(userId, type)` (API-INT-012: no connection or no `pmspa_user_id` → `[]`), `unlink(userId, type, id)`
(API-INT-013: none → 404 "Link not found."), `detail(userId, type, id)` (API-INT-014: `time-log` → 404 until feat-int-time-api; project →
`getProject` → `{type, title, lead: pl ?? "", done}`; task → `getTask`, then its project's title → `{type, title, projectTitle, column}`;
missing in PMSPA → `pmspa: null`; no active link → 404). Controllers: `@Controller("integrations/pmspa")` with `links`, `links/:type/:id`,
`projects`, `projects/:id/tasks` (an id not 24-hex → 400; not in `listProjects` → 404 "PMSPA project not found.").

### Preview rows (T3)
```ts
// api/src/integrations/pmspa/pmspa-preview.ts: pure, no I/O. Port of the prototype's row(), createAction, pairAction, leadDetail,
// sortByMatch, the four *Candidates functions, importPreview (projects and tasks only, no `dates`), pushPreview (project and task
// targets only) and choiceFor, with the prototype's mock state replaced by the snapshot. Every user-visible string as in the prototype.
export interface SyncSnapshot {
  timeZone: string;
  pm4Projects: Pm4Project[]; pm4Tasks: Pm4Task[];   // all the user's
  remoteProjects: RemoteProject[];                  // listProjects
  remoteTasks: RemoteTask[];                        // import: listTasks of each selected project that exists; sync: listAllTasks
  links: LinkRow[];                                 // active project and task links of the connection's account
}
export function importRows(s: SyncSnapshot, sel: PmspaImportSelectionDto): SyncPreviewItemDto[];
export function syncRows(s: SyncSnapshot, target: PmspaSyncTargetDto): SyncPreviewItemDto[] | null;  // null: target not in pm4Projects / pm4Tasks
export function choiceFor(choices: SyncChoiceDto[], item: SyncPreviewItemDto): SyncChoiceDto;
```
- Keys: `project:<id>` / `task:<id>`, the id of the side the row starts from (PMSPA on import, PM4 on sync).
- **Linked** = a link in `s.links` whose other side is in the snapshot. A link whose other side is missing counts as no link: the row is
  `create`, `linkedId` null, with candidates. `linkedId` = the other side's id (PM4 on import, PMSPA on sync).
- `pairAction` takes the link and the pair: `pm4Changed` = `!fingerprint(projectTuple(pm4)).equals(link.pm4Hash)` (`taskTuple` for tasks),
  `pmspaChanged` likewise with the remote record and `pmspaHash`; then the prototype's rule.
- Candidates exclude records that have a link in `s.links`. PMSPA task candidates come from `s.remoteTasks`, `groupId` the PMSPA project.
- Sync warnings: the prototype's title / description length warnings, plus `clearWarnings(differences)` on `differs` rows.
- `choiceFor`: the prototype's (a `differs` row with `linkedId` defaults to `link` with its `direction`; anything else to `create`).

### Previews and DTOs (T4)
```ts
// dto/sync.dto.ts: the Shared PMSPA shapes as classes, copied from proposed-types.ts (SyncFieldDiffDto, SyncCandidateDto,
// SyncPreviewItemDto, SyncPreviewDto, SyncResultItemDto, SyncResultDto) with @ApiProperty; validation as in save-pmspa-connection.dto.ts
export class SyncChoiceDto {             // one class: kind @IsIn(["create", "link", "skip"]) with @ApiProperty({ enum })
  key: string;                           // @IsString, ≤ 100
  kind: "create" | "link" | "skip";
  id?: string;                           // @ValidateIf(kind === "link") @IsString, ≤ 36
  overwrite?: SyncDirection | null;      // @ValidateIf(kind === "link") @IsOptional @IsIn(["to-pmspa", "to-pm4"])
}
export class PmspaImportSelectionDto { projects: { id: string; taskIds: string[] | null }[] }   // ≤ 50 projects, 24-hex ids (@Matches)
export class PmspaImportDto { selection: PmspaImportSelectionDto; choices: SyncChoiceDto[] }    // ≤ 500 choices
export class PmspaSyncTargetDto { type: "project" | "task"; id: string }                        // @IsIn, @IsUUID
export class PmspaSyncDto { target: PmspaSyncTargetDto; choices: SyncChoiceDto[] }              // ≤ 500 choices
// pmspa-sync.service.ts (T4 part)
async load(userId, sel: PmspaImportSelectionDto | null): Promise<SyncSnapshot>;
//   remote.listProjects first (no connection → its 409); timeZone = the user's time_zone (as time-logs.service.ts reads the user);
//   pmspaUserId from PmspaConnectionRepository.find; links = active(project) + active(task) (null account → []);
//   pm4 lists from PmspaSyncRepository; remoteTasks = sel ? listTasks for each selected id found in remoteProjects : listAllTasks
importPreview(userId, sel): Promise<SyncPreviewDto>   // { items: importRows(await load(userId, sel), sel) }
syncPreview(userId, target): Promise<SyncPreviewDto>  // syncRows(await load(userId, null), target); null → 404 "Project not found." / "Task not found."
// pmspa-sync.controller.ts: @Controller("integrations/pmspa"), POST import/preview and sync/preview, @HttpCode(200),
// @ApiProblemResponses(400, 401, 404, 409, 502, 503), copying pmspa-connection.controller.ts
```

### Commits (T5)
```ts
// pmspa-store.ts
async lock(userId): Promise<boolean>;     // SET pmspa:lock:<userId> 1 NX PX 300000 → true when set (D4)
async unlock(userId): Promise<void>;      // DEL
// pmspa-connection.repository.ts
async setLastSyncAt(userId, at: Date): Promise<void>;
// pmspa-sync.service.ts (T5 part)
importRun(userId, dto: PmspaImportDto): Promise<SyncResultDto>;
syncRun(userId, dto: PmspaSyncDto): Promise<SyncResultDto>;
// pmspa-sync.controller.ts: POST import and sync, @HttpCode(200), same decorators
```
The commit, step by step (`from` = `"pmspa"` on import, `"pm4"` on sync):
1. `store.lock(userId)`; false → `pmspaProblems.syncRunning()` (409). Everything below runs in `try … finally { store.unlock }`.
2. `now = new Date()`. Load the snapshot and build the rows exactly as the preview does (`importRows` / `syncRows`; sync: null → 404).
3. For each row in order: `choice = choiceFor(dto.choices, row)`. `choice.kind === "skip"` or `row.action === "skip"` → `skipped` with
   `row.reason ?? "Left out"`. Otherwise `syncPair` (below) and push its result item. Keep a local map of the links written in this run, so a
   child row finds the counterpart its parent row just got.
4. `syncPair` (the prototype's, per row): `id` = the key's id; `other` = the linked id (`row.linkedId`), else for a `link` choice
   `choice.id`, which must be one of `row.candidates[].id` (else `failed` "The chosen record can't be linked."), else none → create.
   - **create**, from PM4: project → `remote.createProject(toPmspaProject(p))`; task → its project's PMSPA id from the links (none →
     `failed` "Its project isn't in PMSPA (it was left out)."), `remote.createTask({ ...toPmspaTask(t), project })`. Origin `pushed`.
   - **create**, from PMSPA: project → `projectsService.create(userId, toPm4Project(r, null))`; task → its project's PM4 id from the links
     (none → `failed` "Its project wasn't imported."), `tasksService.create(userId, toPm4Task(r, null, pm4ProjectId, tz))`. Origin `imported`.
   - **pair** (`other` set): `direction = choice.kind === "link" ? choice.overwrite : null`. `to-pmspa` → `updateProject` / `updateTask`
     with `toPmspaProject` / `toPmspaTask` (+ `project` = the task's project's PMSPA id when known); `to-pm4` → `projectsService.update` /
     `tasksService.update` with `toPm4Project` / `toPm4Task` (task: its PMSPA project's PM4 id, none → `failed` "Its project wasn't imported.").
     Before writing to a PMSPA record that came from a `link` choice, re-read it (`getProject` / `getTask`); null → `failed` "The chosen record
     can't be linked." (D9). Outcome: new link → `linked` (reason `OVERWRITTEN[direction]` or null); existing link with a direction → `updated`
     with `OVERWRITTEN[direction]`; existing link, no direction → `skipped` "Link only: both kept as they are" and **no link write** (D3).
   - After every write (and for a new link with Link only): re-read both sides (the PM4 record from `PmspaSyncRepository`, the PMSPA one with
     `getProject` / `getTask`, or the created record), `links.save` with `syncedAt = now`, `pm4Hash` / `pmspaHash` = `fingerprint` of their
     tuples, origin `pushed` / `imported` for a create, `linked` for a new pairing (`save` keeps an existing origin).
   - `newTitle`: the title of the row's own record after the write when it differs from `row.title`, else null (OQ-174).
   - `PmspaWriteError` → `failed` with its message (D10). Any other error (unreachable, rate limited, invalid credentials) propagates and
     aborts the commit; links already saved stay.
5. After the loop: `connections.setLastSyncAt(userId, now)`; return `{ items, syncedAt: now.toISOString() }`.

## Acceptance criteria
Signed in as user A (zone `Europe/Zagreb`), connected to PMSPA account X through `FakePmspa` unless stated. The fake's X projects: Anthropic
(tasks PM, "Meetings & demos" In Progress with description "Client calls and demos."), Nvidia (PM, Development), "Acme Website Relaunch"
(lead Jane Doe, `kanboard https://kanboard.example.com/project/42`), Tesla (description "QA retainer."), Archive 2025 (done). Y's project
"Other". A's PM4 projects: Anthropic (linked to X's Anthropic, imported, hashes = both current), Tesla (linked, `pmspa_hash` from before
the description), PM Internal (no link); task Anthropic › Meetings (linked to "Meetings & demos", both hashes stale).

| AC | Case → expected | Test | Task |
| --- | --- | --- | --- |
| AC-1 | `GET /integrations/pmspa/projects` → the five X projects by title, Anthropic and Tesla with `link {pm4Id, pm4Title, origin, syncedAt}`, Archive `done: true`, `taskCount` from PMSPA; never "Other" | `api/test/pmspa-sync.ac.e2e-spec.ts` | T2 |
| AC-2 | `GET …/projects/{Anthropic}/tasks` → PM and "Meetings & demos" (linked); a project with no tasks → `[]`; Y's project id → `404`; `abc` → `400`; no connection → `409 pmspa-not-connected` | `api/test/pmspa-sync.ac.e2e-spec.ts` | T2 |
| AC-3 | `GET /links?type=project` → A's two active links; after reconnecting as Y (confirmed switch) → `[]`; `type=foo` → `400` | `api/test/pmspa-sync.ac.e2e-spec.ts` | T2 |
| AC-4 | `GET /links/project/{Tesla}` → `{origin, syncedAt, pmspa: {type: "project", title: "Tesla", lead, done: false}}`; the PMSPA project deleted in the fake → `pmspa: null`; PM Internal → `404` | `api/test/pmspa-sync.ac.e2e-spec.ts` | T2 |
| AC-5 | `DELETE /links/project/{Tesla}` → `204`; both projects still exist; `GET /links?type=project` lacks it; again → `404` | `api/test/pmspa-sync.ac.e2e-spec.ts` | T2 |
| AC-6 | `POST /import/preview {projects: [{id: Acme, taskIds: null}]}` → a `create` project row (`direction "to-pm4"`, candidates with PM Internal, `detail "Lead Jane Doe"`) and five `create` task rows with `parentKey` the project's; nothing is written | `api/test/pmspa-sync.ac.e2e-spec.ts` | T4 |
| AC-7 | `POST /import` with that selection and no choices → `200`, six `created`; A has a PM4 project "Acme Website Relaunch" (description, text lead Jane Doe, external link) with five tasks, all linked `imported`; `lastSyncAt` = `syncedAt` | `api/test/pmspa-sync.ac.e2e-spec.ts` | T5 |
| AC-8 | Importing Acme again → its rows are `skip` "Same in PM4 and PMSPA"; the run creates nothing | `api/test/pmspa-sync.ac.e2e-spec.ts` | T5 |
| AC-9 | Import preview of Tesla → `differs`, `differences [{field: "Description", pm4: null, pmspa: "QA retainer."}]`, `direction "to-pm4"`; running it without choices → `updated`, PM4 Tesla's description is "QA retainer." | `api/test/pmspa-sync.ac.e2e-spec.ts` | T5 |
| AC-10 | `POST /sync/preview {type: "task", id: Meetings}` → the Anthropic project row (`skip`) and the task row `differs` with Title ("Meetings" / "Meetings & demos"), Description and Status, `direction null`; Link only by default: `POST /sync` without choices → the task row `skipped` "Link only: both kept as they are", nothing written, the link's `synced_at` unchanged | `api/test/pmspa-sync.ac.e2e-spec.ts` | T5 |
| AC-11 | The same with `{key, kind: "link", id: <PMSPA task>, overwrite: "to-pmspa"}` → `updated`, `newTitle null` (the row's PM4 title didn't change), PMSPA's task is titled "Meetings" with PM4's status; with `overwrite: "to-pm4"` instead → PM4's task is "Meetings & demos" and the result `newTitle "Meetings & demos"` | `api/test/pmspa-sync.ac.e2e-spec.ts` | T5 |
| AC-12 | After AC-11, the next preview shows the task `skip` (up to date); editing the PM4 title then gives `direction "to-pmspa"` "Changed in PM4 since the last sync" | `api/test/pmspa-sync.ac.e2e-spec.ts` | T5 |
| AC-13 | `POST /sync/preview {type: "project", id: PM Internal}` → a `create` row (`direction "to-pmspa"`) with PMSPA candidates, the closest title first; `POST /sync` with `{kind: "link", id: Acme, overwrite: null}` → `linked`, neither side changed, the link's origin `linked` | `api/test/pmspa-sync.ac.e2e-spec.ts` | T5 |
| AC-14 | Sync of a PM4 project with two unlinked tasks, one left out with `{kind: "skip"}` → the project and one task `created` in PMSPA (the task in the new project, `done` = completed), both linked `pushed`; the other `skipped` | `api/test/pmspa-sync.ac.e2e-spec.ts` | T5 |
| AC-15 | A PM4 project with an empty description linked to a PMSPA one with a description → the row warns "PMSPA can't clear the Description: it keeps its value."; Overwrite PMSPA leaves PMSPA's description | `api/test/pmspa-sync.ac.e2e-spec.ts` | T5 |
| AC-16 | A PM4 task with due date 2026-10-20 synced to a new PMSPA task → PMSPA `dueDate` = epoch ms of 2026-10-20T12:00Z; a PMSPA due date of 2026-10-19T22:00Z imports as 2026-10-20 (Zagreb) | `api/test/pmspa-sync.ac.e2e-spec.ts` | T5 |
| AC-17 | The fake rejects a task create with 500 `{error: "ERR_VALIDATION", message: "…"}` → that row `failed` "PMSPA rejected it: … (ERR_VALIDATION)", the other rows still written | `api/test/pmspa-sync.ac.e2e-spec.ts` | T5 |
| AC-18 | Two `POST /sync` at once for A → one answers `409 pmspa-sync-running`, PMSPA has one new project; a commit naming another user's project, or a random UUID → `404` | `api/test/pmspa-sync.ac.e2e-spec.ts` | T5 |
| AC-19 | Validation: `import/preview` with a non-hex id, 51 projects; `sync` with 501 choices, a choice `kind: "x"`, `target.type "day"` → `400` | `api/test/pmspa-sync.ac.e2e-spec.ts` | T5 |
| AC-20 | `projectDiff`, `taskDiff`: the prototype's cases (cut titles over 150 compare equal to PMSPA's cut text, empty text = null, due date ignored when PM4 has none, status as the column); `fingerprint` is 8 bytes and stable; `dueDateOf`/`dueAtOf` per D7; `linkVal("ftp://x")` → null; `clearWarnings` per D11 | `api/src/integrations/pmspa/pmspa-fields.ac.spec.ts` | T1 |
| AC-21 | `api/openapi.json` has the eight operations (API-INT-005/006/008/009/012…016) with `bearer`; `SyncChoiceDto` documents `kind` `create`/`link`/`skip` | `check` | T5 |

Typed stubs (created with the tests): `pmspa-fields.ts` with every export of *Fields*, each function body
`throw new Error("not implemented (feat-int-sync-api)")` and the two records filled in. The e2e test is written against *Interfaces* and runs once T5 is done (AC-6 once T4 is).

## Checks
```bash
# AC-21: the sync endpoints are in the contract and protected
node -e "
const d=require('./api/openapi.json'), b='/api/v1/integrations/pmspa';
const want=[['/projects','get'],['/projects/{id}/tasks','get'],['/import/preview','post'],['/import','post'],['/links','get'],['/links/{type}/{id}','get'],['/links/{type}/{id}','delete'],['/sync/preview','post'],['/sync','post']];
for (const [p,m] of want) { const o=d.paths[b+p]?.[m]; if(!o){console.error('missing',m,p);process.exit(1)} if(!JSON.stringify(o.security??[]).includes('bearer')){console.error('not protected',m,p);process.exit(1)} }
const c=JSON.stringify(d.components?.schemas??{}); for (const k of ['\"create\"','\"link\"','\"skip\"']) if(!c.includes(k)){console.error('SyncChoice kind missing',k);process.exit(1)}"
```

## Tasks
| # | Task | App | Size | Tier | Why this tier | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | Field mapping and fingerprints (`pmspa-fields.ts`), the PMSPA projects/tasks client (`pmspa-remote.ts`), the write mappers (`pmspa-writes.ts`) | api | M | haiku | Pure functions copied from the prototype's `projectDiff`/`taskDiff`/`*Fields`; each call is one `PmspaClient.request` with the documented body and response fields | — (feat-int-conn-api done) |
| T2 | Link and sync repositories, API-INT-005/006/012/013/014 | api | M | haiku | Repository and controllers copy `projects/`; the queries and rules are spelled out | T1 |
| T3 | Preview rows (`pmspa-preview.ts`): import and sync rows over a snapshot, pure | api | M | sonnet | A large port of the prototype's preview whose mock lookups map onto the snapshot by judgment (stale links, candidates, hashes) | T1, T2 |
| T4 | Sync DTOs, the snapshot loader, the two preview endpoints (API-INT-008, API-INT-015) | api | M | haiku | DTOs copy `proposed-types.ts` and `save-pmspa-connection.dto.ts`; controller copies `pmspa-connection.controller.ts`; `load` is spelled out | T3 |
| T5 | The commits: lock, row-by-row writes on both sides, links and hashes, `last_sync_at` (API-INT-009, API-INT-016) | api | L | sonnet | Owner ceiling (OQ-189) instead of opus: writes on two systems with partial failure and a lock, spelled out step by step in *Commits* | T4 |

## Open questions
None.

## Changelog
- 2026-10-17: Initial draft (prototype `eefe787`; OQ-157, OQ-159, OQ-164, OQ-170, OQ-172…OQ-174, OQ-176, OQ-181). Ready for review.
- 2026-10-17: Approved by the owner.
- 2026-10-17: Re-split for haiku/sonnet only (OQ-189): the engine (old T3, opus) becomes T3 preview rows (sonnet), T4 DTOs + previews (haiku), T5 commits (sonnet); `pmspa-writes.ts` added to T1; *Interfaces* gains the PMSPA response fields, the write mappers, the snapshot, `load` and the commit steps; `setLastSyncAt` added. Back to review.
- 2026-10-17: Re-split approved by the owner.
