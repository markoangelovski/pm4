---
id: T-0078
title: The push commit: event writes, moves, D3 linking, empty-event deletes, the push endpoint (API-INT-011)
milestone: M6
app: api
status: blocked
size: L
tier: sonnet
depends_on: [T-0077]
feature_spec: specs/06-features/int-time-api.md
spec_row: T5
ac_files:
  - { path: api/test/pmspa-time.ac.e2e-spec.ts, sha256: 8a167fc45fc04441d2b1a614a3df3735d068f52732f277a3d5d8dd46bd2babce }
---

# T-0078: The push commit: event writes, moves, D3 linking, empty-event deletes, the push endpoint (API-INT-011)

**Tier reason:** Owner ceiling (OQ-189) instead of opus: writes on two systems with partial failure and ordering, spelled out in *Push commit*

Work from the brief: `node scripts/pm4.mjs brief T-0078`. Verify with `node scripts/pm4.mjs check T-0078`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by `review-feature`._
