---
id: T-0087
title: A token per connection: store owner, setStatusFor, request's stale and account checks, the connection service callers
milestone: M6
app: api
status: blocked
size: S
tier: sonnet
depends_on: [T-0086]
feature_spec: specs/06-features/int-followups.md
spec_row: T2
ac_files:
  - { path: api/test/pmspa-followups.ac.e2e-spec.ts, sha256: cd2d453fd71f482c31b0ba03a0ac3861163f9bd844c918fa37c8cd9302ffd291 }
  - { path: api/src/integrations/pmspa/pmspa-client.ac.spec.ts, sha256: aa0678941d9c1fe6a7d371c9e54a75a8456f8a13423b158a038786c058fde959 }
---

# T-0087: A token per connection: store owner, setStatusFor, request's stale and account checks, the connection service callers

**Tier reason:** Tokens and a race between overlapping requests (task-routing: auth, tokens, concurrency)

Work from the brief: `node scripts/pm4.mjs brief T-0087`. Verify with `node scripts/pm4.mjs check T-0087`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by `review-feature`._
