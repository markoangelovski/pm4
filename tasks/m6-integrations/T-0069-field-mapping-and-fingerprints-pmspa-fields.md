---
id: T-0069
title: Field mapping and fingerprints (pmspa-fields.ts), the PMSPA projects/tasks client (pmspa-remote.ts), the write mappers (pmspa-writes.ts)
milestone: M6
app: api
status: ready
size: M
tier: haiku
depends_on: []
feature_spec: specs/06-features/int-sync-api.md
spec_row: T1
ac_files:
  - { path: api/src/integrations/pmspa/pmspa-fields.ac.spec.ts, sha256: 014fe40368ed56802e6ec2cd1b90d5c993e85e2e4be7df13abb871d8dcb2882d }
---

# T-0069: Field mapping and fingerprints (pmspa-fields.ts), the PMSPA projects/tasks client (pmspa-remote.ts), the write mappers (pmspa-writes.ts)

**Tier reason:** Pure functions copied from the prototype's `projectDiff`/`taskDiff`/`*Fields`; each call is one `PmspaClient.request` with the documented body and response fields

Work from the brief: `node scripts/pm4.mjs brief T-0069`. Verify with `node scripts/pm4.mjs check T-0069`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by `review-feature`._
