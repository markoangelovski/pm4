---
id: T-0077
title: The import commit of day and event rows (API-INT-009 dates)
milestone: M6
app: api
status: blocked
size: M
tier: haiku
depends_on: [T-0076]
feature_spec: specs/06-features/int-time-api.md
spec_row: T4
ac_files:
  - { path: api/test/pmspa-time.ac.e2e-spec.ts, sha256: 8a167fc45fc04441d2b1a614a3df3735d068f52732f277a3d5d8dd46bd2babce }
---

# T-0077: The import commit of day and event rows (API-INT-009 dates)

**Tier reason:** Each step is spelled out in *Import commit* and calls an existing service or helper; the commit loop and its failure handling exist

Work from the brief: `node scripts/pm4.mjs brief T-0077`. Verify with `node scripts/pm4.mjs check T-0077`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by `review-feature`._
