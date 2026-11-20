---
id: T-0166
title: Promote form-drafts.ts and DraftNotice, replace the five dialogs and three api.ts with their twins, clearFormDrafts() in sign-out and session end
milestone: M0
app: web
status: review
size: S
tier: haiku
implementer: opencode/opencode/deepseek-v4.1-flash-free
depends_on: []
feature_spec: specs/06-features/shell-form-drafts.md
spec_row: T1
ac_files:
  - { path: web/features/system/form-drafts.ac.test.tsx, sha256: b586f95db49dba5d67432a1eae05c52fe7f061f4a90ab48c5a264ea3bfa09c02 }
  - { path: web/features/projects/components/project-form-dialog.ac.test.tsx, sha256: 7aac67dff3e5bc51781a678bc751aea5eae06a698547d34f54b178f00a21bf55 }
  - { path: web/features/auth/use-sign-out.ac.test.tsx, sha256: 36d8f226b04c87399147946b07f8233f1a4ec37cdff46d38ddfe1a90757be69f }
  - { path: web/features/auth/components/auth-guard.ac.test.tsx, sha256: d2861894da839205155e674e4934526ade9bc35b949d4a2daad3f4118670e7ef }
---

# T-0166: Promote form-drafts.ts and DraftNotice, replace the five dialogs and three api.ts with their twins, clearFormDrafts() in sign-out and session end

**Tier reason:** Copy commands spelled out; two one-line edits

Work from the brief: `node scripts/pm4.mjs brief T-0166`. Verify with `node scripts/pm4.mjs check T-0166`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- `features/system/form-drafts.ts` and `features/system/components/draft-notice.tsx` were promoted unchanged (no `@/proto/` imports).
- The five dialogs (`log-form-dialog`, `project-form-dialog`, `task-form-dialog`, `note-form-dialog`, `todo-form-dialog`) and the three `api.ts` (`projects`, `tasks`, `notes`) were replaced by their twins with the brief's sed command; `npx prettier --write` left only `task-form-dialog.tsx` reformatted.
- `clearFormDrafts()` added in `features/auth/use-sign-out.ts` (after `setLastLogLink(NO_LOG_LINK)`, doc comment now names the unsaved form drafts) and in `AuthGuard`'s `onSessionEnded` listener at the same spot.
- `features/time/api.ts` was not touched (D3), so `twins` warns on that pair as the brief expects; it also warns on `features/time/components/logged-time-chart.tsx` and `logged-time-section.tsx`, which belong to other features in this scratch worktree.
- AC-10 is manual (`npm run dev`).

`node scripts/pm4.mjs check T-0166`:
```
ac hashes: ok (4) · scope: ok · web lint: ok · web format:check: ok · web typecheck: ok · web build: ok · twins: ok (147 equal)
FAIL T-0166 — web test failed
```
The only test failures are other features' acceptance tests in this scratch worktree (`api-progress-bar.ac.test.tsx`, `logged-time.ac.test.tsx`, `project-detail.ac.test.tsx`, `task-detail.ac.test.tsx`, `logged-time-section.ac.test.tsx`); all four of this task's AC files pass (17 tests).

On the combined branch `task/T-0165` (main session, 2026-11-21, `pm4 check --feature specs/06-features/shell-form-drafts.md`): ac hashes ok (4), web lint, format:check, typecheck, test and build ok, twins ok (151 equal) with no warnings. Scope fails only on the other two features' files on this branch. The scratch-worktree result and twins warnings above are out of date.

### Attempts
| # | Agent | Result | Summary |
| --- | --- | --- | --- |
| 1 | opencode/opencode/deepseek-v4.1-flash-free | done | Promoted form-drafts.ts and DraftNotice, five dialogs and three api.ts to their twins, clearFormDrafts() in sign-out and AuthGuard; own ACs pass (17), pm4 check FAILs only on other features' ACs (scratch worktree) |

## Review
**Verdict: approve** (reviewer `claude-code/claude-opus-5-5`, 2026-11-21)

The promoted `form-drafts.ts` and `draft-notice.tsx` match their twins byte for byte. All five dialogs and the three `api.ts` files equal their re-generated twins. `forgetDraftsOf` runs on project, task, note and to-do delete; the log delete comes from T-0168 (D3). `clearFormDrafts()` is called in sign-out and in `AuthGuard`'s `onSessionEnded`. Non-goals are untouched. Scope fails only on the other features' files.

Findings:
1. Minor: the implementation notes were stale (scratch-worktree check result, twins warnings). Fixed by the main session: the combined-branch result was added.
2. Minor, a product edge case, not drift: a "new task" or "new log" draft that picked a project or task deleted since then is restored still linked to that item. Submitting it fails with the API's validation error, and no data is corrupted. This matches the confirmed prototype. If it should be handled, record it as an open question and fix it in the prototype twin first.

AC-10 (log, task, note and to-do dialogs keep a draft through Escape; Discard, Cancel, delete) is left for the owner to check by hand.

| Agent | Attempts | ACs first try | Rules kept | Blocks right | Code | Grade | Fit |
| --- | --- | --- | --- | --- | --- | --- | --- |
| opencode/opencode/deepseek-v4.1-flash-free | 1 | yes (4 AC files, 17 tests) | yes | n/a (no BLOCKED) | Exact twin copies and the two one-line edits as specified; notes clear but went stale | A | right: an S-size copy-commands task finished in one attempt by a free model |
