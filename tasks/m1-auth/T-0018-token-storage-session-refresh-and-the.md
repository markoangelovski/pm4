---
id: T-0018
title: Token storage, session refresh and the authenticated API client
milestone: M1
app: web
status: ready
size: M
tier: opus
depends_on: [T-0017]
feature_spec: specs/06-features/auth-web-session.md
spec_row: T1
ac_files:
  - { path: web/lib/auth/token-store.ac.test.ts, sha256: 97adce126549d4ca10d3292a8aa800c890f6e8dfcf6ec56c599837a329015aa6 }
  - { path: web/lib/auth/session.ac.test.ts, sha256: cad893eac505bc0bcc1833beeb1dfa0e520d722c065e96026228fc6b0c9fa7cc }
  - { path: web/lib/api/client.ac.test.ts, sha256: dc7c4f632b85bfdc93a46be1f38b4721c7c30657b7c389b2bdef6e99fc3139e6 }
---

# T-0018: Token storage, session refresh and the authenticated API client

**Tier reason:** Auth tokens, cross-tab locking and single-flight refresh: concurrency and security logic, first instance

Work from the brief: `node scripts/pm4.mjs brief T-0018`. Verify with `node scripts/pm4.mjs check T-0018`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by `review-feature`._
