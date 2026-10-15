---
id: T-0048
title: Dashboard report: GET /reports/dashboard, its DTOs and two repository queries
milestone: M5
app: api
status: done
size: M
tier: haiku
depends_on: []
feature_spec: specs/06-features/rpt-api.md
spec_row: T1
ac_files:
  - { path: api/test/reports.ac.e2e-spec.ts, sha256: 77b477864b3d65597f409a0191d02ce950114e161677f1131c1bb4917ff8421a }
---

# T-0048: Dashboard report: GET /reports/dashboard, its DTOs and two repository queries

**Tier reason:** Both queries and the mapping are spelled out; the controller and service copy `bookings.controller.ts` / `bookings.service.ts`

Work from the brief: `node scripts/pm4.mjs brief T-0048`. Verify with `node scripts/pm4.mjs check T-0048`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- New: `api/src/time/reports.controller.ts` (`GET /reports/dashboard`), `reports.service.ts` (range check as `BookingsService`, project `Ref` mapping, sort), `dto/dashboard-report-response.dto.ts`.
- `time.repository.ts`: `reportDays` and `reportProjects` (raw SQL via `db.execute`, dates cast `::text` so they come back as `YYYY-MM-DD`), plus the `ReportDayRow` / `ReportProjectRow` types.
- `time.module.ts`: CLI registration of the controller and service.
- `api/openapi.json` regenerated.
- Reviewer: `toRef` is private in `time-logs.service.ts`, which is not in this task's Files, so `reports.service.ts` has its own `toProjectRef` with the same rule instead of exporting it.
- Reviewer: the Files row lists `reports.service.ts` as a bare name, so `pm4 check` resolves it to `api/reports.service.ts` and reports it out of scope. The file is the one this row names.

`node scripts/pm4.mjs check T-0048` (last run):
```
  ac hashes: ok (1)
  scope: FAIL (1 file(s))
  api lint: ok (9s)
  api format:check: ok (2s)
  api typecheck: ok (4s)
  api test: ok (6s)
  api test:e2e: ok (28s)
  api build: ok (5s)
  api openapi:export: ok (6s)
  check AC-9: the contract has the dashboard report, protected: ok
FAIL T-0048
- changed files outside scope:
    api/src/time/reports.service.ts (not in the Files table)
```
- Orchestrator: wrote the full path `api/src/time/reports.service.ts` in the spec's Files row (as feat-book-api does). The re-run's
  only scope finding is that one-line spec edit; all gates and AC-9 ok.

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | done (scope FAIL on Files-table path) | Controller, service, DTO, two repo queries, OpenAPI; reports.ac 12/12 pass; lint, format, typecheck, test, e2e, build, openapi ok |

## Review
_Filled in by `review-feature`._

**Verdict: approve** (Opus, 2026-10-11). Interfaces, both queries, the range check, the Ref mapping and the order match the spec and
API-RPT-001; every query is scoped by `user_id`; non-goals untouched; AC-1…AC-9 pass. Minor findings, none blocking:
1. No `reports.service.spec.ts` although the Files row lists one and testing.md asks for unit tests of service logic (range check, sort,
   deleted-project Ref). Follow-up: a quick-lane task.
2. `toProjectRef` repeats the private `toRef` of `time-logs.service.ts`, which isn't in this task's Files (the spec's *Read first* puts
   `toRef` in `time.repository.ts`). Accept, or export and reuse it in a later task.
3. The spec's Files row was corrected during implementation (full path of `reports.service.ts`); commit it with the feature.

Tier feedback: haiku was right; one attempt, the spec gave the SQL, DTOs and mapping in full.
