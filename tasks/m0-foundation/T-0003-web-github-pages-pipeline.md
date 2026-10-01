---
id: T-0003
title: GitHub Pages CI/CD for web/
milestone: M0
app: infra
status: done
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
- [x] The workflow matches `deployment.md` (upload-pages-artifact + deploy-pages, npm cache keyed on `web/package-lock.json`). See `.github/workflows/web-deploy.yml`: `actions/setup-node@v7` with `cache-dependency-path: web/package-lock.json`; build job uploads `web/out` with `actions/upload-pages-artifact@v5`; deploy job uses `actions/deploy-pages@v5` under `environment: github-pages` with `pages: write` + `id-token: write`. `docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:latest` → exit 0, no findings.
- [x] `NEXT_PUBLIC_*` values come from GitHub variables. No secrets in the build. `NEXT_PUBLIC_API_BASE_URL` / `NEXT_PUBLIC_APP_URL` are read only from `${{ vars.* }}` in the build step; no `${{ secrets.* }}` reference anywhere in the workflow.
- [ ] An api-only commit does **not** trigger this workflow. A manual run works. Path config reviewed: `web-deploy.yml` triggers only on `web/**`, `api/openapi.json`, and its own workflow file, matching `deployment.md`'s trigger table — a pure `api/**` change (not touching `openapi.json`) cannot match. **Owner verifies after push:** an actual api-only commit not triggering the workflow, and a manual `workflow_dispatch` run, in GitHub Actions.
- [ ] The deployed site loads at the custom domain over HTTPS, and deep-link hard refresh works. `404.html` is present, and there is no `CNAME` or `.nojekyll` (the domain is set in the Pages settings). Verified locally: `npm run build` (with the real `NEXT_PUBLIC_API_BASE_URL`/`NEXT_PUBLIC_APP_URL` values as env) produced `out/404.html`; `out/CNAME` and `out/.nojekyll` are absent. Served `npx serve out -p 4173` and confirmed `GET /` → 200, `GET /projects/view/?id=abc` → 200 (deep link resolves without a server-side rewrite), `GET /no-such-route-xyz` → 404 serving the app's `404.html` (`<title>PM4</title>`). **Owner verifies after push:** the real deploy at `https://pm4.angelovski.top` over HTTPS and a hard refresh on a deep route in the browser.
- [x] PR runs lint, test and build without deploying. `ci.yml`'s `web` job (gated on `dorny/paths-filter` output `web`) runs lint/typecheck/test/api:types-diff/build/404-check and has no deploy step; the deploy workflow is separate (`web-deploy.yml`, `push`/`workflow_dispatch` only, not `pull_request`). Locally reproduced the same steps directly in `web/` (see Implementation notes) — all passed.
- [ ] Definition of Done satisfied. All items checkable without a live deploy are met (see Implementation notes); the two DoD items that require the real Pages deployment are left for the owner after push.

## Blocked by
- T-0002. Enabling Pages, the custom domain and DNS need the owner's approval and action.

---

## Implementation notes

Added `.github/workflows/web-deploy.yml` and the shared `.github/workflows/ci.yml` (`web` job).
`api-deploy.yml` and the `api` job of `ci.yml` are T-0004; both tasks were implemented together
because they share `ci.yml`.

Also regenerated `web/lib/api/schema.d.ts` from `api/openapi.json` (`npm run api:types`, run from
`web/`) — it was still the placeholder stub from T-0002 (`export interface paths {}`), which would
have failed the new "generated API types are current" CI check. `api/openapi.json` itself is still
the empty scaffold from T-0001 (`"paths": {}`), so the regenerated `schema.d.ts` is likewise empty
of real endpoints; both regenerate again, with real content, the first time an api feature task
runs `openapi:export`.

**Action versions** (current major release tag as of 2026-09-27, checked via
`https://api.github.com/repos/<org>/<repo>/releases/latest`): `actions/checkout@v7`,
`actions/setup-node@v7`, `actions/upload-pages-artifact@v5`, `actions/deploy-pages@v5`,
`dorny/paths-filter@v4` (shared with T-0004/`ci.yml`).

**Verification (local, no push/deploy):**
| Step | Command | Result |
| --- | --- | --- |
| actionlint | `docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:latest` (repo root) | Pass, exit 0, no findings on any of the three workflow files |
| Install | `npm ci` (already installed; verified `node_modules` present, Node `v24.12.0` matches `.nvmrc`) | OK |
| Lint | `npm run lint` | Pass, no output |
| Type-check | `npm run typecheck` | Pass, no output |
| Test | `npm test` | Pass — 3 test files, 14 tests |
| API types | `npm run api:types` then `git diff --exit-code -- lib/api/schema.d.ts` (from repo root) | Regenerated; diff against the last commit is the intentional stub→real change described above (this *is* the working-tree change T-0003 leaves for the owner to commit) |
| Build | `NEXT_PUBLIC_API_BASE_URL=https://pm4-api-heagfvepgbcje5c3.westeurope-01.azurewebsites.net NEXT_PUBLIC_APP_URL=https://pm4.angelovski.top npm run build` | Pass — 12 static routes generated |
| 404 check | `test -f out/404.html` | Pass |
| No CNAME/.nojekyll | `test -f out/CNAME`, `test -f out/.nojekyll` | Both absent, as expected |
| Static serve + deep link | `npx serve out -p 4173`; `curl` to `/`, `/projects/view/?id=abc`, `/no-such-route-xyz` | `/` → 200, deep link → 200, unknown route → 404 serving the app shell's `404.html` |

Path-filter review: `web-deploy.yml`'s `on.push.paths` is `web/**`, `api/openapi.json`,
`.github/workflows/web-deploy.yml` — matches `deployment.md` exactly. `ci.yml`'s `changes` job
(`dorny/paths-filter`) uses the same `web` filter set, shared with `api-deploy.yml`'s `api/**`
filter for the `api` output.

Not verifiable locally (require a real push and the owner's GitHub/Azure/DNS setup — left unticked
above, "owner verifies after push"): the actual GitHub Actions run (including `workflow_dispatch`
and confirming an api-only commit doesn't trigger this workflow in practice), the live Pages
deployment, HTTPS and deep-link hard refresh on `https://pm4.angelovski.top`.

Suggested commit message: `feat(infra): add web-deploy, api-deploy and ci workflows (T-0003, T-0004)`.

## Review
