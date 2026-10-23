---
id: T-0092
title: bookings table and migration 0008, the booking read model, PUT /bookings, the booked-time rule in PATCH /time-logs, booked minutes in lists and reports
milestone: M4
app: api
status: done
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
`bookings` table + migration 0008 (data step appended), booking read model, `PUT /bookings` (`setBookings`), booked-time rule in `updateLog` (BookedTimeException), booked minutes in `listLogs`/reports, `common/duration.ts`. Ordinary unit tests rewritten.

pm4 check: FAIL. Lint, format, typecheck, build and openapi:export ok. Remaining failures are only PMSPA ACs owned by T2: `pmspa-time-fields.ac.spec.ts` AC-15 (tuples still carry booked) and `pmspa-time.ac.e2e-spec.ts` AC-6/14/15/16 (5 tests). All bookings, time-logs, logged-time, reports and delete-day e2e pass. AC-13 (manual migrate) not run.

Orchestrator: re-ran `pm4 check T-0092`, same result. The failing tests are T2's (AC-14/15/16 per the spec's AC table). `pm4 check` didn't exclude them because those PMSPA tests' describe names carry `(feat-int-time-api)`, not `feat-book-partial`, so the pending-AC filter doesn't match. Accepted; they must pass in T-0093's check.

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | sonnet | done (T1 scope) | check fails only on T2 PMSPA ACs |

## Review
**Verdict: approve** (Opus, 2026-10-23). Schema, migration 0008, repository (locks, check order, user scoping) and services match the spec.
- Minor: `time-logs.service.spec.ts:424, 449` test names still say "→ bookingDate null"; they assert `mode() === "clear"` → rename "→ bookings cleared".
- Minor (hardening, optional): `time.repository.ts:606-614` booked-sum in `updateLog` filters only on `time_log_id`; safe today (findLog 404s first, lock and UPDATE are user-scoped); could add `eq(bookings.userId, userId)`.
- Process: `pm4 check` ran T2's PMSPA ACs (describe names carry `(feat-int-time-api)`): pm4 pending-AC filter gap, quick-lane candidate.

Tier: sonnet was right.
