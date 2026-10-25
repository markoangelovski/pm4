---
id: T-0113
title: Offline banner: promote it, mount it in the app shell, and add it with the online retry to AuthGuard's unavailable screen
milestone: M0
app: web
status: blocked
size: S
tier: haiku
depends_on: [T-0112]
feature_spec: specs/06-features/shell-pwa.md
spec_row: T2
ac_files:
  - { path: web/features/system/components/offline-banner.ac.test.tsx, sha256: 646863911299e5dbb217564ff9adc1f1402c0972408edfc5d0c8c970e18ee532 }
  - { path: web/features/auth/components/auth-guard-offline.ac.test.tsx, sha256: 3a50ab6240c53f26ec3958db32ac092cbf54e372df426b279fc9c49788a36c8f }
---

# T-0113: Offline banner: promote it, mount it in the app shell, and add it with the online retry to AuthGuard's unavailable screen

**Tier reason:** Promote as is; two small edits spelled out in *Interfaces*

Work from the brief: `node scripts/pm4.mjs brief T-0113`. Verify with `node scripts/pm4.mjs check T-0113`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by `review-feature`._
