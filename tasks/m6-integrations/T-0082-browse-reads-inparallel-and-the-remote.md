---
id: T-0082
title: Browse reads: inParallel and the remote methods, dayItems, API-INT-006/007/017/018
milestone: M6
app: api
status: blocked
size: M
tier: sonnet
depends_on: [T-0081]
feature_spec: specs/06-features/int-budget.md
spec_row: T2
ac_files:
  - { path: api/test/pmspa-budget.ac.e2e-spec.ts, sha256: d1890826087557d0bbe9417f3aa7d4684acf210998ad61eb6ca2cb1eaf05ed7b }
---

# T-0082: Browse reads: inParallel and the remote methods, dayItems, API-INT-006/007/017/018

**Tier reason:** Concurrency (bounded parallel calls) and the day mapping moved out of the controller

Work from the brief: `node scripts/pm4.mjs brief T-0082`. Verify with `node scripts/pm4.mjs check T-0082`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by `review-feature`._
