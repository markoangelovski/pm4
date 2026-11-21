---
id: T-0173
title: Foundation: schema + migration, API_PUBLIC_URL, rate-limit scopes and windows, prefix exclusions, urlencoded parser, discovery documents
milestone: M9
app: api
status: ready
size: S
tier: haiku
implementer: —
depends_on: []
feature_spec: specs/06-features/mcp-oauth-api.md
spec_row: T1
ac_files:
  - { path: api/test/mcp-oauth.ac.e2e-spec.ts, sha256: 9046cb2d0932242f8031415442b41bdbc4153e56f40ee74e8554bb46dceee738 }
  - { path: api/src/rate-limit/rate-limits.ac.spec.ts, sha256: 7afae94a23266e4199a8552257ec0d8793a2994765196a56dacfd15169b05940 }
  - { path: api/src/config/api-public-url.ac.spec.ts, sha256: 94e20eed54759d24858b2df57cbc7982d1f93d8d5be7fa8e5edf5b2da33017fe }
---

# T-0173: Foundation: schema + migration, API_PUBLIC_URL, rate-limit scopes and windows, prefix exclusions, urlencoded parser, discovery documents

**Tier reason:** Spelled-out edits that copy existing patterns; no auth logic

Work from the brief: `node scripts/pm4.mjs brief T-0173`. Verify with `node scripts/pm4.mjs check T-0173`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Agent | Result | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by `review-feature`._
