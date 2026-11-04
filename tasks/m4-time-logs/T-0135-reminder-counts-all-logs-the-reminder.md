---
id: T-0135
title: Reminder counts all logs: the reminder.ts twin
milestone: M4
app: web
status: ready
size: S
tier: haiku
depends_on: []
feature_spec: specs/06-features/tlog-reminder-all-logged.md
spec_row: T1
ac_files:
  - { path: web/features/time/reminder.ac.test.ts, sha256: ca2eeb669fbe4daa65f3d6cbb260519291e803069ac0e20357b5dfe3c77299d6 }
  - { path: web/features/time/components/notifications-button.ac.test.tsx, sha256: ab47fea1867aabdcb8148727580341edcbd4982c0b29cc813f8d38f4905557cd }
---

# T-0135: Reminder counts all logs: the reminder.ts twin

**Tier reason:** One-file twin copy, the command under *Twin (T1)*

Work from the brief: `node scripts/pm4.mjs brief T-0135`. Verify with `node scripts/pm4.mjs check T-0135`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by `review-feature`._
