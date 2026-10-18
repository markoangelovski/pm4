---
id: T-0084
title: Linked-only reads: loadLinked for sync and push previews and commits, the pick check, candidates: null, API-INT-019
milestone: M6
app: api
status: blocked
size: M
tier: sonnet
depends_on: [T-0083]
feature_spec: specs/06-features/int-budget.md
spec_row: T4
ac_files:
  - { path: api/test/pmspa-budget.ac.e2e-spec.ts, sha256: d1890826087557d0bbe9417f3aa7d4684acf210998ad61eb6ca2cb1eaf05ed7b }
  - { path: api/test/pmspa-sync.ac.e2e-spec.ts, sha256: 2ca914189f8bb12000f213a84ab66d11cb570845a13c4e7784771fd2f0e937cb }
---

# T-0084: Linked-only reads: loadLinked for sync and push previews and commits, the pick check, candidates: null, API-INT-019

**Tier reason:** A new snapshot loader for three targets and the commit's link check inside the lock

Work from the brief: `node scripts/pm4.mjs brief T-0084`. Verify with `node scripts/pm4.mjs check T-0084`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by `review-feature`._
