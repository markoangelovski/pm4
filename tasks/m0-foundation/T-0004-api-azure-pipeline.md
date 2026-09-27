---
id: T-0004
title: Azure Web App CI/CD for api/
milestone: M0
app: infra
status: ready
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
- [ ] The workflow matches `deployment.md` (publish profile from `AZURE_WEBAPP_PUBLISH_PROFILE`, package, webapps-deploy).
- [ ] A web-only commit does **not** trigger this workflow. A manual run works.
- [ ] Migrations run as a separate, explicit step against `DATABASE_URL_DIRECT`, never in `postinstall`.
- [ ] CI e2e tests use Postgres + Redis service containers.
- [ ] The App Service health check path is `/health`, and the deployed `/health` returns 200 (Neon + Redis Cloud reachable).
- [ ] The deployed web app (T-0003) can call the API: CORS works from the Pages origin.
- [ ] Definition of Done satisfied.

## Blocked by
- T-0001. Azure (F1 plan, publish profile with SCM basic auth enabled), Neon and Redis secrets need the owner's approval and action.

---

## Implementation notes

## Review
