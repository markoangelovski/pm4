---
id: T-0020
title: User drawer: useMe, useSignOutEverywhere, UserAvatar and the header drawer
milestone: M1
app: web
status: done
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
Implemented useMe, useSignOutEverywhere, UserAvatar/userInitials and the ProfileSheet drawer.

pm4 check T-0020: lint, format:check, typecheck, test, build all ok. PASS T-0020

Review fix: drawer shows the error state only when there is no data (`isError && !me`), so stale data stays after a failed refetch. pm4 check T-0020: lint, format:check, typecheck, test, build ok; scope FAIL only because T-0021's files are also in this worktree.

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | sonnet | pass | All files implemented; check PASS |
| 2 | sonnet | pass | Review fixes: error state only when no data |

## Review
**Verdict: approve** (Opus review, 2026-10-03). `pm4 check --feature` PASS; no spec drift, Non-goals untouched.

Findings (minor, non-blocking):
- `profile.tsx:57` checks `isError` before `me`, so a failed background refetch (TanStack v5 keeps `data`) hides an already-loaded drawer header behind the error. Suggested fix: `isError && !me`.
- Template fidelity (D7) of the drawer markup can't be verified from the diff; owner compares during AC-13.

Tier feedback: sonnet was right (drawer composition); one attempt.
