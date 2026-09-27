---
id: T-0004
title: Azure Web App CI/CD for api/
milestone: M0
app: infra
status: review
size: M
depends_on: [T-0001]
specs:
  - specs/02-architecture/deployment.md#api--azure-web-app
  - specs/02-architecture/environments.md
requirements: [NFR-003]
---

# T-0004: Azure Web App CI/CD for api/

## Goal
`.github/workflows/api-deploy.yml` tests, migrates (Neon) and deploys `api/` to the Azure Web App. It runs on pushes to `master` touching
`api/**`, and manually via `workflow_dispatch`. It never runs for web-only changes. The api part of `ci.yml` verifies PRs.

## Acceptance criteria
- [x] The workflow matches `deployment.md` (publish profile from `AZURE_WEBAPP_PUBLISH_PROFILE`, package, webapps-deploy). See `.github/workflows/api-deploy.yml`: `azure/webapps-deploy@v2` in the `deploy` job with `publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}` and `app-name: ${{ vars.AZURE_WEBAPP_NAME }}`, `package: deploy` (the staged directory built by the `build` job). `actionlint` (docker) → exit 0, no findings.
- [ ] A web-only commit does **not** trigger this workflow. A manual run works. Path config reviewed: `api-deploy.yml` triggers only on `api/**` and its own workflow file — a pure `web/**` change cannot match. **Owner verifies after push:** an actual web-only commit not triggering the workflow, and a manual `workflow_dispatch` run, in GitHub Actions.
- [x] Migrations run as a separate, explicit step against `DATABASE_URL_DIRECT`, never in `postinstall`. The `deploy` job's "Run database migrations" step runs before "Deploy to Azure Web App", calling `node dist/scripts/migrate.js` directly (not `npm run db:migrate`, whose `--env-file=.env.example` could silently fall back to localhost values) with `DATABASE_URL_DIRECT` from the secret, guarded by an explicit "fails if empty" check. Verified locally end to end: staged the build output (`dist/`, `package.json`, `package-lock.json`, `drizzle/`) exactly as the workflow does, then ran `DATABASE_URL_DIRECT="postgres://pm4:pm4@localhost:5432/pm4" node dist/scripts/migrate.js` from the staged `deploy/` directory → `Migrations applied.` (0 migrations exist yet; the script ran and exited 0). Also verified the empty-secret guard: with `DATABASE_URL_DIRECT` unset/empty, the check step prints `::error::DATABASE_URL_DIRECT secret is not set. Refusing to run migrations.` and exits 1 before the migrate command runs. No `postinstall`/`db:migrate` reference anywhere in the workflow.
- [x] CI e2e tests use Postgres + Redis service containers. Both `api-deploy.yml`'s `build` job and `ci.yml`'s `api` job define `services: postgres (postgres:18, POSTGRES_USER/PASSWORD=pm4, POSTGRES_DB=pm4_test, port 5432)` and `redis (redis:8, port 6379)`, matching `api/test/setup-env.ts`'s defaults and `api/docker-compose.yml`'s health-check parameters. Locally reproduced against `docker compose up -d` (same images/ports): `npm run test:e2e` → 5 test files, 7 tests, all pass.
- [ ] The App Service health check path is `/health`, and the deployed `/health` returns 200 (Neon + Redis Cloud reachable). The workflow's post-deploy step polls `${{ vars.NEXT_PUBLIC_API_BASE_URL }}/health` for up to ~3 minutes and fails the job if it never returns 200 (covers the F1 cold-start case, NFR-003). Locally verified the health endpoint itself: booted the staged production package (`node dist/src/main.js`, staged exactly as `api-deploy.yml` stages it, including `npm ci --omit=dev`) against local Postgres/Redis → `GET /health` → `200 {"status":"ok","db":"up","redis":"up"}`. **Owner action required, not done by this task:** set the Azure Web App's Monitoring → Health check path to `/health` (recorded in `deployment.md`'s new Owner checklist) — **owner verifies after push:** the real deployed `/health` against Neon + Redis Cloud.
- [ ] The deployed web app (T-0003) can call the API: CORS works from the Pages origin. Not testable without the real deploy. **Owner verifies after push.**
- [ ] Definition of Done satisfied. All items checkable without a live Azure deploy are met (see Implementation notes); the DoD items that require the real deployment (health check against Neon/Redis Cloud, CORS from the live Pages origin) are left for the owner after push.

## Blocked by
- T-0001. Azure (F1 plan, publish profile with SCM basic auth enabled), Neon and Redis secrets need the owner's approval and action.

---

## Implementation notes

Added `.github/workflows/api-deploy.yml` and the `api` job of the shared `.github/workflows/ci.yml`
(T-0003 added the `web` job and describes the shared plan/reasoning). Also corrected
`specs/02-architecture/deployment.md`: the startup command is `node dist/src/main.js`
(`api/package.json`'s `start:prod` script), not `node dist/main.js` as the spec said — `nest build`
with this repo's `tsconfig.build.json` (`rootDir: "."`, `include: ["src/**/*", "scripts/**/*"]`)
emits `dist/src/main.js` and `dist/scripts/*.js`. Added the `/health` smoke-check step to the spec
and a new "Owner checklist" section (Azure startup command, health check path, disabling
`SCM_DO_BUILD_DURING_DEPLOYMENT` since the workflow ships a prebuilt package, and enabling Pages
"Enforce HTTPS"), with a changelog line.

**Staging, and why `drizzle/` is included:** the `build` job's "Stage deployment package" step
copies `dist/`, `package.json`, `package-lock.json` **and `drizzle/`** into `api/deploy/`, then runs
`npm ci --omit=dev` inside it. `drizzle/` is needed there (not just for completeness) because
`scripts/migrate.ts` resolves its migrations folder as `resolve(import.meta.dirname, '../../drizzle')`
relative to the compiled `dist/scripts/migrate.js` — i.e. relative to the staged package root, not
the repo root. Verified this by actually running the migrate script from a staged package (see
below); without `drizzle/` staged alongside `dist/`, the migrate step would look for migrations one
level above the staged package and find nothing.

**Action versions** (current major release tag as of 2026-09-27, checked via the GitHub releases
API): `actions/checkout@v7`, `actions/setup-node@v7`, `actions/upload-artifact@v7`,
`actions/download-artifact@v8`, `azure/webapps-deploy@v3` (current major, `v3.0.8`; first written as
`v2` because a v2 maintenance release was mistaken for the latest, and corrected in review; the inputs are
unchanged), `dorny/paths-filter@v4` (shared with T-0003/`ci.yml`).

**Verification (local, no push/deploy/Azure/Neon access):**
| Step | Command | Result |
| --- | --- | --- |
| actionlint | `docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:latest` (repo root) | Pass, exit 0, no findings |
| Install | `node_modules` already present, Node `v24.12.0` matches `.nvmrc` | OK |
| Lint | `npm run lint` | Pass, no output |
| Type-check | `npm run typecheck` | Pass, no output |
| Test | `npm test` | Pass — 7 test files, 36 tests |
| Local services | `docker compose up -d` (`postgres:18`, `redis:8`; `pm4`/`pm4_test` DBs confirmed present via `psql -l`) | Both containers healthy |
| e2e | `npm run test:e2e` | Pass — 5 test files, 7 tests (one intentional negative-path Redis connection-refused log, not a failure) |
| openapi export | `npm run openapi:export` then `git diff --exit-code -- openapi.json` (repo root) | Regenerated; no diff (already current — `api/openapi.json` is still the empty T-0001 scaffold, `"paths": {}`) |
| Build | `npm run build` | Pass (`nest build` → `dist/`) |
| Stage | `mkdir deploy && cp -r dist package.json package-lock.json drizzle deploy/ && (cd deploy && npm ci --omit=dev)` | 142 packages installed, 0 vulnerabilities |
| Boot staged package | `NODE_ENV=production PORT=3099 DATABASE_URL=… REDIS_URL=… CORS_ORIGINS=… WEB_APP_URL=… node dist/src/main.js` (from `deploy/`, env vars passed on the command line using `api/.env.example`'s local values — `.env` itself was never opened) | Nest started; `GET /health` → `200 {"status":"ok","db":"up","redis":"up"}` |
| Migrate from staged package | `DATABASE_URL_DIRECT="postgres://pm4:pm4@localhost:5432/pm4" node dist/scripts/migrate.js` (from `deploy/`) | `Migrations applied.` (0 migrations exist yet) |
| Migrate fail-fast | Same check with `DATABASE_URL_DIRECT` unset | `::error::…Refusing to run migrations.`, exit 1, before any DB call |

Cleaned up after verification: `rm -rf api/deploy api/dist`, `docker compose stop` (both containers
stopped; not removed). `git status` confirms neither `deploy/` nor `dist/` is tracked or left behind.

Not verifiable locally (require a real push, the owner's Azure/Neon/Redis Cloud setup, and the
owner checklist items in `deployment.md`): the actual GitHub Actions run (`workflow_dispatch`,
confirming a web-only commit doesn't trigger this workflow in practice), the Azure deployment
itself, migrations against the real Neon `DATABASE_URL_DIRECT`, the deployed `/health` against Neon
+ Redis Cloud, and CORS from the live Pages origin.

Suggested commit message: `feat(infra): add web-deploy, api-deploy and ci workflows (T-0003, T-0004)`.

## Review
