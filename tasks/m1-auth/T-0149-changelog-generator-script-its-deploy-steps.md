---
id: T-0149
title: Changelog generator script, its deploy steps, ignored files
milestone: M1
app: infra
status: ready
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

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by `review-feature`._
