---
id: T-0174
title: Clients and authorize: redirect-URI matching, the SSRF-safe CIMD fetcher, DCR registration, ClientRegistry, GET /oauth/authorize
milestone: M9
app: api
status: blocked
size: M
tier: sonnet
implementer: —
depends_on: [T-0173]
feature_spec: specs/06-features/mcp-oauth-api.md
spec_row: T2
ac_files:
  - { path: api/src/oauth/redirect-uri.ac.spec.ts, sha256: f7c120419c6ab529c9f3e4b8bfbc7a617ef570c531ae96a4b627913e58fb45c1 }
  - { path: api/src/oauth/cimd-fetcher.ac.spec.ts, sha256: 6e586758a1d547d01c0041cdb3351c155a8f3345b1c68e0715ee23e7171c1f16 }
  - { path: api/test/mcp-oauth.ac.e2e-spec.ts, sha256: 9046cb2d0932242f8031415442b41bdbc4153e56f40ee74e8554bb46dceee738 }
---

# T-0174: Clients and authorize: redirect-URI matching, the SSRF-safe CIMD fetcher, DCR registration, ClientRegistry, GET /oauth/authorize

**Tier reason:** Security logic (SSRF, open redirects) and an external fetch (task-routing sonnet triggers)

Work from the brief: `node scripts/pm4.mjs brief T-0174`. Verify with `node scripts/pm4.mjs check T-0174`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Agent | Result | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by `review-feature`._
