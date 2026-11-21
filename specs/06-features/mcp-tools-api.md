---
id: feat-mcp-tools-api
title: "Agent access: the MCP endpoint and its tools (API)"
status: approved
owner: Marko Angelovski
last_updated: 2026-11-21
milestone: M9
requirements: [FR-MCP-001, FR-MCP-007, FR-MCP-008, API-MCP-012]
related: [req-agents, api-endpoints, sec, ADR-0013, feat-mcp-oauth-api, OQ-288, OQ-289, OQ-297, OQ-302, OQ-306, OQ-307, OQ-308, OQ-309]
prototype: —
---

# Agent access: the MCP endpoint and its tools (API)

## Goal
An MCP client holding a PM4 MCP access token (feat-mcp-oauth-api) can call `POST /mcp` and use the ten tools of
FR-MCP-008 on its user's data, with the same validation and rules as the REST endpoints (FR-MCP-001, FR-MCP-007,
FR-MCP-008; API-MCP-012). The consent page and Connected apps tab are `feat-mcp-web`.

## Decisions
| # | Decision | Source |
| --- | --- | --- |
| D1 | SDK v2: `@modelcontextprotocol/server` + `@modelcontextprotocol/node`; `createMcpHandler` (a fresh `McpServer` per request, stateless) with `responseMode: "json"` | OQ-306 (owner, 2026-11-21) |
| D2 | An omitted `workDate` = today in the user's time zone (`get_day`, `log_time`, `set_workday_start`) | OQ-307 (owner, 2026-11-21) |
| D3 | A `pm4:read` token gets only the five read tools; the write tools are registered only for `pm4:write` | OQ-308 (owner, 2026-11-21) |
| D4 | `list_time_logs` = logs with their work date in `from..to` (a new repository query), optional project/task filter, no bookings | OQ-309 (owner, 2026-11-21) |
| D5 | `/mcp` auth lives in the global `AccessTokenGuard` (a route marked `@McpResource()` verifies an MCP token instead of a web one), so `request.user` is set before the global `RateLimitGuard` counts per user | Agent |
| D6 | Tool inputs: the SDK checks types against a zod schema, then the REST DTO class runs through the same `ValidationPipe` options as the app (limits, trims, defaults), then the REST service. Input names are the DTOs' (`workDate`, `text`), so error lines name the fields the agent sent; only `get_day` and `set_workday_start` report a bad or future `workDate` as `date`, the REST path parameter's name | Agent |
| D7 | Results are one JSON text block (no `outputSchema`, no `structuredContent`) | Agent |
| D8 | `Origin` check against `CORS_ORIGINS` (absent `Origin` passes); no `Host` check (a public, bearer-protected API). CORS stays unchanged | Agent |

## Scope
**In:** API-MCP-012 (`POST /mcp`, `GET`/`DELETE` → `405`); MCP auth in `AccessTokenGuard`; the `mcp` rate-limit
scope (120 / min per user); the ten tools; `TimeLogsService.listRange`; the shared validation-pipe options.

**Test step (main session, before T1):** install the two SDK packages (owner-approved, OQ-306):
`npm install @modelcontextprotocol/server@^2.4.0 @modelcontextprotocol/node@^2.1.2` in `api/`. Update
`rate-limits.ac.spec.ts` AC-13 to the new `DEFAULT_RATE_LIMITS` and `TEST_RATE_LIMITS` (`mcp: 1_000_000`); add `"mcp"` to
`RateLimitScope` (type only); create the acceptance tests, `test/support/mcp-test-utils.ts` and the stub
`src/mcp/report-summary.ts`. Then `pm4 hash`.

**Non-goals** (implementers must not touch these):
- `src/oauth/**` (feat-mcp-oauth-api), `web/**` (feat-mcp-web), CORS in `app.setup.ts` (D8).
- REST endpoints' behaviour: no service method changes except the new `listRange`.
- Any acceptance test (`*.ac.*`), `test/create-test-app.ts`, `test/support/mcp-test-utils.ts`.

## Read first
| Path | Why / copy this |
| --- | --- |
| `specs/03-api/endpoints.md#api-mcp-012-mcp-endpoint` | Contract: transport, auth, tools, error texts |
| `specs/03-api/endpoints.md#shared-agent-access-shapes-req-agents-adr-0013` | MCP access token claims |
| `api/node_modules/@modelcontextprotocol/server/README.md`, `api/node_modules/@modelcontextprotocol/node/README.md` | `createMcpHandler`, `McpServer.registerTool`, `toNodeHandler`, `AuthInfo`, the handler `ctx` (T1) |
| `api/src/common/guards/access-token/access-token.guard.ts`, `api/src/auth/auth.module.ts` | The guard to extend; guard order (T1) |
| `api/src/rate-limit/rate-limits.ts`, `api/src/rate-limit/rate-limit.guard.ts` | Scopes; the per-user tracker (T1) |
| `api/src/oauth/mcp-token.service.ts`, `api/src/oauth/oauth.store.ts` → `isRevoked`, `api/src/oauth/oauth-urls.ts` | Verify, revocation marker, `issuer` (T1) |
| `api/src/app.setup.ts` | Prefix exclusions; the `ValidationPipe` options to move (T1) |
| `api/src/version/version.controller.ts` | `packageJson.version` import (T1: `serverInfo.version`) |
| `api/src/time/time-logs.service.ts` → `assertDate`, `daysBetween`, `todayIn`, `toTimeLogDto`; `api/src/time/reports.service.ts` → range check | Helpers and the 366-day rule to copy (T2) |
| `api/src/time/time.repository.ts` → `listDay`, `selectRows` | The query to copy for `listRange` (T2) |
| DTOs: `api/src/projects/dto/list-projects-query.dto.ts`, `api/src/tasks/dto/{list-tasks-query,create-task,update-task}.dto.ts`, `api/src/time/dto/{create-time-log,update-time-log,set-workday,workdays-query}.dto.ts` | What each tool validates against; `PROJECT_SORTS`, `TASK_SORTS`, `TASK_STATUSES` (T2, T3) |

## Files
| App | File | C/M | Task | Notes |
| --- | --- | --- | --- | --- |
| api | `api/package.json`, `api/package-lock.json` | M | tests | The two SDK packages (OQ-306) |
| api | `api/test/mcp-endpoint.ac.e2e-spec.ts` | C | tests | AC-1…AC-5 |
| api | `api/test/mcp-tools.ac.e2e-spec.ts` | C | tests | AC-7…AC-13, AC-15…AC-19 |
| api | `api/src/mcp/report-summary.ac.spec.ts` | C | tests | AC-14 |
| api | `api/test/support/mcp-test-utils.ts` | C | tests | *Test support* |
| api | `api/src/rate-limit/rate-limits.ac.spec.ts`, `api/test/create-test-app.ts` | M | tests | AC-6 |
| api | `api/src/mcp/report-summary.ts` | C | tests, T2 | Stub in the test step |
| api | `api/src/rate-limit/rate-limits.ts` | M | tests, T1 | Test step: the `"mcp"` type; T1: `mcp: 120` |
| api | `api/src/rate-limit/rate-limit.guard.ts` | M | T1 | Per-user tracker for `mcp` |
| api | `api/src/common/decorators/mcp-resource/mcp-resource.decorator.ts` | C | T1 | `npx nest g decorator common/decorators/mcp-resource` |
| api | `api/src/common/guards/access-token/access-token.guard.ts` | M | T1 | MCP branch (D5) |
| api | `api/src/common/validation/validation-pipe.ts` | C | T1 | Shared options + `validateDto` |
| api | `api/src/app.setup.ts` | M | T1 | `"mcp"` prefix exclusion; `VALIDATION_PIPE_OPTIONS` |
| api | `api/src/mcp/mcp.module.ts`, `api/src/app.module.ts` | C, M | T1 | `npx nest g module mcp` |
| api | `api/src/mcp/mcp.controller.ts` | C | T1 | `npx nest g controller mcp --flat --no-spec` |
| api | `api/src/mcp/mcp.service.ts` | C | T1 | `npx nest g service mcp --flat --no-spec` |
| api | `api/src/mcp/mcp-tools.ts` | C | T1 | Auth type, result helpers, `userToday` |
| api | `api/src/mcp/read-tools.service.ts` | C | T1, T2 | `npx nest g service mcp/read-tools --flat --no-spec`; T1: empty `register`; T2: the tools |
| api | `api/src/mcp/write-tools.service.ts` | C | T1, T3 | `npx nest g service mcp/write-tools --flat --no-spec`; likewise |
| api | `api/src/time/time.module.ts` | M | T2 | Export `ReportsService` |
| api | `api/src/time/time-logs.service.ts`, `api/src/time/time.repository.ts` | M | T2 | `listRange` |
| api | `api/src/mcp/*.spec.ts` | C | T1, T2, T3 | Ordinary unit tests, optional |

## Interfaces

### Shared (all tasks)
```ts
// api/src/mcp/mcp-tools.ts
import type { AuthInfo, CallToolResult } from "@modelcontextprotocol/server";
/** What AccessTokenGuard puts on `request.auth` for /mcp. */
export interface McpAuthInfo extends AuthInfo { extra: { userId: string; grantId: string } }
/** `{ content: [{ type: "text", text: JSON.stringify(value) }] }`. */
export function jsonResult(value: unknown): CallToolResult;
/** `{ content: [{ type: "text", text }], isError: true }`. */
export function errorResult(text: string): CallToolResult;
/**
 * Runs a tool body. Its value → jsonResult. An HttpException → errorResult:
 *  400 with `errors` → "Invalid input:\n- <field>: <message>" (one line per error, in order);
 *  any other 4xx → its message (e.g. "Task not found.").
 * Anything else → logger.error(err), errorResult("Something went wrong. Try again later.").
 */
export function runTool(logger: Logger, body: () => Promise<unknown>): Promise<CallToolResult>;
/** Today in the user's time zone (`todayIn`); no user → UnauthorizedException. */
export function userToday(users: UsersRepository, userId: string): Promise<string>;

// api/src/common/validation/validation-pipe.ts
export const VALIDATION_PIPE_OPTIONS: ValidationPipeOptions;  // exactly app.setup.ts's options today
/** `new ValidationPipe(VALIDATION_PIPE_OPTIONS).transform(value, { type, metatype: cls })`: the DTO instance, or the
 *  same BadRequestException({ errors }) a request gets. */
export function validateDto<T extends object>(cls: new () => T, value: Record<string, unknown>, type: "body" | "query"): Promise<T>;
```
Tool registration (T2, T3 copy this): `server.registerTool(name, { title, description, inputSchema: z.object({…}),
annotations }, (args) => runTool(this.logger, async () => …))`. `import * as z from "zod"`. Leave out keys whose
value is `undefined` before `validateDto` (`forbidNonWhitelisted` is fine with absent keys). Read tools:
`annotations: { readOnlyHint: true }`; write tools: `{ readOnlyHint: false, destructiveHint: false }`, plus
`idempotentHint: true` on `set_task_status` and `set_workday_start`. `title` = FR-MCP-008's *Tool* column; `description`:
one or two sentences naming units and defaults (e.g. "minutes, a multiple of 15", "default: today in the user's time
zone").
```ts
// read-tools.service.ts / write-tools.service.ts
@Injectable() export class McpReadTools { register(server: McpServer, userId: string): void }
@Injectable() export class McpWriteTools { register(server: McpServer, userId: string): void }
```

### Endpoint, auth and rate limit (T1)
- **Decorator:** `export const IS_MCP_RESOURCE_KEY = "pm4:mcpResource"; export const McpResource = () =>
  SetMetadata(IS_MCP_RESOURCE_KEY, true);`
- **`AccessTokenGuard`** gains `McpTokenService`, `OAuthStore` and `AppConfigService`. After the `@Public()` check, when
  `IS_MCP_RESOURCE_KEY` is set (handler or class): `claims = token ? mcpTokens.verify(token) : null`; when `!claims` or
  `await oauthStore.isRevoked(claims.grantId)`: set `WWW-Authenticate` to `Bearer resource_metadata="<issuer>/.well-known/
  oauth-protected-resource/mcp"` (`oauthUrls(config).issuer`), adding `, error="invalid_token"` when a token was sent, and
  throw `UnauthorizedException("Missing or invalid access token.")`. Otherwise `request.user = { id: claims.userId }`,
  `request.auth = { token, clientId: claims.clientId, scopes: claims.scopes, extra: { userId, grantId } }`. Web routes
  are unchanged (an MCP token still fails `AccessTokenService.verify`).
- **Rate limits:** `RateLimitScope` adds `"mcp"`; `DEFAULT_RATE_LIMITS.limits.mcp = 120`. The guard's tracker is
  `"u:" + user.id` when the scope is `"user"` **or `"mcp"`** and `req.user` is set, else per IP.
- **`app.setup.ts`:** `"mcp"` joins the `setGlobalPrefix` exclusions; `new ValidationPipe(VALIDATION_PIPE_OPTIONS)`.
- **`McpController`** (`@Controller("mcp")`, `@McpResource()`, `@RateLimit("mcp")`, `@ApiExcludeController()`):
  - `@Post() handle(@Req() req, @Res() res): Promise<void>`: an `Origin` header not in `config.corsOrigins` →
    `ForbiddenException("Origin not allowed.")`; otherwise `mcp.handle(req, res)`.
  - `@Get()` and `@Delete()` (two methods): `res.status(405).setHeader("Allow", "POST").json({ jsonrpc: "2.0",
    error: { code: -32000, message: "Method not allowed." }, id: null })`.
- **`McpService`** (`OnModuleDestroy`): one `createMcpHandler(factory, { responseMode: "json" })` and its
  `toNodeHandler` built in the constructor. `factory` reads the `McpAuthInfo` the SDK passes through (from
  `req.auth`), creates `new McpServer({ name: "pm4", version: packageJson.version }, { instructions })` and calls
  `readTools.register(server, userId)`, then `writeTools.register(server, userId)` only when `scopes` includes
  `"pm4:write"` (D3). `handle(req, res)` = `node(req, res, req.body)`. `onModuleDestroy` closes the handler.
  `instructions`: "PM4: the signed-in user's projects, tasks and time logs. Dates are YYYY-MM-DD in the user's
  calendar; durations and start times are minutes, in multiples of 15."
- **`McpModule`** imports `ProjectsModule`, `TasksModule`, `TimeModule`, `UsersModule`; provides `McpService`,
  `McpReadTools`, `McpWriteTools`.

### Read tools (T2)
| Tool | zod input | Body |
| --- | --- | --- |
| `search_projects` | `query?: string, sort?: enum(PROJECT_SORTS), page?: int ≥ 1, pageSize?: int 1–100` | `projects.list(userId, validateDto(ListProjectsQueryDto, { q: query, sort, page, pageSize }, "query"))` |
| `search_tasks` | as above with `TASK_SORTS`, plus `projectId?: z.uuid(), status?: array(enum(TASK_STATUSES)).min(1)` | `tasks.list(userId, validateDto(ListTasksQueryDto, { q: query, … }, "query"))` |
| `get_day` | `workDate?: string` | `workdays.getDay(userId, workDate ?? await userToday(…))` |
| `list_time_logs` | `from: string, to: string, projectId?: z.uuid(), taskId?: z.uuid()` | `timeLogs.listRange(userId, { from, to, projectId, taskId })` |
| `report_summary` | `from: string, to: string` | `q = validateDto(WorkdaysQueryDto, { from, to }, "query")`; `summarizeReport(await reports.dashboard(userId, q), from, to, user.dailyTargetMinutes)` (user from `UsersRepository.findById`) |
```ts
// time-logs.service.ts: assertDate(from, "from"), assertDate(to, "to"), 0 ≤ daysBetween ≤ 366 else the reports
// service's 400 on "to"; totalMinutes = sum of every item's durationMinutes.
listRange(userId: string, range: { from: string; to: string; projectId?: string; taskId?: string }):
  Promise<{ from: string; to: string; totalMinutes: number; items: TimeLogResponseDto[] }>;
// time.repository.ts: user's logs with workDate between from and to, AND projectId / taskId when given;
// order workDate asc, id asc (as listDay).
listRange(userId: string, from: string, to: string, filter: { projectId?: string; taskId?: string }): Promise<TimeLogRow[]>;

// api/src/mcp/report-summary.ts (pure)
/** Monday–Friday dates in [from, to] (UTC calendar arithmetic on YYYY-MM-DD); 0 when to < from. */
export function weekdaysBetween(from: string, to: string): number;
export interface ReportSummary { from: string; to: string; workedMinutes: number; bookedMinutes: number;
  nonprodMinutes: number; weekdays: number; dailyTargetMinutes: number; targetMinutes: number; projects: ReportProjectDto[] }
/** Sums report.days' worked/booked/nonprod; targetMinutes = weekdays × dailyTargetMinutes (FR-RPT-004); projects as given. */
export function summarizeReport(report: DashboardReportResponseDto, from: string, to: string, dailyTargetMinutes: number): ReportSummary;
```

### Write tools (T3)
| Tool | zod input | Body |
| --- | --- | --- |
| `log_time` | `workDate?: string, durationMinutes: int, text: string, title?: string \| null, projectId?: uuid \| null, taskId?: uuid \| null, excludeFromStats?: boolean, dayStartMinute?: int` | `timeLogs.create(userId, validateDto(CreateTimeLogDto, { …args, workDate: workDate ?? today }, "body"))` |
| `update_time_log` | `id: z.uuid()`, then every `log_time` field optional (no default date) | `timeLogs.update(userId, id, validateDto(UpdateTimeLogDto, rest, "body"))` |
| `create_task` | `projectId: z.uuid(), title: string, description?: string \| null, status?: enum(TASK_STATUSES), dueDate?: string \| null, serviceId?: uuid \| null, externalLink?: string \| null` | `tasks.create(userId, validateDto(CreateTaskDto, args, "body"))` |
| `set_task_status` | `id: z.uuid(), status: enum(TASK_STATUSES)` | `tasks.update(userId, id, validateDto(UpdateTaskDto, { status }, "body"))` |
| `set_workday_start` | `workDate?: string, startMinute: int` | `dto = validateDto(SetWorkdayDto, { startMinute }, "body")`; `workdays.setStart(userId, workDate ?? today, dto.startMinute)` |

`update_time_log`'s description says that sending `projectId` or `taskId` replaces the log's link as a unit.

### Test support (test step)
```ts
// api/test/support/mcp-test-utils.ts
/** HS256 with the HKDF MCP key (as mcp-oauth.ac.e2e-spec.ts verifies), iss http://localhost:3001,
 *  aud iss + "/mcp", sub, gid (default a random UUID), client_id "https://client.example/app.json",
 *  scope "pm4:read" | "pm4:read pm4:write" (default write), exp now + 900 (overridable). */
export function mcpAccessTokenFor(userId: string, opts?: { scope?: "read" | "write"; grantId?: string; aud?: string; expiresIn?: number; secret?: "mcp" | "web" }): string;
/** POST /mcp with Content-Type application/json, Accept "application/json, text/event-stream",
 *  MCP-Protocol-Version 2025-11-25 and the bearer token. */
export function mcpPost(app: INestApplication, token: string | null, body: unknown, headers?: Record<string, string>): supertest.Test;
/** tools/call → the result ({ content, isError? }); parses content[0].text as JSON in `json` when not an error. */
export function callTool(app: INestApplication, token: string, name: string, args: Record<string, unknown>): Promise<{ isError: boolean; text: string; json: unknown }>;
```
Stub: `report-summary.ts` with both functions throwing `new Error("not implemented (feat-mcp-tools-api)")`.

## Acceptance criteria
`ISSUER` = `http://localhost:3001`; `WEB` = `http://localhost:3000` (`CORS_ORIGINS`). Users from `insertUser()` (time zone
`Europe/Zagreb`, daily target 420); data from `project-test-utils.ts` or the REST API with `accessTokenFor`.

| AC | Case → expected | Test | Task |
| --- | --- | --- | --- |
| AC-1 | `initialize` (2025-11-25) with a write token → `200` `application/json`, `result.serverInfo.name` `"pm4"`, `result.capabilities.tools` present; no `Mcp-Session-Id` header | `api/test/mcp-endpoint.ac.e2e-spec.ts` | T1 |
| AC-2 | `401` Problem Details `unauthorized` for: no token (`WWW-Authenticate` exactly `Bearer resource_metadata="ISSUER/.well-known/oauth-protected-resource/mcp"`); a web access token, an expired MCP token, `aud` `http://other.example/mcp`, an MCP-shaped token signed with `JWT_ACCESS_SECRET`, a valid token whose `gid` has `mcp:revoked:<gid>` in Redis (each: the header ends `, error="invalid_token"`) | `api/test/mcp-endpoint.ac.e2e-spec.ts` | T1 |
| AC-3 | `POST /api/v1/mcp` with a valid token → `404`; `GET /mcp` and `DELETE /mcp` with a valid token → `405`, `Allow: POST` | `api/test/mcp-endpoint.ac.e2e-spec.ts` | T1 |
| AC-4 | `Origin: https://evil.example` → `403` `forbidden`; `Origin: WEB` and no `Origin` → `200` | `api/test/mcp-endpoint.ac.e2e-spec.ts` | T1 |
| AC-5 | `RATE_LIMITS` `mcp: 2`: user A's third POST → `429` `rate-limited` with `Retry-After`; user B's first POST → `200` | `api/test/mcp-endpoint.ac.e2e-spec.ts` | T1 |
| AC-6 | feat-api-rate-limit AC-13 (updated): `DEFAULT_RATE_LIMITS` = feat-mcp-oauth-api D10's object with `mcp: 120` | `api/src/rate-limit/rate-limits.ac.spec.ts` | T1 |
| AC-7 | `tools/list`: a write token → exactly the ten names of API-MCP-012; a read token → exactly `search_projects`, `search_tasks`, `get_day`, `list_time_logs`, `report_summary`; every tool has an `inputSchema` of type `object` and a `description` | `api/test/mcp-tools.ac.e2e-spec.ts` | T3 |
| AC-8 | A read token calling `log_time` → a JSON-RPC error or an `isError` result, and the day has no new log | `api/test/mcp-tools.ac.e2e-spec.ts` | T3 |
| AC-9 | `search_projects` `{query: "Alpha"}` → only the user's "Alpha site" (not "Beta", not another user's "Alpha other"), `page 1`, `pageSize 25`, `total 1`; `{pageSize: 101}` → `isError` | `api/test/mcp-tools.ac.e2e-spec.ts` | T2 |
| AC-10 | `search_tasks` `{projectId: P, status: ["in-progress"]}` → only P's in-progress tasks | `api/test/mcp-tools.ac.e2e-spec.ts` | T2 |
| AC-11 | `get_day` `{}` → `workDate` = today in `Europe/Zagreb`; `{workDate: "2026-01-05"}` with two logs → both in entry order, with the day's `startMinute`; `{workDate: "2026-13-01"}` → `isError`, text has `- date: must be a date in YYYY-MM-DD format` | `api/test/mcp-tools.ac.e2e-spec.ts` | T2 |
| AC-12 | `list_time_logs` `2026-01-05…2026-01-06` → only logs of those dates, by date then entry order, `totalMinutes` their sum; a 2026-01-07 log and another user's log absent; `projectId` narrows to P's logs; `2026-01-01…2027-01-03` → `isError` with `- to: must not be before from and at most 366 days after it` | `api/test/mcp-tools.ac.e2e-spec.ts` | T2 |
| AC-13 | `report_summary` `2026-01-01…2026-01-04` with 120 min on P on Thu 1 Jan and 60 min on P on Sat 3 Jan → `workedMinutes 180, bookedMinutes 0, weekdays 2, dailyTargetMinutes 420, targetMinutes 840`, `projects` = `[{kind: "project", project: {title: P's}, workedMinutes: 180, bookedMinutes: 0}]` | `api/test/mcp-tools.ac.e2e-spec.ts` | T2 |
| AC-14 | `weekdaysBetween`: `2026-01-01…2026-01-04` → 2; `2026-01-05…2026-01-11` → 5; `2026-01-03…2026-01-03` → 0; `to` before `from` → 0. `summarizeReport` sums the days and multiplies the target | `api/src/mcp/report-summary.ac.spec.ts` | T2 |
| AC-15 | `log_time` `{durationMinutes: 60, text: "Wrote spec", projectId: P, dayStartMinute: 540}` → a `TimeLog` dated today; `GET /api/v1/workdays/{today}` shows it and `startMinute 540` | `api/test/mcp-tools.ac.e2e-spec.ts` | T3 |
| AC-16 | `log_time` → `isError` with: a future `workDate` → `- workDate: must not be after today`; a date with no start and no `dayStartMinute` → `- dayStartMinute: is required when the day has no start time`; `durationMinutes: 20` → a `- durationMinutes:` line; another user's `taskId` → `Task not found.`; no `text` → `isError` (input schema) | `api/test/mcp-tools.ac.e2e-spec.ts` | T3 |
| AC-17 | `update_time_log` `{id, durationMinutes: 90}` → the log with 90; another user's log id → `isError` `Time log not found.` | `api/test/mcp-tools.ac.e2e-spec.ts` | T3 |
| AC-18 | `create_task` `{projectId: P, title: "Draft"}` → a `Task` with status `upcoming`; `set_task_status` `{id, status: "in-progress"}` → that status; another user's task id → `isError` `Task not found.` | `api/test/mcp-tools.ac.e2e-spec.ts` | T3 |
| AC-19 | `set_workday_start` `{startMinute: 480}` → `{workDate: today, startMinute: 480}`; `{startMinute: 485}` → `isError` with a `- startMinute:` line | `api/test/mcp-tools.ac.e2e-spec.ts` | T3 |
| AC-20 | `openapi.json` is current and has no `/mcp` path | check | T1 |

## Checks
```bash
# AC-20: /mcp stays out of the contract, which is current
node -e "const p=require('./api/openapi.json').paths; process.exit(Object.keys(p).some(k=>/\/mcp$/.test(k))?1:0)"
tmp=$(mktemp -d)
cp api/openapi.json "$tmp/"
(cd api && npm run -s openapi:export) && cmp -s api/openapi.json "$tmp/openapi.json"
```

## Tasks
| # | Task | App | Size | Tier | Why this tier | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | The `/mcp` endpoint: MCP auth in `AccessTokenGuard`, `mcp` rate limit, prefix exclusion, shared validation options, `McpService` with the SDK handler, controller with the Origin check and `405`s, tool helpers, empty tool services | api | M | sonnet | Auth logic in the global guard and a new SDK integrated for the first time (task-routing sonnet triggers) | — |
| T2 | Read tools: `search_projects`, `search_tasks`, `get_day`, `list_time_logs` (+ `listRange`), `report_summary` (+ `report-summary.ts`) | api | M | haiku | Each tool is a spelled-out mapping onto an existing service, copying T1's registration pattern; one query copies `listDay` | T1 |
| T3 | Write tools: `log_time`, `update_time_log`, `create_task`, `set_task_status`, `set_workday_start` | api | S | haiku | Same pattern as T2 onto existing services; no new logic | T2 |

## Agents
| Step | Agent | Date |
| --- | --- | --- |
| Prototype | — | — |
| Spec | `claude-code/claude-opus-5-5` | 2026-11-21 |
| Tasks (`pm4 tasks`) | `claude-code/claude-opus-5-5` | 2026-11-21 |
| Acceptance tests | `claude-code/claude-sonnet-5-5`, checked by `claude-code/claude-opus-5-5` (stub, `"mcp"` scope with placeholder `mcp: 0` by `claude-code/claude-opus-5-5`) | 2026-11-21 |

## Open questions
— (OQ-306…OQ-309 resolved)

## Changelog
- 2026-11-21: Initial draft (OQ-306…OQ-309 decided with the owner the same day). Status `review`.
- 2026-11-21: Approved by the owner.
