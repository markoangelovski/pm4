---
id: T-0093
title: PMSPA without the booked flag; the import's booked-time failure and its preview warning
milestone: M4
app: api
status: blocked
size: M
tier: haiku
depends_on: [T-0092]
feature_spec: specs/06-features/book-partial.md
spec_row: T2
ac_files:
  - { path: api/test/pmspa-time.ac.e2e-spec.ts, sha256: 5e724b64d19ec0398caaac9973225db49d1e9c00c06ee6e0c3594ad6934d3725 }
  - { path: api/src/integrations/pmspa/pmspa-time-fields.ac.spec.ts, sha256: c3d49a4b60889fd77214c244e5168b6b71d56c668d077e5360207c2169b4221f }
---

# T-0093: PMSPA without the booked flag; the import's booked-time failure and its preview warning

**Tier reason:** Deletions, one `try` and one warning spelled out in *PMSPA*

Work from the brief: `node scripts/pm4.mjs brief T-0093`. Verify with `node scripts/pm4.mjs check T-0093`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by `review-feature`._
