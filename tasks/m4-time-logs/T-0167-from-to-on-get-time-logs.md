---
id: T-0167
title: from/to on GET /time-logs (API-TLOG-001): the range check and the filter, openapi:export
milestone: M4
app: api
status: done
size: S
tier: haiku
implementer: opencode/opencode/longcat-2.5-free
depends_on: []
feature_spec: specs/06-features/tlog-logged-range.md
spec_row: T1
ac_files:
  - { path: api/test/logged-time.ac.e2e-spec.ts, sha256: 5feff68cd0d0cb14ff886eb284b2d58e68e7e8933dd1a86a706b8858a13199da }
---

# T-0167: from/to on GET /time-logs (API-TLOG-001): the range check and the filter, openapi:export

**Tier reason:** Check copied from `ReportsService.dashboard`; the filter is spelled out

Work from the brief: `node scripts/pm4.mjs brief T-0167`. Verify with `node scripts/pm4.mjs check T-0167`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- `api/src/time/time-logs.service.ts`: `MAX_RANGE_DAYS = 366`; `list` now asserts `from`/`to` and the `from ≤ to ≤ from + 366` rule (copied from `ReportsService.dashboard`), and passes `{ from, to }` to `listLogs` between `filter` and `page`.
- `api/src/time/time.repository.ts`: `listLogs` takes `range`, filters every query (page, `total`, `totalMinutes`, `bookedMinutes`) with `between(timeLogs.workDate, range.from, range.to)`, and the `days` inner `WHERE` gains `AND work_date BETWEEN …`.
- The DTO `from`/`to` were already in the tree from the test step; `openapi:export` leaves no diff.
- `node scripts/pm4.mjs check T-0167` → `PASS T-0167` (lint, format:check, typecheck, test, e2e, build, openapi:export all ok).

### Attempts
| # | Agent | Result | Summary |
| --- | --- | --- | --- |
| 1 | ori-opencode/nvidia/nemotron-3-ultra-550b-a55b:free | stopped | Rate limited mid-task; left a correct range check in the service, repository not done |
| 2 | opencode/opencode/longcat-2.5-free | done | Kept the service range check, added the from/to filter in the repository; pm4 check PASS (incl. e2e, openapi:export unchanged) |

## Review
**Verdict: approve** (reviewer `claude-code/claude-opus-5-5`, 2026-11-21)

`from`/`to` are checked with `assertDate`. A span below 0 or above 366 is rejected on field `to` with API-RPT-001's message, after the projectId/taskId check (D4). One `between(work_date)` clause in the shared `where` covers the page, `total`, `totalMinutes` and `bookedMinutes`. The `days` subquery is filtered with bound parameters. User scoping is unchanged, and so are the schema, the DTO and `openapi.json`. Every API gate passes, including test:e2e and openapi:export.

Findings (both minor and optional, behaviour is correct):
1. Naming and placement differ from *Interfaces*: `MAX_RANGE_DAYS` sits after `daysBetween` instead of at the top (`time-logs.service.ts:43`), and the span is called `days`, not `span` (`:151`). That forces the alias `days: dayRows` (`:167`, `:182`). This mirrors `reports.service.ts:48`.
2. The `days` subquery's `BETWEEN ${range.from} AND ${range.to}` (`time.repository.ts:333`) leaves out the `::date` casts the file's other raw range queries use (`:470`, `:475`, `:518`). It's a consistency issue only.

Both findings were fixed by the main session (`claude-code/claude-opus-5-5`, 2026-11-21): the constant is now at the top, the span is `span` and the alias is dropped, and both parameters have `::date`. `pm4 check T-0167` passes every gate (lint, format, typecheck, test, test:e2e, build, openapi:export); scope fails only on the other features' files.

| Agent | Attempts | ACs first try | Rules kept | Blocks right | Code | Grade | Fit |
| --- | --- | --- | --- | --- | --- | --- | --- |
| opencode/opencode/longcat-2.5-free | 1 (after attempt 1, ori-opencode/nvidia/nemotron-3-ultra-550b-a55b:free, was stopped by a rate limit) | yes | yes | n/a (no BLOCKED) | Correct and scoped; two cosmetic deviations | A | right: an S task with a spelled-out filter, done in one attempt with every gate green |
