---
id: T-0060
title: Permanent delete of projects and tasks, restore removed, migration 0005
milestone: M4
app: api
status: ready
size: M
tier: opus
depends_on: []
feature_spec: specs/06-features/hard-delete.md
spec_row: T1
ac_files:
  - { path: api/test/projects.ac.e2e-spec.ts, sha256: 2805ab724df29d2e668fc9b867ba81a80a0c749bff52987b41f5ecadfc16ee75 }
  - { path: api/test/tasks.ac.e2e-spec.ts, sha256: 0873def42fcfb3d787d2d3bc2264d5fe50f7d8bd00f496c3005c629dc6fb984d }
  - { path: api/test/time-logs.ac.e2e-spec.ts, sha256: 59b4d099b3b733ef5b56339d34c9cd2ee58ce133b71e8bd92a406485ad9694e5 }
  - { path: api/test/reports.ac.e2e-spec.ts, sha256: bc3c81ef1bf69f9fe3ce8b69fdf464736b96d1d31b7a4c76ddb84fc293169070 }
  - { path: api/test/logged-time.ac.e2e-spec.ts, sha256: 5da409bd23c5800cc5f3e64600f400138db9270b1d4f92053e8deb1c5712e518 }
---

# T-0060: Permanent delete of projects and tasks, restore removed, migration 0005

**Tier reason:** Transactions over several tables with row locks (D1); a data migration

Work from the brief: `node scripts/pm4.mjs brief T-0060`. Verify with `node scripts/pm4.mjs check T-0060`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by `review-feature`._
