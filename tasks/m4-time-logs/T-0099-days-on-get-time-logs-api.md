---
id: T-0099
title: days on GET /time-logs (API-TLOG-001), openapi:export
milestone: M4
app: api
status: ready
size: S
tier: haiku
depends_on: []
feature_spec: specs/06-features/proto-sync-logged-chart.md
spec_row: T1
ac_files:
  - { path: api/test/logged-time.ac.e2e-spec.ts, sha256: b6e6be21d0fb64b2f6f799f60859727d84f2838e77b7d0daaddcc720e43428a4 }
---

# T-0099: days on GET /time-logs (API-TLOG-001), openapi:export

**Tier reason:** The query is spelled out in *Interfaces*; copy `reportDays`

Work from the brief: `node scripts/pm4.mjs brief T-0099`. Verify with `node scripts/pm4.mjs check T-0099`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by `review-feature`._
