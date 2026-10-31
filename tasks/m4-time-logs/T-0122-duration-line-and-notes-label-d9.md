---
id: T-0122
title: Duration line and Notes label (D9): the confirmed prototype's prompt.ts and dialog twins
milestone: M4
app: web
status: done
size: S
tier: haiku
depends_on: [T-0091]
feature_spec: specs/06-features/tlog-prompt.md
spec_row: T4
ac_files:
  - { path: web/features/time/components/day-prompt-duration.ac.test.tsx, sha256: bb3c41caa91c47ac595d34a632e770816959808cd5b79e882d8d48da3fcf9a3b }
---

# T-0122: Duration line and Notes label (D9): the confirmed prototype's prompt.ts and dialog twins

**Tier reason:** Twin copy, the T1 commands for two files

Work from the brief: `node scripts/pm4.mjs brief T-0122`. Verify with `node scripts/pm4.mjs check T-0122`.

## Implementation notes
Done in the main session (two-file twin copy, task-routing: a few lines already in context), no subagent.
`web/features/time/prompt.ts` and `web/features/time/components/day-prompt-dialog.tsx` are the twins of the prototype
files at `30f62f0` (`sed 's#@/proto/#@/#g'` + Prettier): `PromptSection.durationMinutes` (the sum of the section's
non-excluded logs), a **Duration** line after **Date** (`formatDuration`) in the card and the markdown, **Note** → **Notes**.

`pm4 check T-0122`: ac hashes ok (1), scope ok, web lint / format:check / typecheck / test / build ok, AC-12 twins equal ok
(120 equal), manual AC-13 (owner). **PASS**.

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | main session | PASS | Twin copy of the two files; all gates green |

## Review
**Verdict: approve** (Opus reviewer, 2026-10-31). `pm4 check` PASS. No findings: the sum skips excluded logs (after the
`excludeFromStats` skip), `**Duration:**` follows `**Date:**` and `**Note:**` became `**Notes:**`, the dialog shows Date, Duration,
Notes in order, the twins are equal, no non-goals touched. Manual for the owner: AC-13 (the taller cards still scroll inside the
fixed header and footer; the Duration row aligns at 360 px and desktop, light and dark).
**Tier feedback:** haiku was enough; a mechanical twin copy, done in the main session.
