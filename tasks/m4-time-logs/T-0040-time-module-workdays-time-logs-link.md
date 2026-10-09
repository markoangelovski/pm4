---
id: T-0040
title: time module: workdays, time logs, link and day-start rules, moving a task's logs
milestone: M4
app: api
status: done
size: L
tier: sonnet
depends_on: [T-0039]
feature_spec: specs/06-features/tlog-api.md
spec_row: T2
ac_files:
  - { path: api/test/time-logs.ac.e2e-spec.ts, sha256: 8f5b6b9fcbac8222870f10fe74c81212d48560842f55f27d806331e218800f49 }
---

# T-0040: time module: workdays, time logs, link and day-start rules, moving a task's logs

**Tier reason:** Transactions across two tables, link and day-start rules, time-zone "today" and a cross-module change in `TasksRepository`

Work from the brief: `node scripts/pm4.mjs brief T-0040`. Verify with `node scripts/pm4.mjs check T-0040`.

## Implementation notes
Added the `time` module (workdays + time-logs controllers/services, `TimeRepository`, DTOs), `TasksRepository.update` now moves a task's logs in one transaction, `TimeModule` registered, OpenAPI exported. Read-model helpers (`toTimeLogDto`, `todayIn`, `assertNotFuture`, `assertDate`) are exported from `time-logs.service.ts` (no extra file outside the Files table). "Today" is computed from `new Date()` in the user's `time_zone`.

pm4 check T-0040: scope FAIL only for `specs/06-features/tlog-api.md` (expected, orchestrator edit); lint, format, typecheck, test, e2e (59 AC tests pass), build, openapi:export, AC-21 all ok.

Review fixes: `assertNotFuture` throws 401 when the user row is missing; `update` checks the future date only when `workDate` changes; `{date}` params are `format: date` in OpenAPI (re-exported); unit tests added. pm4 check T-0040: scope FAIL only for orchestrator-edited `specs/03-api/endpoints.md` and `specs/06-features/tlog-api.md` (expected); lint, format, typecheck, test, e2e, build, openapi:export, AC-21 all ok.

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | sonnet | done | Implemented; all checks ok except the expected spec-file scope note |
| 2 | sonnet | done | Review fixes (401 on missing user, unchanged workDate skips future check, date param format); same check result |

## Review
**Verdict: approve** (Opus review, 2026-10-09). D1–D8 are implemented as specified. Every query is scoped by user, and the first-log workday insert is concurrency-safe.
- Minor: `assertNotFuture` falls back to UTC when the user row is missing. It should give `401` instead.
- Minor: `PATCH` checks `workDate` against today even when the date hasn't changed.
- Minor: shared helpers are exported from `time-logs.service.ts` (a `time.read-model.ts` would be cleaner; acceptable as is).
- Minor: the OpenAPI `{date}` path parameter lacks `format: date`.
- Minor: no unit test for the link rules in `resolveLink` (e2e covers them).
- Tier: sonnet was right.
