---
id: T-0016
title: Access tokens, the default-deny guard and GET /me
milestone: M1
app: api
status: ready
size: M
tier: opus
depends_on: [T-0010, T-0015]
feature_spec: specs/06-features/auth-api-session.md
spec_row: T2
ac_files:
  - { path: api/test/me.ac.e2e-spec.ts, sha256: dbc41015e1b7e384a58a89f5c8860709fbd6ec740c17295182c358f5775c79a7 }
  - { path: api/src/config/env.schema.ac.spec.ts, sha256: 3995cc24bce437441a6cf340e278af914394868d1df53b0e3c1fce29db558da5 }
---

# T-0016: Access tokens, the default-deny guard and GET /me

**Tier reason:** First auth guard and token pattern (task-routing: auth/tokens); env and module wiring

Work from the brief: `node scripts/pm4.mjs brief T-0016`. Verify with `node scripts/pm4.mjs check T-0016`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by `review-feature`._
