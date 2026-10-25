---
id: T-0114
title: New menu with Project, Task and Log; floating swipeable Log time button in the layout
milestone: M0
app: web
status: ready
size: S
tier: haiku
depends_on: []
feature_spec: specs/06-features/shell-new-menu.md
spec_row: T1
ac_files:
  - { path: web/features/notes/components/new-item-button.ac.test.tsx, sha256: c0fed9a0eca974b9415e5709721605d9a8517a3ed57a9b991f55e8bf6912c50e }
  - { path: web/features/time/components/log-time-button.ac.test.tsx, sha256: 527c961a72b4a8add8a3d63ee85d299fbeb7ec470c72b5a00778adb2c62efc2a }
---

# T-0114: New menu with Project, Task and Log; floating swipeable Log time button in the layout

**Tier reason:** Two scripted `git apply`s, a click handler written out in full, and two one-line layout edits

Work from the brief: `node scripts/pm4.mjs brief T-0114`. Verify with `node scripts/pm4.mjs check T-0114`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by `review-feature`._
