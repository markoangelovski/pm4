---
id: T-0162
title: Account deletion and the lead picker: api:types, D3 type switch, D1 sign-out target, the four twins
milestone: M1
app: web
status: blocked
size: S
tier: haiku
depends_on: [T-0161, T-0160]
feature_spec: specs/06-features/acct-web.md
spec_row: T2
ac_files:
  - { path: web/features/auth/use-sign-out.ac.test.tsx, sha256: 6c4ca366acc56c72af1dabf94f1fa34712700c399d26ed0b3975e67a59d3356b }
  - { path: web/features/users/api.ac.test.tsx, sha256: b2baf56bd1a0eeb95093ce15540f8c996ba813674255b2fc58cad79176235d91 }
  - { path: web/features/users/components/delete-account-card.ac.test.tsx, sha256: 597300d553192c2394ace1a7d2e22589f4e8ae7b368f66d6147badc605764296 }
  - { path: web/features/users/components/user-profile.ac.test.tsx, sha256: 4d7074f59fbfa701f3973f4f67151400815f7fdebba5ebae5bac64030dd541bb }
  - { path: web/features/users/components/project-lead-field.ac.test.tsx, sha256: 01a3ca6c473e8e8376d5c3ad67b99d4e1e62a5bc54d3264647e9b6b45b923f85 }
---

# T-0162: Account deletion and the lead picker: api:types, D3 type switch, D1 sign-out target, the four twins

**Tier reason:** Every edit is listed under *Types, hooks and sign-out target*; the rest is the twin copy

Work from the brief: `node scripts/pm4.mjs brief T-0162`. Verify with `node scripts/pm4.mjs check T-0162`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by `review-feature`._
