---
id: T-0017
title: Google sign-in, login codes, refresh rotation and sign-out
milestone: M1
app: api
status: blocked
size: M
tier: opus
depends_on: [T-0016]
feature_spec: specs/06-features/auth-api-session.md
spec_row: T3
ac_files: []
---

# T-0017: Google sign-in, login codes, refresh rotation and sign-out

**Tier reason:** Security logic: OAuth state/PKCE, single-use codes, rotation with reuse detection, Redis transactions

Work from the brief: `node scripts/pm4.mjs brief T-0017`. Verify with `node scripts/pm4.mjs check T-0017`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by `review-feature`._
