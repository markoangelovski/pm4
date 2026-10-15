---
id: T-0062
title: Promote the prototype: the marker, delete dialogs, relink, Delete day; Trash page, route and link removed
milestone: M4
app: web
status: blocked
size: M
tier: haiku
depends_on: [T-0061]
feature_spec: specs/06-features/hard-delete.md
spec_row: T3
ac_files:
  - { path: web/features/projects/api.ac.test.tsx, sha256: f49d1c6d2c832397c592830268a32fe5e13cd4c466ccf03cd42614ac01c0dc5c }
  - { path: web/features/tasks/api.ac.test.tsx, sha256: 0c1a2758ca9ed1af4867994e35c2db77db6b9bb1149cee49945a63ef0a101abb }
  - { path: web/features/time/api.ac.test.tsx, sha256: 729cc50b3144e3ddc2c4fd15e21d0e9be2a1d047648243fe789874612ee41b8e }
  - { path: web/features/projects/components/project-detail.ac.test.tsx, sha256: 70f3721da8b3084ba07dd01c77f0df609c7e1e0d7383599cc3b9c96db1fb5eba }
  - { path: web/features/tasks/components/task-detail.ac.test.tsx, sha256: 3e13ff6410a66682e27c0b9b25d4f89e43c5fa602e636118ff8e6f463ef6a41a }
  - { path: web/features/time/components/day-view.ac.test.tsx, sha256: 794c7d7f508e390ff0ed7e293a05f6e557d55fa644ef1cc3b08f2d148ab15258 }
  - { path: web/features/dashboard/components/dashboard-view.ac.test.tsx, sha256: 57d00209ba5a3f64c6cdb4188cb5b0fccfaf169aa1cca0fad879bd31b29d6ac8 }
  - { path: web/features/time/components/log-form-dialog.ac.test.tsx, sha256: 0b6de2ea032df0b782ea05a5282918a060acfb1661062cda9a729b8baf544983 }
  - { path: web/app/(dashboard-layout)/layout/vertical/sidebar/sidebaritems.ac.test.ts, sha256: f0ef56e5e0635d4d29edb13b0beb79988b63dab14867905cf140fb40e37bc61a }
  - { path: web/app/(dashboard-layout)/layout/vertical/sidebar/nav-collapse/nav-collapse.ac.test.tsx, sha256: 54b42fbccdd0cbd28938aa2e146434055412826c87308c1bd857966b32faecb1 }
---

# T-0062: Promote the prototype: the marker, delete dialogs, relink, Delete day; Trash page, route and link removed

**Tier reason:** Promote + twins (D5); hooks spelled out

Work from the brief: `node scripts/pm4.mjs brief T-0062`. Verify with `node scripts/pm4.mjs check T-0062`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by `review-feature`._
