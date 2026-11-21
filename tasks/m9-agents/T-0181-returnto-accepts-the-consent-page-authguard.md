---
id: T-0181
title: returnTo accepts the consent page, AuthGuard's signedOutHref, D1 for api.ts / scopes.ts and their twins, promote app-mark
milestone: M9
app: web
status: ready
size: S
tier: sonnet
implementer: —
depends_on: []
feature_spec: specs/06-features/mcp-web.md
spec_row: T1
ac_files:
  - { path: web/lib/auth/return-to-consent.ac.test.ts, sha256: fa22dea8b0f5fac471aa075d19590a74a87b4e50691740b07914685f9017e8ca }
  - { path: web/features/auth/components/auth-guard-consent.ac.test.tsx, sha256: c36e239de1ffb5ea170cee79aeb708c839bac78dc1b3efb66c1f2c969fa3d734 }
  - { path: web/features/agents/api.ac.test.tsx, sha256: 87e008afda7d6374cb2e46e1c80b4c6d13698a57520666ed763ad471c20a2057 }
---

# T-0181: returnTo accepts the consent page, AuthGuard's signedOutHref, D1 for api.ts / scopes.ts and their twins, promote app-mark

**Tier reason:** Auth redirect rule and the guard's signed-out target (auth trigger); the rest is spelled out

Work from the brief: `node scripts/pm4.mjs brief T-0181`. Verify with `node scripts/pm4.mjs check T-0181`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Agent | Result | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by `review-feature`._
