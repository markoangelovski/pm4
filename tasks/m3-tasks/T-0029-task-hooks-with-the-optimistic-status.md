---
id: T-0029
title: Task hooks with the optimistic status change, due state, formatWorkDate, status select and due badge
milestone: M3
app: web
status: ready
size: M
tier: opus
depends_on: [T-0028, T-0027]
feature_spec: specs/06-features/tsk-web.md
spec_row: T1
ac_files:
  - { path: web/features/tasks/due.ac.test.ts, sha256: 5ab5d9ac167f96924511c6051878baed079e9564c99820ac4fc30cda5c6eaab0 }
  - { path: web/lib/time/format-work-date.ac.test.ts, sha256: ec290922de82e064799a1889a83d82c87826bd8c7fe2804b5076f5ef927f230b }
  - { path: web/features/tasks/api.ac.test.tsx, sha256: cfa8c639953372a1a563f615835d935eb3ba280ec95fbd7e5ac4e2627580b4b4 }
---

# T-0029: Task hooks with the optimistic status change, due state, formatWorkDate, status select and due badge

**Tier reason:** First optimistic update with rollback across several cached lists (D5)

Work from the brief: `node scripts/pm4.mjs brief T-0029`. Verify with `node scripts/pm4.mjs check T-0029`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by `review-feature`._
