---
id: api-endpoints
title: API Endpoints
status: draft
owner: Marko Angelovski
last_updated: 2026-10-01
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
| API-AUTH-001 | GET | `/auth/google?returnTo=` → 302 Google | FR-AUTH-001 | TODO |
| API-AUTH-002 | GET | `/auth/google/callback` → 302 web `/auth/callback` | FR-AUTH-001/002 | TODO |
| API-AUTH-003 | POST | `/auth/token` `{code}` → tokens | FR-AUTH-001 | TODO |
| API-AUTH-004 | POST | `/auth/refresh` `{refreshToken}` → tokens | FR-AUTH-003 | TODO |
| API-AUTH-005 | POST | `/auth/logout` `{refreshToken}` | FR-AUTH-004 | TODO |
| API-AUTH-006 | POST | `/auth/logout-all` (bearer) → revokes all of the user's sessions | FR-AUTH-007 | TODO |
| API-USR-001 | GET | `/me` | FR-AUTH-006 | TODO |
| API-USR-002 | PATCH | `/me` `{timeZone}` | FR-AUTH-006 | TODO |
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

## Open questions
OQ-029, OQ-030, OQ-036

## Changelog
- 2026-09-26: Initial scaffold.
- 2026-09-26: Updated with owner answers to OQ-001–018.
- 2026-09-26: Added API-AUTH-006 (sign out of all devices, OQ-023).
- 2026-09-27: API-SYS-002 removed (OQ-031, ADR-0011).
- 2026-10-01: OQ-050: no trailing slashes (`trailingSlash: false`); detail routes `/app/project?id=` and `/app/task?id=` (feat-land-app-route-split).
