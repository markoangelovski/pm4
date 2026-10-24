---
id: T-0099
title: days on GET /time-logs (API-TLOG-001), openapi:export
milestone: M4
app: api
status: done
size: S
tier: haiku
depends_on: []
feature_spec: specs/06-features/proto-sync-logged-chart.md
spec_row: T1
ac_files:
  - { path: api/test/logged-time.ac.e2e-spec.ts, sha256: b6e6be21d0fb64b2f6f799f60859727d84f2838e77b7d0daaddcc720e43428a4 }
---

# T-0099: days on GET /time-logs (API-TLOG-001), openapi:export

**Tier reason:** The query is spelled out in *Interfaces*; copy `reportDays`

Work from the brief: `node scripts/pm4.mjs brief T-0099`. Verify with `node scripts/pm4.mjs check T-0099`.

## Implementation notes
- `TimeRepository.listLogs` runs a fourth query in its `Promise.all`: the spec's per-log booked subquery grouped by
  `work_date`, filtered by `user_id` and the project or task, oldest first. It returns `days`.
- `TimeLogsService.list` returns the repository's `days` (the test step's `days: []` stub is gone). `openapi.json` is unchanged.
- `pm4 check T-0099`: PASS. ac hashes ok (1), scope ok, api lint / format:check / typecheck / test / test:e2e / build ok,
  openapi:export ok (no diff). Pending ACs of T-0100 excluded: AC-5…AC-9.

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | PASS after a format fix | Query and service as in the spec. Its check failed only on Prettier (one wrapped type argument in `time.repository.ts`); the orchestrator ran `prettier --write` on that file, then the check passed |

## Review
**Verdict: approve** (Opus, 2026-10-24). `pm4 check --feature`: PASS (ac hashes ok (6), scope ok, all api and web gates, twins 91 equal).
- The `days` query is the spec's SQL, the fourth query in `listLogs`'s `Promise.all`; the service returns it and the stub is gone.
- Scoped by `user_id`; the booked subquery reads only the caller's logs' bookings (as `reportDays`). AC-4 covers another user's
  project and an unknown id. `days` ignores paging (AC-3), counts excluded logs (D2) and books on the work date (D1).
- No schema or migration change.
- Findings: none.
- Tier: haiku was right (the query was spelled out; only a Prettier wrap).
