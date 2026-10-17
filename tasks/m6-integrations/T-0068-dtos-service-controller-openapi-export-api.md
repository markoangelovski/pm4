---
id: T-0068
title: DTOs, service, controller, OpenAPI export (API-INT-001…004)
milestone: M6
app: api
status: blocked
size: M
tier: haiku
depends_on: [T-0067]
feature_spec: specs/06-features/int-conn-api.md
spec_row: T5
ac_files:
  - { path: api/test/pmspa-connection.ac.e2e-spec.ts, sha256: d96a1b2bfb555527c8d0bac804cb9e6d038f9a1aec1fbfd3cbece9604d295f7d }
---

# T-0068: DTOs, service, controller, OpenAPI export (API-INT-001…004)

**Tier reason:** Copy `projects/` (controller, service, DTOs, `@ApiProblemResponses`); the save/test/disconnect rules are in *Interfaces*

Work from the brief: `node scripts/pm4.mjs brief T-0068`. Verify with `node scripts/pm4.mjs check T-0068`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by `review-feature`._
