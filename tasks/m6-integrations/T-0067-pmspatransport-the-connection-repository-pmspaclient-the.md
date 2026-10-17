---
id: T-0067
title: PmspaTransport, the connection repository, PmspaClient, the module's providers
milestone: M6
app: api
status: blocked
size: M
tier: sonnet
depends_on: [T-0065, T-0066]
feature_spec: specs/06-features/int-conn-api.md
spec_row: T4
ac_files: []
---

# T-0067: PmspaTransport, the connection repository, PmspaClient, the module's providers

**Tier reason:** First outbound HTTP client, tokens and re-login, a transaction over four tables (owner: sonnet, as it is specified line by line)

Work from the brief: `node scripts/pm4.mjs brief T-0067`. Verify with `node scripts/pm4.mjs check T-0067`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by `review-feature`._
