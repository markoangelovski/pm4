---
id: T-0061
title: Delete day (API-WD-004), the time read model, the in-trash exception and the Problem mechanism removed
milestone: M4
app: api
status: blocked
size: M
tier: haiku
depends_on: [T-0060]
feature_spec: specs/06-features/hard-delete.md
spec_row: T2
ac_files:
  - { path: api/test/delete-day.ac.e2e-spec.ts, sha256: 7b1a4e5074a286ede7520fa93d13c4d601575fb664a08f2f7640e05c7ca878de }
---

# T-0061: Delete day (API-WD-004), the time read model, the in-trash exception and the Problem mechanism removed

**Tier reason:** Signatures and SQL spelled out; copy `time-logs.controller.ts` `remove`

Work from the brief: `node scripts/pm4.mjs brief T-0061`. Verify with `node scripts/pm4.mjs check T-0061`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by `review-feature`._
