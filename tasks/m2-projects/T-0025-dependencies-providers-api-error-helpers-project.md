---
id: T-0025
title: Dependencies, providers, API error helpers, project and user-search hooks, lead helpers
milestone: M2
app: web
status: ready
size: M
tier: opus
depends_on: [T-0024, T-0021]
feature_spec: specs/06-features/prj-web.md
spec_row: T1
ac_files:
  - { path: web/lib/api/problem.ac.test.ts, sha256: f9edc16d2deecfc3007b47b7be5cb2269c7f0271211d828d76349e86f5ccba47 }
  - { path: web/features/projects/stats.ac.test.ts, sha256: ce50d6981841307274368999b1f4db3be535fc28f8f341b972ee00df231b94cd }
  - { path: web/features/users/lead.ac.test.ts, sha256: 5a40e5aefa7b7e66955e328b907cf63b28370f12ffe187059bb3fd4aea64b831 }
  - { path: web/features/projects/api.ac.test.tsx, sha256: 6f69c8aac560a33f0c5c7d2cd7a433ebfdec0bdff133d3a31ffc376b810845e3 }
---

# T-0025: Dependencies, providers, API error helpers, project and user-search hooks, lead helpers

**Tier reason:** First `ApiError`/`unwrap`/`applyFieldErrors` and first domain mutations with invalidations; new deps

Work from the brief: `node scripts/pm4.mjs brief T-0025`. Verify with `node scripts/pm4.mjs check T-0025`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by `review-feature`._
