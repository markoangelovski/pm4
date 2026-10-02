---
id: api-conventions
title: API Conventions
status: approved
owner: Marko Angelovski
last_updated: 2026-10-02
related: [api-endpoints, api-data-model, sec, ADR-0010]
---

# API Conventions

## Purpose
Rules that every endpoint follows.

## General
- REST over HTTPS, JSON only. Base path `/api/v1`. `/health` sits outside the version prefix.
- Resource names are plural and kebab-case: `/projects`, `/tasks`, `/workdays`, `/time-logs`.
- JSON fields are camelCase. IDs are UUIDv7 strings in the standard 36-char form (OQ-027).
- Auth: `Authorization: Bearer <accessToken>` on everything except the public endpoints: `/health`,
  `/api/v1/version` and API-AUTH-001…005 (`/api/v1/auth/logout-all` needs the token). Enforced by a global
  guard; public handlers are marked `@Public()` (OQ-066). `@CurrentUser()` gives a handler the user id.

## Dates and times
This resolves OQ-015. **Two kinds of values. Never mix them.**

| Kind | Examples | DB type | API format | Who decides |
| --- | --- | --- | --- | --- |
| **Instant** (a moment in time) | `createdAt`, `updatedAt`, `deletedAt` | `timestamptz` | ISO 8601 UTC: `2026-09-26T08:15:00.000Z` | Server clock |
| **Work date** (a calendar day in the user's life) | `workDate`, `dueDate`, report `from`/`to` | `date` | ISO 8601 date: `2026-09-26` | The client, in the user's time zone |
| **Time of day** | Workday start | `smallint` minutes after local midnight | integer `startMinute` (e.g. `510` = 08:30) | The client |

Why work dates are **not** timestamps: a log for "26 Sept" entered in Zagreb at 00:30 CEST is
`2026-09-25T22:30Z` in UTC. Storing a timestamp would put it on the wrong day in UTC-based grouping.
(The legacy `makeDate` had exactly this bug: it truncated to UTC midnight.) A `date` column is
unambiguous, takes 4 bytes, and groups trivially.

Rules:
- The **client** turns "today", "this month" and date-range presets into `YYYY-MM-DD` values using the
  user's IANA time zone (e.g. `Europe/Zagreb`, which handles the CET/CEST switch) via `@date-fns/tz`.
- The **server** never uses its own clock or zone to decide a work date. Report ranges are inclusive
  (`from ≤ workDate ≤ to`). Grouping is by `work_date`, with no time-zone math in SQL.
- The server uses instants only for audit, and for trash retention (`deletedAt < now() - 31 days`).

## Module structure (NestJS)
Modules: `auth`, `users`, `projects`, `tasks`, `workdays`, `time-logs`,
`reports`, `trash`, `health`, `jobs` (BullMQ queues and processors, ADR-0011; no controller). Each has a controller (HTTP only), a service (business rules,
transactions), a repository (Drizzle queries, **always scoped by userId**) and DTOs. Shared: `database`
(Drizzle client + schema), `redis`, `common` (filters, pipes, guards, decorators such as `@CurrentUser()`).

## Code generation (Nest CLI)
- **Always create Nest building blocks with the Nest CLI**, from `api/`: `npx nest generate <schematic> <name>`
  (short form `npx nest g`). This applies to `module`, `controller`, `service`, `guard`, `pipe`, `filter`,
  `interceptor`, `decorator`, `middleware`, `provider` and `class`. The CLI registers the element in its module
  and creates the matching `.spec.ts`.
- For a new feature module, use `npx nest g resource <name>` (REST, no CRUD entry points), or `module` +
  `controller` + `service`. Then add the repository with `npx nest g provider <name>/<name>.repository --flat`.
- Keep the generated `.spec.ts` files. Don't pass `--no-spec`.
- Run with `--dry-run` first when unsure where files will land.
- Hand-write only files that have no schematic: DTOs, Drizzle schema, and migrations (drizzle-kit generates those).

## Requests
- DTO validation with a global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`.
- Strings are trimmed. Empty optional strings become `null`.
- `PATCH` for partial updates. `PUT` only for idempotent upserts keyed by natural keys (`PUT /workdays/{date}`).
- Flat resources with filter params (`GET /tasks?projectId=…`, `GET /time-logs?from=&to=`). Actions that
  aren't CRUD use a sub-resource verb (`POST /time-logs/{id}/move`, `POST /projects/{id}/restore`).

## Responses
- A single resource is returned **unwrapped** (no `{data}` envelope).
- Lists use `{ "items": [...], "page": 1, "pageSize": 25, "total": 123 }`.
- `201` + the resource on create. `200` + the resource on update. `204` on delete, restore or purge.
- References to tasks/projects inside other resources use a **ref object**:
  `{ "id": "…" | null, "title": "…", "deleted": boolean }` (supports retained names, FR-TRASH-006).

## Pagination, sorting, filtering
- `?page=1&pageSize=25` (max 100). Offset pagination is fine at this scale.
- `?sort=updatedAt:desc`, with an allow-list per endpoint.
- Filters are named params. Multi-values are comma-separated (`status=upcoming,in-progress`, `projectIds=a,b`).

## Soft delete conventions
- `DELETE /projects/{id}` and `DELETE /tasks/{id}` → soft delete (moves to the trash).
- `POST /{resource}/{id}/restore` → restore. `DELETE /{resource}/{id}/permanent` → hard delete (trash only).
- Normal reads exclude soft-deleted rows. Reading a soft-deleted item by id returns `404` with
  `type …/errors/in-trash`, so the UI can offer restore.

## Errors
RFC 9457 Problem Details (`application/problem+json`):
```json
{ "type": "https://pm4.angelovski.top/errors/validation", "title": "Validation failed", "status": 400,
  "detail": "One or more fields are invalid.", "errors": [{ "field": "note", "message": "must not be empty" }] }
```
| Status | When |
| --- | --- |
| 400 | Validation error (`errors[]` per field) |
| 401 | Missing, invalid or expired access token |
| 404 | Not found, not owned, or in the trash (`type` distinguishes `not-found` from `in-trash`) |
| 409 | Conflict (e.g. restoring a task whose project is in the trash) |
| 429 | Rate limited |
| 500 | Unexpected error. No internals leaked. Logged (NestJS default logger). |

## OpenAPI
- `@nestjs/swagger` + the CLI plugin. `/docs` is served when `NODE_ENV !== production`.
- `npm run openapi:export` writes `api/openapi.json` (committed). CI fails if it's stale (ADR-0010).

## Open questions
—

## Changelog
- 2026-09-26: Initial scaffold.
- 2026-09-26: Updated with owner answers to OQ-001–018.
- 2026-09-26: OQ-027 narrowed to UUIDv7 vs ULID.
- 2026-09-27: OQ-027 resolved: UUIDv7 ids.
- 2026-09-27: Removed /internal/* (ADR-0011). Added the jobs module.
- 2026-09-27: Logging: NestJS default logger (NFR-009).
- 2026-09-27: Nest building blocks are always generated with the Nest CLI.
- 2026-09-27: Approved by the owner.
- 2026-09-27: Error `type` example uses the real web domain.
- 2026-10-02: Public endpoints listed; default-deny guard with `@Public()` and `@CurrentUser()` (OQ-066). Back to `review` (feat-auth-api-session).
- 2026-10-02: Approved by the owner.
