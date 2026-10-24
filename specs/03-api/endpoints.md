---
id: api-endpoints
title: API Endpoints
status: review
owner: Marko Angelovski
last_updated: 2026-10-24
related: [api-conventions, api-data-model, req-auth, req-projects, req-tasks, req-time-logs, req-reporting, req-integrations]
---

# API Endpoints

## Purpose
The contract between `web/` and `api/`. Each endpoint has an ID, traces to requirements, and
defines its request, response and errors. Paths are relative to `/api/v1` unless marked (root).

## Endpoint template
```markdown
### API-PRJ-001: Create project
`POST /projects` · Auth: bearer · Implements: FR-PRJ-001
**Request body:** `{ title: string(1–200), description?: string(≤2000) | null, projectLead?: string(≤100) | null }`
**201:** `Project`
**Errors:** 400 validation · 401
```

## Index

| ID | Method | Path | Implements | Status |
| --- | --- | --- | --- | --- |
| API-SYS-001 | GET | `/health` (root) | NFR-003 | specified |
| API-SYS-003 | GET | `/version` → `{version}` (public, no DB/Redis) | SCR-004 | specified |
| API-AUTH-001 | GET | `/auth/google?returnTo=&timeZone=` → 302 Google | FR-AUTH-001, FR-AUTH-006 | specified |
| API-AUTH-002 | GET | `/auth/google/callback` → 302 web `/auth/callback` (or `/auth/sign-in?error=`) | FR-AUTH-001/002 | specified |
| API-AUTH-003 | POST | `/auth/token` `{code}` → tokens | FR-AUTH-001 | specified |
| API-AUTH-004 | POST | `/auth/refresh` `{refreshToken}` → tokens | FR-AUTH-003 | specified |
| API-AUTH-005 | POST | `/auth/logout` `{refreshToken}` | FR-AUTH-004 | specified |
| API-AUTH-006 | POST | `/auth/logout-all` (bearer) → revokes all of the user's sessions | FR-AUTH-007 | specified |
| API-USR-001 | GET | `/me` | FR-AUTH-006 | specified |
| API-USR-002 | PATCH | `/me` `{timeZone?, dailyTargetMinutes?}` (with the settings screen, OQ-064) | FR-AUTH-006, FR-TLOG-017 | specified |
| API-USR-003 | GET | `/users?q=` (project-lead picker, OQ-089) | FR-PRJ-006 | specified |
| API-PRJ-001 | POST | `/projects` | FR-PRJ-001 | specified |
| API-PRJ-002 | GET | `/projects?q=&sort=&page=&pageSize=` (with task counts and logged minutes) | FR-PRJ-002 | specified |
| API-PRJ-003 | GET | `/projects/{id}` | FR-PRJ-003, FR-PRJ-008 | specified |
| API-PRJ-004 | PATCH | `/projects/{id}` | FR-PRJ-004 | specified |
| API-PRJ-005 | DELETE | `/projects/{id}` (with its tasks) | FR-PRJ-005 | specified |
| API-TSK-001 | POST | `/tasks` | FR-TSK-001 | specified |
| API-TSK-002 | GET | `/tasks?projectId=&status=&q=&sort=&page=&pageSize=` | FR-TSK-002/003, picker | specified |
| API-TSK-003 | GET | `/tasks/{id}` | FR-TSK-004 | specified |
| API-TSK-004 | PATCH | `/tasks/{id}` (incl. status, projectId) | FR-TSK-005/006 | specified |
| API-TSK-005 | DELETE | `/tasks/{id}` | FR-TSK-007 | specified |
| API-WD-001 | GET | `/workdays?from=&to=` → `{items: [{workDate, startMinute, totalMinutes}]}` (the calendar's marks) | FR-TLOG-001 | specified |
| API-WD-002 | PUT | `/workdays/{date}` `{startMinute}` | FR-TLOG-009 | specified |
| API-WD-003 | GET | `/workdays/{date}` → `Day` (the start, the total and the day's logs in entry order) | FR-TLOG-001/002/003/009/015/016 | specified |
| API-WD-004 | DELETE | `/workdays/{date}` (the day's start and its logs, with their bookings) | FR-TLOG-019 | specified |
| API-TLOG-001 | GET | `/time-logs?projectId=&taskId=&page=&pageSize=` → logs of one project or task (`BookingLog`), with `totalMinutes`, `bookedMinutes` and the minutes per date (`days`) | FR-TLOG-012 | specified |
| API-TLOG-002 | POST | `/time-logs` `{workDate, durationMinutes, text, title?, projectId?, taskId?, dayStartMinute?}` | FR-TLOG-004/009 | specified |
| API-TLOG-003 | — | (removed) | — | — |
| API-TLOG-004 | PATCH | `/time-logs/{id}` | FR-TLOG-006 | specified |
| API-TLOG-005 | — | (removed) | — | — |
| API-TLOG-006 | DELETE | `/time-logs/{id}` (immediate) | FR-TLOG-008 | specified |
| API-TLOG-007 | — | (removed) | — | — |
| API-BOOK-001 | GET | `/bookings?from=&to=` → `{items: BookingLog[]}` (logs worked in the range, and logs booked into it) | FR-BOOK-001/002/003 | specified |
| API-BOOK-002 | PUT | `/bookings` `{logs: [{logId, bookings}]}` → `{items: BookingLog[]}` (replaces the bookings of one or many logs) | FR-BOOK-004/005 | specified |
| API-RPT-001 | GET | `/reports/dashboard?from=&to=` → `{days: ReportDay[], projects: ReportProject[]}` (worked and booked minutes per day and per project) | FR-RPT-002…006 | specified |
| API-RPT-002 | — | (removed, OQ-129) | — | — |
| API-INT-001 | GET | `/integrations/pmspa` → `PmspaConnection` | FR-INT-001, FR-INT-004, FR-INT-006 | specified |
| API-INT-002 | PUT | `/integrations/pmspa` `{url, email, password?, confirmAccountSwitch?}` → `PmspaConnection` (saves, then checks) | FR-INT-002, FR-INT-003 | specified |
| API-INT-003 | POST | `/integrations/pmspa/test` → `PmspaConnection` | FR-INT-004 | specified |
| API-INT-004 | DELETE | `/integrations/pmspa` (connection and token; links kept) | FR-INT-005 | specified |
| API-INT-005 | GET | `/integrations/pmspa/projects` → `{items: PmspaProject[]}` (live) | FR-INT-007 | specified |
| API-INT-006 | GET | `/integrations/pmspa/projects/{id}/tasks` → `{items: PmspaTask[]}` (live) | FR-INT-007 | specified |
| API-INT-007 | GET | `/integrations/pmspa/days?from=&to=` → `{items: PmspaDaySummary[]}` (live, one PMSPA call) | FR-INT-007, FR-INT-015 | specified |
| API-INT-008 | POST | `/integrations/pmspa/import/preview` `PmspaImportSelection` → `SyncPreview` (with `days` for `dates`) | FR-INT-011 | specified |
| API-INT-009 | POST | `/integrations/pmspa/import` `{selection, choices}` → `SyncResult` (with `days` for `dates`) | FR-INT-011 | specified |
| API-INT-010 | POST | `/integrations/pmspa/push/preview` `{type: day, id}` → `SyncPreview` | FR-INT-012 | specified |
| API-INT-011 | POST | `/integrations/pmspa/push` `{target, choices}` → `SyncResult` | FR-INT-012 | specified |
| API-INT-012 | GET | `/integrations/pmspa/links?type=` → `{items: PmspaLink[]}` (active links, for the sync flags) | FR-INT-010 | specified |
| API-INT-013 | DELETE | `/integrations/pmspa/links/{type}/{id}` (unlink; both records stay) | FR-INT-010 | specified |
| API-INT-014 | GET | `/integrations/pmspa/links/{type}/{id}` → `PmspaLinkDetail` (the counterpart, live) | FR-INT-010 | specified |
| API-INT-015 | POST | `/integrations/pmspa/sync/preview` `{type: project\|task, id}` → `SyncPreview` | FR-INT-008, FR-INT-012 | specified |
| API-INT-016 | POST | `/integrations/pmspa/sync` `{target, choices}` → `SyncResult` | FR-INT-008, FR-INT-012 | specified |
| API-INT-017 | GET | `/integrations/pmspa/tasks` → `{items: PmspaTask[]}` (live, every task, for **Expand all**) | FR-INT-007, FR-INT-015 | specified |
| API-INT-018 | GET | `/integrations/pmspa/days/details?dates=` → `{items: PmspaDay[]}` (live, the given days with their events) | FR-INT-007, FR-INT-015 | specified |
| API-INT-019 | POST | `/integrations/pmspa/candidates` `PmspaCandidatesInput` → `PmspaCandidates` (live, **Link to existing** lists) | FR-INT-008, FR-INT-012, FR-INT-015 | specified |

## Endpoint details

### API-SYS-001: Health
`GET /health` (root, outside `/api/v1`) · Auth: none (public) · Implements: NFR-003
Checks Postgres and Redis in parallel: a ping with a **10 s** timeout for the DB (a Neon wake-up, NFR-003) and
**2 s** for Redis. A component that errors or times out is `down`. Used by the App Service health check and the
post-deploy smoke check ([deployment](../02-architecture/deployment.md)). Not rate limited (security.md). Not in the
OpenAPI contract (`@ApiExcludeController`).
**200:** `{ status: "ok", db: "up", redis: "up" }` when both are up
**503:** `{ status: "error", db: "up" | "down", redis: "up" | "down" }` when either is down (same JSON shape, not Problem Details)
**Errors:** none of its own

### API-SYS-003: API version
`GET /version` · Auth: none (public) · Implements: SCR-004 (OQ-052)
Returns the `version` field of `api/package.json` of the running build, which `api-deploy` stamps with
the release version ([release versions](../02-architecture/deployment.md#release-versions-oq-098)); `0.0.0` in local builds. Touches neither Postgres nor
Redis, so it never wakes Neon. Not rate limited (security.md). In the OpenAPI contract (unlike `/health`).
**200:** `{ version: string }`, e.g. `{ "version": "0.0.1" }`
**Errors:** none of its own

### Shared auth shapes
- **Access token:** a JWT signed HS256 with `JWT_ACCESS_SECRET`, claims `sub` (user id), `iat`, `exp`
  (`iat` + `ACCESS_TOKEN_TTL`). Sent as `Authorization: Bearer <token>`.
- **`TokenPair`:** `{ accessToken: string, accessTokenExpiresAt: string (ISO 8601 UTC), refreshToken: string }`.
  The refresh token is opaque: 32 random bytes, base64url (43 chars).
- **Protection (OQ-066):** every endpoint needs a valid access token unless marked public: `/health`,
  API-SYS-003, API-AUTH-001…005. A missing, malformed, badly signed or expired token → `401`
  `…/errors/unauthorized`.
- **Valid `returnTo` (API rule, security.md):** a string of 1–2048 chars that starts with `/`, doesn't start
  with `//`, and has no `\` and no control characters. The web applies its stricter `/app` rule on top.

### API-AUTH-001: Start Google sign-in
`GET /auth/google?returnTo=&timeZone=` · Auth: none · Implements: FR-AUTH-001, FR-AUTH-006 (OQ-061, OQ-065)
**Query:** `returnTo?`: kept only if valid (above), otherwise treated as absent. `timeZone?`: kept only if
it is ≤ 64 chars and `Intl.DateTimeFormat` accepts it as a time zone, otherwise treated as absent. Neither
causes a `400`: this is a browser navigation.
**302:** `Location` = Google's authorization endpoint with `response_type=code`, `client_id`,
`redirect_uri` = `GOOGLE_CALLBACK_URL`, `scope=openid email profile`, `state`, `code_challenge`,
`code_challenge_method=S256` and `prompt=select_account`. Stores the state entry (security.md step 2,
TTL 10 min) with the PKCE verifier, `returnTo` and `timeZone`.
**Errors:** 500 if Google discovery or Redis fails.

### API-AUTH-002: Google callback
`GET /auth/google/callback?code=&state=` (or `?error=&state=`) · Auth: none · Implements: FR-AUTH-001, FR-AUTH-002 (OQ-062, OQ-063)
Always answers **302** to the web app, never JSON.
- **Success:** `<WEB_APP_URL>/auth/callback?code=<login code>` plus `&returnTo=<returnTo>` when the state
  entry held one. The user is created or updated first (FR-AUTH-002), and a single-use login code (TTL 60 s) is stored.
- **Failure:** `<WEB_APP_URL>/auth/sign-in?error=<reason>`, plus `&returnTo=` as above when the state entry was found. Reasons:
  | `error` | When |
  | --- | --- |
  | `cancelled` | Google returned `error=access_denied` |
  | `not-allowed` | The allow-list is set and the verified email isn't on it. No user row is created or changed |
  | `failed` | Anything else: no, unknown, expired or already-used `state`; another Google error; code exchange or ID-token validation fails; `email_verified` isn't true; the email belongs to another account |
- The state entry is deleted when read, whatever the outcome (single use).
- Query values are passed to the web with `URLSearchParams` encoding.

### API-AUTH-003: Exchange the login code
`POST /auth/token` · Auth: none · Implements: FR-AUTH-001
**Request body:** `{ code: string(1–128) }`
**200:** `TokenPair`. Consumes the code (single use) and starts a new session (refresh-token family).
**Errors:** 400 validation · 401 unknown, expired or already-used code

### API-AUTH-004: Refresh the session
`POST /auth/refresh` · Auth: none · Implements: FR-AUTH-003, FR-AUTH-002 (allow-list, OQ-039)
**Request body:** `{ refreshToken: string(1–128) }`
**200:** `TokenPair` with a **new** refresh token. The old one stops working (rotation), and the session's
lifetime slides to `REFRESH_TOKEN_TTL` from now.
**Errors:** 400 validation · 401 when the token is unknown or expired; when it was already rotated (reuse:
the whole session is revoked as well); when the user no longer exists; or when the allow-list is set and the
user's email isn't on it (the session is revoked)

### API-AUTH-005: Sign out
`POST /auth/logout` · Auth: none · Implements: FR-AUTH-004
**Request body:** `{ refreshToken: string(1–128) }`
**204:** always, also for an unknown token. Revokes the session the token belongs to.
**Errors:** 400 validation

### API-AUTH-006: Sign out of all devices
`POST /auth/logout-all` · Auth: bearer · Implements: FR-AUTH-007
**204:** revokes every session of the user. Access tokens already issued stay valid until they expire (≤ `ACCESS_TOKEN_TTL`).
**Errors:** 401

### API-USR-001: Current user
`GET /me` · Auth: bearer · Implements: FR-AUTH-006
**200:** `Me` = `{ id: string, email: string, displayName: string, avatarUrl: string | null, timeZone: string, dailyTargetMinutes: number, createdAt: string }`
**Errors:** 401 (also when the token's user no longer exists)

### Shared project and task shapes
Used by API-USR-003, API-PRJ-* and API-TSK-*. Implements the field tables in
[req-projects](../01-requirements/projects.md#fields) and [req-tasks](../01-requirements/tasks.md#fields).

- **Text inputs** are trimmed. An optional field that is empty after trimming is stored as `null`.
  `title` empty after trimming → `400`.
- **`externalLink`:** an absolute `http://` or `https://` URL, ≤ 500 chars, else `400`.
- **`dueDate`:** a real calendar date `YYYY-MM-DD`, else `400`.
- **Lead input** (OQ-078), two body fields: `projectLeadUserId?: uuid | null` and `projectLeadName?: string(1–100) | null`.
  Both non-null → `400` (field `projectLeadName`, "must be empty when projectLeadUserId is set").
  `projectLeadUserId` that isn't a registered user → `400` (field `projectLeadUserId`, "must be an existing user").
  Any registered user is allowed, not only the caller (OQ-076). On `POST`, a missing field means `null`.
  On `PATCH`, the lead is replaced **as a unit** when either field is present (the absent one counts as `null`), and left alone when both are absent.
- **`ProjectLead`** (read model, data-model.md *Project lead*):
  `{ kind: "user" | "text", name: string, user: { id: string, displayName: string, avatarUrl: string | null } | null }`.
  `kind: "user"`: `user` set, `name` = `user.displayName` (current). `kind: "text"`: `user: null`. No lead → the field is `null`.
  The lead user's email is never included (OQ-077).
- **`TaskCounts`:** `{ upcoming: number, inProgress: number, completed: number, total: number }` over the
  project's tasks. The completed percentage is left to the client.
- **`loggedMinutes`** (OQ-132): an integer, the sum of `durationMinutes` of the caller's time logs, excluded ones too, computed
  in the query and never stored (data-model.md *time_logs*). A project's covers every log with that project, so its tasks' logs as
  well; a task's covers the logs linked to it. `0` when there are none. It equals
  API-TLOG-001's `totalMinutes` for the same project or task.
- **`Project`:** `{ id, title, description: string | null, externalLink: string | null, projectLead: ProjectLead | null,
  taskCounts: TaskCounts, loggedMinutes, createdAt, updatedAt }` (instants ISO 8601 UTC).
- **`Task`:** `{ id, project: Ref, title, description: string | null, externalLink: string | null,
  projectLead: ProjectLead | null, status: "upcoming" | "in-progress" | "completed", dueDate: string | null,
  loggedMinutes, createdAt, updatedAt }`. `Ref` = `{ id, title, deleted }` (conventions.md *Responses*), `deleted: false` here.
- **Ids in paths:** a value that isn't a UUID → `404` `…/errors/not-found` (never `400`, never a database error).
- **Deleted:** a deleted project or task is gone: reading, changing or deleting it by id → `404` `…/errors/not-found`.
- **Updated date:** any successful `PATCH` sets `updatedAt` to now. Task changes never touch the project's `updatedAt` (OQ-091).
- **Lists:** `?page` ≥ 1 (default 1), `?pageSize` 1–100 (default 25), `?q` ≤ 200 chars (trimmed; empty = no filter;
  a case-insensitive "contains" on `title`, with `%`, `_` and `\` matched literally, OQ-085). Sort ties break on `id` descending.
  Out-of-range values → `400`. A page past the end → `items: []` with the real `total`.

### API-USR-003: Search users for the project lead
`GET /users?q=` · Auth: bearer · Implements: FR-PRJ-006 (OQ-076, OQ-077, OQ-089)
**Query:** `q`: 2–100 chars after trimming, else `400`.
**200:** `{ items: UserSummary[] }`, at most 10, where `UserSummary` = `{ id, displayName, email, avatarUrl: string | null }`.
Matches registered users whose `displayName` or `email` contains `q` (case-insensitive, wildcards literal).
Order: the caller first (when they match), then `displayName` (case-insensitive), then `email`. No pagination.
This is the only endpoint that returns other users' emails (security.md *Authorization*).
**Errors:** 400 validation · 401

### API-PRJ-001: Create project
`POST /projects` · Auth: bearer · Implements: FR-PRJ-001, FR-PRJ-006
**Request body:** `{ title: string(1–200), description?: string(≤2000) | null, externalLink?: string(≤500) | null, projectLeadUserId?: uuid | null, projectLeadName?: string(≤100) | null }`
**201:** `Project` (zero `taskCounts`)
**Errors:** 400 validation · 401

### API-PRJ-002: List projects
`GET /projects?q=&sort=&page=&pageSize=` · Auth: bearer · Implements: FR-PRJ-002
The caller's projects. `sort` ∈ `updatedAt:desc` (default), `updatedAt:asc`,
`createdAt:desc`, `createdAt:asc`, `title:asc`, `title:desc` (title compared case-insensitively).
`q` (OQ-099, OQ-102): matches the `title` **or** the lead's name, each a case-insensitive "contains" with wildcards
literal. The lead's name is the read-model name (data-model.md *Project lead*): the lead user's current
`displayName`, else the text lead; never an email. With a non-empty `q`, projects whose title matches come first,
then lead-only matches; inside each group the `sort` order applies, then `id` descending. `total` counts both groups.
**200:** `{ items: Project[], page, pageSize, total }`
**Errors:** 400 validation · 401

### API-PRJ-003: Get project
`GET /projects/{id}` · Auth: bearer · Implements: FR-PRJ-003, FR-PRJ-008
**200:** `Project`
**Errors:** 401 · 404 `not-found` (missing, not a UUID, deleted, or another user's)

### API-PRJ-004: Update project
`PATCH /projects/{id}` · Auth: bearer · Implements: FR-PRJ-004
**Request body:** the create fields, all optional; `title` may not be `null`. An empty body is valid (only `updatedAt` changes).
**200:** `Project`
**Errors:** 400 validation · 401 · 404 `not-found`

### API-PRJ-005: Delete project
`DELETE /projects/{id}` · Auth: bearer · Implements: FR-PRJ-005
Deletes the project and its tasks permanently. In the same transaction, first saves the project's title on the logs with
that project, and each task's title on the logs of that task (data-model.md *Retained names*), then deletes the project; the
cascade deletes its tasks and the FKs unlink the logs. The logs themselves stay (FR-TLOG-014).
**204**
**Errors:** 401 · 404 `not-found` (also when already deleted)

### API-TSK-001: Create task
`POST /tasks` · Auth: bearer · Implements: FR-TSK-001
**Request body:** `{ projectId: uuid, title: string(1–200), description?: string(≤2000) | null, externalLink?: string(≤500) | null,
projectLeadUserId?: uuid | null, projectLeadName?: string(≤100) | null, status?: TaskStatus (default "upcoming"), dueDate?: date | null }`
**201:** `Task`
**Errors:** 400 validation · 401 · 404 `not-found` when `projectId` is missing or another user's

### API-TSK-002: List tasks
`GET /tasks?projectId=&status=&q=&sort=&page=&pageSize=` · Auth: bearer · Implements: FR-TSK-002, FR-TSK-003
The caller's tasks. `projectId`: one project (a missing or foreign one gives
`items: []`, not an error). `status`: a comma-separated non-empty subset of the three statuses; absent = all.
`sort` ∈ `updatedAt:desc` (default), `updatedAt:asc`, `dueDate:asc`, `dueDate:desc`, `title:asc`, `title:desc`;
tasks without a due date come last in both `dueDate` directions (OQ-085).
**200:** `{ items: Task[], page, pageSize, total }`
**Errors:** 400 validation (also a non-UUID `projectId` or an unknown status) · 401

### API-TSK-003: Get task
`GET /tasks/{id}` · Auth: bearer · Implements: FR-TSK-004
**200:** `Task`
**Errors:** 401 · 404 `not-found`

### API-TSK-004: Update task
`PATCH /tasks/{id}` · Auth: bearer · Implements: FR-TSK-005, FR-TSK-006
**Request body:** the create fields, all optional; `projectId`, `title` and `status` may not be `null`.
A new `projectId` moves the task (it must be the caller's, else `404` `not-found`).
Moving a task also sets the project of its time logs to the new project, in the same transaction (data-model.md *time_logs*).
**200:** `Task`
**Errors:** 400 validation · 401 · 404 `not-found`

### API-TSK-005: Delete task
`DELETE /tasks/{id}` · Auth: bearer · Implements: FR-TSK-007
Deletes the task permanently. In the same transaction, first saves its title on its logs (data-model.md *Retained names*),
then deletes it; the FK unlinks the logs from the task, and they keep their project. The logs themselves stay (FR-TLOG-014).
**204**
**Errors:** 401 · 404 `not-found` (also when already deleted)

### API-USR-002: Update the profile settings
`PATCH /me` · Auth: bearer · Implements: FR-AUTH-006, FR-TLOG-017
**Request body:** `{ timeZone?: string, dailyTargetMinutes?: integer }`, all optional, none may be `null`. A new user's `dailyTargetMinutes` is 420 (7 h). `timeZone` must be accepted by
`Intl.DateTimeFormat`, be ≤ 64 chars and not be a fixed UTC offset; it is stored in the canonical form `Intl` resolves, as at sign-in. `dailyTargetMinutes`: 15–1440, a multiple of 15.
**200:** `Me`
**Errors:** 400 validation · 401

### Shared time-capture shapes
Used by API-WD-* and API-TLOG-*. Implements [req-time-logs](../01-requirements/time-logs.md).

- **`TimeLog`:** `{ id, workDate: "YYYY-MM-DD", durationMinutes, text, title: string | null, project: Ref | null, task: Ref | null, excludeFromStats: boolean }`.
  `Ref` as in conventions.md (a deleted project or task keeps its title with `id: null` and `deleted: true`, data-model.md *Retained names*).
  A log with a task always has `project` set (the task's project).
- **`Day`:** `{ workDate, startMinute: number | null, totalMinutes: number, logs: TimeLog[] }`. `startMinute` is `null` when the date has no workday.
  `logs` are in entry order (`id` ascending), and all of the date's logs are returned (no pagination).
- **Inputs:** `text` (1–1000) and `title` (1–100) are trimmed, and an empty `title` is stored as `null`; an empty `text` → `400`.
  `durationMinutes`: an integer, a multiple of 15, 15–1440. `workDate`: a real calendar date that is **not after today in the caller's time zone**.
  `startMinute` / `dayStartMinute`: an integer, a multiple of 15, 0–1425. `excludeFromStats`: a boolean (default `false` on `POST`; `null` → `400`). A wrong value → `400` naming the field.
- **Link input:** `projectId?: uuid | null` and `taskId?: uuid | null`.
  - With `taskId`: the task must be the caller's, else `404` `not-found` ("Task not found."). The log's project becomes the task's project.
    A `projectId` that differs from the task's → `400` (field `projectId`, "must be the task's project").
  - With only `projectId`: the project must be the caller's, else `404` `not-found` ("Project not found.").
  - With neither: an unsorted log.
  - On `PATCH`, the link is replaced **as a unit** when either field is present (the absent one counts as `null`) and left alone when both are absent.
    A log of a deleted task or project can be relinked this way; the new link clears its retained names (data-model.md *Retained names*).
- **Workday start:** `dayStartMinute` on `POST` (and on `PATCH` when `workDate` changes) is **required** when the target date has no workday
  (`400`, field `dayStartMinute`, "is required when the day has no start time"), and creates it in the same transaction. When the date already has a
  workday, `dayStartMinute` is ignored.
- **Ids in paths:** a value that isn't a UUID, or a log/date that doesn't exist for the caller → `404` `…/errors/not-found`. A `{date}` that isn't a real date → `400`.

### API-WD-001: List workdays
`GET /workdays?from=&to=` · Auth: bearer · Implements: FR-TLOG-001
**Query:** `from`, `to`: dates, `from` ≤ `to`, at most 366 days apart, else `400`.
**200:** `{ items: { workDate, startMinute, totalMinutes }[] }`, one per workday in the range, ordered by `workDate`; `totalMinutes` is the sum of its logs (0 when none).
The calendar marks the dates whose `totalMinutes` > 0.
**Errors:** 400 validation · 401

### API-WD-002: Set the day start
`PUT /workdays/{date}` · Auth: bearer · Implements: FR-TLOG-009
**Request body:** `{ startMinute }`. Creates the workday or replaces its start. `date` must not be after today (`400`).
**200:** `{ workDate, startMinute }`
**Errors:** 400 validation · 401

### API-WD-003: Get a day
`GET /workdays/{date}` · Auth: bearer · Implements: FR-TLOG-001/002/003/009/015/016
**200:** `Day`. A date with no workday and no logs → `{ workDate, startMinute: null, totalMinutes: 0, logs: [] }`. Any real date is valid, including the future (empty).
**Errors:** 400 invalid date · 401

### API-WD-004: Delete a day
`DELETE /workdays/{date}` · Auth: bearer · Implements: FR-TLOG-019
Deletes, in one statement, the caller's workday on `date` (its start) and all the caller's logs with that `workDate`; their
bookings go with them (FK cascade). Logs of other dates with a booking dated `date` keep it (OQ-152).
**204**
**Errors:** 400 invalid date · 401 · 404 `not-found` when the caller has no workday and no logs on `date` (so also any future date)

### API-TLOG-001: List the logs of a project or task
`GET /time-logs?projectId=&taskId=&page=&pageSize=` · Auth: bearer · Implements: FR-TLOG-012
**Query:** exactly one of `projectId`, `taskId` (a UUID), else `400` (both or neither: field `projectId`, "exactly one of projectId and taskId is
required"). `page`, `pageSize` as in *Lists* above (`q` isn't accepted).
**200:** `{ items: BookingLog[], page, pageSize, total, totalMinutes, bookedMinutes, days: LoggedDay[] }`: the caller's logs with that project (which includes the logs of its
tasks) or that task, ordered by `workDate` descending, then entry order (`id` ascending). `totalMinutes` sums **all** matching logs, not only the page;
`bookedMinutes` sums their bookings' `minutes`. `days`: one `LoggedDay` = `{ workDate, workedMinutes, bookedMinutes }` per date with a matching log
(**all** of them, not only the page's; excluded logs too), oldest first; `workedMinutes` sums that date's matching logs, `bookedMinutes` their bookings'
`minutes` whatever the bookings' dates (as `ReportDay`, OQ-127), so the `days` add up to `totalMinutes` and `bookedMinutes` (OQ-222). An unknown or
foreign id → `items: []`, `total: 0`, `totalMinutes: 0`, `bookedMinutes: 0`, `days: []`. A page past the end → `items: []` with the real totals and `days`. `BookingLog`: *Shared booking shapes* below.
**Errors:** 400 validation · 401

### API-TLOG-002: Create a time log
`POST /time-logs` · Auth: bearer · Implements: FR-TLOG-004, FR-TLOG-009
**Request body:** `{ workDate, durationMinutes, text, title?, projectId?, taskId?, excludeFromStats?, dayStartMinute? }` (shapes above).
**201:** `TimeLog`
**Errors:** 400 validation · 401 · 404 `not-found` (task or project)

### API-TLOG-004: Update a time log
`PATCH /time-logs/{id}` · Auth: bearer · Implements: FR-TLOG-006
**Request body:** `{ workDate?, durationMinutes?, text?, title?, projectId?, taskId?, excludeFromStats?, dayStartMinute? }`; `workDate`, `durationMinutes`, `text` and `excludeFromStats` may not be `null`; `title: null` clears it.
An update that leaves the log unbookable (excluded from statistics, or neither a project nor a task) also removes all its bookings (FR-BOOK-006); any other
update keeps them. An update that leaves the log bookable with a `durationMinutes` below its booked minutes → `400`, field `durationMinutes`,
"<booked> of this log is booked. Remove bookings first, or keep at least <booked>." (`<booked>` as the web's duration, e.g. `1h 30m`), and nothing
changes (OQ-213). The check and the write run in one transaction that locks the log, as API-BOOK-002 does.
**200:** `TimeLog`
**Errors:** 400 validation (also the booked-time rule above) · 401 · 404 `not-found`

### API-TLOG-006: Delete a time log
`DELETE /time-logs/{id}` · Auth: bearer · Implements: FR-TLOG-008
Deletes the row immediately. The workday stays.
**204**
**Errors:** 401 · 404 `not-found`

### Shared booking shapes
Used by API-BOOK-*. Implements [req-bookings](../01-requirements/bookings.md).

- **`Booking`:** `{ date: "YYYY-MM-DD", minutes: integer }`: part of a log's time booked to a date; `minutes` 15–1440, a multiple of 15 (OQ-212).
- **`BookingLog`:** `TimeLog` plus `bookings: Booking[]`, by `date` ascending (`[]` = not booked). A log has at most one booking per date, and its
  bookings' minutes add up to at most its `durationMinutes`. `TimeLog` and `Day` themselves don't carry bookings. Also the item of API-TLOG-001.
- **Bookable:** a log with `excludeFromStats` false and a `project` (a deleted one too). Only bookable logs have bookings.

### API-BOOK-001: List a booking range
`GET /bookings?from=&to=` · Auth: bearer · Implements: FR-BOOK-001/002/003
**Query:** `from`, `to`: dates, `from` ≤ `to`, at most 366 days apart, else `400`.
**200:** `{ items: BookingLog[] }`: the caller's logs whose `workDate` is in the range **or** that have a booking dated in the range, ordered by
`workDate`, then entry order (`id`), each with all its bookings (also those outside the range). No pagination. A log worked before the range but
booked into it is included; so is a log worked in the range but booked outside it.
**Errors:** 400 validation · 401

### API-BOOK-002: Replace the bookings of logs
`PUT /bookings` · Auth: bearer · Implements: FR-BOOK-004, FR-BOOK-005
**Request body:** `{ logs: { logId: uuid, bookings: Booking[] }[] }`. `logs`: 1–100 entries; `bookings`: 0–96 entries (`[]` removes them all).
Each listed log's bookings become exactly the given list, in one transaction, all or nothing; the client sends the whole list (book, **Book all**,
edit and remove all send the log's new list). A booking's `date` is a real date **not after today in the caller's time zone** (it may be before the
log's work date). Logs not listed are unchanged.
**200:** `{ items: BookingLog[] }`, the listed logs after the change, in `id` order.
**Errors:** 400 validation, fields by position (`i` = the entry in `logs`, `j` = the booking): shape errors as dot paths from the DTO
(`logs`, `logs.<i>.logId`, `logs.<i>.bookings.<j>.date`, `logs.<i>.bookings.<j>.minutes`); `logs.<i>.bookings.<j>.date` "must not be after today";
`logs.<i>.logId` "lists a log twice" for a repeated `logId`; `logs.<i>.bookings` "has two bookings on one date", "adds up to more than the log's
duration", or "can't be booked" (non-empty for a log that isn't bookable) · 401 · 404 `not-found` ("Time log not found.") when any `logId` isn't the
caller's log; nothing changes on any error.

### API-RPT-001: Dashboard report
`GET /reports/dashboard?from=&to=` · Auth: bearer · Implements: FR-RPT-002…006 ([req-reporting](../01-requirements/reporting.md))
**Query:** `from`, `to`: dates, `from` ≤ `to`, at most 366 days apart, else `400`. Future dates are allowed (they have nothing).
**200:** `{ days: ReportDay[], projects: ReportProject[] }`, computed from the caller's workdays and logs whose date is in the range:
- **`ReportDay`:** `{ workDate, startMinute: number | null, workedMinutes, bookedMinutes }`, one per date that has a workday or a log, ordered by
  `workDate`. `workedMinutes` sums all of the date's logs (excluded ones too); `bookedMinutes` sums their bookings' minutes, whatever the bookings'
  dates (OQ-127).
  `startMinute` is `null` for a date with logs but no workday.
- **`ReportProject`:** `{ kind: "project" | "unsorted" | "nonprod", project: Ref | null, workedMinutes, bookedMinutes }`. A log excluded from statistics
  counts under `nonprod`; else a log without a project (and no retained project name) under `unsorted`; else under its project: one row per
  `project_id`, and per retained name for deleted projects (data-model.md *Retained names*). `project` is the `Ref` (deleted → `deleted: true`),
  `null` for `unsorted` and `nonprod`, whose `bookedMinutes` is always 0. Order: the `project` rows by `workedMinutes` descending, then title, then
  `unsorted`, then `nonprod`. Rows with no logs aren't returned.

Empty range → `{ days: [], projects: [] }`. The project and task counts of FR-RPT-002 come from API-PRJ-002 and API-TSK-002 (`total`).
**Errors:** 400 validation · 401

### Shared PMSPA shapes
The connector's endpoints (req-integrations). PMSPA ids are 24-hex ObjectId strings; PM4 ids are UUIDs.
```ts
PmspaConnectionStatus = "not-configured" | "connected" | "invalid-credentials" | "unreachable"
PmspaAccount = { id: string, email: string, avatarUrl: string | null, role: "admin" | "user" }
  // from PMSPA's who-am-I; avatarUrl only when its host is images.unsplash.com, else null (OQ-166)
PmspaRateLimit = { limit: integer, remaining: integer, resetAt: string, observedAt: string }
  // PMSPA's X-RateLimit-* headers of its last answer to any PM4 user, per PMSPA host (FR-INT-015, OQ-200)
PmspaConnection = { status, url: string | null, email: string | null, account: PmspaAccount | null,
                    lastCheckedAt: string | null, lastSyncAt: string | null,
                    rateLimit: PmspaRateLimit | null }                          // never a password or token
PmspaLinkType = "project" | "task" | "time-log"
PmspaLinkOrigin = "imported" | "pushed" | "linked"                              // OQ-164
PmspaLink = { pm4Id: string, origin, syncedAt: string, pmspaCreatedAt: string }
  // pmspaCreatedAt: when PMSPA created the linked record, from the first 4 bytes of its ObjectId (OQ-207); ISO 8601 UTC
PmspaRecordLink = { pm4Id: string, pm4Title: string, origin, syncedAt: string }
PmspaRecordDetail = { type: "project", title, lead, done: boolean }
                  | { type: "task", title, projectTitle, column: PmspaColumn }
                  | { type: "time-log", title, eventTitle }                      // OQ-170
PmspaLinkDetail = { origin, syncedAt, pmspa: PmspaRecordDetail | null }         // null = gone in PMSPA
PmspaColumn = "Upcoming" | "In Progress" | "Completed"
PmspaProject = { id, title, done: boolean, taskCount: integer, link: PmspaRecordLink | null }
PmspaTask = { id, projectId, title, column: PmspaColumn, link: PmspaRecordLink | null }
PmspaLog = { id, title, durationMinutes: integer, linked: boolean }
PmspaEvent = { id, title, task: { id, title, projectTitle } | null, logs: PmspaLog[] }   // no booked flag: bookings aren't synced (OQ-215, OQ-219)
PmspaDay = { date: "YYYY-MM-DD", startMinute: integer | null, totalMinutes: integer,
             linkState: "linked" | "partly-linked" | "not-linked", events: PmspaEvent[] }
PmspaDaySummary = { date: "YYYY-MM-DD", startMinute: integer | null, eventCount: integer }  // OQ-205
SyncRecordType = "project" | "task" | "day" | "event"
SyncAction = "create" | "update" | "skip" | "differs"
SyncDirection = "to-pm4" | "to-pmspa"
SyncFieldDiff = { field: string, pm4: string | null, pmspa: string | null }
SyncCandidate = { id, title, groupId: string | null, detail: string | null, differences: SyncFieldDiff[] }
SyncPreviewItem = { key, parentKey: string | null, type: SyncRecordType, title, detail: string | null,
                    action: SyncAction, direction: SyncDirection | null, reason: string | null,
                    linkedId: string | null, parent: boolean, optional: boolean,
                    candidates: SyncCandidate[] | null, differences: SyncFieldDiff[], warnings: string[],
                    taskPath?: { projectTitle: string, taskTitle: string } }
  // taskPath: an import's or a day push's event row with a PMSPA task (OQ-205); absent otherwise
  // candidates null: a sync or push row whose PMSPA candidates weren't read; API-INT-019 reads them (OQ-204)
SyncPreview = { items: SyncPreviewItem[], days?: PmspaDay[] }      // days: API-INT-008 with `dates` only
SyncChoice = { key, kind: "create" } | { key, kind: "link", id, overwrite: SyncDirection | null } | { key, kind: "skip" }
SyncOutcome = "created" | "updated" | "linked" | "skipped" | "failed"
SyncResultItem = { key, parentKey, type, title, newTitle: string | null, outcome: SyncOutcome, reason: string | null }
SyncResult = { items: SyncResultItem[], syncedAt: string, days?: PmspaDay[] }  // days: API-INT-009 with `dates` only
PmspaCandidatesInput = { type: "project", for: uuid[] } | { type: "task", projectId: string(24-hex), for: uuid[] }  // OQ-204
PmspaCandidates = { items: { pm4Id: uuid, candidates: SyncCandidate[] }[] }
```
- A preview row's `key` is `<type>:<id>`, the id on the side the row starts from (PMSPA on import, PM4 on sync and push;
  an event row of a push is `event:<group key>`). A commit recomputes the preview and applies `choices` by `key`; a
  choice whose key isn't in the recomputed preview is ignored. A row without a choice: `create`, or for a row that
  differs, `link` to its counterpart with its suggested `direction` (OQ-173).
- `candidates` (OQ-204): on an import row, the user's unlinked PM4 records of the type (no PMSPA call). On a sync or push
  row, `[]` when it's linked, else `null`: the preview doesn't list PMSPA records, and the web reads them with
  API-INT-019 when the row's **Link to existing ▾** opens. One exception: a project sync of a linked project lists that
  project's tasks anyway, so its unlinked task rows carry that project's unlinked tasks as `candidates`.
- *Linked-only reads* (OQ-204), API-INT-010/011/015/016: PMSPA is read only for records PM4 has an active link to, each
  by id, at most 2 calls at a time. A linked project whose tasks the preview needs is read as one `tasks?project=` list
  (⌈n/50⌉ calls); a linked task not in that list is read by id. A link whose PMSPA record PMSPA no longer answers counts
  as no link. A commit reads the same, plus each PMSPA record a `link` choice picks, by id; a picked record PMSPA doesn't
  answer, or that is already linked, fails its row with "The chosen record can't be linked."
- Rules per row (FR-INT-008, FR-INT-011, FR-INT-012) are in the feature specs `feat-int-sync-api` and `feat-int-time-api`.

### PMSPA errors
Every endpoint that calls PMSPA makes at most 2 PMSPA calls at a time (FR-INT-015, OQ-201), and can answer, besides its
own errors (Problem Details, conventions.md#errors, with the slug as the last path segment of `type`):

| Status | Slug | When |
| --- | --- | --- |
| 409 | `pmspa-not-connected` | No saved connection |
| 409 | `pmspa-invalid-credentials` | PMSPA rejected the stored credentials on re-login; the status becomes Invalid credentials |
| 502 | `pmspa-unreachable` | PMSPA couldn't be reached or didn't answer within 60 s (OQ-165); the status becomes Unreachable |
| 502 | `pmspa-error` | PMSPA answered a read with an unexpected error |
| 503 | `pmspa-rate-limited` | PMSPA answered 429, or the host is paused after one (OQ-177). Extension `retryAfterSeconds` (integer) |
| 409 | `pmspa-sync-running` | Import, sync and push only: another import, sync or push of this user is still running |

A write that PMSPA rejects inside an import, sync or push isn't an error of the endpoint: that record's result is
`failed` with PMSPA's reason (design principle 9).

### API-INT-001: Get the PMSPA connection
`GET /integrations/pmspa` · Auth: bearer · Implements: FR-INT-001, FR-INT-004, FR-INT-006
Reads the stored row; no PMSPA call. No row → `{status: "not-configured", url: null, email: null, account: null,
lastCheckedAt: null, lastSyncAt: null, rateLimit: null}`. `rateLimit` (FR-INT-015, OQ-200): the numbers of PMSPA's last
answer to the row's host (any PM4 user's), kept in Redis until that window resets; null when there's none (also for
API-INT-002/003). `account` is what the last successful check returned (who-am-I), kept in
Redis without expiry and deleted on disconnect; null before the first successful check or when Redis lost it.
**200:** `PmspaConnection`
**Errors:** 401

### API-INT-002: Save the PMSPA connection
`PUT /integrations/pmspa` · Auth: bearer · Implements: FR-INT-002, FR-INT-003, FR-INT-004
**Request body:** `{ url: string(≤500), email: string(email, ≤254), password?: string(1–200), confirmAccountSwitch?: boolean }`.
URL rule (FR-INT-002): `https://` and a public host; in `development` also `http://localhost` / `http://127.0.0.1`.
`password` is required without a stored connection; omitted = keep the stored one. Saving checks the connection
(login + who-am-I) and stores the settings whatever the result. When the check logs in as another PMSPA account than
the user's links (active or kept) and links exist, nothing is stored and the answer is `409` `pmspa-account-switch`
unless `confirmAccountSwitch` is true; confirmed → the old account's links are deleted, then the row is stored.
**200:** `PmspaConnection` (the status the check found)
**Errors:** 400 validation (`url`, `email`, `password`) · 401 · 409 `pmspa-account-switch` (extensions `linkCount`, `accountEmail`) · 503 `pmspa-rate-limited`

### API-INT-003: Test the PMSPA connection
`POST /integrations/pmspa/test` · Auth: bearer · Implements: FR-INT-004
Logs in again with the stored credentials (ignoring the cached token), then who-am-I; writes the status and
*last checked* (OQ-178). A login as another account than the row's `pmspa_user_id` sets Invalid credentials.
**200:** `PmspaConnection`
**Errors:** 401 · 404 (no connection) · 503 `pmspa-rate-limited`

### API-INT-004: Disconnect PMSPA
`DELETE /integrations/pmspa` · Auth: bearer · Implements: FR-INT-005
Deletes the connection row and the cached token. The links stay (inactive). Idempotent.
**204** · **Errors:** 401

### API-INT-005: List PMSPA projects
`GET /integrations/pmspa/projects` · Auth: bearer · Implements: FR-INT-007
Every project of the connected account, read live (all pages of `projects.list`, 50 per page, sorted by title).
`taskCount` = PMSPA's `openTasksCount + closedTasksCount`. `link` = the active link's PM4 record, else null.
**200:** `{ items: PmspaProject[] }`
**Errors:** 401 · *PMSPA errors*

### API-INT-006: List a PMSPA project's tasks
`GET /integrations/pmspa/projects/{id}/tasks` · Auth: bearer · Implements: FR-INT-007
All tasks of one PMSPA project of the connected account (`tasks.listByProject`, all pages), PMSPA's order. No other
PMSPA read: `tasks.listByProject` is owner-scoped, so another account's or an unknown project has no tasks (OQ-201).
**200:** `{ items: PmspaTask[] }` (PMSPA's 404 for no tasks → `[]`)
**Errors:** 400 (`id` not 24-hex) · 401 · *PMSPA errors*

### API-INT-007: List PMSPA days
`GET /integrations/pmspa/days?from=&to=` · Auth: bearer · Implements: FR-INT-007, FR-INT-015
The connected account's days from `from` to `to` (inclusive, `YYYY-MM-DD`, at most 7 days: one week of the Time tab), newest
first, from **one** PMSPA call (`days.findByRange`, the range form: each day's date, start and event ids; OQ-205). Nothing
else is read: a day's events come from API-INT-018 when it opens. `eventCount` = the event ids PMSPA lists (it can list an
event it never saved; API-INT-018 leaves that out). `startMinute` = PMSPA `start` × 60, rounded to 15. A day without event
ids isn't returned; PMSPA's 404 → `[]`.
**200:** `{ items: PmspaDaySummary[] }`
**Errors:** 400 validation (`from`, `to`, range) · 401 · *PMSPA errors*

### API-INT-018: Get PMSPA days with their events
`GET /integrations/pmspa/days/details?dates=` · Auth: bearer · Implements: FR-INT-007, FR-INT-015
`dates`: 1 to 7 distinct `YYYY-MM-DD`, the query parameter repeated (`?dates=2026-10-16&dates=2026-10-17`). Those days
of the connected account, newest first, each with its events and logs: one `days.findByDay` per date, then one
`tasks.getOne` per distinct task the events of all those days reference, then one `projects.getOne` per distinct project
of those tasks, nothing else (OQ-201, OQ-205). A task PMSPA no longer has → `task: null`, a project it no longer has →
`projectTitle: ""`. `startMinute`, `totalMinutes`, `durationMinutes` as API-INT-007; `linkState` from the day's log
links. A date PMSPA has no day or no events for is left out.
**200:** `{ items: PmspaDay[] }`
**Errors:** 400 validation (`dates` missing, more than 7, a repeat, not a date) · 401 · *PMSPA errors*

### API-INT-017: List every PMSPA task
`GET /integrations/pmspa/tasks` · Auth: bearer · Implements: FR-INT-007, FR-INT-015
Every task of the connected account (`tasks.list`, all pages), PMSPA's order: **Expand all** reads it once instead of
API-INT-006 per project (OQ-201). Same items as API-INT-006.
**200:** `{ items: PmspaTask[] }` (PMSPA's 404 for no tasks → `[]`)
**Errors:** 401 · *PMSPA errors*

### API-INT-008: Preview an import
`POST /integrations/pmspa/import/preview` · Auth: bearer · Implements: FR-INT-011
**Request body:** `PmspaImportSelection` = `{ projects: { id: string(24-hex), taskIds: string(24-hex)[] (≤ 500) | null }[] (≤ 50), dates?: string(YYYY-MM-DD)[] (≤ 7) }`
(`taskIds: null` = all of the project's tasks; `dates` arrives with feat-int-time-api). Writes nothing. With `dates`,
PMSPA is read like API-INT-018 (OQ-201): the days, the selected projects one by one and their tasks, then only the tasks
the days' events reference and their projects; without `dates`, all projects and the selected projects' tasks. With
`dates`, every project and task row comes before every day row (OQ-205), and `days` = the selected days it read, as
API-INT-018 answers them (a future date isn't read, so it isn't there), from those reads: no extra PMSPA call.
**200:** `SyncPreview`
**Errors:** 400 validation · 401 · *PMSPA errors*

### API-INT-009: Import
`POST /integrations/pmspa/import` · Auth: bearer · Implements: FR-INT-011
**Request body:** `{ selection: PmspaImportSelection, choices: SyncChoice[] (≤ 500) }`. Recomputes the preview, writes
record by record (parents first), sets `last_sync_at`. With `dates`, `days` = API-INT-008's `days` with `linkState` and
`linked` as they stand after the import (the links are read again; no PMSPA call).
**200:** `SyncResult`
**Errors:** 400 validation · 401 · *PMSPA errors* (incl. `pmspa-sync-running`)

### API-INT-010: Preview a day push
`POST /integrations/pmspa/push/preview` · Auth: bearer · Implements: FR-INT-012
**Request body:** `{ type: "day", id: string(YYYY-MM-DD) }` (not in the future in the user's zone). Writes nothing. A
day without logs → `{ items: [] }`. An event row whose group has a task names its PMSPA project and task in `taskPath`
(the linked task's, or the PM4 names it's created with) and `detail` is only the logs (OQ-205). PMSPA reads (OQ-204):
the day, then by id the linked tasks of its logs' PM4 tasks, and the linked projects of their PM4 projects and of those
PMSPA tasks (*Linked-only reads*).
**200:** `SyncPreview`
**Errors:** 400 validation · 401 · *PMSPA errors*

### API-INT-011: Push a day
`POST /integrations/pmspa/push` · Auth: bearer · Implements: FR-INT-012
**Request body:** `{ target: { type: "day", id }, choices: SyncChoice[] (≤ 500) }`. As API-INT-009, PM4 → PMSPA. Reads
as API-INT-010, plus the picked records (*Linked-only reads*).
**200:** `SyncResult`
**Errors:** 400 validation · 401 · *PMSPA errors* (incl. `pmspa-sync-running`)

### API-INT-012: List active links
`GET /integrations/pmspa/links?type=project|task|time-log` · Auth: bearer · Implements: FR-INT-010
The user's links of that type whose PMSPA account is the connected one; no PMSPA call. No connection, or no account
yet → `{ items: [] }`. Each link's `pmspaCreatedAt` is derived from its `pmspa_id` (OQ-207), not stored.
**200:** `{ items: PmspaLink[] }`
**Errors:** 400 validation (`type`) · 401

### API-INT-013: Unlink
`DELETE /integrations/pmspa/links/{type}/{id}` · Auth: bearer · Implements: FR-INT-010
Deletes the link of the user's PM4 record `id` (any account). Both records stay; no PMSPA call.
**204** · **Errors:** 400 validation · 401 · 404 (no such link)

### API-INT-014: Get a link with its PMSPA counterpart
`GET /integrations/pmspa/links/{type}/{id}` · Auth: bearer · Implements: FR-INT-010
The active link of PM4 record `id` and its PMSPA record, read live (`projects.getOne`, `tasks.getOne` with its
project, or the log's event via `days.findByRange` on the PM4 log's work date). Nothing is stored. PMSPA has no such
record any more → `pmspa: null`.
**200:** `PmspaLinkDetail`
**Errors:** 400 validation · 401 · 404 (no active link) · *PMSPA errors*

### API-INT-015: Preview a sync
`POST /integrations/pmspa/sync/preview` · Auth: bearer · Implements: FR-INT-008, FR-INT-012
**Request body:** `{ type: "project" | "task", id: uuid }` (a PM4 record of the user). A project brings its tasks as
optional rows; a task its project as a parent when that isn't linked. Writes nothing. PMSPA reads (OQ-204, *Linked-only
reads*): a project sync reads the linked project by id and its tasks as one list, then by id the linked tasks of the
project's PM4 tasks not in that list; a task sync reads by id the task's linked task and its project's linked project.
Unlinked → nothing read.
**200:** `SyncPreview`
**Errors:** 400 validation · 401 · 404 (no such project or task) · *PMSPA errors*

### API-INT-016: Sync
`POST /integrations/pmspa/sync` · Auth: bearer · Implements: FR-INT-008, FR-INT-012
**Request body:** `{ target: { type, id }, choices: SyncChoice[] (≤ 500) }`. As API-INT-009, both ways per row. Reads
as API-INT-015, plus the picked records (*Linked-only reads*).
**200:** `SyncResult`
**Errors:** 400 validation · 401 · 404 · *PMSPA errors* (incl. `pmspa-sync-running`)

### API-INT-019: List Link to existing candidates
`POST /integrations/pmspa/candidates` · Auth: bearer · Implements: FR-INT-008, FR-INT-012, FR-INT-015
**Request body:** `PmspaCandidatesInput`: `type` `project` or `task`; `projectId` (24-hex, required for `task`, ignored
for `project`); `for`: the PM4 projects or tasks of that type to compare with (uuid, 1…500, unique). Writes nothing.
Reads PMSPA once per list (OQ-204): `project` = the account's projects, `task` = the tasks of PMSPA project `projectId`
(another account's project, or one without tasks → none). ⌈n/50⌉ calls.
**200:** `PmspaCandidates`: one item per id of `for` that is the user's (others left out), in `for` order; its
`candidates` = the listed PMSPA records with no active link, same title first, `differences` against that PM4 record,
`groupId` = the PMSPA project of a task (null for a project), as a preview row's.
**Errors:** 400 validation · 401 · *PMSPA errors*

## Open questions
None.

## Changelog
- 2026-09-26: Initial scaffold.
- 2026-09-26: Updated with owner answers to OQ-001–018.
- 2026-09-26: Added API-AUTH-006 (sign out of all devices, OQ-023).
- 2026-10-01: OQ-050: no trailing slashes (`trailingSlash: false`); detail routes `/app/project?id=` and `/app/task?id=` (feat-land-app-route-split).
- 2026-10-02: Added API-SYS-003 `GET /version` (OQ-052, feat-shell-sidebar-branding).
- 2026-10-02: The owner approved API-SYS-003 for feat-shell-sidebar-branding.
- 2026-10-02: Detailed API-AUTH-001…006 and API-USR-001, shared auth shapes, default-deny protection (OQ-061…066, feat-auth-api-session).
- 2026-10-02: The owner approved API-AUTH-001…006 and API-USR-001 (with *Shared auth shapes*) for feat-auth-api-session.
- 2026-10-03: Detailed API-USR-003, API-PRJ-001…005 and API-TSK-001…005 with the shared project and task shapes (OQ-076…OQ-091; feat-prj-api, feat-tsk-api). Logged-time totals dropped from API-PRJ-002 (OQ-080).
- 2026-10-03: The owner approved *Shared project and task shapes*, API-USR-003, API-PRJ-001…005 and API-TSK-001…005 for feat-prj-api, feat-prj-web, feat-tsk-api and feat-tsk-web.
- 2026-10-03: API-SYS-003 returns the release version stamped by `api-deploy` (OQ-098, feat-ops-release-versions).
- 2026-10-04: API-PRJ-002 `q` also matches the lead's name, title matches first (OQ-099, OQ-102; feat-prj-dates-lead-search). Needs the owner's approval again.
- 2026-10-04: The owner approved API-PRJ-002 (as updated) for feat-prj-dates-lead-search.
- 2026-10-07: Time capture detailed from the owner's description: API-WD-001…003, API-TLOG-001/002/004/006 with the shared time-capture shapes; API-TLOG-003/005/007 removed; `Me.dailyTargetMinutes` and API-USR-002 (OQ-103…OQ-114). `Me` (approved) needs the owner's approval again.
- 2026-10-09: `TimeLog.excludeFromStats` and its input on API-TLOG-002/004 (OQ-119); the daily target defaults to 420 (OQ-115).
- 2026-10-09: `BookingLog`, API-BOOK-001/002; API-TLOG-004 removes the booking of a log that becomes unbookable (feat-book-api, OQ-122…OQ-125).
- 2026-10-09: API-RPT-001 is `GET /reports/dashboard` with `ReportDay` and `ReportProject`; API-RPT-002 removed (OQ-127, OQ-129; feat-rpt-api).
- 2026-10-09: API-USR-002: `timeZone` is canonicalised and fixed UTC offsets are rejected, as at sign-in (feat-tlog-api D9).
- 2026-10-11: `loggedMinutes` on `Project` and `Task` (OQ-132); API-TLOG-001 returns `BookingLog` items and `bookedMinutes`, and spells out its
  validation (feat-proto-sync-web, prototype `fa9a030`). `Project`, `Task` and API-TLOG-001 need the owner's approval.
- 2026-10-14: Index status of API-BOOK-001/002 and API-RPT-001 set to `specified` (controllers and detail sections exist). API-SYS-001 detailed from the
  built `api/src/health/` and set to `specified`.
- 2026-10-14: Approved by the owner.
- 2026-10-15: API-WD-004 *Delete a day* (OQ-152, prototype `51c6200`). Back to `review` (feat-hard-delete).
- 2026-10-17: API-INT-001…016 with the shared PMSPA shapes and *PMSPA errors* (prototype `eefe787` `proposed-types.ts`; OQ-164…OQ-180). Back to `review` (feat-int-conn-api, feat-int-sync-api, feat-int-time-api).
- 2026-10-17: Approved by the owner.
- 2026-10-18: `PmspaRateLimit` on `PmspaConnection`; API-INT-006 without the project check, API-INT-007 and API-INT-008 (`dates`) read only the referenced tasks and projects, API-INT-017 every task, at most 2 PMSPA calls at a time (feat-int-budget, OQ-200…OQ-202). Approved by the owner for feat-int-budget.
- 2026-10-18: API-INT-007 answers `PmspaDaySummary` from one range call; API-INT-018 the given days with their events; API-INT-008/009 with `dates` answer `days` and put projects and tasks before days; `taskPath` on import and push event rows; API-INT-017/018 in the index (feat-int-budget, OQ-205, prototype `072da99`). Back to `review`.
- 2026-10-18: OQ-204: API-INT-010/011/015/016 read only linked PMSPA records (*Linked-only reads*); `SyncPreviewItem.candidates`
  null on an unlinked sync or push row; API-INT-019 `POST /integrations/pmspa/candidates` (feat-int-budget). Still `review`.
- 2026-10-18: `PmspaLink.pmspaCreatedAt` on API-INT-012, derived from the PMSPA ObjectId (OQ-207, feat-int-followups). Still `review`.
- 2026-10-23: Partial bookings (feat-book-partial, OQ-212…OQ-219): `Booking`; `BookingLog.bookings` replaces `bookingDate`; API-BOOK-002 replaces each
  listed log's bookings; API-TLOG-004 rejects a duration below the booked time; API-TLOG-001 and API-RPT-001 sum booked minutes; `PmspaEvent.booked` removed.
- 2026-10-24: API-TLOG-001 returns `days` (`LoggedDay[]`) for the Logged time chart (OQ-222, feat-proto-sync-logged-chart). Still `review`.
