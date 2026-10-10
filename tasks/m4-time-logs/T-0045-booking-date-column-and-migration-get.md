---
id: T-0045
title: booking_date column and migration, GET/PUT /bookings, clearing the booking in PATCH /time-logs
milestone: M4
app: api
status: ready
size: M
tier: haiku
depends_on: []
feature_spec: specs/06-features/book-api.md
spec_row: T1
ac_files:
  - { path: api/test/bookings.ac.e2e-spec.ts, sha256: 00540e163b0b146836d747cf764c11bc6bb708b43cc5897e3d40fa9955af6b5f }
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
