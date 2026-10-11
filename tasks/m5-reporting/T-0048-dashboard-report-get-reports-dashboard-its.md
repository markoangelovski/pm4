---
id: T-0048
title: Dashboard report: GET /reports/dashboard, its DTOs and two repository queries
milestone: M5
app: api
status: ready
size: M
tier: haiku
depends_on: []
feature_spec: specs/06-features/rpt-api.md
spec_row: T1
ac_files:
  - { path: api/test/reports.ac.e2e-spec.ts, sha256: 77b477864b3d65597f409a0191d02ce950114e161677f1131c1bb4917ff8421a }
---

# T-0048: Dashboard report: GET /reports/dashboard, its DTOs and two repository queries

**Tier reason:** Both queries and the mapping are spelled out; the controller and service copy `bookings.controller.ts` / `bookings.service.ts`

Work from the brief: `node scripts/pm4.mjs brief T-0048`. Verify with `node scripts/pm4.mjs check T-0048`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by `review-feature`._
