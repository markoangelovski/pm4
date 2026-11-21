---
id: T-0177
title: The /mcp endpoint: MCP auth in AccessTokenGuard, mcp rate limit, prefix exclusion, shared validation options, McpService with the SDK handler, controller with the Origin check and 405s, tool helpers, empty tool services
milestone: M9
app: api
status: ready
size: M
tier: sonnet
implementer: —
depends_on: []
feature_spec: specs/06-features/mcp-tools-api.md
spec_row: T1
ac_files:
  - { path: api/test/mcp-endpoint.ac.e2e-spec.ts, sha256: 4367b9eb317732c99753c76a8cccc6594afb056213bf2290f22a6d7da76e99fb }
  - { path: api/src/rate-limit/rate-limits.ac.spec.ts, sha256: 0d7ad01f7fdfadf8bd5d1f651c2b07fd09464807aac024463ba469f043000749 }
---

# T-0177: The /mcp endpoint: MCP auth in AccessTokenGuard, mcp rate limit, prefix exclusion, shared validation options, McpService with the SDK handler, controller with the Origin check and 405s, tool helpers, empty tool services

**Tier reason:** Auth logic in the global guard and a new SDK integrated for the first time (task-routing sonnet triggers)

Work from the brief: `node scripts/pm4.mjs brief T-0177`. Verify with `node scripts/pm4.mjs check T-0177`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Agent | Result | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by `review-feature`._
