---
id: T-0031
title: Task lists (project page section and /app/tasks), task detail page, delete and restore
milestone: M3
app: web
status: blocked
size: M
tier: haiku
depends_on: [T-0030]
feature_spec: specs/06-features/tsk-web.md
spec_row: T3
ac_files:
  - { path: web/features/tasks/components/tasks-list.ac.test.tsx, sha256: 4910b762d4b04ca416d427931e8e2a31c105641529835af8ceb22a7b82e3c0ce }
  - { path: web/features/tasks/components/task-detail.ac.test.tsx, sha256: bd9836ccc4bddc4ffca7869d4a655bd046b37440ca6a2edc1101e9044adeb48c }
---

# T-0031: Task lists (project page section and /app/tasks), task detail page, delete and restore

**Tier reason:** Composes T1/T2 and the project list/detail patterns; states and copy stated

Work from the brief: `node scripts/pm4.mjs brief T-0031`. Verify with `node scripts/pm4.mjs check T-0031`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by `review-feature`._
