---
id: T-0065
title: PmspaCrypto, URL policy, host guard, PmspaStore (AC-15, AC-16)
milestone: M6
app: api
status: blocked
size: M
tier: haiku
depends_on: [T-0064]
feature_spec: specs/06-features/int-conn-api.md
spec_row: T2
ac_files:
  - { path: api/src/integrations/pmspa/pmspa-crypto.ac.spec.ts, sha256: cf0bf1055a6c4c6282a2ab7f3ba5d8fcc1d63aa0c2d9f3a4e5ed2326043fcf12 }
  - { path: api/src/integrations/pmspa/pmspa-url-policy.ac.spec.ts, sha256: e1890d70e365cd7bf0ab86d54d14f53066baa8377dc4c26dd2bfaee87c0b2eb3 }
---

# T-0065: PmspaCrypto, URL policy, host guard, PmspaStore (AC-15, AC-16)

**Tier reason:** Fully specified in *Interfaces* (AES-GCM layout, ranges, keys/TTLs); the store copies `session.store.ts`. Owner's call against the security trigger; AC-15/16 and the Opus review cover it

Work from the brief: `node scripts/pm4.mjs brief T-0065`. Verify with `node scripts/pm4.mjs check T-0065`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by `review-feature`._
