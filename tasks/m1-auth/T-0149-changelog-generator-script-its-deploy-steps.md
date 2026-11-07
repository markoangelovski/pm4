---
id: T-0149
title: Changelog generator script, its deploy steps, ignored files
milestone: M1
app: infra
status: done
size: M
tier: sonnet
depends_on: []
feature_spec: specs/06-features/shell-documentation.md
spec_row: T1
ac_files:
  - { path: scripts/changelog.ac.test.mjs, sha256: b4c17e475fac334e3f3d0da30c232afa08e9e14d74ae1e598f2aa66105f76ec9 }
---

# T-0149: Changelog generator script, its deploy steps, ignored files

**Tier reason:** git ranges and CLI tests against a temp repo plus workflow YAML; infra, so the main session runs it

Work from the brief: `node scripts/pm4.mjs brief T-0149`. Verify with `node scripts/pm4.mjs check T-0149`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

Main session (infra). `scripts/changelog.mjs`: `changeFor`, `buildChangelog` and the CLI (tags sorted numerically, ranges per tag, the release being shipped via `nextRelease`). `web-deploy.yml` and `api-deploy.yml`: a `Changelog` step after `Stamp version`; the API stages `changelog.json`. Root `.gitignore`: both generated files. On this repo, `web` gives 7 releases (latest web-v0.6.0).

`pm4 check T-0149`: ac hashes ok (1), scope ok, AC-1…AC-4 ok, AC-5 ok; AC-8 and AC-14 skipped (later tasks). PASS.

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | main session (opus) | pass | First try, 4/4 ACs green |

## Review
**Opus review (2026-11-07): approve.** `scripts/changelog.mjs` matches the Interfaces exactly; both workflows run `Changelog` after `Stamp version` and before the build, the API stages `changelog.json`, both files are ignored, `ci.yml` and `release-version.mjs` untouched. Minor (no change): a malformed `<app>-v*` tag fails the deploy before the build, as AC-4 specifies; recovery is deleting the tag. Tier: right (sonnet, run in the main session, first try).
