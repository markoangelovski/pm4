---
id: T-0116
title: project_services table and migration; services on API-PRJ-001…004 (replace in one locked transaction) and API-PRJ-006
milestone: M2
app: api
status: ready
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

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by `review-feature`._
