---
id: T-0104
title: The to-dos service and repository
milestone: M8
app: api
status: done
size: S
tier: haiku
depends_on: [T-0103]
feature_spec: specs/06-features/note-todos.md
spec_row: T2
ac_files:
  - { path: api/test/todos.ac.e2e-spec.ts, sha256: 3219d5c2a3cb954c924812a482e22766a43e33cb15d410ff1688d91fa86f1f7a }
---

# T-0104: The to-dos service and repository

**Tier reason:** Copies T1's `notes.repository.ts` / `notes.service.ts`; rules spelled out

Work from the brief: `node scripts/pm4.mjs brief T-0104`. Verify with `node scripts/pm4.mjs check T-0104`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- `api/src/notes/todos.repository.ts` (new): copies `notes.repository.ts` for `todos`; `list` has no paging.
- `api/src/notes/todos.service.ts`: stub replaced (the file-level eslint-disable is gone). Rules as in the brief.
  Links use `!== undefined` checks, not `"taskId" in dto`: with the ES2023 target, class fields exist as
  `undefined`, so `in` would always be true and every PATCH would clear the link.
- `api/src/notes/notes.module.ts`: `TodosRepository` added to providers.
- Reviewer: the `done: true` update uses `coalesce(todos.done_at, now())` (keeps the existing timestamp).

`pm4 check T-0104` (final run): 
```
ac hashes: ok (1)
scope: FAIL (28 file(s)): only the expected entries (api/src/tasks/tasks.repository.spec.ts from T-0103; web/ files from T-0105)
api lint: ok | api format:check: ok | api typecheck: ok | api test: ok | api test:e2e: ok (13 to-dos ACs pass) | api build: ok | api openapi:export: ok
```

Orchestrator re-run: `pm4 check T-0104` → all api gates ok (incl. test:e2e 56s); `FAIL` on scope only for the accepted T-0103 unit test and T-0105's web files (same branch).

Orchestrator re-run after retry 1: `pm4 check T-0104` → all api gates ok (test:e2e 58s); scope lists only accepted files: `tasks.repository.spec.ts` (T-0103's unit test), `api/test/todos.e2e-spec.ts` (ordinary test for the review fix) and `specs/06-features/note-todos.md` (orchestrator's spec edits from the review).

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
### Retry 1 (review finding: empty PATCH body)
- `api/src/notes/todos.repository.ts` `update`: returns without a query when `values` has no keys (`PATCH {}` → 200, row unchanged, `updatedAt` kept). Same guard as `time.repository.ts`.
- New ordinary e2e test `api/test/todos.e2e-spec.ts` (extra test file, not an acceptance test): `PATCH {}` → 200, `text`/`doneAt`/`updatedAt` unchanged.
- `api/test/todos.ac.e2e-spec.ts` + `todos.e2e-spec.ts`: 14/14 pass.
- `pm4 check T-0104` (retry): api lint, format:check, typecheck, test, test:e2e (60s), build, openapi:export all ok. Scope FAIL only lists expected entries plus `specs/06-features/note-todos.md` (not touched by this task; flagged for the reviewer).

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | done | Repository, service, module wiring; `todos.ac.e2e-spec.ts` 13/13 pass; lint fixed (unused `or`, prettier) |
| 2 | haiku | done | Review fix: `PATCH {}` skips the UPDATE (was 500); ordinary test `todos.e2e-spec.ts`; all api gates ok; scope FAIL = expected files + `specs/06-features/note-todos.md` |

## Review
**Verdict: changes-requested** (Opus review, 2026-10-24).
- Major: `PATCH /todos/{id}` with `{}` returns 500. `TodosRepository.update` calls `.set({})` and Drizzle throws "No values to set". API-TODO-003 (`specs/03-api/endpoints.md`): "An empty body changes nothing." Fix: skip the UPDATE when `values` is empty (as `time.repository.ts:204`) and return the row unchanged; add an ordinary test: `PATCH {}` → 200, `updatedAt` unchanged.
- Minor: same `!== undefined` spec drift as T-0103 (implementation correct).
- Fixed in retry 1 (haiku): early return on an empty `values` in `TodosRepository.update`; ordinary test `api/test/todos.e2e-spec.ts`. Re-checked by the orchestrator: gates ok.
- Tier: haiku was enough; the empty-body rule was in endpoints.md but not the feature spec (spec gap).
