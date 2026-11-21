---
id: T-0175
title: Consent, tokens, revoke: the Redis store with the rotation script, McpTokenService, the consent endpoints, POST /oauth/token and /oauth/revoke
milestone: M9
app: api
status: blocked
size: M
tier: sonnet
implementer: —
depends_on: [T-0174]
feature_spec: specs/06-features/mcp-oauth-api.md
spec_row: T3
ac_files:
  - { path: api/test/mcp-oauth.ac.e2e-spec.ts, sha256: 9046cb2d0932242f8031415442b41bdbc4153e56f40ee74e8554bb46dceee738 }
---

# T-0175: Consent, tokens, revoke: the Redis store with the rotation script, McpTokenService, the consent endpoints, POST /oauth/token and /oauth/revoke

**Tier reason:** Auth and token logic with an atomic Lua script (sonnet triggers)

Work from the brief: `node scripts/pm4.mjs brief T-0175`. Verify with `node scripts/pm4.mjs check T-0175`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Agent | Result | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by `review-feature`._
