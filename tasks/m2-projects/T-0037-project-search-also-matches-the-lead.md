---
id: T-0037
title: Project search also matches the lead's name, title matches first (API-PRJ-002 q)
milestone: M2
app: api
status: ready
size: S
tier: sonnet
depends_on: []
feature_spec: specs/06-features/prj-dates-lead-search.md
spec_row: T1
ac_files:
  - { path: api/test/projects-lead-search.ac.e2e-spec.ts, sha256: 896348fef396d3d0533c01cca776e4ec21a121f6f2e9bdc2a72e5afea987448b }
---

# T-0037: Project search also matches the lead's name, title matches first (API-PRJ-002 q)

**Tier reason:** One query change, but a join in the count and a ranked order across pages

Work from the brief: `node scripts/pm4.mjs brief T-0037`. Verify with `node scripts/pm4.mjs check T-0037`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by `review-feature`._
