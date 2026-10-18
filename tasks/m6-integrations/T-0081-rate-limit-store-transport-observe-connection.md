---
id: T-0081
title: Rate limit: store, transport observe, connection service; openapi:export
milestone: M6
app: api
status: ready
size: S
tier: haiku
depends_on: []
feature_spec: specs/06-features/int-budget.md
spec_row: T1
ac_files:
  - { path: api/test/pmspa-budget.ac.e2e-spec.ts, sha256: d1890826087557d0bbe9417f3aa7d4684acf210998ad61eb6ca2cb1eaf05ed7b }
---

# T-0081: Rate limit: store, transport observe, connection service; openapi:export

**Tier reason:** Every step is spelled out under *Rate limit*; copies the store's key pattern

Work from the brief: `node scripts/pm4.mjs brief T-0081`. Verify with `node scripts/pm4.mjs check T-0081`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by `review-feature`._
