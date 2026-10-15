---
id: T-0061
title: Delete day (API-WD-004), the time read model and Problem bodies
milestone: M4
app: api
status: done
size: M
tier: haiku
depends_on: [T-0060]
feature_spec: specs/06-features/hard-delete.md
spec_row: T2
ac_files:
  - { path: api/test/delete-day.ac.e2e-spec.ts, sha256: 7b1a4e5074a286ede7520fa93d13c4d601575fb664a08f2f7640e05c7ca878de }
---

# T-0061: Delete day (API-WD-004), the time read model and Problem bodies

**Tier reason:** Signatures and SQL spelled out; copy `time-logs.controller.ts` `remove`

Work from the brief: `node scripts/pm4.mjs brief T-0061`. Verify with `node scripts/pm4.mjs check T-0061`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- `TimeRepository.deleteDay` (one SQL statement, logs and workday) and `WorkdaysService.deleteDay` (API-WD-004; `404` when neither exists).
- Time read model: `TimeLogRow` carries the live project and task titles plus the retained names (`deletedProjectTitle`, `deletedTaskTitle`); `toRef(id, title, snapshot)` returns the live ref (`deleted: false`) or the retained name (`deleted: true`); `resolveLink` lets `findOwned`'s 404 propagate.
- `reportProjects` reads no `deleted_at`; `toProjectRef` returns `deleted: false` for a live project.
- Problem bodies carry only type/title/status/detail/errors. The filter's `describe` maps each exception to those fields, and `ProblemDetailsDto` is the body type.
- `api/.env.example` holds no retention setting; the in-trash exception is not part of the API error set.
- `api/openapi.json` regenerated.
- Reviewer: `api/src/time/time.repository.ts` (the `deleteDay` SQL) and `api/src/time/time-logs.service.ts` (`toRef`, `resolveLink`).

`node scripts/pm4.mjs check T-0061`:

```
pm4 check T-0061
  ac hashes: ok (1)
  scope: ok
  pending ACs (later tasks, excluded): AC-9, AC-10, AC-11, AC-12, AC-13, AC-14, AC-15, AC-17, AC-18, AC-19
  api lint: ok (9s)
  api format:check: ok (2s)
  api typecheck: ok (2s)
  api test: ok (6s)
  api test:e2e: ok (31s)
  api build: ok (5s)
  api openapi:export: ok (6s)
  check AC-16: no trace in the API: ok
  check AC-17: no trace in the web app: skipped (later task)
  check AC-19: the columns are dropped: skipped (later task)
  manual (owner verifies): AC-7

PASS T-0061
```

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | PASS | Delete day, read model, Problem bodies; AC-8 and AC-16 pass; pm4 check PASS |
| 2 | haiku | PASS | Review fixes: filter body typed as `ProblemDetailsDto`; spec sample message neutral; Implementation notes phrased as current state. Verified with lint, typecheck, unit tests and `pm4 check --feature` (AC-19 pending, T-0063) |

## Review
**Verdict: approve** (Opus reviewer, 2026-10-15). `deleteDay` SQL and service match D3; `toRef`/`toProjectRef` and the D4 filter match the spec; scoped by `userId`.

Findings (minor):
- `problem-details.filter.ts:65` types the body as `ProblemDetailsDto & Record<string, unknown>`; `ProblemDetailsDto` is enough now.
- `problem-details.filter.spec.ts:111` sample message `"already restored"`; use a neutral one such as `"already exists"`.
- Implementation notes: phrase as current state.

Tier feedback: haiku was right.

Follow-up (2026-10-15, attempt 2): body typed as `ProblemDetailsDto`, neutral sample message, notes rewritten as current state. Feature check: all gates pass.
