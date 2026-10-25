---
id: T-0112
title: Manifest, theme colour, the service worker, the build script that writes out/sw.js, and its registration
milestone: M0
app: web
status: ready
size: M
tier: sonnet
depends_on: []
feature_spec: specs/06-features/shell-pwa.md
spec_row: T1
ac_files:
  - { path: web/scripts/build-sw.ac.test.ts, sha256: 227350b3a699f4b2b4486744a17b063912ec1a6b77b232d03161b485e5410806 }
  - { path: web/sw/service-worker.ac.test.ts, sha256: bf1d24c8ba894be9cf6f73dd3c0397054c7b5c94898d674de6025ca9d5c05249 }
  - { path: web/features/system/components/service-worker-registration.ac.test.tsx, sha256: 24d727d9beacf9a4b11525a7c7584bda25a60bd9008e42f58b1fe08f9f381ac7 }
---

# T-0112: Manifest, theme colour, the service worker, the build script that writes out/sw.js, and its registration

**Tier reason:** First service worker and build-time code generation; cache ordering and update behaviour that passing tests don't fully prove (the algorithm is written out in *Interfaces*)

Work from the brief: `node scripts/pm4.mjs brief T-0112`. Verify with `node scripts/pm4.mjs check T-0112`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by `review-feature`._
