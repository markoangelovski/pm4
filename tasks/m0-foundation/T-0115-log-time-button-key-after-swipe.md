---
id: T-0115
title: Log time button: a key press after a touch swipe is never swallowed
milestone: M0
app: web
status: done
size: S
tier: haiku
depends_on: []
feature_spec: —
files: [web/features/time/components/log-time-button.tsx, web/proto/features/time/components/log-time-button.tsx, web/features/time/components/log-time-button.test.tsx]
specs: [specs/06-features/shell-new-menu.md]
ac_files: []
---

# T-0115: Log time button: a key press after a touch swipe is never swallowed

## Goal
Fix T-0114 review finding 1: Enter or Space on the floating Log time button (or its edge tab) always activates it, even right after a touch swipe.

## Change
Cause: `onPointerUp` sets `swiped.current = true` after a swipe so that `onTap` ignores the click that ends it. A touch drag usually fires no click, so the flag stays set and `onTap` drops the next activation, which may come from the keyboard (FR-TLOG-011, AC-4: Enter opens the dialog).

In `web/features/time/components/log-time-button.tsx` and its twin `web/proto/features/time/components/log-time-button.tsx` (same change; the twins stay equal after `sed 's#@/proto/#@/#g'`):
- Add, after `onTap`:
  ```ts
  // A key press is never the end of a swipe: Enter and Space click after keydown, so clear the flag first.
  const onKeyDown = () => {
    swiped.current = false;
  };
  ```
- Add `onKeyDown={onKeyDown}` to the `Button` and to the edge-tab `button`, after their `onClick`.

New ordinary test `web/features/time/components/log-time-button.test.tsx` (pattern: `log-time-button.ac.test.tsx`): a touch swipe with no click (`pointerDown` x 100, `pointerMove`/`pointerUp` x 200) hides the button; then `keyDown` Enter + `click` on **Show Log time button** shows the button again.

## Acceptance criteria
- [x] After a touch swipe with no click, Enter on the tab shows the button (`log-time-button.test.tsx`).
- [x] The T-0114 acceptance tests still pass (a mouse swipe's own click is still ignored).
- [ ] Owner: on a phone, swipe the button away, then activate the tab with a keyboard or screen reader.

---

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- Done in the main session (a few lines, files already in context; task-routing allows it).
- `onKeyDown` clears `swiped` on the button and the tab, in the real file and its proto twin (twins equal).
- `log-time-button.test.tsx`: fails without the fix (the tab click is swallowed), passes with it.
- Not covered: a screen-reader activation sends a click with no keydown, so it can still be swallowed once after a touch swipe. Fixing that needs a different signal (e.g. a short time window after the swipe); left for the owner to decide.
- `pm4 check` summary: PASS: scope ok; lint, format:check, typecheck, test, build ok; twins ok (118 equal).

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | main | PASS | Fix + regression test; `pm4 check` PASS |

## Review
_The owner's review (quick lane), or `review-feature`'s verdict._
