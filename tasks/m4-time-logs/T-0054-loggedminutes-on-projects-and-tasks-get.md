---
id: T-0054
title: loggedMinutes on projects and tasks, GET /time-logs (API-TLOG-001), openapi:export
milestone: M4
app: api
status: done
size: M
tier: haiku
depends_on: []
feature_spec: specs/06-features/proto-sync-web.md
spec_row: T1
ac_files:
  - { path: api/test/logged-time.ac.e2e-spec.ts, sha256: b37f9b55ea4433db6babb496197d94b8acadd0f32021e662038f0ae0734f5648 }
---

# T-0054: loggedMinutes on projects and tasks, GET /time-logs (API-TLOG-001), openapi:export

**Tier reason:** Queries spelled out in *Interfaces*. Copy `listBookingRange` and `BookingsService.list`

Work from the brief: `node scripts/pm4.mjs brief T-0054`. Verify with `node scripts/pm4.mjs check T-0054`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- `loggedMinutes`: correlated `coalesce(sum(...))` subquery in `ProjectsRepository.selectRows` (by `userId` and `projectId`) and `TasksRepository.selectRows` (by `taskId`). `toDto` uses the row value. Trashed tasks still count on the project. Fixtures in `projects.service.spec.ts` and `tasks.service.spec.ts` gained `loggedMinutes: 0`.
- `GET /time-logs` (API-TLOG-001): `TimeRepository.listLogs` (one page plus totals with `count`, `totalMinutes` and `bookedMinutes`). `TimeLogsService.list` checks that exactly one of `projectId` and `taskId` is set (`400`, field `projectId`), then maps rows to `BookingLog`s. It doesn't check ownership of the id; unknown or foreign ids give an empty page.
- The stubs from the test step became the implementation. `openapi.json` didn't change (the stub contract already matched).
- `pm4 check T-0054`: PASS. Lint and format:check failed on the first run (Prettier layout in the three repository files); `npm run format` fixed it, and the second run passed. Test e2e: 17 files, 222 tests passed. AC-21 is manual (owner).

`node scripts/pm4.mjs check T-0054` (second run, after `npm run format`):
```
  api lint: ok (10s)
  api format:check: ok (2s)
  api typecheck: ok (5s)
  api test: ok (6s)
  api test:e2e: ok (29s)
  api build: ok (5s)
  api openapi:export: ok (7s)
PASS T-0054
```

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | PASS | Implemented loggedMinutes, listLogs and GET /time-logs. Lint/format fixed with `npm run format`; check passes. AC-1..AC-7 green; AC-21 manual. |

## Review
**Verdict: approve** (Opus reviewer, 2026-10-11). `pm4 check --feature specs/06-features/proto-sync-web.md`: PASS (8 AC hashes, scope, all api and web gates, AC-18, AC-19, AC-20, AC-22; AC-21 manual).

- Minor, optional: `api/src/time/time-logs.service.ts:138` casts `query.taskId as string`; the check above guarantees it, but branching on `query.projectId !== undefined` / `query.taskId !== undefined` would narrow without a cast. Fixed in the main session at the owner's request: the check and the filter are one `if`/`else if` that narrows `projectId`/`taskId`; `pm4 check --feature` PASS afterwards.
- Tier feedback: haiku was right; the spelled-out queries were copied exactly, one Prettier pass.
