---
id: T-0045
title: booking_date column and migration, GET/PUT /bookings, clearing the booking in PATCH /time-logs
milestone: M4
app: api
status: blocked
size: M
tier: haiku
depends_on: []
feature_spec: specs/06-features/book-api.md
spec_row: T1
ac_files: []
---

# T-0045: booking_date column and migration, GET/PUT /bookings, clearing the booking in PATCH /time-logs

**Tier reason:** One table; the queries, the transaction and the clearing rule are spelled out; controllers copy `workdays.controller.ts`

Work from the brief: `node scripts/pm4.mjs brief T-0045`. Verify with `node scripts/pm4.mjs check T-0045`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by `review-feature`._
