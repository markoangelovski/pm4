---
id: T-0074
title: Time mapping (pmspa-time-fields.ts), the PMSPA days client, API-INT-007 and the time-log link detail
milestone: M6
app: api
status: ready
size: M
tier: haiku
depends_on: []
feature_spec: specs/06-features/int-time-api.md
spec_row: T1
ac_files:
  - { path: api/test/pmspa-time.ac.e2e-spec.ts, sha256: 8a167fc45fc04441d2b1a614a3df3735d068f52732f277a3d5d8dd46bd2babce }
  - { path: api/src/integrations/pmspa/pmspa-time-fields.ac.spec.ts, sha256: 5bcad17be11f583507cb218f4e3041da120fcbc7a208056a897028d46dbc70b1 }
---

# T-0074: Time mapping (pmspa-time-fields.ts), the PMSPA days client, API-INT-007 and the time-log link detail

**Tier reason:** Pure functions copied from the prototype; each PMSPA call is one documented request; the browse controller exists

Work from the brief: `node scripts/pm4.mjs brief T-0074`. Verify with `node scripts/pm4.mjs check T-0074`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by `review-feature`._
