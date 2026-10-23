---
id: T-0092
title: bookings table and migration 0008, the booking read model, PUT /bookings, the booked-time rule in PATCH /time-logs, booked minutes in lists and reports
milestone: M4
app: api
status: ready
size: L
tier: sonnet
depends_on: []
feature_spec: specs/06-features/book-partial.md
spec_row: T1
ac_files:
  - { path: api/test/bookings.ac.e2e-spec.ts, sha256: 968b8e7d9407efb6b1faf74fc5d1463aa9c09bc6ed80abb5c949a159ca132557 }
  - { path: api/test/time-logs.ac.e2e-spec.ts, sha256: d923b70e3b82dd9cec8b50245e2c11fd01b4a7ac8b87186eec5f2986e1178d7e }
  - { path: api/test/logged-time.ac.e2e-spec.ts, sha256: c7f61a415e07619118735918fea70fe3c6777d3c0586a5d4bbe7d48e1cc6bc7a }
  - { path: api/test/reports.ac.e2e-spec.ts, sha256: 7ff94bbee5e80856de52bcddf0af1e4c6262b4d868ec7d63b7ab4878040ca4cb }
  - { path: api/test/delete-day.ac.e2e-spec.ts, sha256: 23fabed5b6c698480ea4cfe9c37f99a8d55eb8941d9f614966627f7445b40da6 }
---

# T-0092: bookings table and migration 0008, the booking read model, PUT /bookings, the booked-time rule in PATCH /time-logs, booked minutes in lists and reports

**Tier reason:** Writes over two tables under row locks, with the order spelled out (D4)

Work from the brief: `node scripts/pm4.mjs brief T-0092`. Verify with `node scripts/pm4.mjs check T-0092`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by `review-feature`._
