---
id: T-0020
title: User drawer: useMe, useSignOutEverywhere, UserAvatar and the header drawer
milestone: M1
app: web
status: ready
size: M
tier: sonnet
depends_on: [T-0019]
feature_spec: specs/06-features/shell-user-menu.md
spec_row: T1
ac_files:
  - { path: web/features/users/api.ac.test.tsx, sha256: 5969cda02bdcf62eb1ac8c23965b5b0d2185cac5a1a57fd6ab50716b7c4ce548 }
  - { path: web/features/users/components/user-avatar.ac.test.tsx, sha256: 6378c92a9213e659c23f9a1b6daf8e022983212d0dad5bec2c947f9e07907b1c }
  - { path: web/app/(dashboard-layout)/layout/shared/header/profile.ac.test.tsx, sha256: 9be82fdf6fa1998efe22e3dd1365ca4c684027d8919088ffb3af882f0fc7516e }
---

# T-0020: User drawer: useMe, useSignOutEverywhere, UserAvatar and the header drawer

**Tier reason:** Composes installed primitives and the existing hook shape; the first mutation hook is written out in full

Work from the brief: `node scripts/pm4.mjs brief T-0020`. Verify with `node scripts/pm4.mjs check T-0020`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by `review-feature`._
