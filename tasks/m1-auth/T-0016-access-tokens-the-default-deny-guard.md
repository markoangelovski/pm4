---
id: T-0016
title: Access tokens, the default-deny guard and GET /me
milestone: M1
app: api
status: done
size: M
tier: opus
depends_on: [T-0010, T-0015]
feature_spec: specs/06-features/auth-api-session.md
spec_row: T2
ac_files:
  - { path: api/test/me.ac.e2e-spec.ts, sha256: dbc41015e1b7e384a58a89f5c8860709fbd6ec740c17295182c358f5775c79a7 }
  - { path: api/src/config/env.schema.ac.spec.ts, sha256: 3995cc24bce437441a6cf340e278af914394868d1df53b0e3c1fce29db558da5 }
---

# T-0016: Access tokens, the default-deny guard and GET /me

**Tier reason:** First auth guard and token pattern (task-routing: auth/tokens); env and module wiring

Work from the brief: `node scripts/pm4.mjs brief T-0016`. Verify with `node scripts/pm4.mjs check T-0016`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- `npm install @nestjs/jwt` (^12.0.2), as the spec's Files table says for T2.
- Config: `duration` (`/^[1-9]\d*[smhd]$/` → seconds, `.prefault`), Google/JWT vars, `AUTH_ALLOWED_EMAILS`
  (split/trim/lowercase/drop empty) in `env.schema.ts`; typed getters in `AppConfigService`.
- `AccessTokenService` (sign/verify over `JwtService`, `verify` → `null` on any error or a missing `sub`),
  global `AccessTokenGuard` (`APP_GUARD` in `AuthModule`), `@Public()`, `@CurrentUser()`.
- `UsersModule`: `GET /api/v1/me` (controller → service → repository `findById`), `MeResponseDto`;
  `UsersModule` imports `DatabaseModule` and exports `UsersRepository`. `@Public()` on Health and Version controllers.
- `openapi.json` regenerated (`/api/v1/me` with `bearer` security, `MeResponseDto`).
- `app-config.service.spec.ts` (now in the Files table): new fields, and it provides `APP_ENV` instead of mocking `ConfigService`.
- **No config write-back (owner decision, spec *Config (T2)*):** `ConfigModule` calls `NestConfigModule.forRoot`
  only to load `.env` (no `validate`, no `isGlobal`). A provider `APP_ENV` (token exported from
  `app-config.service.ts`) runs `validateEnv(process.env)` after `NestConfigModule.envVariablesLoaded`, so an
  invalid env still rejects module compilation at boot (`env-validation.e2e-spec.ts` passes). `AppConfigService`
  reads the parsed `Env` from `APP_ENV`; nothing uses Nest's `ConfigService` any more. Consumers (main.ts,
  app.setup.ts, Drizzle, Redis, ProblemDetailsFilter, AuthModule, GoogleOidc) are unchanged and all specs/e2e pass.
  Env is now read at compile time rather than import time. The tests that mutate `process.env` before
  re-importing still work. `test/auth.ac.e2e-spec.ts` no longer fails with "Invalid environment configuration";
  its 22 tests now fail only with 404s on T3's routes, which don't exist yet.
- Reviewer: some comments are now stale: `vitest.config.e2e.ts` `onUnhandledError` and the header of
  `test/env-validation.e2e-spec.ts` both say validation runs at import time. I didn't edit them because they
  aren't my files. The `onUnhandledError` filter is now harmless and unused.

`pm4 check T-0016` (final run):
```
  ac hashes: ok (2)
  scope: FAIL (1 file(s))
  api lint: ok · typecheck: ok · test: ok · test:e2e: ok · build: ok · openapi:export: ok
  check AC-23: skipped (later task)
FAIL T-0016
- changed files outside scope:
    specs/06-features/auth-api-session.md (not in the Files table)   <- the coordinator's spec edit, expected
```

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | opus | BLOCKED: spec | AC-1..AC-6 pass; scope FAIL only on app-config.service.spec.ts (needed for typecheck); TTL write-back by @nestjs/config will break T3's two-app e2e |
| 2 | opus | done | Owner decision applied: APP_ENV provider via validateEnv(process.env), forRoot without validate; all gates ok, only scope flag is the coordinator's spec edit |

## Review
**Verdict: approve** (minor findings only).

Opus review, 2026-10-03, feature `auth-api-session`. `pm4 check --feature`: all gates ok (e2e with
Postgres/Redis up); the only scope flag is the coordinator's authorized spec edit (*Config (T2)*). AC-25 manual (owner).

- Config matches the owner decision: no `validate` in `forRoot`, `APP_ENV` factory runs `validateEnv(process.env)`
  after `envVariablesLoaded`; nothing injects Nest's `ConfigService`. Guard, `JwtModule` (HS256 both ways),
  `@Public()` placement and `/me` scoping match the spec.
- Minor, follow-up for the main session (tests-step files, so correctly not touched here): the
  `onUnhandledError` filter in `api/vitest.config.e2e.ts:21-35` is dead since validation moved into `compile()`
  (and would hide a real future error); the header of `api/test/env-validation.e2e-spec.ts:3-9` still says
  "import time". Delete the filter, fix the header, and list both files under `tests` in the spec's *Files* table.
- Minor, project-wide: OpenAPI documents only success statuses (no `401` on `/api/v1/me`). Candidate quick-lane
  task: Problem Details error responses on all controllers.
- Tier feedback: opus was right (spotted the `@nestjs/config` write-back problem and stopped with BLOCKED: spec).
