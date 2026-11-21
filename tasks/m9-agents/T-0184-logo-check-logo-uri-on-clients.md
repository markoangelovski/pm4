---
id: T-0184
title: Logo check, logo_uri on clients and grants (migration 0013), register echo, ConnectedApp.logoUri, OpenAPI
milestone: M9
app: api
status: ready
size: S
tier: haiku
implementer: —
depends_on: []
feature_spec: specs/06-features/mcp-logos.md
spec_row: T1
ac_files:
  - { path: api/src/oauth/client-logo.ac.spec.ts, sha256: 51ed361fa0ccee1fb755636f089db354b9dbc4cd22ea806bd8e05c81c4d21bf9 }
  - { path: api/src/oauth/client-registry.ac.spec.ts, sha256: 23ee76d951865bd61a7da54e3529445d6cbd0e82074f8c71a7988ebc1d6eb071 }
  - { path: api/test/mcp-logos.ac.e2e-spec.ts, sha256: c12c74da226caf95948346dbee2f86ad1eecf2f639b30899a1f7a82a98e1f167 }
---

# T-0184: Logo check, logo_uri on clients and grants (migration 0013), register echo, ConnectedApp.logoUri, OpenAPI

**Tier reason:** Every step is spelled out in *Interfaces*; copies the `client_name` path

Work from the brief: `node scripts/pm4.mjs brief T-0184`. Verify with `node scripts/pm4.mjs check T-0184`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Agent | Result | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by `review-feature`._
