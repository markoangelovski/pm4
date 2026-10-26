---
id: T-0117
title: serviceId / service on API-TSK-001…004, cleared on a move
milestone: M2
app: api
status: done
size: S
tier: haiku
depends_on: [T-0116]
feature_spec: specs/06-features/prj-services.md
spec_row: T2
ac_files:
  - { path: api/test/project-services.ac.e2e-spec.ts, sha256: ca6488e9e25332efe78266dbc06313b1b03f1f2e68c7242d4dcf3aa3f823b023 }
---

# T-0117: serviceId / service on API-TSK-001…004, cleared on a move

**Tier reason:** Every rule spelled out in *API: tasks*; copies the `selectRows` joins

Work from the brief: `node scripts/pm4.mjs brief T-0117`. Verify with `node scripts/pm4.mjs check T-0117`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- `tasks.repository.ts`: `TaskValues.serviceId`, `TaskRow.serviceId`/`serviceName`; `selectRows` selects `tasks.serviceId` and
  `projectServices.name` via `leftJoin(projectServices, …)`.
- `tasks.service.ts`: `create` asserts a non-null `serviceId` against the project (`assertService`) and inserts it; `update`
  computes `moved`/`target`, asserts a string `serviceId` against the target after the target-project check, clears on `null`
  or on a move without `serviceId`; `toDto` returns `service: {id, name}` or `null`.
- `tasks.service.spec.ts` (ordinary test, only where it broke): `row()` gains `serviceId`/`serviceName`; the create expectation gains `serviceId: null`.
- Reviewer: a `projectId` equal to the current one is not a move, so the service is kept (AC-11); only a real move clears it.

`pm4 check T-0117`: PASS T-0117. ac hashes ok; scope ok; api lint ok; api format:check ok; api typecheck ok; api test ok;
api test:e2e ok (project-services AC-8…AC-12 pass); api build ok; api openapi:export ok. Pending ACs AC-13…AC-23 are later tasks.

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | PASS | Service linking on API-TSK-001…004 implemented; AC-8…AC-12 pass; `pm4 check` PASS |

## Review
Feature review (Opus, 2026-10-26): `pm4 check --feature prj-services` PASS, no warnings; all four tasks approved.

- Verdict: **approve**. The move rule (the same projectId isn't a move; a bad service is rejected with 400 before the update) matches the spec, and AC-11 covers all four branches.
- Tier (haiku): right; it passed on the first attempt.
