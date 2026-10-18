---
id: T-0083
title: Import: the snapshot for dates, the time preview's order, reasons and taskPath, push taskPath, days on preview and import
milestone: M6
app: api
status: blocked
size: M
tier: sonnet
depends_on: [T-0082]
feature_spec: specs/06-features/int-budget.md
spec_row: T3
ac_files:
  - { path: api/test/pmspa-budget.ac.e2e-spec.ts, sha256: d1890826087557d0bbe9417f3aa7d4684acf210998ad61eb6ca2cb1eaf05ed7b }
  - { path: api/test/pmspa-sync.ac.e2e-spec.ts, sha256: 2ca914189f8bb12000f213a84ab66d11cb570845a13c4e7784771fd2f0e937cb }
  - { path: api/test/pmspa-time.ac.e2e-spec.ts, sha256: 5311576439371a596205ca4a6a69ce41b390d15f2e684bf14b31a01960a6365c }
---

# T-0083: Import: the snapshot for dates, the time preview's order, reasons and taskPath, push taskPath, days on preview and import

**Tier reason:** A reordered snapshot load and row order across three files, plus a commit hook inside the lock

Work from the brief: `node scripts/pm4.mjs brief T-0083`. Verify with `node scripts/pm4.mjs check T-0083`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by `review-feature`._
