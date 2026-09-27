---
id: T-0003
title: GitHub Pages CI/CD for web/
milestone: M0
app: infra
status: blocked
size: M
depends_on: [T-0002]
specs:
  - specs/02-architecture/deployment.md#web--github-pages
  - specs/02-architecture/environments.md
requirements: []
---

# T-0003: GitHub Pages CI/CD for web/

## Goal
`.github/workflows/web-deploy.yml` builds and deploys `web/` to GitHub Pages at the custom domain. It runs
on pushes to `master` touching `web/**` or `api/openapi.json`, and manually via `workflow_dispatch`. It never runs for api-only changes.
The web part of `ci.yml` verifies PRs.

## Acceptance criteria
- [ ] The workflow matches `deployment.md` (upload-pages-artifact + deploy-pages, npm cache keyed on `web/package-lock.json`).
- [ ] `NEXT_PUBLIC_*` values come from GitHub variables. No secrets in the build.
- [ ] An api-only commit does **not** trigger this workflow. A manual run works.
- [ ] The deployed site loads at the custom domain over HTTPS, and deep-link hard refresh works. `404.html` is present, and there is no `CNAME` or `.nojekyll` (the domain is set in the Pages settings).
- [ ] PR runs lint, test and build without deploying.
- [ ] Definition of Done satisfied.

## Blocked by
- T-0002. Enabling Pages, the custom domain and DNS need the owner's approval and action.

---

## Implementation notes

## Review
