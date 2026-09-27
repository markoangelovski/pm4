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
  settings, with DNS `CNAME pm4 → <owner>.github.io` and **Enforce HTTPS** on. It's served from the root, so no `basePath`.
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
- Azure auth: a **publish profile** in the `AZURE_WEBAPP_PUBLISH_PROFILE` secret, passed to `azure/webapps-deploy`.
  New Web Apps have basic-auth publishing turned off, so **SCM Basic Auth Publishing Credentials** must be
  enabled in the Web App's configuration before downloading the profile. Re-download it (and update the
  secret) if the credentials are reset.
- Startup command: `node dist/main.js`. The app listens on `process.env.PORT`.
- **Health check path:** `/health` (checks the DB and Redis). App Service restarts unhealthy instances.
- Plan: **Free (F1)**. There's no Always On, so the app unloads when idle and cold-starts on the next request (NFR-003).
- Background jobs (trash purge) run in the API process via BullMQ (ADR-0011). Nothing extra to deploy.

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
