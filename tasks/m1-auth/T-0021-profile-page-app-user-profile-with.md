---
id: T-0021
title: Profile page /app/user-profile with sign out of all devices
milestone: M1
app: web
status: blocked
size: S
tier: sonnet
depends_on: [T-0020]
feature_spec: specs/06-features/shell-user-menu.md
spec_row: T2
ac_files:
  - { path: web/lib/time/format-date.ac.test.ts, sha256: 1726060e69211e84e8df905f2b1ce59645dd1a99cdf84750f4c798d9e677fb33 }
  - { path: web/features/users/components/user-profile.ac.test.tsx, sha256: 00b52740736ae4d2e7c90d016bf351307d903472d8105045559a654f05f735ac }
---

# T-0021: Profile page /app/user-profile with sign out of all devices

**Tier reason:** One page from primitives plus a date helper; every string and state given; uses T1's hooks

Work from the brief: `node scripts/pm4.mjs brief T-0021`. Verify with `node scripts/pm4.mjs check T-0021`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by `review-feature`._
