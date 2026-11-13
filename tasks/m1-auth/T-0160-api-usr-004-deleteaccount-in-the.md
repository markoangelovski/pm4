---
id: T-0160
title: API-USR-004: deleteAccount in the repository, AccountService, store exports
milestone: M1
app: api
status: blocked
size: S
tier: sonnet
depends_on: [T-0159]
feature_spec: specs/06-features/acct-api.md
spec_row: T2
ac_files:
  - { path: api/test/account-delete.ac.e2e-spec.ts, sha256: 2a9e678c5fb3a9eb04c1a6cfed293fed8ad9d32a41ba6e0ac1d4d2276294fc52 }
---

# T-0160: API-USR-004: deleteAccount in the repository, AccountService, store exports

**Tier reason:** Writes over several tables and two systems, with a lock and partial failure (task-routing sonnet trigger); the algorithm is spelled out above

Work from the brief: `node scripts/pm4.mjs brief T-0160`. Verify with `node scripts/pm4.mjs check T-0160`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by `review-feature`._
