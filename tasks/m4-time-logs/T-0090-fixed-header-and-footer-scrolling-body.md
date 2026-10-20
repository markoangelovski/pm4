---
id: T-0090
title: Fixed header and footer, scrolling body (D7): the confirmed prototype dialog's twin
milestone: M4
app: web
status: done
size: S
tier: haiku
depends_on: [T-0089]
feature_spec: specs/06-features/tlog-prompt.md
spec_row: T2
ac_files: []
---

# T-0090: Fixed header and footer, scrolling body (D7): the confirmed prototype dialog's twin

**Tier reason:** Twin copy, the T1 commands for `day-prompt-dialog.tsx` only

Work from the brief: `node scripts/pm4.mjs brief T-0090`. Verify with `node scripts/pm4.mjs check T-0090`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- Re-copied `web/proto/features/time/components/day-prompt-dialog.tsx` into `web/features/time/components/day-prompt-dialog.tsx` with the T1 commands (`sed 's#@/proto/#@/#g'`, then `npx prettier --write` on that file only). No other file changed.
- `node scripts/pm4.mjs twins`: `twins: 90 equal, 1 intended, 0 not promoted, 0 warnings, 0 failures`.
- `node scripts/pm4.mjs check T-0090` output:
  ```
  pm4 check T-0090
    ac hashes: none recorded
    scope: ok
    web lint: ok (12s)
    web format:check: ok (4s)
    web typecheck: ok (3s)
    web test: ok (25s)
    web build: ok (13s)
    check AC-12: twins equal: ok
    twins: ok (90 equal)
    manual (owner verifies): AC-13
  PASS T-0090
  ```
- Orchestrator re-run (2026-10-20, machine under load, load average 11–23): `pm4 check T-0090` → all gates ok except `web test`, where 5 s timeouts hit unrelated ACs (dashboard-view AC-8, day-view AC-19, log-form-dialog AC-9; another run budget AC-14), a different set each run. Those files pass alone, and the full suite passes with `npx vitest run --maxWorkers=6` (69 files, 218 tests). Not caused by this change.
- AC-13 (overflowing day scrolls only the body) is manual: the owner checks it on the dev server, Logs page.

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | PASS | Twin copy of the dialog (sed + prettier, T1 commands). `pm4 check` PASS, AC-12 twins equal (90). AC-13 left for the owner's manual check. |

## Review
**Verdict: approve** (reviewer on haiku at the owner's request, 2026-10-20).
- The file matches D7 exactly (content, header, body with `px-6 py-4`, footer) and is a clean twin of the prototype (`pm4 twins`: 90 equal). Scope ok, no `@/proto` import, AC-6…AC-12 pass (`npx vitest run features/time`: 41/41).
- Minor: the `web test` gate timed out under machine load in unrelated files; see the implementation notes.
- Manual AC-13 (owner): on a day that overflows 90vh, the title and **Cancel** / **Copy all** stay in view and only the body scrolls; the empty day still shows its message with padding; check a narrow viewport too.
- Tier feedback: haiku was right (a pure copy).
