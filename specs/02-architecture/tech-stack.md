---
id: arch-stack
title: Tech Stack
status: approved
owner: Marko Angelovski
last_updated: 2026-10-02
related: [arch-overview, web-template, ADR-0001, ADR-0002, ADR-0005, ADR-0006, ADR-0007, ADR-0008, ADR-0009, ADR-0010, ADR-0011]
---

# Tech Stack

## Purpose
The authoritative list of technologies. Agents must not add a runtime dependency that isn't listed
here without flagging it. Dev tooling in the same category is fine.

**Version policy:** use the **latest stable** release of each item when bootstrapping, and pin it via
`package-lock.json`. The versions below are the latest stable releases on npm as of 2026-09-27 (targets). Bootstrap
(T-0001, T-0002) installs the then-latest patch/minor of the same major and records any difference here.
A newer **major** needs a spec update.

## Shared
| Concern | Choice |
| --- | --- |
| Repo | Monorepo, independent npm projects (ADR-0006) |
| Package manager | **npm** (`npm ci` in CI) |
| Language | TypeScript, `strict`. **7.0.x** (the native compiler; the template already uses it). If the Nest CLI or its Swagger plugin doesn't work with 7.x at T-0001, `api/` pins **6.0.x** and records why. |
| Node | **Node 24 LTS** ("Krypton", 24.21.x), the same major for local, CI and Azure (`NODE|24-lts`), recorded in `.nvmrc` per app. Node 26 isn't LTS yet (OQ-042). |
| Dates | date-fns + `@date-fns/tz` (time-zone-aware calculations). 4.4.x / 1.5.x |

## Frontend: `web/`
| Concern | Choice | Version | Notes |
| --- | --- | --- | --- |
| Framework | Next.js (App Router) | 16.3.6 (bumped from template's 16.3.0 at T-0002: fixed a critical RCE advisory) | `output: "export"` (ADR-0001) |
| UI library | React | 19.3.0 | |
| Base | `next-shadcn-dashboard` template | — | ADR-0005 |
| Components | shadcn/ui (`base-nova` style, Base UI `@base-ui/react`) | shadcn CLI 4.21.x, `@base-ui/react` 1.8.x | Polymorphism is Base UI's `render={<X/>}` prop, not Radix's `asChild` |
| Styling | Tailwind CSS v4 | 4.3.x | |
| Theming | next-themes (template) | 0.4.x | Light and dark, as in the template |
| Icons | lucide-react | 1.48.x | `@iconify/react` removed at T-0002 |
| Server state | TanStack Query v5 | 5.104.x | ADR-0009. `@tanstack/react-query-devtools` added (dev only), not in the original list but implied by the ADR |
| HTTP client | openapi-fetch + openapi-typescript | 0.17.x / 7.13.x | ADR-0010. `lib/api/schema.d.ts` is a stub (`export interface paths {}`) until `api/openapi.json` exists; regenerate with `npm run api:types` once it does |
| URL state | nuqs | 2.10.x | ADR-0009. Installed at T-0002; not yet used (no filters/date-range UI in scope yet) |
| Forms | react-hook-form + zod + @hookform/resolvers | 7.89.x / 4.6.x / 5.9.x | ADR-0009. Installed at T-0002; not yet used (no forms in scope yet) |
| Tables | TanStack Table (template wrappers) | 8.21.x (keep the template's major; 9.x is out but breaking) | |
| Charts | Recharts (template) | 3.10.x | Line chart for FR-RPT-004 |
| Unit/component tests | Vitest + Testing Library | 5.0.x / 16.3.x | MSW **not yet installed** (T-0002 has no data-fetching component to mock) — add it with the first feature that needs an API mock |
| E2E tests | Playwright against the static `out/` build | — | **Deliberately deferred to M1+** per T-0002's plan: no Playwright setup yet, so no version pin |

## Backend: `api/`
| Concern | Choice | Version | Notes |
| --- | --- | --- | --- |
| Framework | NestJS (Express adapter) | 12.1.0 | ADR-0002. **Ships ESM-only** (`@nestjs/common`'s `package.json` has `"type": "module"`, no CJS build) — installing it as `require()`-able CommonJS fails at runtime. `api/` is therefore ESM throughout: `package.json` has `"type": "module"`, `tsconfig.json` uses `module`/`moduleResolution: "nodenext"`, and every relative import ends in `.js` (the emitted extension, per TS's nodenext rule) even though the source is `.ts`. This is why the Nest CLI's own `new` schematic now defaults to Vitest + oxlint instead of Jest + ESLint (see the Tests and Lint rows) — `api/` now matches the Tests default (Vitest) but keeps ESLint over oxlint (Lint row) |
| Validation | class-validator + class-transformer, global `ValidationPipe` | 0.15.1 / 0.5.1 | Works with the Swagger CLI plugin |
| API docs | @nestjs/swagger (+ CLI plugin) | 12.0.2 | ADR-0010. The CLI plugin (`introspectComments`, `classValidatorShim`) was added to `api/nest-cli.json` at the T-0001 follow-up (missed at bootstrap, flagged on review); harmless until now since there were no DTOs to annotate — `openapi:export`'s output is unchanged |
| Config | @nestjs/config + env schema validation (zod) | 12.0.1 / zod 4.6.5 | Fail fast at boot. T-0001 validates only `NODE_ENV`, `PORT`, `DATABASE_URL`, `REDIS_URL`, `CORS_ORIGINS`, `WEB_APP_URL` (`src/config/env.schema.ts`); the rest of `environments.md`'s variables are in `.env.example` and get added to the schema by the task that first uses them (auth → M1) |
| Database | PostgreSQL on **Neon** | **18** (Neon's default for new projects; local/CI containers `postgres:18`) | ADR-0008. The `postgres:18` Docker image changed its data-directory convention: `docker-compose.yml` mounts the named volume at `/var/lib/postgresql` (not the old `.../data` subdirectory), or the container fails to start |
| DB driver | `pg` (node-postgres) with Neon's **pooled** URL | 8.23.0 | A long-running server, not edge |
| ORM / migrations | **Drizzle ORM + drizzle-kit** | 0.45.3 / 0.31.11 | ADR-0008 |
| Cache / ephemeral | **Redis Cloud** via `ioredis` | 6.0.0 (BullMQ's supported range not yet checked — BullMQ isn't installed until the jobs module lands, ADR-0011) | ADR-0008 |
| Auth | Google OAuth (Authorization Code + PKCE) via `openid-client`; JWT (HS256) via `@nestjs/jwt` | 6.8.x / 12.0.x | ADR-0007, OQ-059. Installed by feat-auth-api-session. A generic, OpenID-certified OIDC client: PKCE, state, discovery and ID-token validation for Google and any future OIDC provider (Authentik, Keycloak…). No Passport; `openid-client` ships its own Passport strategy if that's ever wanted. |
| Background jobs | **BullMQ** via `@nestjs/bullmq`, worker in the API process | 6.3.x / 12.0.x | ADR-0011. **Not installed at T-0001** (out of scope). Uses the Redis Cloud DB (`noeviction`) |
| Rate limiting | `@nestjs/throttler` with Redis storage | 6.7.x | **Not installed yet.** Deferred to its own feature after auth (OQ-060) |
| Security headers | helmet | 8.3.0 | |
| Logging | NestJS default logger → stdout → App Service logs | — | NFR-009. No log library. |
| Lint / format | ESLint (flat config, `typescript-eslint`) + Prettier | eslint 10.11.x / typescript-eslint 8.70.x / prettier 3.9.x | Task/spec requirement (`api/AGENTS.md`, `03-api/conventions.md`). The Nest CLI's `new` schematic now scaffolds **oxlint** by default, not ESLint — kept ESLint per this table's requirement, unlike the Tests row (which now follows the CLI's own default) |
| Tests | **Vitest** + Supertest. Postgres and Redis via docker-compose (local) / service containers (CI). | 4.1.11 / 7.3.0 (`@vitest/coverage-v8` 4.1.11, `vite-tsconfig-paths` 5.1.4) | Switched from Jest to Vitest at the T-0001 follow-up (owner decision 2026-09-27), matching what the Nest CLI's own `new` schematic scaffolds for an ESM-only Nest 12 project (see the Framework row) — canonical config copied from a throwaway `npx @nestjs/cli@latest new` reference project. No experimental Node flags or `moduleNameMapper` hacks: `vitest.config.ts` (unit, `src/**/*.spec.ts`) and `vitest.config.e2e.ts` (e2e, `test/**/*.e2e-spec.ts`, `test/setup-env.ts`, `fileParallelism: false` since specs mutate `process.env`) both set `test.globals: true` (`describe`/`it`/`expect`/`vi` ambient, `tsconfig.json`'s `types: ["vitest/globals"]`). `vi.mock()` is hoisted by Vitest's own transform (unlike real Node ESM), so mocking `pg`/`ioredis` needs only `vi.mock(...)` + `vi.hoisted(...)` for any mock function a factory closes over — no `jest.unstable_mockModule` + dynamic `import()` dance, no explicit `@jest/globals` import. `jest.resetModules()` → `vi.resetModules()` for the two specs that re-`import()` the module graph after mutating env vars. One Vitest-specific wrinkle, not present under Jest: `@nestjs/config`'s `ConfigModule.forRoot()` is `async` and its `validate` option throws synchronously, so JS turns that into an already-rejected Promise planted into `AppModule`'s `imports` array at *import* time, `await`ed only later inside `compile()` — Node reports the gap as an unhandled rejection even though `compile()` goes on to handle it correctly. Filtered narrowly via `vitest.config.e2e.ts`'s `onUnhandledError` (matches only that one error message), not the blanket `dangerouslyIgnoreUnhandledErrors`. `vite-tsconfig-paths` is included for parity with the CLI's scaffold even though `tsconfig.json` declares no path aliases yet; `api/`'s larger dependency tree doesn't hoist `vite` to a location the plugin's optional peer resolution finds on its own, so `vite` is pinned as an explicit top-level devDependency too |

## Available, not used (yet)
- Cloudflare R2 (S3-compatible object storage). Any use needs a spec + ADR update.

## Changelog
- 2026-09-26: Initial scaffold.
- 2026-09-26: Updated with owner answers to OQ-001–018.
- 2026-09-27: ADR-0009/0010 accepted. Added BullMQ (ADR-0011).
- 2026-09-27: OQ-042 resolved (Node 24 LTS, Postgres 18). Filled in target versions. Logging is the NestJS default logger. Auth library: openid-client.
- 2026-09-27: Auth library note: generic OIDC, SSO-ready.
- 2026-09-27: Approved by the owner.
- 2026-09-27: T-0002 bootstrap: filled in actual `web/` versions (see the Frontend table). Two
  toolchain pins below the Shared table's stated choices, both due to current ecosystem gaps, not
  preference — recorded in full in `web/AGENTS.md` and the task's Implementation notes, flagged for
  the owner to decide whether the Shared table's Language row should note them too: `typescript`
  pinned to `6.0.3` (`typescript-eslint`, used by `eslint-config-next`, does not support TS 7.x
  yet) and `eslint` pinned to `9.39.x` (`eslint-plugin-react` does not support ESLint 10 yet).
  `react`/`react-dom` bumped to `19.3.0` (from the template's exact-pinned `19.2.5`) to match this
  table's target.
- 2026-09-27: T-0001 bootstrap: filled in actual `api/` versions (see the Backend table).
  `typescript` pinned to `6.0.3`, same as `web/` — but for a different reason, **corrected on
  review** (the original entry here said "no stable `7.0.x` release exists yet on npm," which was
  false and unverified: `npm view typescript dist-tags` shows `latest: 7.0.2`, a real, non-prerelease
  release). The real reason: TS 7.0.2 is the native (Go) compiler preview, and its npm package's
  `require('typescript')` export is only `{version, versionMajorMinor}` — none of the classic
  Program/transformer Compiler API (verified directly: `getParsedCommandLineOfConfigFile` is
  `undefined` on it). `@nestjs/cli`'s `TypeScriptBinaryLoader.assertProgrammaticApiIsSupported`
  requires that function to exist and throws `UNSUPPORTED_TYPESCRIPT_VERSION` otherwise, so
  `nest build` (and the Swagger CLI plugin, which rides the same compiler process) fail immediately
  on TS 7.0.2 — nothing to do with prerelease status. Bigger finding: NestJS 12.1.x ships ESM-only,
  which is why the Nest CLI's `new` schematic now defaults to Vitest + oxlint instead of Jest +
  ESLint. Converted to Jest + ESLint per this table and `api/AGENTS.md` at the time (both work under
  ESM, but need `--experimental-vm-modules`, `jest.unstable_mockModule` instead of `jest.mock`, and
  explicit `@jest/globals` imports). Rate limiting, BullMQ and the auth libraries are in this table
  but not yet installed — out of scope for T-0001, deferred to the tasks that add auth/jobs.
- 2026-09-27: T-0001 follow-up (owner decision): switched `api/` tests from Jest to **Vitest**
  (see the Tests row) — the friction flagged above is gone under Vitest, which is also what the Nest
  CLI's own `new` schematic scaffolds for an ESM-only Nest 12 project. Added the `@nestjs/swagger`
  CLI plugin (`introspectComments`, `classValidatorShim`) to `api/nest-cli.json`, previously missing
  (`openapi:export` still produces a byte-identical `openapi.json` today, since there are no DTOs yet
  to annotate). `typescript` is now pinned as an exact version (`"6.0.3"`, no `^` range) rather than
  a caret range that happened to resolve to the same version.
- 2026-10-02: Auth libraries installed by feat-auth-api-session (OQ-059); rate limiting deferred to its own feature (OQ-060). Back to `review` (feat-auth-api-session).
- 2026-10-02: Approved by the owner.
