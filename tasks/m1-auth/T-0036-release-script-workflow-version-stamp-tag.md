---
id: T-0036
title: Release script, workflow version/stamp/tag steps, frozen 0.0.0 versions
milestone: M1
app: infra
status: done
size: M
tier: sonnet
depends_on: []
feature_spec: specs/06-features/ops-release-versions.md
spec_row: T1
ac_files:
  - { path: scripts/release-version.ac.test.mjs, sha256: bc28c750752ed37f34f1bf11cedea38ade0feb2d8c095d2cbbd6f88d3b2d69fd }
---

# T-0036: Release script, workflow version/stamp/tag steps, frozen 0.0.0 versions

**Tier reason:** Small pure functions plus git and workflow YAML, fully specified; infra, so the main session runs it

Work from the brief: `node scripts/pm4.mjs brief T-0036`. Verify with `node scripts/pm4.mjs check T-0036`.

## Implementation notes
Done in the main session (infra task).

- `scripts/release-version.mjs`: `bumpFor`, `bumpVersion`, `nextRelease` as specified; the CLI resolves the repo
  root, finds the last `<app>-v*` tag, reads `--no-merges` messages for `APP_PATHS[app]`, prints one line and
  appends `version`/`tag`/`bump` to `GITHUB_OUTPUT`. Errors → stderr, exit 1. Without tags it gives
  `web 0.0.0 → 0.1.0`, `api 0.0.0 → 0.1.0` today.
- Workflows: full-history checkout, job outputs, `Release version` + `Stamp version` before the build (api: after
  `Verify openapi.json is current`), `Tag the release` at the end of the deploy job with `contents: write` and
  `working-directory: .`.
- `web/package.json`, `api/package.json` (+ locks) at `0.0.0`; `api/openapi.json` re-exported (`info.version` 0.0.0);
  `schema.d.ts` unchanged.
- Spec: the three *Checks* blocks were merged into one, since pm4 runs only the first block; AC-6/AC-7 were
  silently skipped before. That edit is the only scope finding below.

`pm4 check T-0036`: ac hashes ok (1); AC-1…AC-5 ok; AC-6 ok; AC-7 ok; AC-8 manual; scope FAIL only for
`specs/06-features/ops-release-versions.md` (the Checks merge above). Infra has no pm4 gates, so they were run by hand:
web lint/typecheck/test/build/format:check and api lint/typecheck/test/test:e2e/build/format:check all pass.

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | opus (main session) | PASS | All ACs pass first run |
| 2 | opus (main session) | PASS | Review fixes: tag step exit-status branch, no-tag log line |

## Review
**Opus review (2026-10-03): changes-requested → fixed in the main session.**

1. Blocker, fixed: the tag step (copied from the spec snippet) tested `gh api`'s output for emptiness, but on a 404
   `gh api` prints the error body to stdout, so the tag would never be created. Spec snippet and both workflows
   now branch on `gh api`'s exit status. (`gh` isn't installed locally; the fix holds either way.)
2. Minor, watch in AC-8: `GITHUB_TOKEN` may be refused when tagging a commit that changes workflow files (the
   T-0036 merge). If so, re-run after the next non-workflow commit.
3. Minor, fixed: the CLI printed `no changes since null` with no tag; now `no changes, no tag yet`.
4. Minor, no change: `git describe` takes the nearest tag; a manual dispatch on another ref also tags that ref.
5. Tooling, proposal: pm4 runs only the first bash block of *Checks* (other specs may have skipped checks);
   quick-lane task to run every block or reject several.

Scope finding: only the spec (Checks merge + snippet fix). Tier feedback: sonnet was right; the defect came from the spec.
