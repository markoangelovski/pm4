---
id: T-0013
title: Group the sidebar nav into sections and move Trash and Settings to a fixed footer
milestone: M1
app: web
status: ready
size: S
tier: sonnet
depends_on: []
feature_spec: specs/06-features/shell-sidebar-sections.md
spec_row: T1
ac_files:
  - { path: web/app/(dashboard-layout)/layout/vertical/sidebar/sidebaritems.ac.test.ts, sha256: 441be81ba33e8f1fd69971ce3c0cc7d9558066f36a67a842252b677e2c154890 }
  - { path: web/app/(dashboard-layout)/layout/vertical/sidebar/nav-collapse/nav-collapse.ac.test.tsx, sha256: d625b7548427317bf4e032c7f502036ba325041aafe6f5740d95fedf626b6f1e }
---

# T-0013: Group the sidebar nav into sections and move Trash and Settings to a fixed footer

**Tier reason:** 4 files, all changes given; more than haiku's 3 files, no new pattern

Work from the brief: `node scripts/pm4.mjs brief T-0013`. Verify with `node scripts/pm4.mjs check T-0013`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by `review-feature`._
