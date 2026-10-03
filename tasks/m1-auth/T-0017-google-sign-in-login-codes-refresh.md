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
ac_files:
  - { path: api/test/auth.ac.e2e-spec.ts, sha256: 06777b59ab6eac0e01ffcbc65f68dc945e0b8c6d4fb29f207e1ca59d594e35d5 }
  - { path: api/src/auth/google-oidc.ac.spec.ts, sha256: 39b6a699356424b64587656196e8119e0b0ee0ddc1cee6f58242540325eea363 }
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
