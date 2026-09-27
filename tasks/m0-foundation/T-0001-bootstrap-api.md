---
id: T-0001
title: Bootstrap api/ NestJS app
milestone: M0
app: api
status: done
size: L
depends_on: [T-0005]
specs:
  - specs/02-architecture/tech-stack.md
  - specs/02-architecture/repositories.md
  - specs/02-architecture/environments.md
  - specs/03-api/conventions.md
  - specs/03-api/data-model.md
  - specs/02-architecture/security.md
  - specs/05-quality/testing.md
  - specs/decisions/ADR-0008-data-stores.md
  - specs/decisions/ADR-0010-openapi-contract.md
requirements: [NFR-003, NFR-004]
---

# T-0001: Bootstrap api/ NestJS app

## Goal
Create a production-ready NestJS skeleton in `api/` that later feature tasks can build on.

## Scope
**In:**
- A new NestJS project (latest stable) in `api/`, created with the Nest CLI (`npx @nestjs/cli@latest new api --package-manager npm --strict`), with **npm**, strict TypeScript, ESLint + Prettier, and `.nvmrc` (Node LTS).
- Config module with env schema validation (fail fast). `.env.example` with every variable from environments.md.
- Global ValidationPipe, Problem Details error filter, helmet, CORS from `CORS_ORIGINS`, JSON body limit. Logging uses the NestJS default logger (no log library, NFR-009).
- Drizzle + `pg` against `DATABASE_URL`, and a drizzle-kit config (migrations in `api/drizzle/`, run via an explicit script). An empty initial migration.
- A Redis module (`ioredis`, `REDIS_URL`).
- `/health` checks Postgres and Redis (200 / 503). Swagger at `/docs` (non-prod). `npm run openapi:export` → `api/openapi.json`.
- `docker-compose.yml` with Postgres (same major as Neon) and Redis for local dev and tests.
- Test setup: Vitest unit + e2e against the compose services (owner decision 2026-09-27, replacing Jest). One e2e test for `/health`.
- `api/AGENTS.md` + `api/CLAUDE.md` (commands, structure, link to `../specs`, and the rule to generate building blocks with `npx nest g`).

**Out:** auth and feature modules and tables; CI/CD (T-0004).

## Acceptance criteria
- [x] `lint`, `test`, `test:e2e` and `build` scripts pass on a clean clone.
- [x] The app boots with only `.env.example` values (plus the local DB), and fails fast on missing/invalid env.
- [x] `GET /health` returns 200 with Postgres and Redis up, and 503 if either is down.
- [x] `npm run openapi:export` produces a deterministic `openapi.json` (no diff when run twice).
- [x] Migrations run only via an explicit script (no `postinstall`).
- [x] Errors follow `03-api/conventions.md#errors`.
- [x] CORS only allows the configured origins.
- [x] `api/AGENTS.md` documents the commands. The tech-stack spec is updated with the actual versions.
- [x] Definition of Done satisfied.

## Blocked by
- T-0005 (monorepo). Specs approved 2026-09-27.

---

## Implementation notes

Implemented per the owner-approved plan (`plan-T-0001.md`). Followed its Decisions 1–6 literally
except where the plan's assumptions didn't hold in practice (see Deviations below), which were
worked through rather than guessed at, and are recorded here for the reviewer/owner.

### What was built
- `api/`: NestJS 12.1.0 (Express adapter), created with `npx @nestjs/cli@latest new api
  --package-manager npm --strict --skip-git`, then hardened.
- Config: `src/config/env.schema.ts` (zod), validating `NODE_ENV`, `PORT`, `DATABASE_URL`,
  `REDIS_URL`, `CORS_ORIGINS`, `WEB_APP_URL` (plan decision 1); `AppConfigService` typed accessor;
  wired via a `@Global()` `ConfigModule` wrapping `@nestjs/config`'s `ConfigModule.forRoot({validate,
  ignoreEnvFile: true})`.
- `src/app.setup.ts` (`configureApp`): global prefix `api/v1` excluding `health`; `helmet()`;
  `useBodyParser('json', {limit: '100kb'})`; CORS from `CORS_ORIGINS` (exact match, no credentials,
  `GET,POST,PATCH,PUT,DELETE`, `Authorization, Content-Type`); global `ValidationPipe({whitelist,
  forbidNonWhitelisted, transform})` with a custom `exceptionFactory`
  (`src/common/validation/flatten-validation-errors.ts`) producing `{field, message}[]`; global
  `ProblemDetailsFilter`; `enableShutdownHooks()`. Shared by `main.ts` and every e2e test.
- `src/common/filters/problem-details/problem-details.filter.ts` (`npx nest g filter
  common/filters/problem-details`): RFC 9457 `application/problem+json` for every exception;
  `type` = `${WEB_APP_URL}/errors/<slug>` for `validation, unauthorized, forbidden, not-found,
  conflict, rate-limited, internal`; 400 carries `errors[]`; every 5xx (an `HttpException(msg, 500)`
  or a raw `Error`) replies with a generic detail and logs the real cause via Nest's `Logger`.
- `src/database/` (`npx nest g module database` + `npx nest g provider database/drizzle --flat`):
  `Drizzle` provider owns a `pg.Pool(DATABASE_URL)` (connects lazily, on first query) +
  `drizzle(pool, {schema})`; exposes the db via the `DRIZZLE` factory token and a `ping(timeoutMs)`
  health check; closes the pool `onModuleDestroy`. `src/database/schema/index.ts` is empty (T-0001
  scope). `drizzle.config.ts` (dialect postgresql, schema `./src/database/schema`, out `./drizzle`,
  url `DATABASE_URL_DIRECT` falling back to `DATABASE_URL`). Empty initial migration
  (`drizzle-kit generate --custom --name init` → `drizzle/0000_init.sql`). `db:generate` / `db:migrate`
  scripts; no `postinstall`.
- `src/redis/` (`npx nest g module redis` + `npx nest g provider redis/redis --flat`): `Redis`
  provider wraps `ioredis` (`lazyConnect: true`, an `error` listener so a failed connection doesn't
  crash the process), `ping(timeoutMs)`, `quit()` on shutdown.
- `src/health/` (`npx nest g module/controller/service health`): `GET /health` runs the DB (10 s
  timeout, NFR-003/Neon cold start) and Redis (2 s timeout) checks in parallel via `Promise.all`,
  200 when both are up, 503 otherwise, body always `{status, db, redis}`; excluded from the global
  prefix and from Swagger (`@ApiExcludeController()`).
- `src/openapi.ts` + `scripts/export-openapi.ts`: builds the OpenAPI doc (title "PM4 API", version
  from `package.json`, bearer auth scheme) and writes `api/openapi.json` (2-space indent, trailing
  newline) without starting an HTTP listener. `/docs` is served when `NODE_ENV !== 'production'`.
- `docker-compose.yml` (`postgres:18` with `pm4` + `pm4_test` via `docker/init-db.sh`, `redis:8`)
  for local dev and `test:e2e`.
- Tests: 7 unit suites / 36 tests (env schema, `AppConfigService`, `ProblemDetailsFilter` per status,
  `Drizzle`/`Redis` providers with mocked `pg`/`ioredis`, `HealthService`/`HealthController`). 5 e2e
  suites / 7 tests against the real compose services (`test/*.e2e-spec.ts`): `/health` 200;
  `/health` 503 with Redis pointed at a dead port (separate app instance); unknown route → 404
  `application/problem+json`; CORS allows the configured origin and not others; invalid/missing env
  → module compilation rejects.
- `api/AGENTS.md` + `api/CLAUDE.md` (`@AGENTS.md`); `api/.env.example` (every variable from
  `environments.md`, dummy values, local ones pointing at the compose services); `api/.nvmrc` (`24`)
  + `engines.node`; `api/README.md` trimmed to a pointer at `AGENTS.md`.

### Deviations from the plan (flagged, not silently made)
1. **NestJS 12.1's CLI now scaffolds Vitest + oxlint, not Jest + ESLint** (the plan anticipated
   "convert if the CLI produces another runner" for tests only). Converted both, since the task and
   `03-api/conventions.md`/tech-stack.md require Jest + Supertest and the task explicitly lists
   "ESLint + Prettier". Recorded in `tech-stack.md`'s Backend section + changelog.
2. **NestJS 12.1's own packages are ESM-only** (`@nestjs/common`'s `package.json` has `"type":
   "module"`, no CJS build) — this was the deeper reason for the CLI's new defaults, discovered only
   after the CJS conversion (attempt 1) failed at `require('@nestjs/common')`. `api/` is ESM
   throughout as a result: `"type": "module"`, `tsconfig` `module`/`moduleResolution: "nodenext"`,
   every relative import ends in `.js`. Getting Jest to work under this required, beyond the ESM
   preset: `node --experimental-vm-modules` (Jest's own vm-based ESM support is gated on it,
   independent of Node's native `require(esm)`), a `moduleNameMapper` stripping the `.js` suffix so
   ts-jest can resolve back to the `.ts` source, `jest.unstable_mockModule(...)` + a dynamic
   `await import(...)` after it wherever a dependency module needs mocking (`jest.mock()`'s hoisting
   doesn't apply to real ESM — an earlier attempt silently left the real `ioredis`/`pg` unmocked,
   which surfaced as a hung test process retrying a real Redis connection), and an explicit
   `import { jest } from '@jest/globals'` in every spec file that calls a `jest.*` API (the ambient
   global wasn't reliably injected). Recorded in full in `tech-stack.md`'s Tests row; flagged there
   for the owner to reconsider Jest vs. Vitest for `api/`, since Vitest (the CLI's new default) needs
   none of this.
3. **TypeScript pinned to `6.0.3`** (exact, not `^6.0.2`), not usable at 7.0.x: TS 7.0.2 (`npm view
   typescript dist-tags` → `latest: 7.0.2`, a real, non-prerelease release — **corrected on review**;
   the original version of this note wrongly claimed no stable `7.0.x` existed) is the native (Go)
   compiler preview, and its npm package's `require('typescript')` export is only
   `{version, versionMajorMinor}` — none of the classic Program/transformer Compiler API (verified
   directly: `require('typescript').getParsedCommandLineOfConfigFile === undefined` on a scratch
   install of `typescript@7.0.2`). `@nestjs/cli`'s
   `TypeScriptBinaryLoader.assertProgrammaticApiIsSupported` requires that function to exist and
   throws `UNSUPPORTED_TYPESCRIPT_VERSION` otherwise (confirmed by reading
   `node_modules/@nestjs/cli/lib/compiler/typescript-loader.js`), so `nest build` and the Swagger CLI
   plugin (same compiler process) fail immediately on TS 7.0.2 — per plan decision 4's fallback,
   pinned to `6.0.3` and recorded why (now correctly). Recorded in `tech-stack.md`'s changelog (same
   finding `web/` hit, different reason).
- `postgres:18`'s Docker image changed its data-directory convention (a single mount at
    `/var/lib/postgresql`, not the old `.../data`); `docker-compose.yml`'s volume mount was fixed
    accordingly (container failed to start otherwise). Recorded in `tech-stack.md`.
4. Dropped the CLI's placeholder `AppController`/`AppService`/root e2e spec (a "Hello World" demo
   with no product purpose) rather than keep it as unrelated leftover code.
5. `@nestjs/mau` (the CLI's default `deploy` dev dependency) was uninstalled: unused (Azure
   deployment is T-0004, not `mau`) and it was pulling in 3 of the original 9 `npm audit`
   vulnerabilities (`tmp`, `inquirer`, `undici`, all dev-only). The remaining 4 moderate advisories
   are `esbuild`, transitively via `drizzle-kit`'s optional TS-config loader — dev-only, no fix
   available without a breaking drizzle-kit downgrade; left as-is and noted here.
6. No new runtime dependencies outside `tech-stack.md`. `tsx`/`ts-node` were considered for
   `scripts/` but not added: `scripts/export-openapi.ts` and `scripts/migrate.ts` are compiled by
   `nest build` (via `tsconfig.build.json`'s `rootDir: "."`/`include`) and run as plain compiled JS,
   matching the plan's own `openapi:export` design.

### Verification (from `api/`, after `npm ci`)
- `docker compose up -d` → both healthy (had to fix the Postgres 18 volume-mount convention first,
  see Deviations).
- `npm run lint` → 0 problems. `npx tsc --noEmit` → 0 errors.
- `npm test` → 7 suites / 36 tests passed.
- `npm run test:e2e` → 5 suites / 7 tests passed (real Postgres `pm4_test` + Redis).
- `npm run build` → succeeds, `dist/src/main.js` + `dist/scripts/*.js` present.
- `npm run start:dev` with `.env.example` values: `curl localhost:3001/health` → `200
  {"status":"ok","db":"up","redis":"up"}`. `/docs` → 200 (Swagger, non-prod).
- `docker compose stop redis` → `curl localhost:3001/health` → `503
  {"status":"error","db":"up","redis":"down"}`. `docker compose start redis` → back to 200 within a
  few seconds.
- `NODE_ENV=development PORT=3001 REDIS_URL=... CORS_ORIGINS=... WEB_APP_URL=... node
  dist/src/main.js` with **no** `DATABASE_URL` → exits immediately, code 1, with `Invalid
  environment configuration:\n  - DATABASE_URL: Invalid input: expected string, received undefined`.
- `npm run openapi:export` run twice → identical `sha256sum` (`1935c10...a109a7`). `paths: {}` (no
  feature endpoints yet, `/health` excluded, as expected for T-0001's scope).
- `npm run db:migrate` against local Postgres → `Migrations applied.`; `drizzle.__drizzle_migrations`
  has one row (`0000_init`); no data tables created (the migration is empty). `npm run db:generate`
  afterwards → "No schema changes, nothing to migrate" (idempotent).
- `curl -H 'Origin: https://evil.test' -I localhost:3001/health` → no
  `Access-Control-Allow-Origin` header. Configured origin (`http://localhost:3000`) → header present.
- Stopped every process started (`start:dev`'s watch + compiled app, background `npm test`/`test:e2e`
  runs); ended with `docker compose stop` (both containers `Exited (0)`).

### Notes / proposals for the owner
- Rate limiting (`@nestjs/throttler`), BullMQ and the auth libraries are listed in `tech-stack.md`'s
  Backend table but intentionally not installed — out of this task's scope (auth/jobs modules,
  M1+). `T-0001`'s task file already excludes them ("Out: auth and feature modules...").
  `@nestjs/throttler` in particular needs an authenticated user for its per-user limit, so it's
  naturally deferred to whichever task adds auth.
- ~~Worth a deliberate decision at some point: keep Jest for `api/`... or switch to Vitest~~ —
  **resolved 2026-09-27** (owner decision): switched to Vitest. See "Follow-up" below.
- `npm audit`: 4 moderate, dev-only advisories remain (`esbuild` via `drizzle-kit`'s optional
  `@esbuild-kit/esm-loader` dependency). No fix without a breaking `drizzle-kit` downgrade; not a
  runtime/production exposure.

## Follow-up (2026-09-27): response to review

Addresses the review's two should-fix items and two nits (below), plus the owner's Jest→Vitest
decision that motivated re-opening this task.

### 1. Jest → Vitest (owner decision, 2026-09-27)

Converted `api/`'s whole test setup from Jest to Vitest, per the owner's decision recorded in
`specs/05-quality/testing.md`'s changelog ("API tests use Vitest instead of Jest") and this task's
Scope. Per the review's point 5, this removes every piece of Jest-under-ESM ceremony flagged there.

- **Canonical config**: scaffolded a throwaway reference project
  (`npx @nestjs/cli@latest new nest-ref --package-manager npm --strict --skip-git --skip-install`,
  then `npm install`) in the scratchpad to see exactly what the Nest CLI's own `new` schematic
  generates for Vitest on an ESM-only Nest 12 project, confirmed its one generated test actually
  passes (`npm test`, `npm run build`), then deleted it. Copied its shape into `api/`:
  `vitest.config.ts` (unit, `include: ['src/**/*.spec.ts']`) and `vitest.config.e2e.ts` (e2e,
  `include: ['test/**/*.e2e-spec.ts']`), both `test.globals: true` + `vite-tsconfig-paths` (kept for
  parity with the scaffold even though `api/`'s `tsconfig.json` has no `paths` yet — a future
  `nest g library` would need it). `tsconfig.json`'s `types` changed `"jest"` → `"vitest/globals"`;
  `eslint.config.mjs`'s test globals changed `globals.jest` → `globals.vitest`.
- **Dependencies removed**: `jest`, `ts-jest`, `@types/jest` (no `@jest/globals` was ever added as a
  direct dependency; the `jest` import in specs came from the ambient global). **Added**: `vitest`,
  `@vitest/coverage-v8`, `vite-tsconfig-paths` (versions the CLI's own scaffold resolves to on today's
  registry: see `tech-stack.md`'s Tests row) — plus an explicit `vite` devDependency, **not** present
  in the reference scaffold's `package.json`. Needed because `vite` is only `vitest`'s transitive
  dependency; the reference project's smaller tree happens to hoist it to top-level `node_modules`
  where `vite-tsconfig-paths`'s own (optional peer) `import 'vite'` can find it, but `api/`'s larger
  tree (drizzle-kit, pg, ioredis, zod, class-validator, …) does not — `npm ls` showed
  `UNMET OPTIONAL DEPENDENCY vite@*` and `vitest.config.ts` failed to load
  (`ERR_MODULE_NOT_FOUND: Cannot find package 'vite'`) until `vite` was pinned explicitly. Flagged
  here since it's a real (if small) deviation from "copy the canonical setup verbatim."
- **Scripts**: `test`/`test:watch`/`test:cov`/`test:debug`/`test:e2e` all rewritten to plain `vitest`
  invocations (no `node --experimental-vm-modules`, no `--config ./test/jest-e2e.json` — replaced by
  `--config ./vitest.config.e2e.ts`). `test/jest-e2e.json` deleted; the `"jest": {...}` block in
  `package.json` removed.
- **Spec conversions** (all 7 unit spec files + 5 e2e spec files, same test bodies/assertions,
  1:1 behavior):
  - `import { jest } from '@jest/globals'` → `import { vi } from 'vitest'` (or nothing, where a file
    used no `jest.*` API at all — `app-config.service.spec.ts`, `env.schema.spec.ts` needed no
    change beyond running under the new globals).
  - `jest.fn<...>()` → `vi.fn<...>()`, `jest.spyOn` → `vi.spyOn` (`problem-details.filter.spec.ts`,
    `health.controller.spec.ts`, `health.service.spec.ts`).
  - `jest.resetModules()` → `vi.resetModules()` (`env-validation.e2e-spec.ts`,
    `health-redis-down.e2e-spec.ts` — both still re-`import()` the module graph after mutating
    `process.env`, same reasoning as before, now with Vitest's own module registry).
  - `jest.unstable_mockModule('pg'|'ioredis', factory)` + dynamic `await import(...)` →
    `vi.mock('pg'|'ioredis', factory)` (`drizzle.spec.ts`, `redis.spec.ts`). Vitest hoists `vi.mock()`
    via its own compile-time transform (not real Node ESM module caching, unlike Jest), so this is
    now the same shape `vi.mock` has everywhere else — no dynamic-import dance needed for it to take
    effect, though the dynamic `await import('./drizzle.js')` /  `await import('./redis.js')` after
    the mock was kept anyway (harmless, and it's what actually makes the *module-under-test* pick up
    the freshly-mocked `pg`/`ioredis`). Any variable a `vi.mock()` factory closes over (`queryMock`,
    `endMock`, `pingMock`, `quitMock`, `onMock`) is declared via `vi.hoisted(() => ({...}))` instead of
    a bare `const`, since `vi.mock()` calls are hoisted *above* ordinary `const` declarations in the
    same file — a plain `const` there would be a TDZ reference once hoisted. One behavioral fix
    Vitest's stricter runtime caught that Jest didn't: `vi.fn().mockImplementation(() => ({...}))`
    (an arrow function) can't be called with `new` (`TypeError: ... is not a constructor`) — Jest
    silently tolerated this; Vitest doesn't, so both mock constructors
    (`pg.Pool`, `ioredis.Redis`) now use `function () { return {...}; }`.
  - No unit test needed `@jest/globals`' typed generics workarounds; `vi.fn<Signature>()` types the
    same way `jest.fn<Signature>()` did.
- **One Vitest-specific issue found and fixed, not present under Jest**: `@nestjs/config`'s
  `ConfigModule.forRoot()` is an `async` function whose `validate` option (our zod schema) throws
  synchronously, before any `await` — so JS turns that throw into an already-rejected Promise that
  `forRoot()` places straight into `AppModule`'s `imports` array at *import* time (when
  `config.module.ts`'s `@Module` decorator argument is evaluated). Nest only `await`s that promise
  later, inside `compile()` — by which point `env-validation.e2e-spec.ts` correctly asserts on the
  resulting rejection (`.rejects.toThrow(/DATABASE_URL/)`), so the *test* passes either way. But
  Node's own unhandled-rejection detection fires in the gap between those two points (creation vs.
  `await`), and Vitest reports that as an "Unhandled Error" that fails the whole run
  (`process.exitCode = 1`) even though every individual test still shows as passed. Restructuring the
  test code (static vs. dynamic imports, fewer intervening `await`s) didn't change the timing — the
  culprit promise lives entirely inside `@nestjs/config`, outside the test's own control. Fixed
  narrowly via `vitest.config.e2e.ts`'s `onUnhandledError` hook, filtering only error messages
  containing `'Invalid environment configuration'` (our own schema's exact error prefix) — not the
  blanket `dangerouslyIgnoreUnhandledErrors: true`, which would also hide a genuine unhandled
  rejection anywhere else in the suite. Recorded in full in `tech-stack.md`'s Tests row and as a
  comment in `vitest.config.e2e.ts` itself.
- **Counts preserved**: still 7 unit suites / 36 tests, 5 e2e suites / 7 tests — same coverage, same
  assertions, only the runner and mocking mechanics changed.

### 2. TypeScript pin — corrected reasoning (review point 1)

Deviation #3 above is rewritten in place with the real, verified reason (TS 7.0.2 is the native/Go
compiler preview with no classic Compiler API — verified via
`require('typescript').getParsedCommandLineOfConfigFile === undefined` on a scratch install of
`typescript@7.0.2`, and via reading `@nestjs/cli`'s `typescript-loader.js`), replacing the false "no
stable 7.0.x exists" claim. `tech-stack.md`'s matching changelog line is corrected the same way.
`api/package.json` now pins `"typescript": "6.0.3"` exactly (no `^`), addressing the review's nit 3
about the caret-range/"pinned" wording mismatch.

### 3. `@nestjs/swagger` CLI plugin (review point 2)

Added to `api/nest-cli.json`'s `compilerOptions.plugins`:
```json
{ "name": "@nestjs/swagger", "options": { "classValidatorShim": true, "introspectComments": true } }
```
Verified `npm run build` still succeeds and `npm run openapi:export` run twice still produces a
byte-identical `openapi.json` (same `sha256sum` as before the change, `1935c10...a109a7`) — expected,
since there are no DTOs yet for the plugin to annotate; it only affects generated Swagger metadata for
classes it introspects. `resolvePluginPath('@nestjs/swagger', ...)` resolves via that package's own
`./plugin` export (`node_modules/@nestjs/swagger/package.json`'s `exports` map), confirmed by reading
`@nestjs/cli`'s `plugins-loader.js`.

### 4. Definition of Done walk-through (review point 4)

See below.

### 5. Verification (this follow-up pass, from `api/`)

- `rm -rf node_modules dist coverage openapi.json && npm ci` → clean install, 436 packages, same 4
  moderate dev-only advisories as before (`esbuild`, transitively via `drizzle-kit`'s optional
  `@esbuild-kit/esm-loader` — unchanged, no fix available without a breaking `drizzle-kit` downgrade).
- `docker compose up -d` → both `pm4-api-postgres-1`/`pm4-api-redis-1` healthy.
- `npm run lint` → 0 problems (exit 0).
- `npx tsc --noEmit` → 0 errors (exit 0).
- `npm test` → **7 suites / 36 tests passed** (same count as before the Jest→Vitest conversion).
- `npm run test:e2e` → **5 suites / 7 tests passed** (same count as before), exit 0. A
  `PromiseRejectionHandledWarning` is still printed to stderr by Node itself (harmless, cosmetic —
  see point 1 above); the run's own exit code and "Test Files/Tests" summary are unaffected by it.
- `npm run build` → succeeds, `dist/src/main.js` + `dist/scripts/*.js` present (spec files correctly
  excluded, same as before).
- `npm run openapi:export` run twice → identical `sha256sum`
  (`1935c10365be0d1364f0e12fcc1c6e62ca2e83bdc5ac1c781b95466db8a109a7`) — **the same checksum recorded
  in the original Implementation notes**, confirming the new Swagger CLI plugin doesn't change the
  (still-empty) output.
- `docker compose stop` → both containers stopped.
- `git status --porcelain` (repo root) → only spec/task files and the untracked `api/`/`web/`
  directories touched; `git diff --cached --stat` → empty. Nothing staged, committed or pushed.

## Definition of Done walk-through

Per `specs/05-quality/definition-of-done.md`.

**All tasks**
- [x] Every acceptance criterion met, evidence in Implementation notes above (What was built /
  Verification) and in the Follow-up section above (Vitest switch, TS pin, Swagger plugin).
- [x] Implementation matches the referenced specs. Every deviation (plan vs. reality) is recorded
  under Deviations, and this Follow-up section resolves the review's should-fix items instead of
  leaving them silent.
- [x] Lint, type-check, tests and build pass locally — commands and results recorded in Verification
  (original) and this follow-up's own verification pass below.
- [x] Tests added/updated per `testing.md`: unit tests for every service/provider with logic
  (env schema, config service, Problem Details filter, Drizzle/Redis providers, health service/
  controller); e2e tests for `/health` happy path, 503, CORS, 404 shape, and env-validation-at-boot.
  `testing.md`'s "cross-user access returns 404" and "auth" must-have cases are N/A at this scope —
  no endpoints or auth exist yet (T-0001 explicitly excludes feature modules and auth).
- [x] No secrets, debug leftovers, commented-out code or unrelated changes — `.env.example` only has
  dummy values; no stray `console.log`/`.only`/`.skip` in any spec; the scratchpad `nest-ref`
  reference project was deleted after use, not left in the repo.
- [x] New env vars documented in `environments.md` and `.env.example` — unchanged by this follow-up
  (no new env vars introduced by the Vitest/TypeScript/Swagger-plugin changes).
- [x] `api/AGENTS.md` updated — commands table's Jest rows now describe Vitest + which config file
  each uses; Structure section documents `vitest.config.ts`/`vitest.config.e2e.ts`.
- [x] Task status updated in this file and `tasks/BOARD.md` — stays `review` per the owner's
  instruction for this follow-up pass (a human/owner review still needs to confirm the should-fix
  items before moving to `done`).
- [x] Nothing staged, committed or pushed — `git status`/`git diff --cached` checked empty at the end
  of this pass (see Verification below).

**API tasks (additional)**
- [ ] N/A — OpenAPI annotations complete and matching `endpoints.md`: no endpoints exist yet at this
  scope (`openapi.json`'s `paths: {}`); the Swagger CLI plugin is now wired (review point 2) so the
  first feature task's DTOs pick up annotations automatically.
- [ ] N/A — ownership/authorization enforced and covered by a cross-user test: no user-owned
  resources exist yet (`/health` is unauthenticated and global by design).
- [ ] N/A — migrations generated, expand/contract-safe, storage-rules-compliant: the one migration in
  scope (`drizzle/0000_init.sql`) is empty (no tables yet); left uncommitted for the owner as usual.
- [x] `openapi.json` regenerated and left uncommitted — re-verified in this follow-up
  (`npm run openapi:export` twice, identical checksum, see Verification below).

### Fix (2026-09-27): local `.env` not loaded
`npm run start:dev` failed with "Invalid environment configuration" because `src/config/config.module.ts` had
`ignoreEnvFile: true`, so `api/.env` was never read. Changed to `ignoreEnvFile: process.env.NODE_ENV === 'test'`:
local dev reads `.env`, real env vars (Azure, CI) still take precedence, tests stay independent of a local `.env`.
Verified with `.env` present: `nest start` → `GET /health` 200 `{"status":"ok","db":"up","redis":"up"}`; lint,
`tsc --noEmit`, `npm test` (36/36) and `npm run test:e2e` (7/7) pass. `api/AGENTS.md` documents `cp .env.example .env`.

## Review

**Verdict: approve** (with should-fix items for the owner to action before/along with T-0004, not
blocking this task's merge).

1. **[should-fix]** The stated reason for pinning `typescript` to `6.0.3` is factually wrong.
   `npm view typescript dist-tags` shows `latest: 7.0.2` (a real, non-prerelease, non-rc release) —
   not "only `7.1.0-dev.*` prereleases" as `tech-stack.md`'s changelog and this task's Implementation
   notes deviation #3 claim. However, independent testing (`npm install typescript@7.0.2` in a
   scratch dir, then `require('typescript')`) shows the *conclusion* is still correct: TS 7.0.2's npm
   package is the native (Go) compiler preview and its `require('typescript')` export is only
   `{version, versionMajorMinor}` — none of the classic Compiler API. `api/node_modules/@nestjs/cli/lib/compiler/typescript-loader.js`'s `TypeScriptBinaryLoader.assertProgrammaticApiIsSupported`
   requires `tsBinary.getParsedCommandLineOfConfigFile` to exist and throws
   `CLI_ERRORS.UNSUPPORTED_TYPESCRIPT_VERSION` otherwise — so `nest build` (and the Swagger CLI
   plugin, which rides the same compiler process) would fail immediately on TS 7.0.2. Plan Decision 4
   said "try 7.0.x; if it fails, pin 6.0.x and record why" — the trial was skipped and a false premise
   was recorded instead of the real, verifiable one. Fix: correct `tech-stack.md`'s 2026-09-27 T-0001
   changelog line and this task's deviation #3 to state the real reason (native/Go compiler, no
   Program/transformer API — verified by `require('typescript').getParsedCommandLineOfConfigFile ===
   undefined`), not "no stable release exists."
2. **[should-fix]** The Swagger CLI plugin was never configured. Plan step 8, `tech-stack.md`'s
   Backend row ("`@nestjs/swagger` (+ CLI plugin)") and `03-api/conventions.md#openapi` all call for
   it, but `api/nest-cli.json:5-7` only sets `deleteOutDir: true` — no `plugins` entry. This is an
   unflagged deviation (harmless today since there are no DTOs yet to annotate, but it should either
   be added now at near-zero cost or explicitly called out as deferred, per DoD "any deviation was
   raised and resolved, not silently made").
3. **[nit]** `api/package.json` declares `"typescript": "^6.0.2"` (a caret range), while
   Implementation notes / `tech-stack.md` describe it as "pinned to 6.0.3." It resolves to `6.0.3`
   today via the lockfile, but isn't a hard pin — a bare `npm update` could move it. Minor wording
   vs. reality mismatch, not a functional issue.
4. **[nit]** Unlike T-0002, this task's Implementation notes have no explicit item-by-item
   "Definition of Done walk-through." The evidence is present, just scattered; for consistency, add
   one and mark the two API-specific DoD items that are N/A at this scope (OpenAPI annotations,
   cross-user ownership test) — there are no feature endpoints yet, by design.
5. Everything else checked out cleanly, with direct evidence, no blockers:
   - Problem Details filter (`src/common/filters/problem-details/problem-details.filter.ts`): RFC
     9457 shape, `type` built from `WEB_APP_URL`, 400 carries `errors[]`, every 5xx path (including a
     raw non-`HttpException`) returns a generic detail — covered by
     `problem-details.filter.spec.ts:137-160` for both 500 cases.
   - CORS/helmet/body limit (`src/app.setup.ts:13-31`): exact-origin allow-list, `credentials:
     false`, restricted methods/headers, `helmet()`, 100kb JSON limit — verified against
     `test/cors.e2e-spec.ts` (allowed vs. unconfigured origin) and the notes' manual curl checks.
   - `/health` (`src/health/health.controller.ts`, `health.service.ts`): excluded from the `api/v1`
     prefix and from Swagger (`@ApiExcludeController()`), DB 10 s / Redis 2 s timeouts, 200/503 —
     covered by `test/health.e2e-spec.ts` and `test/health-redis-down.e2e-spec.ts`.
   - `.env.example`: every variable in `specs/02-architecture/environments.md` is present with dummy
     values; no `.env*` other than `.env.example` in `api/`; no real secrets found anywhere in the
     tree (docker-compose credentials and JWT placeholder are dev-only dummies).
   - `openapi:export`: writes a plain, timestamp-free JSON (`api/openapi.json`, verified content);
     `drizzle.config.ts` uses `DATABASE_URL_DIRECT` with a local fallback; no `postinstall` script in
     `package.json`.
   - Nest building blocks are CLI-generated: a matching `.spec.ts` exists next to every provider/
     service/controller/filter (7 spec files).
   - The Jest-under-ESM setup (point 2) works and is well tested (36 unit + 7 e2e tests all
     passing), but is objectively more ceremony than Vitest: `--experimental-vm-modules`,
     `jest.unstable_mockModule` + dynamic `import()` instead of `jest.mock()`'s hoisting, explicit
     `@jest/globals` imports, and a `moduleNameMapper` stripping `.js`. Vitest (the Nest CLI's own
     new default) needs none of this for the same ESM situation. Not a defect — the plan explicitly
     said use Jest — but a real, owner-worth-revisiting trade-off, as the implementer already flagged.

**Owner sign-off (2026-09-27):** runs correctly locally; accepted.
