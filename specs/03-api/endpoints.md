---
id: api-endpoints
title: API Endpoints
status: draft
owner: Marko Angelovski
last_updated: 2026-10-03
related: [api-conventions, api-data-model, req-auth, req-projects, req-tasks, req-time-logs, req-reporting, req-trash]
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
| API-SYS-001 | GET | `/health` (root) | NFR-003 | TODO |
| API-SYS-002 | — | (removed: the purge is a background job, ADR-0011) | — | — |
| API-SYS-003 | GET | `/version` → `{version}` (public, no DB/Redis) | SCR-004 | specified |
| API-AUTH-001 | GET | `/auth/google?returnTo=&timeZone=` → 302 Google | FR-AUTH-001, FR-AUTH-006 | specified |
| API-AUTH-002 | GET | `/auth/google/callback` → 302 web `/auth/callback` (or `/auth/sign-in?error=`) | FR-AUTH-001/002 | specified |
| API-AUTH-003 | POST | `/auth/token` `{code}` → tokens | FR-AUTH-001 | specified |
| API-AUTH-004 | POST | `/auth/refresh` `{refreshToken}` → tokens | FR-AUTH-003 | specified |
| API-AUTH-005 | POST | `/auth/logout` `{refreshToken}` | FR-AUTH-004 | specified |
| API-AUTH-006 | POST | `/auth/logout-all` (bearer) → revokes all of the user's sessions | FR-AUTH-007 | specified |
| API-USR-001 | GET | `/me` | FR-AUTH-006 | specified |
| API-USR-002 | PATCH | `/me` `{timeZone}` (with the settings screen, OQ-064) | FR-AUTH-006 | TODO |
| API-USR-003 | GET | `/users?q=` (project-lead picker, OQ-089) | FR-PRJ-006 | specified |
| API-PRJ-001 | POST | `/projects` | FR-PRJ-001 | specified |
| API-PRJ-002 | GET | `/projects?q=&sort=&page=&pageSize=` (with task counts) | FR-PRJ-002 | specified |
| API-PRJ-003 | GET | `/projects/{id}` | FR-PRJ-003, FR-PRJ-008 | specified |
| API-PRJ-004 | PATCH | `/projects/{id}` | FR-PRJ-004 | specified |
| API-PRJ-005 | DELETE | `/projects/{id}` (soft) | FR-PRJ-005 | specified |
| API-PRJ-006 | POST | `/projects/{id}/restore` (built in M2, OQ-090) | FR-TRASH-002, FR-PRJ-003 | specified |
| API-PRJ-007 | DELETE | `/projects/{id}/permanent` | FR-TRASH-004 | TODO |
| API-TSK-001 | POST | `/tasks` | FR-TSK-001 | specified |
| API-TSK-002 | GET | `/tasks?projectId=&status=&q=&sort=&page=&pageSize=` | FR-TSK-002/003, picker | specified |
| API-TSK-003 | GET | `/tasks/{id}` | FR-TSK-004 | specified |
| API-TSK-004 | PATCH | `/tasks/{id}` (incl. status, projectId) | FR-TSK-005/006 | specified |
| API-TSK-005 | DELETE | `/tasks/{id}` (soft) | FR-TSK-007 | specified |
| API-TSK-006 | POST | `/tasks/{id}/restore` (409 if project in trash; built in M3, OQ-090) | FR-TRASH-003, FR-TSK-004 | specified |
| API-TSK-007 | DELETE | `/tasks/{id}/permanent` | FR-TRASH-004 | TODO |
| API-WD-001 | GET | `/workdays?from=&to=` | FR-TLOG-009, FR-TLOG-013 | TODO |
| API-WD-002 | PUT | `/workdays/{date}` `{startMinute}` | FR-TLOG-009 | TODO |
| API-TLOG-001 | GET | `/time-logs?from=&to=&taskId=&projectId=` (ordered by workDate, position; with task/project ref objects) | FR-TLOG-001/002/003/012 | TODO |
| API-TLOG-002 | POST | `/time-logs` `{workDate, durationMinutes, note, taskId?, projectId?, position?}` (appends, or inserts at `position`) | FR-TLOG-004/005/007 | TODO |
| API-TLOG-003 | GET | `/time-logs/{id}` | — | TODO |
| API-TLOG-004 | PATCH | `/time-logs/{id}` `{durationMinutes?, note?, taskId?, projectId?, workDate?}` | FR-TLOG-006 | TODO |
| API-TLOG-005 | POST | `/time-logs/{id}/move` `{position}` (renumbers the day) | FR-TLOG-007 | TODO (OQ-036) |
| API-TLOG-006 | DELETE | `/time-logs/{id}` (renumbers the day) | FR-TLOG-008 | TODO (OQ-030a) |
| API-TLOG-007 | GET | `/time-logs/recent-links?limit=` (recently used tasks/projects for the picker) | FR-TLOG-005 | TODO |
| API-TRASH-001 | GET | `/trash` (projects with nested cascaded tasks, individually deleted tasks, purge dates) | FR-TRASH-001 | TODO |
| API-RPT-001 | GET | `/reports/summary?from=&to=` → `{totalMinutes, projects: [{project: Ref\|null, minutes}]}` | FR-RPT-002/003 | TODO |
| API-RPT-002 | GET | `/reports/daily?from=&to=&projectIds=` → `{dates: [...], series: [{key, project: Ref\|null, minutes: [...]}]}` (zero-filled) | FR-RPT-004/005, FR-TLOG-013 | TODO |

## Endpoint details
TODO: write each endpoint using the template once its requirement spec reaches `review`.

### API-SYS-003: API version
`GET /version` · Auth: none (public) · Implements: SCR-004 (OQ-052)
Returns the `version` field of `api/package.json` of the running build. Touches neither Postgres nor
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
**200:** `Me` = `{ id: string, email: string, displayName: string, avatarUrl: string | null, timeZone: string, createdAt: string }`
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
  project's tasks that aren't individually deleted. The completed percentage is left to the client.
- **`Project`:** `{ id, title, description: string | null, externalLink: string | null, projectLead: ProjectLead | null,
  taskCounts: TaskCounts, createdAt, updatedAt }` (instants ISO 8601 UTC).
- **`Task`:** `{ id, project: Ref, title, description: string | null, externalLink: string | null,
  projectLead: ProjectLead | null, status: "upcoming" | "in-progress" | "completed", dueDate: string | null,
  createdAt, updatedAt }`. `Ref` = `{ id, title, deleted }` (conventions.md *Responses*), `deleted: false` here.
- **Ids in paths:** a value that isn't a UUID → `404` `…/errors/not-found` (never `400`, never a database error).
- **In the trash:** reading or changing a soft-deleted project, or an effectively deleted task, by id → `404`
  `…/errors/in-trash`. For a task, the Problem Details body also has `projectId: string` and
  `projectInTrash: boolean` (true when the task's **project** is in the trash), so the web can offer
  "Restore project" (FR-TRASH-003).
- **Updated date:** any successful `PATCH` sets `updatedAt` to now. Task changes never touch the project's `updatedAt` (OQ-091).
  Delete and restore change only `deletedAt`.
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
The caller's projects that aren't in the trash. `sort` ∈ `updatedAt:desc` (default), `updatedAt:asc`,
`createdAt:desc`, `createdAt:asc`, `title:asc`, `title:desc` (title compared case-insensitively).
**200:** `{ items: Project[], page, pageSize, total }`
**Errors:** 400 validation · 401

### API-PRJ-003: Get project
`GET /projects/{id}` · Auth: bearer · Implements: FR-PRJ-003, FR-PRJ-008
**200:** `Project`
**Errors:** 401 · 404 `not-found` (missing, not a UUID, or another user's) · 404 `in-trash`

### API-PRJ-004: Update project
`PATCH /projects/{id}` · Auth: bearer · Implements: FR-PRJ-004
**Request body:** the create fields, all optional; `title` may not be `null`. An empty body is valid (only `updatedAt` changes).
**200:** `Project`
**Errors:** 400 validation · 401 · 404 `not-found` · 404 `in-trash`

### API-PRJ-005: Delete project
`DELETE /projects/{id}` · Auth: bearer · Implements: FR-PRJ-005
Sets `deletedAt`. The project's tasks aren't changed; they count as deleted through their project (FR-TRASH rules).
**204**
**Errors:** 401 · 404 `not-found` · 404 `in-trash` (already deleted)

### API-PRJ-006: Restore project
`POST /projects/{id}/restore` · Auth: bearer · Implements: FR-TRASH-002 (OQ-090)
Clears `deletedAt`. Tasks deleted individually stay in the trash. A project that isn't in the trash → `204`, no change.
Works until the purge has run (FR-TRASH-005).
**204**
**Errors:** 401 · 404 `not-found`

### API-TSK-001: Create task
`POST /tasks` · Auth: bearer · Implements: FR-TSK-001
**Request body:** `{ projectId: uuid, title: string(1–200), description?: string(≤2000) | null, externalLink?: string(≤500) | null,
projectLeadUserId?: uuid | null, projectLeadName?: string(≤100) | null, status?: TaskStatus (default "upcoming"), dueDate?: date | null }`
**201:** `Task`
**Errors:** 400 validation · 401 · 404 `not-found` when `projectId` is missing, another user's, or in the trash

### API-TSK-002: List tasks
`GET /tasks?projectId=&status=&q=&sort=&page=&pageSize=` · Auth: bearer · Implements: FR-TSK-002, FR-TSK-003
The caller's tasks that aren't effectively deleted. `projectId`: one project (a missing, foreign or trashed one gives
`items: []`, not an error). `status`: a comma-separated non-empty subset of the three statuses; absent = all.
`sort` ∈ `updatedAt:desc` (default), `updatedAt:asc`, `dueDate:asc`, `dueDate:desc`, `title:asc`, `title:desc`;
tasks without a due date come last in both `dueDate` directions (OQ-085).
**200:** `{ items: Task[], page, pageSize, total }`
**Errors:** 400 validation (also a non-UUID `projectId` or an unknown status) · 401

### API-TSK-003: Get task
`GET /tasks/{id}` · Auth: bearer · Implements: FR-TSK-004
**200:** `Task`
**Errors:** 401 · 404 `not-found` · 404 `in-trash` (with `projectId`, `projectInTrash`)

### API-TSK-004: Update task
`PATCH /tasks/{id}` · Auth: bearer · Implements: FR-TSK-005, FR-TSK-006
**Request body:** the create fields, all optional; `projectId`, `title` and `status` may not be `null`.
A new `projectId` moves the task (it must be the caller's and not in the trash, else `404` `not-found`).
The time-logs feature (M4) adds moving the task's logs (data-model.md *time_logs*).
**200:** `Task`
**Errors:** 400 validation · 401 · 404 `not-found` · 404 `in-trash`

### API-TSK-005: Delete task
`DELETE /tasks/{id}` · Auth: bearer · Implements: FR-TSK-007
Sets the task's `deletedAt`. Linked time logs stay (FR-TRASH-006).
**204**
**Errors:** 401 · 404 `not-found` · 404 `in-trash`

### API-TSK-006: Restore task
`POST /tasks/{id}/restore` · Auth: bearer · Implements: FR-TRASH-003 (OQ-090)
Clears the task's `deletedAt`. A task that isn't deleted → `204`, no change.
**204**
**Errors:** 401 · 404 `not-found` · 409 `conflict` when the task's project is in the trash (restore the project instead)

## Open questions
OQ-029, OQ-030, OQ-036

## Changelog
- 2026-09-26: Initial scaffold.
- 2026-09-26: Updated with owner answers to OQ-001–018.
- 2026-09-26: Added API-AUTH-006 (sign out of all devices, OQ-023).
- 2026-09-27: API-SYS-002 removed (OQ-031, ADR-0011).
- 2026-10-01: OQ-050: no trailing slashes (`trailingSlash: false`); detail routes `/app/project?id=` and `/app/task?id=` (feat-land-app-route-split).
- 2026-10-02: Added API-SYS-003 `GET /version` (OQ-052, feat-shell-sidebar-branding).
- 2026-10-02: The owner approved API-SYS-003 for feat-shell-sidebar-branding.
- 2026-10-02: Detailed API-AUTH-001…006 and API-USR-001, shared auth shapes, default-deny protection (OQ-061…066, feat-auth-api-session).
- 2026-10-02: The owner approved API-AUTH-001…006 and API-USR-001 (with *Shared auth shapes*) for feat-auth-api-session.
- 2026-10-03: Detailed API-USR-003, API-PRJ-001…006 and API-TSK-001…006 with the shared project and task shapes (OQ-076…OQ-091; feat-prj-api, feat-tsk-api). Logged-time totals dropped from API-PRJ-002 (OQ-080).
- 2026-10-03: The owner approved *Shared project and task shapes*, API-USR-003, API-PRJ-001…006 and API-TSK-001…006 for feat-prj-api, feat-prj-web, feat-tsk-api and feat-tsk-web.
