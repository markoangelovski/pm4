---
id: arch-deployment
title: Deployment and CI/CD
status: approved
owner: Marko Angelovski
last_updated: 2026-09-27
related: [arch-env, arch-repos, web-static-export, ADR-0001, ADR-0002, ADR-0006, ADR-0011]
---

# Deployment and CI/CD

## Purpose
How each app is built, tested and deployed **independently** from the monorepo (ADR-0006).

## Workflows
| Workflow | Triggers | Does |
| --- | --- | --- |
| `ci.yml` | `pull_request` | Detects changed paths (`dorny/paths-filter` or equivalent). Runs the web checks and/or the api checks. |
| `web-deploy.yml` | `push` to `master` with `paths: [web/**, api/openapi.json, .github/workflows/web-deploy.yml]`, plus `workflow_dispatch` | Build and deploy web to Pages |
| `api-deploy.yml` | `push` to `master` with `paths: [api/**, .github/workflows/api-deploy.yml]`, plus `workflow_dispatch` | Test, migrate and deploy the api to Azure |

Every job sets `defaults.run.working-directory` to its app folder and uses `actions/setup-node` with
the npm cache keyed on that app's `package-lock.json`. A `concurrency` group per workflow prevents overlapping deploys.

## Web → GitHub Pages
1. `npm ci` → `npm run lint` → type-check → `npm test` → check the generated API types are
   current (ADR-0010) → `npm run build` (→ `web/out/`).
2. Make sure `out/404.html` exists (from `not-found.tsx`). Pages serves it for unknown paths.
3. `actions/upload-pages-artifact` (path `web/out`) → `actions/deploy-pages`.
- The Pages source is set to **GitHub Actions**. The **custom domain** is configured in the repo's Pages
  settings, with DNS `CNAME pm4 → markoangelovski.github.io` (custom domain `pm4.angelovski.top`) and **Enforce HTTPS** on. It's served from the root, so no `basePath`.
- **No `CNAME` or `.nojekyll` file** in the repo or the artifact. With an Actions deploy, GitHub ignores
  a `CNAME` file (the domain lives only in the Pages settings), and it runs no Jekyll build on the
  artifact, so `_next/` is served as is.
- Build env comes from repository **variables**.

## API → Azure Web App
1. `npm ci` → lint → `npm test` → `npm run test:e2e` (Postgres + Redis service containers) →
   check `openapi.json` is current → `npm run build`.
2. **Migrate:** `drizzle-kit migrate` against `DATABASE_URL_DIRECT`, as an explicit step before
   deploy. Migrations must be backward compatible with the currently running version (expand/contract).
3. Package `dist/`, `package.json`, `package-lock.json` and production `node_modules`
   (`npm ci --omit=dev`) → `azure/webapps-deploy`.
4. **Smoke check:** after deploy, poll `/health` until it returns `200`, for up to ~3 minutes (the
   F1 plan's cold start after idle unload, NFR-003). The deploy job fails if it never returns `200`.
- Azure auth: a **publish profile** in the `AZURE_WEBAPP_PUBLISH_PROFILE` secret, passed to `azure/webapps-deploy`.
  New Web Apps have basic-auth publishing turned off, so **SCM Basic Auth Publishing Credentials** must be
  enabled in the Web App's configuration before downloading the profile. Re-download it (and update the
  secret) if the credentials are reset.
- Startup command: `node dist/src/main.js` (the build emits `dist/src/main.js`, not `dist/main.js`).
  The app listens on `process.env.PORT`.
- **Health check path:** `/health` (checks the DB and Redis). App Service restarts unhealthy instances.
- Plan: **Free (F1)**. There's no Always On, so the app unloads when idle and cold-starts on the next request (NFR-003).
- Background jobs (trash purge) run in the API process via BullMQ (ADR-0011). Nothing extra to deploy.

## Owner checklist (before the first push)
One-time setup outside the repo, done by the owner, not an agent:
- Azure Web App (`pm4-api`) → **Configuration → General settings → Startup Command:**
  `node dist/src/main.js`. Without it, Azure runs `npm start` (`nest start`), which isn't installed
  in the production package.
- Azure Web App → **Monitoring → Health check:** path `/health`.
- Azure Web App → App Setting `SCM_DO_BUILD_DURING_DEPLOYMENT` is absent or `false`. The workflow
  ships a prebuilt package (`dist/` + production `node_modules`), so Azure must not run its own
  `npm install`/build on deploy.
- Repo **Pages settings:** tick **Enforce HTTPS** once the certificate has been issued for the
  custom domain.

## Rollback
- Web: re-run `web-deploy.yml` on the previous commit (`workflow_dispatch` with a ref).
- API: redeploy the previous commit. DB changes roll forward only (write a fix migration). Neon
  point-in-time restore is the last resort.

## Open questions
—

## Changelog
- 2026-09-26: Initial scaffold.
- 2026-09-26: Updated with owner answers to OQ-001–018.
- 2026-09-27: OQ-031 resolved (no purge workflow; BullMQ in-app, ADR-0011). Publish profile chosen for Azure deploys. F1 plan recorded.
- 2026-09-27: Default branch is `master`.
- 2026-09-27: Removed `CNAME` and `.nojekyll`: not needed with an Actions-based Pages deploy.
- 2026-09-27: Approved by the owner.
- 2026-09-27: Real custom domain and Pages host filled in.
- 2026-09-27: T-0003/T-0004 implemented `web-deploy.yml`, `api-deploy.yml` and `ci.yml`. Corrected
  the startup command to `node dist/src/main.js` (the build's actual output path, per `start:prod`).
  Added the post-deploy `/health` smoke check and the owner's one-time Azure/Pages setup checklist.
