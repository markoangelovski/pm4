---
id: T-0120
title: Project services queries always carry a userId condition
milestone: M2
app: api
status: done
size: S
tier: haiku
depends_on: []
feature_spec: —
files: [api/src/projects/projects.repository.ts]
specs: [specs/06-features/prj-services.md, specs/02-architecture/security.md]
ac_files: []
---

# T-0120: Project services queries always carry a userId condition

## Goal
Fix the feat-prj-services review findings 1 and 2 (T-0116): every query on services has a `userId` condition
(`api/AGENTS.md`), and the hand-written column in the task-count subquery is documented.

## Change
In `api/src/projects/projects.repository.ts`:
- `update`, the service rename: `.where(and(eq(projectServices.userId, userId), eq(projectServices.id, existing.id)))`.
- `servicesOf`, `taskCount`: the subquery also filters `${tasks.userId} = ${userId}`, with a comment that
  `project_services` must stay unaliased (Drizzle drops the table name, so the outer column is written by hand).

No behavior change: `existing` already comes from the user-scoped locked read, and a task's service is always
the user's own.

## Acceptance criteria
- [x] Both queries carry the `userId` condition.
- [x] The feat-prj-services acceptance tests still pass (`api/test/project-services.ac.e2e-spec.ts`).

---

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- Done in the main session (a few lines; task-routing allows it).
- Inside the subquery, the unqualified `user_id` that Drizzle renders resolves to `tasks.user_id` (the innermost
  scope), not the outer `project_services.user_id`.
- `pm4 check T-0120`: api lint, format:check, typecheck, test, test:e2e, build ok. Scope lists only T-0121's three web files, which share the branch `task/T-0120`.

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | main | PASS | The two conditions and the comment |

## Review
_The owner's review (quick lane), or `review-feature`'s verdict._
