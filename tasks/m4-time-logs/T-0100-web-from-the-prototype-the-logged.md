---
id: T-0100
title: Web from the prototype: the Logged time chart and tabs, LoggedDay and the prototype api.ts twin, the Logs header and pie dialog, Bookings day links, the Statistics link
milestone: M4
app: web
status: blocked
size: M
tier: haiku
depends_on: [T-0099]
feature_spec: specs/06-features/proto-sync-logged-chart.md
spec_row: T2
ac_files:
  - { path: web/features/time/components/logged-time-section.ac.test.tsx, sha256: 103b8ebff5530df6f35bb7199dd2bfec79483ce9c6f2b9587849157a096a21b6 }
  - { path: web/features/time/components/day-view.ac.test.tsx, sha256: cdcf35568ac002600f7149dbdf1d35faa990be237ea3d3b388adc068f2433d10 }
  - { path: web/features/bookings/components/bookings-view.ac.test.tsx, sha256: 1e73a360ac2b90583a23fe07382cf38a67ae558f72be39250620506b1cb7bd58 }
  - { path: web/app/(dashboard-layout)/layout/vertical/sidebar/sidebaritems.ac.test.ts, sha256: 1622a29340f7e4a7fe5fa8002cb5720ba5b11c8409777c63771095d3fc6d562c }
  - { path: web/app/(dashboard-layout)/layout/vertical/sidebar/nav-collapse/nav-collapse.ac.test.tsx, sha256: 61061b43d87004261920c41c3cf1f7bc51d69ad313c0183935f20ceb62064738 }
---

# T-0100: Web from the prototype: the Logged time chart and tabs, LoggedDay and the prototype api.ts twin, the Logs header and pie dialog, Bookings day links, the Statistics link

**Tier reason:** Copy commands spelled out; one import change and a two-line sidebar edit; no logic

Work from the brief: `node scripts/pm4.mjs brief T-0100`. Verify with `node scripts/pm4.mjs check T-0100`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by `review-feature`._
