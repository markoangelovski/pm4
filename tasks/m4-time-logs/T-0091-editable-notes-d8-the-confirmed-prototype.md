---
id: T-0091
title: Editable notes (D8): the confirmed prototype's prompt.ts and dialog twins
milestone: M4
app: web
status: done
size: S
tier: haiku
depends_on: [T-0090]
feature_spec: specs/06-features/tlog-prompt.md
spec_row: T3
ac_files:
  - { path: web/features/time/components/day-prompt-notes.ac.test.tsx, sha256: 85377b88849810524b72c28aff090ee72cd1c7e4bd4c5cc25512bc2e823246cb }
---

# T-0091: Editable notes (D8): the confirmed prototype's prompt.ts and dialog twins

**Tier reason:** Twin copy, the T1 commands for two files

Work from the brief: `node scripts/pm4.mjs brief T-0091`. Verify with `node scripts/pm4.mjs check T-0091`.

## Implementation notes
Applied the T1 copy commands to `web/features/time/prompt.ts` and `web/features/time/components/day-prompt-dialog.tsx`
(`sed 's#@/proto/#@/#g'` + Prettier). `day-menu.tsx` untouched. The dialog matches its prototype twin after the same
transform + Prettier. AC-14…AC-17 pass in `day-prompt-notes.ac.test.tsx`; AC-18 is covered by the twins check.

`pm4 check T-0091`:
```
  ac hashes: ok (1)
  scope: ok
  web lint: ok (14s)
  web format:check: ok (4s)
  web typecheck: ok (11s)
  web test: ok (25s)
  web build: ok (26s)
  check AC-12: twins equal: ok
  twins: ok (90 equal)
  manual (owner verifies): AC-13
PASS T-0091
```

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | PASS | Twin copy of prompt.ts and day-prompt-dialog.tsx; pm4 check PASS |

## Review
**Verdict: approve** (Opus reviewer, 2026-10-23). `pm4 check` PASS, twins equal (90), scope and Non-goals respected,
no drift from D8 / AC-14…AC-18.

Findings (minor, not blocking; each would start in the prototype twin if wanted):
- A section whose notes are all cleared is still copied, with a bare `**Note:**` line (`prompt.ts:69-73`). Within D8.
- Edits replace a section's whole notes array (`day-prompt-dialog.tsx:80-85`), so a logs refetch while the dialog
  is open is ignored for an edited section. Unlikely (modal, single user).

Owner checks: AC-13 again (header, body and footer now render inside `PromptContent`); D8 by eye: borderless until
hover/focus, auto-grow (`field-sizing-content`), bullet alignment, 360 px and dark theme, reopen resets edits.

Tier: haiku was right (mechanical twin copy, first attempt).
