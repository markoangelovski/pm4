---
id: T-0036
title: Release script, workflow version/stamp/tag steps, frozen 0.0.0 versions
milestone: M1
app: infra
status: ready
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
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by `review-feature`._
