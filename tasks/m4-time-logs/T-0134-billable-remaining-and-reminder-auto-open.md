---
id: T-0134
title: Billable Remaining and reminder, auto-open Log time: six prototype twins
milestone: M4
app: web
status: done
size: S
tier: haiku
depends_on: []
feature_spec: specs/06-features/tlog-billable-reminder.md
spec_row: T1
ac_files:
  - { path: web/features/time/reminder.ac.test.ts, sha256: 49be1c319f71cc65ca563c89e86d52944ac19c8c4177773a64aa6dc8ea957e4a }
  - { path: web/features/time/components/notifications-button.ac.test.tsx, sha256: c68b4c83c462c5a69d4d6db048555a73506be175611630dc39a3e8f028b4f352 }
  - { path: web/features/time/day.ac.test.ts, sha256: 1e167160e7df64f21e31876a8b5c10a5bb9c2d467c092b8112c5e82fb1521997 }
  - { path: web/features/time/components/day-view.ac.test.tsx, sha256: 9b041c3ad2ef22c862a869fef4f58321012ffa321a46f87cb789881ed0d1df53 }
---

# T-0134: Billable Remaining and reminder, auto-open Log time: six prototype twins

**Tier reason:** Twin copy, the command under *Twins (T1)*

Work from the brief: `node scripts/pm4.mjs brief T-0134`. Verify with `node scripts/pm4.mjs check T-0134`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

Pure twin copy of the six prototype files (sed + prettier, *Twins (T1)* command, run from the worktree root). Prettier reported all six unchanged. `key={shown?.since}` on `LogFormDialog` in `notifications-button.tsx` is kept (present in both prototype and twin).

`node scripts/pm4.mjs check T-0134` output:

```
pm4 check T-0134
  ac hashes: ok (4)
  scope: ok
  web lint: ok (16s)
  web format:check: ok (5s)
  web typecheck: ok (12s)
  web test: ok (29s)
  web build: ok (25s)
  check AC-9: twins equal: ok
  twins: ok (126 equal)
  manual (owner verifies): AC-10

PASS T-0134
```

AC-10 is manual (browser check on `/app/**`), left for the owner.

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | PASS | Ran twin command, prettier unchanged, `pm4 check` PASS (AC-9 ok, AC-10 manual). |

## Review
2026-11-03, Opus reviewer: **approve**. No blockers, no majors. `pm4 check --feature` PASS; D2–D4 and Interfaces match the spec, no drift, no `@/proto/*` imports.
- Minor: `reminder.ts:48` doc comment still says "start + logged"; should be "start + billable" (fix in the prototype first, then re-copy the twin).
- Minor: the save-then-reopen path relies on `onOpenChange` closing over the old `shown`; covered by AC-5, optional comment.
- Minor: nothing stops the auto-open dialog stacking on another open dialog when a 15 min boundary passes; owner to judge during AC-10.

Tier feedback: haiku was right (mechanical twin copy, first attempt).

Fixes (main session, 2026-11-03): findings 1 and 2 fixed in the prototype, then the twins re-copied; the two prototype files added to the spec's Files table. Finding 3 left for the owner's AC-10 check. `pm4 check`: all gates and AC-9 ok; scope flags only the spec itself (the Files-table edit).
