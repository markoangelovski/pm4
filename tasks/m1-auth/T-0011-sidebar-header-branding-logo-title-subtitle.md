---
id: T-0011
title: Sidebar header branding: logo, title, subtitle, version pill with the API version tooltip
milestone: M1
app: web
status: blocked
size: M
tier: sonnet
depends_on: [T-0010]
feature_spec: specs/06-features/shell-sidebar-branding.md
spec_row: T2
ac_files:
  - { path: web/lib/version.ac.test.ts, sha256: fe666ed98ddddfd74d9f929f2454f5801a691e35e64404973b7c5a3e94d2a2f4 }
  - { path: web/features/system/api.ac.test.tsx, sha256: 4b8dee2facb5fbf42932dee717c025d071eeb6bd06612ee3a1633798996388e7 }
  - { path: web/features/system/components/version-badge.ac.test.tsx, sha256: 07ca53eda6b78687e954284e50ecd18d5df340c8221b315de049bbc5f8f244f4 }
  - { path: web/app/(dashboard-layout)/layout/shared/logo/full-logo.ac.test.tsx, sha256: 6227a9dc88443711bf4b8356a3516b5810061aa859c1d95908316c2bba443b29 }
---

# T-0011: Sidebar header branding: logo, title, subtitle, version pill with the API version tooltip

**Tier reason:** Composes existing primitives over ~8 files; the first `features/*/api.ts` is written out in full in *Interfaces*, so no pattern is designed here

Work from the brief: `node scripts/pm4.mjs brief T-0011`. Verify with `node scripts/pm4.mjs check T-0011`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by `review-feature`._
