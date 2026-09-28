# AGENTS.md — api/

NestJS backend for PM4 (ADR-0002). This file holds `api/`-specific commands and structure. It must
not contradict the root `AGENTS.md`/`CLAUDE.md` or `../specs` — read those first, then this file.

## Commands (run from `api/`)
| Command | What |
| --- | --- |
| `npm ci` | Install |
| `docker compose up -d` | Start local Postgres (`pm4` + `pm4_test` databases) and Redis |
| `npm run start:dev` | Dev server, watch mode. Reads `api/.env` (create it once with `cp .env.example .env`); real env vars take precedence, and tests ignore `.env` |
| `npm run lint` / `npm run lint:fix` | ESLint (`eslint.config.mjs`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` / `npm run test:watch` / `npm run test:cov` | Vitest unit tests (`vitest.config.ts`) |
| `npm run test:e2e` | Vitest e2e tests (`vitest.config.e2e.ts`, Supertest, real Postgres + Redis — needs `docker compose up -d`) |
| `npm run build` | `nest build` → `dist/` |
| `npm run db:generate` | drizzle-kit: generate a SQL migration from `src/database/schema` into `drizzle/` |
| `npm run db:migrate` | Apply committed migrations (`drizzle/`) against `DATABASE_URL_DIRECT` (falls back to `DATABASE_URL` locally) — explicit only, never automatic (no `postinstall`) |
| `npm run openapi:export` | Build, then write `api/openapi.json` (committed, ADR-0010) |

## Structure
- `src/main.ts` — bootstrap. `src/app.setup.ts` — `configureApp()`: prefix, helmet, CORS, body
  limit, `ValidationPipe`, the Problem Details filter, shutdown hooks. Shared with e2e tests so
  they run the same hardening stack as production.
- `src/openapi.ts` — builds the Swagger/OpenAPI document; used by `/docs` (non-prod) and
  `scripts/export-openapi.ts`.
- `src/config/` — `env.schema.ts` (zod, validated at boot, fails fast) and the typed
  `AppConfigService`.
- `src/database/` — `Drizzle` provider (owns the `pg.Pool`, exposes `db` via the `DRIZZLE` token
  and a `ping()` health check) and `schema/` (Drizzle table definitions; empty until a feature task
  adds tables).
- `src/redis/` — `Redis` provider (ioredis client, lazy connect, `ping()` health check).
- `src/health/` — `GET /health`: outside the `api/v1` prefix, unauthenticated, excluded from
  Swagger and (later) rate limiting.
- `src/common/filters/problem-details/` — RFC 9457 error filter. `src/common/validation/` — DTO
  validation-error flattening used by the pipe's `exceptionFactory`.
- `scripts/` — standalone scripts (no Nest DI bootstrap beyond what they need): `export-openapi.ts`,
  `migrate.ts`. Compiled by `nest build` (see `tsconfig.build.json`) and run from `dist/scripts/`.
- `drizzle/` — committed SQL migrations + snapshots (drizzle-kit). `drizzle.config.ts` — drizzle-kit
  config. `docker-compose.yml`, `docker/init-db.sh` — local Postgres 18 + Redis 8.
- `test/` — e2e specs (`*.e2e-spec.ts`), `create-test-app.ts` (shared app factory), `setup-env.ts`
  (env for e2e tests; no `.env.test`, since `.env.*` is git-ignored — see conventions.md).
- `vitest.config.ts` / `vitest.config.e2e.ts` — Vitest config for unit (`src/**/*.spec.ts`) and e2e
  (`test/**/*.e2e-spec.ts`) runs; the latter loads `test/setup-env.ts` and disables file parallelism
  (specs mutate `process.env` and re-`import()` the module graph).

## Conventions
- Generate every module, controller, service, guard, pipe, filter, interceptor, decorator,
  middleware and provider with the Nest CLI: `npx nest generate <schematic> <name>` (short form
  `npx nest g`), then implement the generated file. Hand-write only files with no schematic: DTOs,
  the Drizzle schema, migrations and the standalone `scripts/`.
  → `../specs/03-api/conventions.md#code-generation-nest-cli`
- Every table/query is scoped to the authenticated user; a missing/unowned resource is `404`, not
  `403` (existence isn't revealed). → `../specs/02-architecture/security.md`
- Errors are RFC 9457 Problem Details (`application/problem+json`).
  → `../specs/03-api/conventions.md#errors`
- `openapi.json` must match `../specs/03-api/endpoints.md` and stay regenerated
  (`npm run openapi:export`, no diff). → ADR-0010
- ESM throughout: every relative import ends in `.js`, even though the source is `.ts`.
- Leave generated tracked files (`openapi.json`, `drizzle/*.sql`, `drizzle/meta/*`) as uncommitted
  changes for review (`../AGENTS.md` §3).

## Patterns to copy
No feature module exists yet. The **first** module, repository, DTO and guard become the reference;
their tasks are opus/sonnet (`../specs/05-quality/task-routing.md`). Add them to this table when they land.

| Need | Copy from | What to copy |
| --- | --- | --- |
| Module + controller + service wiring | `src/health/` | `@Module` imports/providers, constructor DI, `.js` imports |
| Injecting the database | `src/database/drizzle.ts`, `database.module.ts` | `Drizzle` / `DRIZZLE` token; import `DatabaseModule` |
| Errors | `src/common/filters/problem-details/` | Throw Nest `HttpException`s; the filter makes Problem Details. Don't hand-build error bodies |
| Unit test | `src/health/health.service.spec.ts` | Construct the service directly with `vi.fn()` fakes |
| e2e test | `test/health.e2e-spec.ts` + `test/create-test-app.ts` | `createTestApp()` + Supertest, closed in `afterAll` |
| New env var | `src/config/env.schema.ts` + `app-config.service.ts` | zod schema entry + typed getter + `.env.example` |

## Never
- Never edit `*.ac.spec.ts` / `*.ac.e2e-spec.ts` (acceptance tests) unless you are the test writer.
- Never hand-write a module, controller, service, guard, pipe, filter or interceptor. Use `npx nest g`.
- Never query without a `userId` condition. Never return `403` for another user's resource (use `404`).
- Never edit an existing migration in `drizzle/`. Never run `db:migrate` against Neon, or `drizzle-kit push`.
- Never use `console.log`. Use Nest's `Logger`.
- Never add dependencies without asking.

Full specs: `../specs` (start at `../AGENTS.md`).
