---
id: T-0092
title: bookings table and migration 0008, the booking read model, PUT /bookings, the booked-time rule in PATCH /time-logs, booked minutes in lists and reports
milestone: M4
app: api
status: blocked
size: L
tier: sonnet
depends_on: []
feature_spec: specs/06-features/book-partial.md
spec_row: T1
ac_files: []
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
