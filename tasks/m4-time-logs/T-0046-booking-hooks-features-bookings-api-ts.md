---
id: T-0046
title: Booking hooks (features/bookings/api.ts)
milestone: M4
app: web
status: done
size: S
tier: haiku
depends_on: []
feature_spec: specs/06-features/book-web.md
spec_row: T1
ac_files:
  - { path: web/features/bookings/api.ac.test.tsx, sha256: 4808eae28b17b2a5fc0aea3a67c951df7c5a8daf369179fe07601160e583fada }
---

# T-0046: Booking hooks (features/bookings/api.ts)

**Tier reason:** Copies `features/time/api.ts`; the keys, URLs and invalidation are stated

Work from the brief: `node scripts/pm4.mjs brief T-0046`. Verify with `node scripts/pm4.mjs check T-0046`.

## Implementation notes
Replaced the typed stub in `web/features/bookings/api.ts` with the real hooks, copying `features/time/api.ts`:
- `useBookingRange` (`useQuery`, key `bookingKeys.range`) calls `GET /api/v1/bookings` with `query: { from, to }` and returns `data.items`.
- `useSetBooking` (`useMutation`) calls `PUT /api/v1/bookings` with the body and returns `data.items`; `onSuccess` invalidates `bookingKeys.all`.
- `bookingKeys` and the `BookingLog` re-export are unchanged from the stub.

Reviewer: no ac-hash changes; the test file is untouched.

`node scripts/pm4.mjs check T-0046`:
```
pm4 check T-0046
  ac hashes: ok (1)
  scope: ok
  pending ACs (later tasks, excluded): AC-7, AC-8, AC-9, AC-10, AC-11, AC-12, AC-13
  web lint: ok (7s)
  web format:check: ok (1s)
  web typecheck: ok (2s)
  web test: ok (16s)
  web build: ok (23s)
  web api:types: ok (1s)
  check AC-13: the build has the bookings page: skipped (later task)

PASS T-0046
```

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | PASS | Hooks implemented; AC-6 passes; `pm4 check` PASS |

## Review
**Verdict: approve** (Opus, 2026-10-10). Keys, URLs, query/body, `data.items` and `bookingKeys.all` invalidation match the spec; no findings.
**Tier:** haiku was right (plain copy of `features/time/api.ts`, passed first try).
