---
id: T-0096
title: Rename two time-logs service test names that still say "bookingDate null"
milestone: M4
app: api
status: ready
size: S
tier: haiku
depends_on: []
feature_spec: —
files: [api/src/time/time-logs.service.spec.ts]
specs: [specs/06-features/book-partial.md]
ac_files: []
---

# T-0096: Rename two time-logs service test names that still say "bookingDate null"

## Goal
Two unit-test names in the time-logs service spec describe the old model (`time_logs.booking_date`,
dropped in T-0095); rename them to what the tests check, a cleared booking. Opus review of T-0095, finding 3.

## Change
`api/src/time/time-logs.service.spec.ts`, test names only (no change to any test body):
- `"taskId and projectId both null → bookingDate null"` → `"taskId and projectId both null → booking cleared"`
- `"excludeFromStats true → bookingDate null"` → `"excludeFromStats true → booking cleared"`

## Acceptance criteria
- [ ] `grep -n "bookingDate null" api/src/time/time-logs.service.spec.ts` finds nothing
- [ ] `npm test` in `api/` passes, with the two tests under their new names

## Checks
```bash
! grep -n "bookingDate null" api/src/time/time-logs.service.spec.ts
```

---

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |

## Review
_The owner's review (quick lane), or `review-feature`'s verdict._
