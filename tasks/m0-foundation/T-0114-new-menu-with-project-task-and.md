---
id: T-0114
title: New menu with Project, Task and Log; floating swipeable Log time button in the layout
milestone: M0
app: web
status: done
size: S
tier: haiku
depends_on: []
feature_spec: specs/06-features/shell-new-menu.md
spec_row: T1
ac_files:
  - { path: web/features/notes/components/new-item-button.ac.test.tsx, sha256: c0fed9a0eca974b9415e5709721605d9a8517a3ed57a9b991f55e8bf6912c50e }
  - { path: web/features/time/components/log-time-button.ac.test.tsx, sha256: 5830fe4defd482f070838f07317db19844fe707c8e74b434874ad4894350362e }
---

# T-0114: New menu with Project, Task and Log; floating swipeable Log time button in the layout

**Tier reason:** Two scripted `git apply`s, a click handler written out in full, and two one-line layout edits

Work from the brief: `node scripts/pm4.mjs brief T-0114`. Verify with `node scripts/pm4.mjs check T-0114`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- Menu: prototype diff applied (`fc49830`) to `new-item-button.tsx`; twins match.
- Floating button: prototype diff applied, then D3 (`onTap`, `swiped` ref, `setPointerCapture?.`, `onPointerUp` body, `onClick` on both buttons) in the real file and its proto twin. Both files formatted with prettier; twins equal after `sed`.
- Layout: `LogTimeButton` removed from the header, added once after `</SidebarInset>` in `layout.tsx`.
- Tests: the menu and log-time-button acceptance test files pass (7 tests).
- `pm4 check` summary (main session, after the fix below): PASS: ac hashes ok (2); scope ok; lint, format:check, typecheck, test, build ok; AC-8 ok; twins ok (118 equal); AC-9 manual (owner).
- Attempt 1 fix (main session): the committed `log-time-button.ac.test.tsx` failed prettier (one line wrap). Ran `prettier --write` on it (formatting only, no logic change) and re-ran `pm4 hash`.

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | BLOCKED: test (format) | Applied menu + D3 + layout; all ACs pass; check fails only on prettier of the log-time-button acceptance test |
| — | main | PASS | Test formatted with prettier, re-hashed; `pm4 check` PASS |

## Review
_Filled in by `review-feature`._

**Verdict: approve** (Opus reviewer, 2026-10-25). `pm4 check` PASS. Menu and button match their prototype twins, D3 applied as written, layout renders `LogTimeButton` once. The one acceptance-test edit (prettier re-wrap) is recorded.

Findings (all minor, owner to decide; any fix goes to the prototype twin first):
1. A touch swipe usually fires no click, so `swiped` can stay `true` and swallow the next Enter/Space or screen-reader activation once. Fix: reset `swiped.current` in an `onKeyDown` on the button and the tab.
2. After a mouse swipe the hidden control can keep focus while `aria-hidden`. Optional fix: move focus to the visible control when `hidden` changes.
3. AC-3's test doesn't cover `/app/task?id=…` (the code handles it). Add an ordinary test, or check it in AC-9.

Tier feedback: haiku was right. The only snag (prettier on the committed AC test) came from the test-writing step.
