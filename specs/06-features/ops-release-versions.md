---
id: feat-ops-release-versions
title: "Automatic release versions from git tags and conventional commits"
status: approved
owner: Marko Angelovski
last_updated: 2026-10-03
milestone: M1
requirements: []
related: [arch-deployment, arch-env, api-endpoints, feat-shell-sidebar-branding, OQ-051, OQ-052, OQ-098]
---

# Automatic release versions from git tags and conventional commits

## Goal
Every deploy gets the right semver without anyone bumping a version: each deploy workflow derives its
app's next version from git tags and conventional commits, ships it, and tags the commit. The sidebar
pill (SCR-004) and API-SYS-003 show it. Rules: [arch-deployment#release-versions-oq-098](../02-architecture/deployment.md#release-versions-oq-098).

## Decisions
| # | Decision | Source |
| --- | --- | --- |
| D1 | Versions are automatic, per app (web and API separate), from `<app>-v<semver>` tags and conventional commits since the last tag. | OQ-098 (owner, 2026-10-03) |
| D2 | Standard bump rules also while major is 0: breaking → major, `feat` → minor, anything else → patch. The first release after the bootstrap tags becomes `0.1.0`. | OQ-098 (owner, 2026-10-03) |
| D3 | The version is stamped into the app's `package.json` in CI (`npm version … --no-git-tag-version`) instead of changing app code. The web build and the API's `dist/package.json` already read it, so no app source changes. | Agent: smallest change; API-SYS-003 and its tests stay as they are |
| D4 | The repo's `package.json` versions are frozen at `0.0.0` (local builds show `v0.0.0`, so a local build never looks like a release). `openapi.json` is exported before stamping, so its `info.version` stays `0.0.0`. | Agent |
| D5 | CI creates tags through the GitHub API (`gh api …/git/refs`) after a successful deploy; it never commits. | Agent: no race with the owner's pushes |
| D6 | The script is one dependency-free Node file at the repo root, testable as pure functions plus a CLI run against a temporary git repo. | Agent: like `scripts/pm4.mjs` |

## Scope
**In:** `scripts/release-version.mjs`, the version and tag steps in `web-deploy.yml` and
`api-deploy.yml`, freezing both `package.json` versions at `0.0.0`.

**Non-goals** (implementers must not touch these):
- `ci.yml` (PRs don't release), app source code in `web/` and `api/`, the version helpers and pill.
- Changelogs, GitHub Releases, commit-message linting.
- Creating the bootstrap tags or pushing anything: the owner does that (arch-deployment owner checklist).

## Read first
| Path | Why / copy this |
| --- | --- |
| `specs/02-architecture/deployment.md#release-versions-oq-098` | The rules this implements |
| `scripts/pm4.mjs` | Style of a dependency-free root script: `spawnSync("git", …)`, plain `console.log`, exit codes |
| `.github/workflows/web-deploy.yml`, `.github/workflows/api-deploy.yml` | The steps to extend |
| `web/next.config.ts` | Reads `web/package.json` `version` at build time (why stamping is enough for web) |
| `api/src/version/version.controller.ts` | Imports `package.json`; the build emits `dist/package.json` (why stamping is enough for the API) |

## Files
| App | File | C/M | Task | Notes |
| --- | --- | --- | --- | --- |
|  | `scripts/release-version.ac.test.mjs` | C | tests | Acceptance tests (`node --test`) |
|  | `scripts/release-version.mjs` | C | T1 | Stub from the test writer |
|  | `.github/workflows/web-deploy.yml` | M | T1 | Version, stamp, tag |
|  | `.github/workflows/api-deploy.yml` | M | T1 | Version, stamp, tag |
| web | `web/package.json` | M | T1 | `npm version 0.0.0 --no-git-tag-version` |
| web | `web/package-lock.json` | M | T1 | Same command |
| api | `api/package.json` | M | T1 | `npm version 0.0.0 --no-git-tag-version` |
| api | `api/package-lock.json` | M | T1 | Same command |
| api | `api/openapi.json` | M | T1 | `npm run openapi:export` (`info.version` → `0.0.0`) |

## Interfaces

### Script (T1)
```js
// scripts/release-version.mjs — no dependencies, Node 24, ESM. Exports for tests; CLI when run directly.
/** @typedef {"major" | "minor" | "patch" | "none"} Bump */

/** Paths whose commits count for each app (the same paths that trigger its deploy workflow). */
export const APP_PATHS = { web: ["web/", "api/openapi.json"], api: ["api/"] };

/**
 * Highest bump among full commit messages (subject + body). Subject `^(\w+)(\([^)]*\))?(!)?: ` :
 * `!` or a body line starting `BREAKING CHANGE:` / `BREAKING-CHANGE:` → "major"; type `feat` → "minor";
 * anything else, including a non-conventional subject → "patch". [] → "none".
 */
export function bumpFor(messages /* string[] */) /* : Bump */;

/** "0.1.3" + "minor" → "0.2.0"; "none" → unchanged. Throws on a version that isn't `\d+.\d+.\d+`. */
export function bumpVersion(version /* string */, bump /* Bump */) /* : string */;

/**
 * lastTag `null` → previous "0.0.0". Returns { previous, version, bump, tag }:
 * tag = `${app}-v${version}` when bump !== "none", else null. Throws on an unknown app or a tag that
 * isn't `${app}-v\d+.\d+.\d+`.
 */
export function nextRelease({ app, lastTag, messages }) /* : { previous: string, version: string, bump: Bump, tag: string | null } */;
```
CLI `node scripts/release-version.mjs <web|api>`, from any directory inside the repo:
- Repo root: `git rev-parse --show-toplevel` (from the current directory). Every git command runs there.
- Last tag: `git describe --tags --abbrev=0 --match "<app>-v[0-9]*" HEAD`; a non-zero exit → `null`.
- Messages: `git log --no-merges --format=%B%x1e <lastTag>..HEAD -- <APP_PATHS[app]>` (without
  `<lastTag>..` when there's no tag), split on `\x1e`, trimmed, empty ones dropped.
- Prints one line: `web 0.0.1 → 0.1.0 (minor, 12 commits)` or `web 0.1.0 (no changes since web-v0.1.0)`.
- If `GITHUB_OUTPUT` is set, appends `version=<version>`, `tag=<tag or empty>`, `bump=<bump>` (one per line).
- A missing or unknown app, or a malformed tag → message on stderr, exit 1.

### Workflows (T1)
Both workflows, build job:
- `actions/checkout` gets `with: fetch-depth: 0` (history and tags).
- Job `outputs`: `version`, `tag`, `bump` from a step `id: release`.
- After the last check and before `npm run build`: step `Release version` (`id: release`) runs
  `node ../scripts/release-version.mjs <app>`, then step `Stamp version` runs
  `npm version "${{ steps.release.outputs.version }}" --no-git-tag-version --allow-same-version`.
  In `api-deploy.yml` this comes after `Verify openapi.json is current`, so the stamped version never
  reaches `openapi.json`, and before `Build`, so `dist/package.json` and the staged `package.json` carry it.

Deploy job, last step, `if: needs.build.outputs.bump != 'none'`, job `permissions` adds `contents: write`
(web keeps `pages: write`, `id-token: write`):
```yaml
- name: Tag the release
  env:
    GH_TOKEN: ${{ github.token }}
    TAG: ${{ needs.build.outputs.tag }}
  run: |
    if existing=$(gh api "repos/${{ github.repository }}/git/ref/tags/$TAG" --jq .object.sha 2>/dev/null); then
      [ "$existing" = "${{ github.sha }}" ] || echo "::warning::$TAG already points to $existing; not moved."
    else
      gh api "repos/${{ github.repository }}/git/refs" -f ref="refs/tags/$TAG" -f sha="${{ github.sha }}"
    fi
```
In `api-deploy.yml` it runs after `Smoke check (/health)`; in `web-deploy.yml` after `Deploy to GitHub Pages`.
The step sets `working-directory: .`: nothing is checked out in the deploy job, and `web-deploy.yml`'s
workflow-level `defaults.run.working-directory: web` would point at a folder that doesn't exist there.

## Acceptance criteria
| AC | Case → expected | Test | Task |
| --- | --- | --- | --- |
| AC-1 | `bumpFor`: `feat: x` → minor; `fix: x`, `chore(tooling): x`, `test(web): x`, `Update README` → patch; `feat(web)!: x` → major; `fix: x` with body line `BREAKING CHANGE: y` → major; `[fix, feat]` → minor; `[]` → none | `scripts/release-version.ac.test.mjs` | T1 |
| AC-2 | `bumpVersion`: `0.0.1`+patch → `0.0.2`; `0.0.1`+minor → `0.1.0`; `0.1.3`+minor → `0.2.0`; `0.2.3`+major → `1.0.0`; `0.2.3`+none → `0.2.3`; `1.2` → throws | `scripts/release-version.ac.test.mjs` | T1 |
| AC-3 | `nextRelease`: `{web, null, [feat]}` → previous `0.0.0`, version `0.1.0`, tag `web-v0.1.0`; `{api, "api-v0.1.0", []}` → version `0.1.0`, bump none, tag null; tag `web-v1.2` or app `docs` → throws | `scripts/release-version.ac.test.mjs` | T1 |
| AC-4 | CLI in a temporary git repo: tags `web-v0.0.1`/`api-v0.0.1` on the first commit, then `feat(web): a` (touches `web/`), `fix(api): b` (touches `api/`), `chore: c` (touches `api/openapi.json`), and a merge commit `feat!: merge side` of a branch whose only commit is `fix(web): side` (the merge commit is ignored) → `web` prints `web 0.0.1 → 0.1.0` and writes `version=0.1.0`, `tag=web-v0.1.0`, `bump=minor` to `GITHUB_OUTPUT`; `api` → `0.0.2`, `api-v0.0.2`, `patch`; run from a subfolder → same result | `scripts/release-version.ac.test.mjs` | T1 |
| AC-5 | CLI: no commits for the app since its tag → `bump=none`, `tag=` empty, version = the tag's; no tag at all → counts from `0.0.0`; no argument → exit 1 | `scripts/release-version.ac.test.mjs` | T1 |
| AC-6 | Both workflows: full history checkout, release + stamp steps before the build, tag step with `contents: write` at the end of the deploy job | `check` | T1 |
| AC-7 | `web/package.json`, `api/package.json` and `api/openapi.json` `info.version` are `0.0.0`; the generated contract is current | `check` | T1 |
| AC-8 | After the owner's bootstrap tags and push: `web-deploy` and `api-deploy` succeed, the repo gets `web-v0.1.0` and `api-v0.1.0`, the pill shows `v0.1.0` and its tooltip `Web v0.1.0 · API v0.1.0`; re-running a workflow creates no new tag | `manual` | T1 |

Typed stubs (created with the tests, so the tests fail for the right reason):
- `scripts/release-version.mjs`: `APP_PATHS` real; `bumpFor`, `bumpVersion`, `nextRelease` each
  `throw new Error("not implemented (feat-ops-release-versions)")`; the CLI entry exits 1 with the same message.

## Checks
```bash
# AC-1…AC-5: release-version acceptance tests
node --test scripts/release-version.ac.test.mjs

# AC-6: workflow steps
for w in web api; do
  f=.github/workflows/$w-deploy.yml
  grep -q 'fetch-depth: 0' $f
  grep -q "release-version.mjs $w" $f
  grep -q 'npm version "${{ steps.release.outputs.version }}" --no-git-tag-version --allow-same-version' $f
  grep -q 'contents: write' $f
  grep -q 'working-directory: \.' $f
  grep -q 'name: Tag the release' $f
  test "$(grep -n 'Stamp version' $f | cut -d: -f1)" -lt "$(grep -n 'run: npm run build' $f | cut -d: -f1)"
done
test "$(grep -n 'Verify openapi.json is current' .github/workflows/api-deploy.yml | cut -d: -f1)" -lt "$(grep -n 'Stamp version' .github/workflows/api-deploy.yml | cut -d: -f1)"

# AC-7: frozen versions, contract current
test "$(node -p "require('./web/package.json').version")" = 0.0.0
test "$(node -p "require('./api/package.json').version")" = 0.0.0
test "$(node -p "require('./api/openapi.json').info.version")" = 0.0.0
tmp=$(mktemp -d)
cp api/openapi.json web/lib/api/schema.d.ts "$tmp/"
(cd api && npm run -s openapi:export) && cmp -s api/openapi.json "$tmp/openapi.json"
(cd web && npm run -s api:types) && cmp -s web/lib/api/schema.d.ts "$tmp/schema.d.ts"
```

## Tasks
| # | Task | App | Size | Tier | Why this tier | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | Release script, workflow version/stamp/tag steps, frozen `0.0.0` versions | infra | M | sonnet | Small pure functions plus git and workflow YAML, fully specified; infra, so the main session runs it | — |

## Open questions
—

## Changelog
- 2026-10-03: Initial draft (OQ-098). Open questions empty → `review`.
- 2026-10-03: Approved by the owner.
- 2026-10-03: Checks merged into one bash block (pm4 runs only the first).
- 2026-10-03: Review: the tag step branches on `gh api`'s exit status (on a 404 `gh api` prints the error body to stdout, so an empty-output test never created the tag).
