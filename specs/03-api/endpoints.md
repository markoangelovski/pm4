---
id: api-endpoints
title: API Endpoints
status: draft
owner: Marko Angelovski
last_updated: 2026-10-02
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
| API-PRJ-001 | POST | `/projects` | FR-PRJ-001 | TODO |
| API-PRJ-002 | GET | `/projects?q=&sort=&page=&pageSize=` (includes counts + total minutes) | FR-PRJ-002 | TODO |
| API-PRJ-003 | GET | `/projects/{id}` | FR-PRJ-003 | TODO |
| API-PRJ-004 | PATCH | `/projects/{id}` | FR-PRJ-004 | TODO |
| API-PRJ-005 | DELETE | `/projects/{id}` (soft) | FR-PRJ-005 | TODO |
| API-PRJ-006 | POST | `/projects/{id}/restore` | FR-TRASH-002 | TODO |
| API-PRJ-007 | DELETE | `/projects/{id}/permanent` | FR-TRASH-004 | TODO |
| API-TSK-001 | POST | `/tasks` | FR-TSK-001 | TODO |
| API-TSK-002 | GET | `/tasks?projectId=&status=&q=&sort=&page=&pageSize=` | FR-TSK-002/003, picker | TODO |
| API-TSK-003 | GET | `/tasks/{id}` | FR-TSK-004 | TODO |
| API-TSK-004 | PATCH | `/tasks/{id}` (incl. status, projectId) | FR-TSK-005/006 | TODO |
| API-TSK-005 | DELETE | `/tasks/{id}` (soft) | FR-TSK-007 | TODO |
| API-TSK-006 | POST | `/tasks/{id}/restore` (409 if project in trash) | FR-TRASH-003 | TODO |
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
