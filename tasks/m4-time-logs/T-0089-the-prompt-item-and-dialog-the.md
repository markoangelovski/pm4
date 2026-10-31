---
id: T-0089
title: The Prompt item and dialog: the three prototype twins
milestone: M4
app: web
status: done
size: S
tier: haiku
depends_on: []
feature_spec: specs/06-features/tlog-prompt.md
spec_row: T1
ac_files:
  - { path: web/features/time/prompt.ac.test.ts, sha256: 72f414407806a4cbd2ff6ff5e341d25cbe463db101174c8d5782d62c8ac46051 }
  - { path: web/features/time/components/day-prompt-dialog.ac.test.tsx, sha256: 1dba0d4a8e3347f3516ee47f1507d03ded8ccd572c7c95a33307d8b05d65623f }
---

# T-0089: The Prompt item and dialog: the three prototype twins

**Tier reason:** Twin copy, the commands under *Interfaces → Web*

Work from the brief: `node scripts/pm4.mjs brief T-0089`. Verify with `node scripts/pm4.mjs check T-0089`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- Copied the three prototype files into production with `@/proto/` → `@/` and prettier (the brief's commands). `features/time/prompt.ts` and `day-menu.tsx` were already prettier-clean.
- No `@/proto` imports remain in `web/features/time/`.
- `node scripts/pm4.mjs check T-0089` output:
  ```
  pm4 check T-0089
    ac hashes: ok (2)
    scope: ok
    web lint: ok (14s)
    web format:check: ok (4s)
    web typecheck: ok (11s)
    web test: ok (23s)
    web build: ok (26s)
    check AC-12: twins equal: ok
    twins: ok (90 equal)

  PASS T-0089
  ```

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | PASS | Twin copy of the three prototype files (sed + prettier); pm4 check PASS, AC-12 twins equal. |
| 2 | opus (main session) | PASS | Review finding 1: `useCopy` counts copies and keys its timer on the count, so copying again restarts the 2 s Copied state. Fixed in the prototype twin first, then copied over again with the twin commands. Added the prototype file to the spec's Files table. `pm4 check`: gates, AC-12 and twins (90 equal) ok; scope flags only `specs/06-features/tlog-prompt.md` (that Files row). An unrelated `budget.ac.test.tsx` waitFor timed out once and passed on re-run (flaky). |

## Review
**Verdict: approve** (Opus reviewer, 2026-10-19). Spec conformance: scope, interfaces and D1–D4 match; AC-1–AC-11 pass; AC-12 and `pm4 twins` show 90 equal, and each production file matches its twin after the `@/proto/` → `@/` rewrite (the only other difference is Prettier joining one import onto a single line). No risks: no new endpoints, and work dates are handled as local dates.

Findings (minor, non-blocking):
1. Copying again within 2 s doesn't restart the Copied timer, so the label reverts 2 s after the first click (`day-prompt-dialog.tsx:28-35`). **Fixed** (attempt 2): prototype first, then copied over again.
2. Observation: links have no loading or error indicator, and Copy all leaves out links that haven't loaded yet. D3 accepts this.

Tier feedback: haiku was right; it passed on the first attempt.
