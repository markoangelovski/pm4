---
id: api-endpoints
title: API Endpoints
status: approved
owner: Marko Angelovski
last_updated: 2026-10-15
related: [api-conventions, api-data-model, req-auth, req-projects, req-tasks, req-time-logs, req-reporting]
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
| API-TLOG-001 | GET | `/time-logs?projectId=&taskId=&page=&pageSize=` → logs of one project or task (`BookingLog`), with `totalMinutes` and `bookedMinutes` | FR-TLOG-012 | specified |
| API-TLOG-002 | POST | `/time-logs` `{workDate, durationMinutes, text, title?, projectId?, taskId?, dayStartMinute?}` | FR-TLOG-004/009 | specified |
| API-TLOG-003 | — | (removed) | — | — |
| API-TLOG-004 | PATCH | `/time-logs/{id}` | FR-TLOG-006 | specified |
| API-TLOG-005 | — | (removed) | — | — |
| API-TLOG-006 | DELETE | `/time-logs/{id}` (immediate) | FR-TLOG-008 | specified |
| API-TLOG-007 | — | (removed) | — | — |
| API-BOOK-001 | GET | `/bookings?from=&to=` → `{items: BookingLog[]}` (logs worked in the range, and logs booked into it) | FR-BOOK-001/002/003 | specified |
| API-BOOK-002 | PUT | `/bookings` `{logIds, bookingDate}` → `{items: BookingLog[]}` (book, re-date or remove, one or many logs) | FR-BOOK-004/005 | specified |
| API-RPT-001 | GET | `/reports/dashboard?from=&to=` → `{days: ReportDay[], projects: ReportProject[]}` (worked and booked minutes per day and per project) | FR-RPT-002…006 | specified |
| API-RPT-002 | — | (removed, OQ-129) | — | — |

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
`bookingDate` goes with them. Logs of other dates whose `bookingDate` is `date` keep it (OQ-152).
**204**
**Errors:** 400 invalid date · 401 · 404 `not-found` when the caller has no workday and no logs on `date` (so also any future date)

### API-TLOG-001: List the logs of a project or task
`GET /time-logs?projectId=&taskId=&page=&pageSize=` · Auth: bearer · Implements: FR-TLOG-012
**Query:** exactly one of `projectId`, `taskId` (a UUID), else `400` (both or neither: field `projectId`, "exactly one of projectId and taskId is
required"). `page`, `pageSize` as in *Lists* above (`q` isn't accepted).
**200:** `{ items: BookingLog[], page, pageSize, total, totalMinutes, bookedMinutes }`: the caller's logs with that project (which includes the logs of its
tasks) or that task, ordered by `workDate` descending, then entry order (`id` ascending). `totalMinutes` sums **all** matching logs, not only the page;
`bookedMinutes` sums those with a `bookingDate`. An unknown or foreign id → `items: []`, `total: 0`, `totalMinutes: 0`, `bookedMinutes: 0`. A page past the
end → `items: []` with the real totals. `BookingLog`: *Shared booking shapes* below.
**Errors:** 400 validation · 401

### API-TLOG-002: Create a time log
`POST /time-logs` · Auth: bearer · Implements: FR-TLOG-004, FR-TLOG-009
**Request body:** `{ workDate, durationMinutes, text, title?, projectId?, taskId?, excludeFromStats?, dayStartMinute? }` (shapes above).
**201:** `TimeLog`
**Errors:** 400 validation · 401 · 404 `not-found` (task or project)

### API-TLOG-004: Update a time log
`PATCH /time-logs/{id}` · Auth: bearer · Implements: FR-TLOG-006
**Request body:** `{ workDate?, durationMinutes?, text?, title?, projectId?, taskId?, excludeFromStats?, dayStartMinute? }`; `workDate`, `durationMinutes`, `text` and `excludeFromStats` may not be `null`; `title: null` clears it.
An update that leaves the log unbookable (excluded from statistics, or neither a project nor a task) also removes its booking (FR-BOOK-006); any other update keeps it.
**200:** `TimeLog`
**Errors:** 400 validation · 401 · 404 `not-found`

### API-TLOG-006: Delete a time log
`DELETE /time-logs/{id}` · Auth: bearer · Implements: FR-TLOG-008
Deletes the row immediately. The workday stays.
**204**
**Errors:** 401 · 404 `not-found`

### Shared booking shapes
Used by API-BOOK-*. Implements [req-bookings](../01-requirements/bookings.md).

- **`BookingLog`:** `TimeLog` plus `bookingDate: "YYYY-MM-DD" | null`. `TimeLog` and `Day` themselves don't carry the booking. Also the item of API-TLOG-001.
- **Bookable:** a log with `excludeFromStats` false and a `project` (a deleted one too). Only bookable logs have a `bookingDate`.

### API-BOOK-001: List a booking range
`GET /bookings?from=&to=` · Auth: bearer · Implements: FR-BOOK-001/002/003
**Query:** `from`, `to`: dates, `from` ≤ `to`, at most 366 days apart, else `400`.
**200:** `{ items: BookingLog[] }`: the caller's logs whose `workDate` **or** `bookingDate` is in the range, ordered by `workDate`, then entry order
(`id`). No pagination. A log worked before the range but booked into it is included; so is a log worked in the range but booked outside it.
**Errors:** 400 validation · 401

### API-BOOK-002: Set the booking date of logs
`PUT /bookings` · Auth: bearer · Implements: FR-BOOK-004, FR-BOOK-005
**Request body:** `{ logIds: uuid[], bookingDate: "YYYY-MM-DD" | null }`. `logIds`: 1–100 UUIDs (repeats allowed). `bookingDate`: a real date **not
after today in the caller's time zone** (it may be before the logs' work dates), or `null` to remove the booking. Sets every listed log's booking date
in one transaction, all or nothing.
**200:** `{ items: BookingLog[] }`, the listed logs after the change (each once), in `id` order.
**Errors:** 400 validation (`bookingDate` in the future or not a date; `logIds` empty, over 100 or not UUIDs; a non-null `bookingDate` for a log that
isn't bookable → field `logIds`, "contains a log that can't be booked") · 401 · 404 `not-found` ("Time log not found.") when any id isn't the caller's
log; nothing changes on any error.

### API-RPT-001: Dashboard report
`GET /reports/dashboard?from=&to=` · Auth: bearer · Implements: FR-RPT-002…006 ([req-reporting](../01-requirements/reporting.md))
**Query:** `from`, `to`: dates, `from` ≤ `to`, at most 366 days apart, else `400`. Future dates are allowed (they have nothing).
**200:** `{ days: ReportDay[], projects: ReportProject[] }`, computed from the caller's workdays and logs whose date is in the range:
- **`ReportDay`:** `{ workDate, startMinute: number | null, workedMinutes, bookedMinutes }`, one per date that has a workday or a log, ordered by
  `workDate`. `workedMinutes` sums all of the date's logs (excluded ones too); `bookedMinutes` sums those with a booking date, whatever it is (OQ-127).
  `startMinute` is `null` for a date with logs but no workday.
- **`ReportProject`:** `{ kind: "project" | "unsorted" | "nonprod", project: Ref | null, workedMinutes, bookedMinutes }`. A log excluded from statistics
  counts under `nonprod`; else a log without a project (and no retained project name) under `unsorted`; else under its project: one row per
  `project_id`, and per retained name for deleted projects (data-model.md *Retained names*). `project` is the `Ref` (deleted → `deleted: true`),
  `null` for `unsorted` and `nonprod`, whose `bookedMinutes` is always 0. Order: the `project` rows by `workedMinutes` descending, then title, then
  `unsorted`, then `nonprod`. Rows with no logs aren't returned.

Empty range → `{ days: [], projects: [] }`. The project and task counts of FR-RPT-002 come from API-PRJ-002 and API-TSK-002 (`total`).
**Errors:** 400 validation · 401

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
