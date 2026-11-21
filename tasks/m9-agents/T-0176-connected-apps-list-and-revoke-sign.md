---
id: T-0176
title: Connected apps list and revoke, Sign out of all devices and account deletion ending grants, openapi.json
milestone: M9
app: api
status: blocked
size: S
tier: sonnet
implementer: —
depends_on: [T-0175]
feature_spec: specs/06-features/mcp-oauth-api.md
spec_row: T4
ac_files:
  - { path: api/test/connected-apps.ac.e2e-spec.ts, sha256: 6c3abd1012d3c20d8f05cda1d322a8e53286f707c5f58f15898e0b13522c8865 }
---

# T-0176: Connected apps list and revoke, Sign out of all devices and account deletion ending grants, openapi.json

**Tier reason:** Revocation across Postgres and Redis in two existing auth flows (auth logic trigger)

Work from the brief: `node scripts/pm4.mjs brief T-0176`. Verify with `node scripts/pm4.mjs check T-0176`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Agent | Result | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by `review-feature`._
