---
id: T-0076
title: Time DTOs, the time snapshot loader, the import preview with dates, the push preview (API-INT-008 dates, API-INT-010)
milestone: M6
app: api
status: blocked
size: M
tier: haiku
depends_on: [T-0075]
feature_spec: specs/06-features/int-time-api.md
spec_row: T3
ac_files:
  - { path: api/test/pmspa-time.ac.e2e-spec.ts, sha256: 8a167fc45fc04441d2b1a614a3df3735d068f52732f277a3d5d8dd46bd2babce }
---

# T-0076: Time DTOs, the time snapshot loader, the import preview with dates, the push preview (API-INT-008 dates, API-INT-010)

**Tier reason:** DTOs copy `dto/sync.dto.ts`; queries copy `TimeRepository.listDay` and `PmspaLinksRepository.active`; `loadTime` and the endpoint are spelled out

Work from the brief: `node scripts/pm4.mjs brief T-0076`. Verify with `node scripts/pm4.mjs check T-0076`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by `review-feature`._
