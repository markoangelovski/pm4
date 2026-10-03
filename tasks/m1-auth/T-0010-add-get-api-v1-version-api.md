---
id: T-0010
title: Add GET /api/v1/version (API-SYS-003) and export the OpenAPI document
milestone: M1
app: api
status: ready
size: S
tier: haiku
depends_on: []
feature_spec: specs/06-features/shell-sidebar-branding.md
spec_row: T1
ac_files:
  - { path: api/test/version.ac.e2e-spec.ts, sha256: 86f2e47b850161e647332363d541af3233508789ad770b2087d92363d8819f02 }
---

# T-0010: Add GET /api/v1/version (API-SYS-003) and export the OpenAPI document

**Tier reason:** 4 small files, all code given in *Interfaces*; Nest CLI + `openapi:export`; no DB, auth or decisions

Work from the brief: `node scripts/pm4.mjs brief T-0010`. Verify with `node scripts/pm4.mjs check T-0010`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by `review-feature`._
