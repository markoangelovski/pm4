---
id: T-0130
title: Non-prod out of worked (D5): nonprodMinutes on the report's days
milestone: M5
app: api
status: done
size: S
tier: haiku
depends_on: [T-0048]
feature_spec: specs/06-features/rpt-api.md
spec_row: T2
ac_files:
  - { path: api/test/reports.ac.e2e-spec.ts, sha256: 3d8650d92d7ab9761c6652f3831e66aadde5ce4064843c358311b14740275c76 }
---

# T-0130: Non-prod out of worked (D5): nonprodMinutes on the report's days

**Tier reason:** One field and the SQL spelled out under *Repository (T2)*

Work from the brief: `node scripts/pm4.mjs brief T-0130`. Verify with `node scripts/pm4.mjs check T-0130`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- `ReportDayDto.nonprodMinutes` added (after `bookedMinutes`), `ReportDayRow.nonprodMinutes` added.
- `reportDays` SQL: `worked` now excludes `exclude_from_stats` logs; `nonprod` sums the excluded ones. Bookings are still summed per log (subquery), as before.
- `ReportsService.dashboard` maps `nonprodMinutes`. `openapi.json` regenerated (`nonprodMinutes` required, number).
- `pm4 check T-0130` summary:
  ```
  ac hashes: ok (1)
  scope: ok
  api lint: ok (14s)
  api format:check: ok (3s)
  api typecheck: ok (2s)
  api test: ok (9s)
  api test:e2e: ok (63s)
  api build: ok (6s)
  api openapi:export: ok (7s)
  check AC-9: the contract has the dashboard report, protected: ok
  PASS T-0130
  ```

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | PASS | D5 applied to `reportDays` SQL and DTO; `reports.ac.e2e-spec.ts` 13/13 (AC-10 included); `pm4 check` PASS |

## Review
_Filled in by `review-feature`._

- 2026-11-02, Opus reviewer: **approve**. `pm4 check T-0130` PASS; AC-11 run by hand: ok. DTO, `reportDays` SQL and the service mapping match D5 and *Repository (T2)*; `projects` untouched; non-goals respected.
- Finding (minor, no change here): `specs/03-api/endpoints.md` is still `review`, though its API-RPT-001 D5 change is implemented.
- Tier: haiku was right (one attempt).
