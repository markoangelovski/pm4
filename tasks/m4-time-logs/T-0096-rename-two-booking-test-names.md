---
id: T-0096
title: Rename two time-logs service test names that still say "bookingDate null"
milestone: M4
app: api
status: done
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
Renamed the two test names in `api/src/time/time-logs.service.spec.ts` (line 149 and 178); test bodies unchanged.
- `"taskId and projectId both null → bookingDate null"` → `"taskId and projectId both null → booking cleared"`
- `"excludeFromStats true → bookingDate null"` → `"excludeFromStats true → booking cleared"`

`grep -n "bookingDate null"` finds nothing. `npx vitest run src/time/time-logs.service.spec.ts`: 12 passed.

`node scripts/pm4.mjs check T-0096`:
```
pm4 check T-0096
  ac hashes: none recorded
  scope: ok
  api lint: ok (15s)
  api format:check: ok (3s)
  api typecheck: ok (6s)
  api test: ok (10s)
  api test:e2e: ok (47s)
  api build: ok (6s)
  check checks: ok

PASS T-0096
```

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | pass | Renamed both test names; grep clean; check PASS |

## Review
_The owner's review (quick lane), or `review-feature`'s verdict._
