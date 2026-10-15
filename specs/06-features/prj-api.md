---
id: feat-prj-api
title: "Projects API: CRUD, task counts and the project-lead user search"
status: approved
owner: Marko Angelovski
last_updated: 2026-10-03
milestone: M2
requirements: [FR-PRJ-001, FR-PRJ-002, FR-PRJ-003, FR-PRJ-004, FR-PRJ-005, FR-PRJ-006, FR-PRJ-007, FR-PRJ-008, API-USR-003, API-PRJ-001, API-PRJ-002, API-PRJ-003, API-PRJ-004, API-PRJ-005]
related: [req-projects, api-endpoints, api-data-model, api-conventions, sec, feat-auth-api-session, feat-tsk-api, OQ-076, OQ-077, OQ-078, OQ-079, OQ-080, OQ-085, OQ-088, OQ-089, OQ-091]
---

# Projects API: CRUD, task counts and the project-lead user search

## Goal
The API lets a signed-in user create, list, read, edit and delete their
projects, each with an optional external link and a project lead that is a PM4 user or a text name,
and with live task counts. It also offers the user search behind the lead picker. Contract:
[endpoints.md → Shared project and task shapes](../03-api/endpoints.md#shared-project-and-task-shapes),
API-USR-003, API-PRJ-001…005. Tables: [data-model.md → projects, Project lead, tasks](../03-api/data-model.md#projects).
The web side is feat-prj-web; task endpoints are feat-tsk-api (OQ-088).

## Decisions
| # | Decision | Source |
| --- | --- | --- |
| D1 | The lead is a PM4 user or a text name; any registered user can be picked; informational only. | OQ-076 (owner, 2026-10-03) |
| D2 | A user lead shows the user's current name and avatar; the fallback is the name saved with it. | OQ-077 (owner) |
| D3 | User search: ≥ 2 chars, name or email contains, ≤ 10 results, caller first. | OQ-089 (owner) |
| D4 | `DELETE` removes the project for good; its tasks go with it through the `tasks.project_id` FK (`ON DELETE CASCADE`). | OQ-016 (owner) |
| D5 | Task changes never bump the project's `updatedAt`. | OQ-091 (owner) |
| D6 | No logged time in the API yet (no totals). | OQ-080 (owner) |
| D7 | This feature creates the `tasks` table too (T1), so task counts are real and tested now. feat-tsk-api adds only the endpoints. | Agent: counts need the table; one migration |
| D8 | Lead input is two flat body fields (`projectLeadUserId`, `projectLeadName`) replaced as a unit on `PATCH`; the response is one `ProjectLead` object. Flat fields validate cleanly with class-validator and generate simple OpenAPI types. | Agent |
| D9 | The lead logic (validate the user, compute the two columns, build the response) lives in one injectable, `ProjectLeadService` in `users/`, so feat-tsk-api reuses it unchanged. | Agent: first instance, reused by tasks |
| D11 | A path id that isn't a UUID → `404 not-found`, checked in the service with `isUUID` before any query. | Agent: endpoints.md *Ids in paths* |
| D12 | Trimming lives in DTO `@Transform`s (`Trim`, `TrimToNull` in `common/validation/transforms.ts`); there is no global transform. | Agent: conventions *Requests* |

## Scope
**In:** the `projects` and `tasks` tables, the `task_status` enum and their migration; the `projects` module
(API-PRJ-001…005); `GET /users` (API-USR-003); `ProjectLeadService`; shared helpers (`Trim`/`TrimToNull`,
`PageQueryDto`, `escapeLike`); the OpenAPI export.

**Before the tests are written:** feat-auth-api-session is done (T-0015…T-0017: `users`, the guard,
`@CurrentUser()`, `UsersRepository`, `api/test/support/auth-test-utils.ts`).

**Non-goals** (implementers must not touch these):
- Anything in `web/`. Task endpoints (`/tasks`, feat-tsk-api). Time logs, totals in minutes (D6).
- The auth flow, the guard, `GET /me`, `MeResponseDto`. Rate limiting.
- `api/test/*` files written in the test step (`*.ac.*`, `support/*`).

## Read first
| Path | Why / copy this |
| --- | --- |
| `specs/03-api/endpoints.md#shared-project-and-task-shapes` and API-USR-003, API-PRJ-001…005 | Contract |
| `specs/03-api/data-model.md#projects` (*projects*, *Project lead*, *tasks*) | Tables |
| `specs/03-api/conventions.md` (*Requests*, *Responses*, *Pagination*, *Errors*) | Rules |
| `api/src/users/` (controller, service, repository, `dto/me-response.dto.ts`) | Module layering, `@CurrentUser()`, `@ApiBearerAuth('bearer')`, DTO style |
| `api/src/database/schema/users.ts` | Drizzle table style, column order |
| `api/src/common/validation/flatten-validation-errors.ts` | Field error shape |
| `api/test/support/auth-test-utils.ts`, `api/test/create-test-app.ts` | How e2e tests sign in and seed |

## Files
| App | File | C/M | Task | Notes |
| --- | --- | --- | --- | --- |
| api | `api/test/projects.ac.e2e-spec.ts` | C | tests | API-PRJ-* |
| api | `api/test/users-search.ac.e2e-spec.ts` | C | tests | API-USR-003 |
| api | `api/test/support/project-test-utils.ts` | C | tests | Seeds projects/tasks rows directly |
| api | `api/src/common/sql/escape-like.ac.spec.ts` | C | tests | Unit |
| api | `api/src/common/sql/escape-like.ts` | C | tests, T2 | Typed stub from the test writer |
| api | `api/src/database/schema/projects.ts` | C | T1 | Hand-written (Drizzle): `projects`, `tasks`, `task_status` |
| api | `api/src/database/schema/index.ts` | M | T1 | Re-export |
| api | `api/drizzle/0002_projects_tasks.sql`, `api/drizzle/meta/*` | C/M | T1 | `npm run db:generate -- --name projects_tasks` |
| api | `api/src/common/validation/transforms.ts` | C | T2 | Hand-written (no schematic) |
| api | `api/src/common/dto/page-query.dto.ts` | C | T2 | Hand-written |
| api | `api/src/users/project-lead.service.ts`, `api/src/users/project-lead.service.spec.ts` | C | T2 | `npx nest g service users/project-lead --flat` |
| api | `api/src/users/dto/project-lead.dto.ts` | C | T2 | Hand-written |
| api | `api/src/users/users.module.ts` | M | T2, T3 | Export `ProjectLeadService` (T2); the CLI adds the controller (T3) |
| api | `api/src/users/users.repository.ts`, `api/src/users/users.repository.spec.ts` | M | T2, T3 | `findLeadUser` (T2), `search` (T3) |
| api | `api/src/projects/projects.module.ts` | C | T2 | `npx nest g module projects` |
| api | `api/src/projects/projects.controller.ts`, `api/src/projects/projects.controller.spec.ts` | C | T2 | `npx nest g controller projects` |
| api | `api/src/projects/projects.service.ts`, `api/src/projects/projects.service.spec.ts` | C | T2 | `npx nest g service projects` |
| api | `api/src/projects/projects.repository.ts`, `api/src/projects/projects.repository.spec.ts` | C | T2 | `npx nest g provider projects/projects.repository --flat` |
| api | `api/src/projects/dto/*.ts` | C | T2 | Hand-written |
| api | `api/src/app.module.ts` | M | T2 | The CLI adds `ProjectsModule` |
| api | `api/openapi.json` | M | T2, T3 | `npm run openapi:export` |
| api | `api/src/users/user-search.controller.ts`, `api/src/users/user-search.controller.spec.ts` | C | T3 | `npx nest g controller users/user-search --flat`, then `@Controller('users')` |
| api | `api/src/users/users.service.ts`, `api/src/users/users.service.spec.ts` | M | T3 | `search` |
| api | `api/src/users/dto/user-search.dto.ts` | C | T3 | Hand-written |

## Interfaces

### Database (T1)
```ts
// api/src/database/schema/projects.ts (column order per data-model.md storage rule 7)
export const taskStatus = pgEnum('task_status', ['upcoming', 'in-progress', 'completed']);

export const projects = pgTable('projects', {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  id: uuid('id').primaryKey().default(sql`uuidv7()`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  projectLeadUserId: uuid('project_lead_user_id').references(() => users.id, { onDelete: 'set null' }),
  title: varchar('title', { length: 200 }).notNull(),
  description: varchar('description', { length: 2000 }),
  externalLink: varchar('external_link', { length: 500 }),
  projectLead: varchar('project_lead', { length: 100 }),
}, (t) => [
  index('projects_user_id_idx').on(t.userId),
]);

export const tasks = pgTable('tasks', {
  createdAt, updatedAt,                                  // as projects
  dueDate: date('due_date', { mode: 'string' }),
  status: taskStatus('status').notNull().default('upcoming'),
  id, userId,                                            // as projects
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  projectLeadUserId,                                     // as projects
  title, description, externalLink, projectLead,         // as projects
}, (t) => [
  index('tasks_project_id_idx').on(t.projectId),
  index('tasks_user_id_status_idx').on(t.userId, t.status),
]);

export type Project = typeof projects.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type TaskStatus = (typeof taskStatus.enumValues)[number];
```
Write each column out in full (the comments above only save space here). `schema/index.ts`: add
`export * from './projects.js';`. Then `npm run db:generate -- --name projects_tasks`. Don't hand-edit the SQL.

### Shared helpers (T2)
```ts
// api/src/common/validation/transforms.ts
export const Trim = () => Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));
export const TrimToNull = () => Transform(({ value }) => (typeof value === 'string' ? value.trim() || null : value));

// api/src/common/sql/escape-like.ts
/** Escapes `\`, `%` and `_` for a Postgres LIKE/ILIKE pattern (default escape char `\`). */
export function escapeLike(value: string): string;

// api/src/common/dto/page-query.dto.ts
export class PageQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize: number = 25;
  @IsOptional() @Trim() @IsString() @MaxLength(200) q?: string;   // '' → no filter (service)
}
```

### Project lead (T2)
```ts
// api/src/users/dto/project-lead.dto.ts
export class LeadUserDto { id: string; displayName: string; @ApiProperty({ type: String, nullable: true }) avatarUrl: string | null }
export class ProjectLeadDto {
  @ApiProperty({ enum: ['user', 'text'] }) kind: 'user' | 'text';
  name: string;
  @ApiProperty({ type: LeadUserDto, nullable: true }) user: LeadUserDto | null;
}
/** Mixin fields for create/update DTOs (copy the decorators into each DTO). */
//  @IsOptional() @IsUUID() projectLeadUserId?: string | null;
//  @IsOptional() @TrimToNull() @IsString() @MaxLength(100) projectLeadName?: string | null;

// api/src/users/users.repository.ts (T2)
findLeadUser(id: string): Promise<{ id: string; displayName: string } | null>;

// api/src/users/project-lead.service.ts (exported by UsersModule)
export interface LeadColumns { projectLeadUserId: string | null; projectLead: string | null }
export interface LeadRow { projectLeadUserId: string | null; projectLead: string | null; leadDisplayName: string | null; leadAvatarUrl: string | null }
/** POST: missing fields = null. PATCH (`partial`): both absent → undefined (leave unchanged). */
toColumns(input: { projectLeadUserId?: string | null; projectLeadName?: string | null }, partial: boolean): Promise<LeadColumns | undefined>;
toDto(row: LeadRow): ProjectLeadDto | null;
```
`toColumns`: both non-null → `BadRequestException({ errors: [{ field: 'projectLeadName', message: 'must be empty when projectLeadUserId is set' }] })`.
A user id → `findLeadUser`; missing → `BadRequestException({ errors: [{ field: 'projectLeadUserId', message: 'must be an existing user' }] })`;
found → `{ projectLeadUserId: id, projectLead: displayName }`. A name → `{ null, name }`. Neither → `{ null, null }`.
`toDto`: `projectLeadUserId` and `leadDisplayName` set → `{ kind: 'user', name: leadDisplayName, user: { id, displayName: leadDisplayName, avatarUrl: leadAvatarUrl } }`;
else `projectLead` set → `{ kind: 'text', name: projectLead, user: null }`; else `null`.
Repositories get `leadDisplayName`/`leadAvatarUrl` with `LEFT JOIN users AS lead ON lead.id = x.project_lead_user_id`.

### Projects (T2)
```ts
// api/src/projects/dto/
export class CreateProjectDto {
  @Trim() @IsString() @Length(1, 200) title: string;
  @IsOptional() @TrimToNull() @IsString() @MaxLength(2000) description?: string | null;
  @IsOptional() @TrimToNull() @IsUrl({ protocols: ['http', 'https'], require_protocol: true }) @MaxLength(500) externalLink?: string | null;
  // + the two lead fields
}
export class UpdateProjectDto { /* the same fields; title: @ValidateIf((o) => o.title !== undefined) instead of required, so null → 400 */ }
export const PROJECT_SORTS = ['updatedAt:desc', 'updatedAt:asc', 'createdAt:desc', 'createdAt:asc', 'title:asc', 'title:desc'] as const;
export class ListProjectsQueryDto extends PageQueryDto { @IsOptional() @IsIn(PROJECT_SORTS) sort: ProjectSort = 'updatedAt:desc' }
export class TaskCountsDto { upcoming: number; inProgress: number; completed: number; total: number }
export class ProjectResponseDto {
  id: string; title: string;
  @ApiProperty({ type: String, nullable: true }) description: string | null;
  @ApiProperty({ type: String, nullable: true }) externalLink: string | null;
  @ApiProperty({ type: ProjectLeadDto, nullable: true }) projectLead: ProjectLeadDto | null;
  taskCounts: TaskCountsDto;
  /** ISO 8601 UTC */ createdAt: string; /** ISO 8601 UTC */ updatedAt: string;
}
export class ProjectListResponseDto { items: ProjectResponseDto[]; page: number; pageSize: number; total: number }

// api/src/projects/projects.repository.ts (every method scoped by userId)
export interface ProjectRow extends LeadRow { /* projects columns */ counts: { upcoming: number; inProgress: number; completed: number } }
insert(userId: string, values: ProjectValues): Promise<string>;                 // returns id
findById(userId: string, id: string): Promise<ProjectRow | null>;
list(userId: string, q: string | null, sort: ProjectSort, page: number, pageSize: number): Promise<{ rows: ProjectRow[]; total: number }>;
update(userId: string, id: string, values: Partial<ProjectValues>): Promise<void>; // also updatedAt = now()
delete(userId: string, id: string): Promise<void>;                               // DELETE; the FK cascade removes its tasks

// api/src/projects/projects.service.ts
create(userId, dto): Promise<ProjectResponseDto>;   list(userId, query): Promise<ProjectListResponseDto>;
get(userId, id): Promise<ProjectResponseDto>;       update(userId, id, dto): Promise<ProjectResponseDto>;
remove(userId, id): Promise<void>;
/** Shared lookup: non-UUID or missing → NotFoundException('Project not found.'). */
findOwned(userId: string, id: string): Promise<ProjectRow>;

// api/src/projects/projects.controller.ts: @ApiBearerAuth('bearer') @Controller('projects')
@Post() create · @Get() list(@Query() q: ListProjectsQueryDto) · @Get(':id') get · @Patch(':id') update
@Delete(':id') @HttpCode(204) remove
```
Counts: `LEFT JOIN (SELECT project_id, count(*) FILTER (WHERE status = 'upcoming') AS upcoming, … FROM tasks
WHERE user_id = $1 GROUP BY project_id) c ON c.project_id = p.id`, `coalesce(…, 0)`;
`total` = the sum of the three. Title sort: `lower(title)`, then `id DESC`. `q`: `ilike(title, '%' + escapeLike(q) + '%')`.
`list` runs the page query and a `count(*)` with the same filter. Instants: `toISOString()`.
`remove` uses `findOwned`, then `delete`.
`ProjectsModule` imports `UsersModule` and exports `ProjectsService` (feat-tsk-api uses `findOwned`). Run `npm run openapi:export` at the end.

### User search (T3)
```ts
// api/src/users/dto/user-search.dto.ts
export class UserSearchQueryDto { @Trim() @IsString() @Length(2, 100) q: string }
export class UserSummaryDto { id: string; displayName: string; email: string; @ApiProperty({ type: String, nullable: true }) avatarUrl: string | null }
export class UserSearchResponseDto { items: UserSummaryDto[] }

// api/src/users/users.repository.ts
search(q: string, callerId: string, limit: number): Promise<UserSummaryDto[]>;
// WHERE display_name ILIKE p OR email ILIKE p (p = '%' + escapeLike(q) + '%')
// ORDER BY (id = callerId) DESC, lower(display_name), lower(email) LIMIT limit

// api/src/users/users.service.ts
search(callerId: string, q: string): Promise<UserSearchResponseDto>; // limit 10

// api/src/users/user-search.controller.ts: @ApiBearerAuth('bearer') @Controller('users')
@Get() search(@CurrentUser() user: AuthUser, @Query() query: UserSearchQueryDto): Promise<UserSearchResponseDto>
```
Run `npm run openapi:export` at the end.

## Acceptance criteria
All e2e cases sign in as user A unless stated; B and C are other registered users.

| AC | Case → expected | Test | Task |
| --- | --- | --- | --- |
| AC-1 | `POST /projects {title:"  Web  "}` → `201`, `title:"Web"`, `description`, `externalLink`, `projectLead` `null`, `taskCounts` all `0`, UUID `id`, ISO `createdAt` = `updatedAt` | `api/test/projects.ac.e2e-spec.ts` | T2 |
| AC-2 | `POST` with every field and `projectLeadUserId` = B → `201`, `projectLead` `{kind:"user", name: B's name, user:{id, displayName, avatarUrl}}`; the body contains no `email` anywhere | `api/test/projects.ac.e2e-spec.ts` | T2 |
| AC-3 | `projectLeadName:"  Ana "` → `{kind:"text", name:"Ana", user:null}`; `description:""`, `externalLink:"  "`, `projectLeadName:""` → `null` each | `api/test/projects.ac.e2e-spec.ts` | T2 |
| AC-4 | `400` `…/errors/validation` with the named `errors[].field` for: no title, title `"   "`, 201 chars; description 2001; externalLink `ftp://x`, `not a url`, 501 chars; projectLeadName 101; both lead fields set (`projectLeadName`); a random UUID as `projectLeadUserId` (`projectLeadUserId`); `projectLeadUserId:"abc"`; an unknown body field | `api/test/projects.ac.e2e-spec.ts` | T2 |
| AC-5 | `GET /projects` lists only A's projects; a project seeded with tasks 2 upcoming, 1 in-progress, 1 completed → `taskCounts {2,1,1,total 4}`; B's projects are absent | `api/test/projects.ac.e2e-spec.ts` | T2 |
| AC-6 | `q=web` matches "My Web App" and "WEBSITE", not "Other"; `q=50%` matches "50% off", not "500"; `q=a_b` matches "a_b", not "axb"; `q=` (empty) = no filter; `q` of 201 chars → `400` | `api/test/projects.ac.e2e-spec.ts` | T2 |
| AC-7 | Default order = `updatedAt` desc; `sort=title:asc` → "alpha", "Beta", "gamma"; `sort=createdAt:asc` oldest first; `sort=name:asc` → `400` | `api/test/projects.ac.e2e-spec.ts` | T2 |
| AC-8 | 3 projects: `pageSize=2&page=2` → 1 item, `total 3`, `page 2`, `pageSize 2`; `page=5` → `items []`, `total 3`; `page=0`, `pageSize=0`, `pageSize=101` → `400` | `api/test/projects.ac.e2e-spec.ts` | T2 |
| AC-9 | `GET /projects/{id}`: own → `200` (same shape as AC-1); B's → `404` `…/errors/not-found`; a random UUID → `404 not-found`; `abc` → `404 not-found`; own deleted → `404 not-found` | `api/test/projects.ac.e2e-spec.ts` | T2 |
| AC-10 | `PATCH` title → `200`, new title, `updatedAt` later, `createdAt` same; `description:null` and `externalLink:""` → `null`; `{}` → `200`, `updatedAt` later; `title:null` → `400`; on a user lead, `{description:"d"}` keeps the lead, `{projectLeadName:"X"}` → text lead, `{projectLeadUserId:null}` → no lead; B's → `404 not-found`; deleted → `404 not-found` | `api/test/projects.ac.e2e-spec.ts` | T2 |
| AC-11 | Lead B, then B's `display_name` changes in the DB → `GET` shows the new name (D2); B's user row deleted → `{kind:"text", name: B's name when saved, user:null}` | `api/test/projects.ac.e2e-spec.ts` | T2 |
| AC-12 | `DELETE` → `204`; then `GET` → `404 not-found`, the list leaves it out, and its task rows are gone from the database; `DELETE` again → `404 not-found`; B's → `404 not-found`, B's project unchanged | `api/test/projects.ac.e2e-spec.ts` | T2 |
| AC-14 | FR-PRJ-007: A's project with lead B; signed in as B, `GET /projects` doesn't list it and `GET /projects/{id}` → `404 not-found` | `api/test/projects.ac.e2e-spec.ts` | T2 |
| AC-15 | Every `/projects` endpoint and `GET /users` without a token → `401` | `api/test/projects.ac.e2e-spec.ts`, `api/test/users-search.ac.e2e-spec.ts` | T2, T3 |
| AC-16 | `escapeLike`: `a%b_c\d` → `a\%b\_c\\d`; `plain` unchanged | `api/src/common/sql/escape-like.ac.spec.ts` | T2 |
| AC-17 | `GET /users?q=an` (users "Ana", "Dan", "Bob" with email `bob@han.dev`, "Zed"): returns Ana, Bob, Dan in name order, not Zed; each item exactly `{id, displayName, email, avatarUrl}`; when A matches, A is first | `api/test/users-search.ac.e2e-spec.ts` | T3 |
| AC-18 | 12 matching users → 10 items; `q` missing, `a`, `" a "`, 101 chars → `400`; `q=%%` matches only names/emails containing `%%` | `api/test/users-search.ac.e2e-spec.ts` | T3 |
| AC-19 | The migration creates `task_status`, `projects` and `tasks` with `uuidv7()`, the indexes, `ON DELETE cascade` for `tasks.project_id` and `ON DELETE set null` for both `project_lead_user_id` | `check` | T1 |
| AC-20 | `api/openapi.json` has `/api/v1/projects` (get, post), `/api/v1/projects/{id}` (get, patch, delete) and `/api/v1/users` (get), all requiring `bearer` | `check` | T3 |

Typed stubs (created with the tests, so lint and typecheck pass while the tests fail):
- `api/src/common/sql/escape-like.ts`: `escapeLike` from *Interfaces*, body `throw new Error("not implemented (feat-prj-api)")`.

## Checks
```bash
# AC-19: the projects/tasks migration
f=api/drizzle/0002_projects_tasks.sql
test -f "$f"
grep -q 'CREATE TYPE "public"."task_status" AS ENUM' "$f"
grep -q 'CREATE TABLE "projects"' "$f" && grep -q 'CREATE TABLE "tasks"' "$f"
test "$(grep -c 'uuidv7()' "$f")" -ge 2
test "$(grep -ci 'ON DELETE set null' "$f")" -ge 2
grep -qi 'ON DELETE cascade' "$f"
```

```bash
# AC-20: the contract has the project and user-search endpoints, all protected
node -e "
const p=require('./api/openapi.json').paths, need=[['/api/v1/projects','get'],['/api/v1/projects','post'],['/api/v1/projects/{id}','get'],['/api/v1/projects/{id}','patch'],['/api/v1/projects/{id}','delete'],['/api/v1/users','get']];
for (const [u,m] of need) { const op=p[u]?.[m]; if(!op){console.error('missing',m,u);process.exit(1)} if(!JSON.stringify(op.security??[]).includes('bearer')){console.error('not protected',u);process.exit(1)} }"
```

## Tasks
| # | Task | App | Size | Tier | Why this tier | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | Add the `projects` and `tasks` tables, the `task_status` enum and their migration | api | S | haiku | Schema given in full; the migration is generated; no logic | — (needs T-0015) |
| T2 | Projects module (API-PRJ-001…005) with task counts and the project lead | api | M | opus | First feature module and repository; first lead pattern, reused by tasks | T1 (and T-0017) |
| T3 | `GET /users` user search for the lead picker (API-USR-003) | api | S | sonnet | Copies T2's controller/repository pattern; the one cross-user read (security.md) | T2 |

## Open questions
None. OQ-076…OQ-080, OQ-085, OQ-088, OQ-089 and OQ-091 are resolved.

## Changelog
- 2026-10-03: Initial draft (OQ-076…OQ-089, OQ-091).
- 2026-10-03: Approved by the owner.
