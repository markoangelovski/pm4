---
id: T-0024
title: GET /users user search for the lead picker (API-USR-003)
milestone: M2
app: api
status: done
size: S
tier: sonnet
depends_on: [T-0023]
feature_spec: specs/06-features/prj-api.md
spec_row: T3
ac_files:
  - { path: api/test/users-search.ac.e2e-spec.ts, sha256: 5141150c3058c5a9ea2023f6c1cc5b22f673c05d51a18ec22a29685522a4797d }
---

# T-0024: GET /users user search for the lead picker (API-USR-003)

**Tier reason:** Copies T2's controller/repository pattern; the one cross-user read (security.md)

Work from the brief: `node scripts/pm4.mjs brief T-0024`. Verify with `node scripts/pm4.mjs check T-0024`.

## Implementation notes
Added `GET /users` (UserSearchController, UserSearchQueryDto/UserSummaryDto/UserSearchResponseDto, UsersService.search limit 10, UsersRepository.search with escapeLike ILIKE and caller-first ordering) plus unit tests; openapi regenerated.

pm4 check T-0024: all gates ok (lint, format, typecheck, test, e2e, build, openapi, AC-19). Only failure: scope, `specs/06-features/prj-api.md` modified in the worktree before this task (not by T-0024).

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | sonnet | done | Implemented; all gates pass except pre-existing out-of-scope spec edit |

## Review
**Verdict: approve** (Opus reviewer, 2026-10-04). The one cross-user read follows security.md (≥ 2 chars, ≤ 10, `escapeLike`, caller first).
Nit applied by the orchestrator: `SEARCH_LIMIT` moved below the imports in `users.service.ts`.
**Tier:** sonnet was right (copies T2's pattern; done in one attempt).
