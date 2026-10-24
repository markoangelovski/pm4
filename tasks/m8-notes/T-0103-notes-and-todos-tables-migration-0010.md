---
id: T-0103
title: notes and todos tables, migration 0010, the notes service and repository, ItemLinkService, retained names and task moves for both tables
milestone: M8
app: api
status: done
size: M
tier: sonnet
depends_on: []
feature_spec: specs/06-features/note-todos.md
spec_row: T1
ac_files:
  - { path: api/test/notes.ac.e2e-spec.ts, sha256: 219254471f89d700808c6d04712adf857ac155333d263c93b85889b79f42921c }
---

# T-0103: notes and todos tables, migration 0010, the notes service and repository, ItemLinkService, retained names and task moves for both tables

**Tier reason:** Writes in the project/task delete and move transactions (several tables under row locks); the first time-zone date filter

Work from the brief: `node scripts/pm4.mjs brief T-0103`. Verify with `node scripts/pm4.mjs check T-0103`.

## Implementation notes
Schema `notes`/`todos` + migration 0010, `NotesRepository`, `NotesService`, `ItemLinkService`, `toRef` exported, retained names and task moves for notes and todos in projects/tasks repositories. Also updated `api/src/tasks/tasks.repository.spec.ts` (ordinary unit test: update now issues 3 `projectId` updates).
`pm4 check` scope gate failed only on the parallel web task's files and that spec file; gates run by hand in `api/`: lint, format:check, typecheck, test, build, openapi:export all pass (no openapi.json diff); e2e: `notes.ac.e2e-spec.ts` 16/16 pass, only `todos.ac.e2e-spec.ts` (T-0104) fails.

Orchestrator re-run (quiet machine): `pm4 check T-0103` → all api gates ok (lint, format:check, typecheck, test, test:e2e 57s, build, openapi:export); `FAIL` on scope only: T-0105's web files (parallel task, same branch) and `tasks.repository.spec.ts` (accepted: the unit test of `tasks.repository.ts`, which is in Files). Note for T-0104: `TodosRepository` is not yet in `NotesModule` providers.

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | sonnet | done | notes API ACs 1-8 pass; scope gate blocked by parallel web task |

## Review
**Verdict: approve** (Opus review, 2026-10-24).
- Minor: `!== undefined` instead of the spec's `"x" in dto` for link changes is correct (ES2023 class fields make `in` always true; matches `TimeLogsService.update`; `null` still clears). Spec's *Service rules* to be updated; no code change.
- Minor, optional: list's date filter is skipped when the user's `timeZone` can't be read (fails open; can't happen for an authenticated user).
- Tier: sonnet was right.
