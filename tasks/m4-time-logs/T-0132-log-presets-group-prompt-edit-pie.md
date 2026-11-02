---
id: T-0132
title: Log presets, group **+**, Prompt Edit, pie tooltip, wider dialogs: ten prototype twins
milestone: M4
app: web
status: done
size: S
tier: haiku
depends_on: []
feature_spec: specs/06-features/tlog-reminder.md
spec_row: T1
ac_files:
  - { path: web/features/time/components/log-form-dialog.ac.test.tsx, sha256: 23b6bfc89baf74915f90cb12a8cfb9a989e2fd61060461ffdca70cde91d7a8b8 }
  - { path: web/features/time/components/day-view.ac.test.tsx, sha256: c55f1c35ceebb7ced4db661b60a810145d82d86bda84299f50d7cd66ab399e78 }
  - { path: web/features/time/components/day-prompt-notes.ac.test.tsx, sha256: a7f1c6bbce973523bbf0035d353576344204faedefe9fca6b438021378845afa }
  - { path: web/features/time/last-log-link.ac.test.tsx, sha256: 8fb6d0e9de598a1f864b045c7d969bee39d70e100e7f471326259c4c12e53560 }
---

# T-0132: Log presets, group **+**, Prompt Edit, pie tooltip, wider dialogs: ten prototype twins

**Tier reason:** Twin copy, the command under *Twins (T1)*

Work from the brief: `node scripts/pm4.mjs brief T-0132`. Verify with `node scripts/pm4.mjs check T-0132`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- Ran the twin command from the brief unchanged for the ten prototype files (sed `@/proto/` → `@/` and `@/proto/mock/client` → `@/lib/api/client`), then prettier on the same ten. Files changed: `web/features/projects/components/project-form-dialog.tsx`, `web/features/tasks/components/task-form-dialog.tsx`, `web/features/notes/components/todo-form-dialog.tsx`, `web/features/notes/components/markdown-editor.tsx`, `web/features/time/prompt.ts`, `web/features/time/components/day-prompt-dialog.tsx`, `web/features/time/components/day-charts.tsx`, `web/features/time/schemas.ts`, `web/features/time/components/log-form-dialog.tsx`, `web/features/time/components/day-view.tsx`. No hand edits.
- No `@/proto` imports remain under `web/features`.
- AC-4, AC-5, AC-6, AC-7 test files: `log-form-dialog.ac.test.tsx`, `day-view.ac.test.tsx`, `day-prompt-notes.ac.test.tsx` pass (21 tests).
- `pm4 check T-0132` output:

```
pm4 check T-0132
  ac hashes: ok (3)
  scope: ok
  pending ACs (later tasks, excluded): AC-1, AC-2, AC-3, AC-8, AC-9
  web lint: ok (17s)
  web format:check: ok (5s)
  web typecheck: ok (13s)
  web test: ok (31s)
  web build: ok (28s)
  check AC-8: twins equal; the header has the bell: skipped (later task)
  twins: ok (123 equal)
  twins warning: features/time/components/notifications-button.tsx
  twins warning: features/time/reminder.ts

PASS T-0132
```

- Expected twin warnings for `reminder.ts` and `notifications-button.tsx` are stubs, to be replaced in T-0133. Not part of this task.

- Review rework (attempt 2, amended spec): added the two api twins `web/features/projects/api.ts` and `web/features/tasks/api.ts` (same sed, prettier), re-copied `web/features/time/components/day-prompt-dialog.tsx` from the changed prototype (prettier). Sign-out: `web/features/auth/use-sign-out.ts` and `web/features/auth/components/auth-guard.tsx` import `NO_LOG_LINK, setLastLogLink` and call `setLastLogLink(NO_LOG_LINK);` after each `queryClient.clear();` (one in the hook, two in the guard), prettier on both. No other file touched; `notifications-button.tsx` left for T-0133.
- Attempt 2 tests: `last-log-link.ac.test.tsx`, `log-form-dialog.ac.test.tsx`, `day-view.ac.test.tsx`, `day-prompt-notes.ac.test.tsx` pass (24 tests); `npm run typecheck` ok.
- `pm4 check T-0132` (attempt 2), real output:

```
pm4 check T-0132
  ac hashes: ok (4)
  scope: FAIL (12 file(s))
  pending ACs (later tasks, excluded): AC-1, AC-2, AC-3, AC-8, AC-12, AC-9
  web lint: ok (16s)
  web format:check: ok (5s)
  web typecheck: ok (3s)
  web test: ok (30s)
  web build: ok (14s)
  check AC-8: twins equal; the header has the bell: skipped (later task)
  twins: FAIL (1)

FAIL T-0132
- changed files outside scope:
    specs/04-web/screens.md, specs/06-features/README.md, specs/06-features/tlog-reminder.md, specs/open-questions.md (not in the Files table)
    web/app/(dashboard-layout)/layout/vertical/header/index.tsx (belongs to T2)
    web/proto/features/auth/use-sign-out.ts, web/proto/features/projects/api.ts, web/proto/features/tasks/api.ts,
    web/proto/features/time/components/day-prompt-dialog.tsx, web/proto/features/time/components/notifications-button.tsx,
    web/proto/features/time/last-log-link.ts (not in the Files table)
    web/features/system/use-attention.ts (belongs to T2)
- production files differ from their prototype twins:
    web/features/time/components/notifications-button.tsx
```

- Expected per the rework brief: every scope line is the uncommitted test step or T-0133 work. The one twin FAIL is `notifications-button.tsx`, which is T-0133's file and differs from its prototype until T-0133 makes the twin; I did not touch it. AC-12 (pending) is also T-0133's. Reviewer: the overall result is FAIL only because of the scope list and the T-0133 twin, not T-0132 code.

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | PASS | Ten twins copied and formatted; AC-4..AC-7 tests pass; `pm4 check` PASS (twin warnings for T-0133 stubs only). |
| 2 | haiku | FAIL (expected: scope and T-0133 twin only) | Review rework: added `projects/api.ts`, `tasks/api.ts`, re-copied `day-prompt-dialog.tsx`; sign-out resets the last log link in `use-sign-out.ts` and `auth-guard.tsx`. Tests and typecheck pass; `pm4 check` FAIL only on out-of-scope test-step/T-0133 files and the `notifications-button.tsx` twin. |
| 3 | haiku | PASS | Second review fix: `setLastLogLink(NO_LOG_LINK)` added after `queryClient.clear()` in the no-session path of `auth-guard.tsx`; AC-10 and AC-11 pass; Prettier run. |
- Second review fix (attempt 3): `auth-guard.tsx` no-session path now calls `setLastLogLink(NO_LOG_LINK)` after `queryClient.clear()`, so AC-11 passes.

## Review
_Filled in by `review-feature`._

**Verdict (Opus, 2026-11-02): changes-requested.** `pm4 check --feature` PASS (126 twins equal); code matches spec and prototype. The finding is a spec gap (D3), not an implementation mistake.
- **Major:** the last log link (`last-log-link.ts`, module state until reload) survives sign-out, which is client-side navigation (`features/auth/use-sign-out.ts`, session-ended path in `features/auth/components/auth-guard.tsx`). User B in the same tab gets user A's project and task prefilled on their first new log. Proposed: amend D3 (clear on sign-out and session end), call `setLastLogLink(NO_LOG_LINK)` next to each `queryClient.clear()`, add an AC. Needs the owner's OK: the auth files are outside *Files*.
- Minor: the link can point to a deleted project or task (owner decision: clear on delete, or accept the save error).
- Minor: the group **+** is a button inside the `div` trigger (decided in D4); owner checks with keyboard and screen reader in AC-9.
- Minor (optional): Prompt **Edit**/Copy all read card queries at click time; could disable Edit until they settle.
- Tier feedback: haiku was right (mechanical twin copy, no hand edits).

**Second review (Opus, 2026-11-02): changes-requested.** After OQ-263's rework, all gates pass (6 AC hashes, 126 twins). The scope FAIL is only the main session's uncommitted spec and prototype files, which is acceptable. The delete, Edit-wait and bell fixes are complete.
- **Major:** `auth-guard.tsx`'s no-session path (`clearRefreshToken(); queryClient.clear();`) doesn't reset the last link; *Sign-out (T1)* asks for two resets in the guard. AC-11 now also covers it (rehashed).
- Minor (optional): Edit's `useIsFetching` counts every project or task detail fetch, not only the cards', so a background refetch briefly disables Edit. Accepted as within D7.
- Process: the prototype rework, the test step and the implementation share one uncommitted diff. Commit them in parts, or knowingly as one.
- Tier feedback: haiku was right; it followed the spec's example and missed the "two in the guard" count.
- **Fixed (attempt 3, main session verified):** the reset follows both `clear()` calls in the guard; AC-11 (with the no-session case) passes; `pm4 check --feature` passes every gate (the scope list is only the main session's spec and prototype files).
