---
id: T-0127
title: Web: mount the promoted notifier, no query retry on 429, SCR-001/002 rate-limited, api:types
milestone: M1
app: web
status: blocked
size: S
tier: haiku
depends_on: [T-0126]
feature_spec: specs/06-features/api-rate-limit.md
spec_row: T3
ac_files:
  - { path: web/features/system/rate-limit.ac.test.ts, sha256: b5fb80d2250c8391da25b75c7d162641b66b73dd805cc3b7992438245cbafc6c }
  - { path: web/features/system/components/rate-limit-notifier.ac.test.tsx, sha256: 42bafd3a31ef21f34e9176e44022b34fea0700230989b74d387d8fc586da6178 }
  - { path: web/lib/query-client.ac.test.tsx, sha256: 207e840a56ebbc923a8c112d8c59da012db695598fe5e4fc98e35f5d182e475b }
  - { path: web/features/auth/components/auth-rate-limit.ac.test.tsx, sha256: 4f017fa2fefe106c5b0344a590530d95f85469ce7b4bdd002189dedf458a5f01 }
---

# T-0127: Web: mount the promoted notifier, no query retry on 429, SCR-001/002 rate-limited, api:types

**Tier reason:** Promoted files as is; each edit spelled out above

Work from the brief: `node scripts/pm4.mjs brief T-0127`. Verify with `node scripts/pm4.mjs check T-0127`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by `review-feature`._
