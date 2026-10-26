---
id: T-0116
title: project_services table and migration; services on API-PRJ-001…004 (replace in one locked transaction) and API-PRJ-006
milestone: M2
app: api
status: done
size: M
tier: sonnet
depends_on: []
feature_spec: specs/06-features/prj-services.md
spec_row: T1
ac_files:
  - { path: api/test/project-services.ac.e2e-spec.ts, sha256: ca6488e9e25332efe78266dbc06313b1b03f1f2e68c7242d4dcf3aa3f823b023 }
---

# T-0116: project_services table and migration; services on API-PRJ-001…004 (replace in one locked transaction) and API-PRJ-006

**Tier reason:** Writes over two tables in one transaction with a row lock (D8)

Work from the brief: `node scripts/pm4.mjs brief T-0116`. Verify with `node scripts/pm4.mjs check T-0116`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._
Added `project_services` + `tasks.service_id` (migration 0011), services on API-PRJ-001..004 (locked transaction replace), API-PRJ-006, `assertService`. taskCount subquery uses a qualified `project_services.id` (drizzle omits the qualifier otherwise). `pm4 check T-0116`: PASS (lint, format, typecheck, test, e2e, build, openapi all ok).

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | sonnet | pass | Implemented T1; check PASS |

## Review
Feature review (Opus, 2026-10-26): `pm4 check --feature prj-services` PASS, no warnings; all four tasks approved.

- Verdict: **approve**.
- Minor: the service rename (`api/src/projects/projects.repository.ts:193`) has no `userId` condition. It's safe, because `existing` comes from the user-scoped locked read, but `api/AGENTS.md` asks for one: `and(eq(projectServices.userId, userId), eq(projectServices.id, …))`.
- Minor: the taskCount subquery's hand-written `project_services.id` (`:216`) is correct but breaks silently if the outer table is ever aliased. Optional: add a comment, plus `AND tasks.user_id = userId` for defence in depth.
- Tier (sonnet): right; it passed on the first attempt.
