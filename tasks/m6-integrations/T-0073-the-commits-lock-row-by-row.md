---
id: T-0073
title: The commits: lock, row-by-row writes on both sides, links and hashes, last_sync_at (API-INT-009, API-INT-016)
milestone: M6
app: api
status: blocked
size: L
tier: sonnet
depends_on: [T-0072]
feature_spec: specs/06-features/int-sync-api.md
spec_row: T5
ac_files:
  - { path: api/test/pmspa-sync.ac.e2e-spec.ts, sha256: f25186d8786045ddcab6ae6086a1f5d4dcfb010e8953cf22f0a91f551db4054c }
---

# T-0073: The commits: lock, row-by-row writes on both sides, links and hashes, last_sync_at (API-INT-009, API-INT-016)

**Tier reason:** Owner ceiling (OQ-189) instead of opus: writes on two systems with partial failure and a lock, spelled out step by step in *Commits*

Work from the brief: `node scripts/pm4.mjs brief T-0073`. Verify with `node scripts/pm4.mjs check T-0073`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by `review-feature`._
