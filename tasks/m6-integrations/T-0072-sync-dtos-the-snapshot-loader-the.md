---
id: T-0072
title: Sync DTOs, the snapshot loader, the two preview endpoints (API-INT-008, API-INT-015)
milestone: M6
app: api
status: blocked
size: M
tier: haiku
depends_on: [T-0071]
feature_spec: specs/06-features/int-sync-api.md
spec_row: T4
ac_files:
  - { path: api/test/pmspa-sync.ac.e2e-spec.ts, sha256: f25186d8786045ddcab6ae6086a1f5d4dcfb010e8953cf22f0a91f551db4054c }
---

# T-0072: Sync DTOs, the snapshot loader, the two preview endpoints (API-INT-008, API-INT-015)

**Tier reason:** DTOs copy `proposed-types.ts` and `save-pmspa-connection.dto.ts`; controller copies `pmspa-connection.controller.ts`; `load` is spelled out

Work from the brief: `node scripts/pm4.mjs brief T-0072`. Verify with `node scripts/pm4.mjs check T-0072`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by `review-feature`._
