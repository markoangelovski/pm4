---
id: T-0094
title: Booking hooks (the twin), the prototype on the generated types, the mock import's booked-time warning and failure
milestone: M4
app: web
status: blocked
size: S
tier: haiku
depends_on: [T-0093]
feature_spec: specs/06-features/book-partial.md
spec_row: T3
ac_files:
  - { path: web/features/bookings/api.ac.test.tsx, sha256: ade143985aaf8d8cf5aa08c3097dbf3289e0d3c0bac91723e054cb1fb229e0ea }
  - { path: web/features/bookings/components/bookings-view.ac.test.tsx, sha256: d45f1f0cf48eeb39b1731c0572416641561158acd75f7441ff57ae715e3b7262 }
---

# T-0094: Booking hooks (the twin), the prototype on the generated types, the mock import's booked-time warning and failure

**Tier reason:** A twin, import swaps (D9) and one mock rule spelled out in *Web*

Work from the brief: `node scripts/pm4.mjs brief T-0094`. Verify with `node scripts/pm4.mjs check T-0094`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by `review-feature`._
