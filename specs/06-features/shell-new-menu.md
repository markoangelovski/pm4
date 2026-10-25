---
id: feat-shell-new-menu
title: New menu with project, task and log; floating Log time button
status: approved
owner: Marko Angelovski
last_updated: 2026-10-25
milestone: M0
requirements: [FR-NOTE-009, FR-TLOG-011, SCR-022, SCR-032, SCR-041]
related: [req-notes, req-time-logs, web-screens, web-routing, feat-note-todos, feat-tlog-web, OQ-241, OQ-242]
prototype: fc49830
---

# New menu with project, task and log; floating Log time button

## Goal
The header's **New ▾** menu creates a project, task, note, to-do or log (FR-NOTE-009). **Log time** leaves the header
and becomes a floating round button at the bottom right of every app screen. A swipe hides it behind an edge tab
(FR-TLOG-011). Screens: *New menu* and *Log time button* in [screens.md](../04-web/screens.md).

## Decisions
| # | Decision | Source |
| --- | --- | --- |
| D1 | Menu: Project, Task \| Note, To-do \| Log. On a project or task page a new task starts in that project; a new log is for today with no link. | OQ-241 · Owner, prototype `fc49830` |
| D2 | Floating round icon-only button (40 px, 32 px clock), bottom right everywhere; swipe right hides it behind a **‹** tab; tap or swipe left brings it back; hidden isn't remembered. | OQ-242 · Owner, prototype `fc49830` |
| D3 | Production opens the dialog (button) and shows the button again (tab) in `onClick`, not in `onPointerUp` + `onKeyDown` as the prototype does. A click that ends a swipe is ignored. This keeps native button activation (Enter, Space, screen readers, `fireEvent.click`). The prototype twin gets the same change. | Agent: web conventions (native controls) |
| D4 | The existing acceptance test `log-form-dialog.ac.test.tsx` (feat-tlog-web AC-14) stays unchanged and keeps passing: it clicks `Log time` on `<LogTimeButton />`. | Agent |

## Scope
**In:** `NewItemButton` gains Project, Task and Log; `LogTimeButton` becomes the floating swipeable button; the header
drops it; the dashboard layout renders it once, after `SidebarInset`.

**Non-goals** (implementers must not touch these):
- `api/`. The form dialogs themselves (`ProjectFormDialog`, `TaskFormDialog`, `LogFormDialog`, `NoteFormDialog`, `TodoFormDialog`).
- The TanStack Query devtools position (`lib/query-client.tsx`): it may cover the button in dev; the owner left it (OQ-242).
- The day view's own **Log time** button (SCR-040). The other header buttons. `components/ui/*`.
- `web/features/time/components/log-form-dialog.ac.test.tsx` (D4).

## Read first
| Path | Why / copy this |
| --- | --- |
| `web/proto/features/notes/components/new-item-button.tsx` | The confirmed menu (prototype `fc49830`) |
| `web/proto/features/time/components/log-time-button.tsx` | The confirmed floating button (prototype `fc49830`) |
| `web/proto/mock/shell/proto-shell.tsx` | Where the shell renders `<LogTimeButton />` (after `SidebarInset`) |
| `web/features/time/components/log-form-dialog.ac.test.tsx` | Test setup to copy: `withProviders`, the `apiClient` mock, the fixed "today", AC-14 |

## Files
| App | File | C/M | Task | Notes |
| --- | --- | --- | --- | --- |
| web | `web/features/notes/components/new-item-button.ac.test.tsx` | C | tests | Acceptance tests |
| web | `web/features/time/components/log-time-button.ac.test.tsx` | C | tests | Acceptance tests |
| web | `web/features/notes/components/new-item-button.tsx` | M | T1 | Apply the prototype diff (*Interfaces → Menu*) |
| web | `web/features/time/components/log-time-button.tsx` | M | T1 | Apply the prototype diff, then D3 (*Interfaces → Floating button*) |
| web | `web/proto/features/time/components/log-time-button.tsx` | M | T1 | The same D3 change, so the prototype stays ahead |
| web | `web/app/(dashboard-layout)/layout/vertical/header/index.tsx` | M | T1 | Remove `LogTimeButton` (import and element) |
| web | `web/app/(dashboard-layout)/layout.tsx` | M | T1 | `import { LogTimeButton } from "@/features/time/components/log-time-button";` and `<LogTimeButton />` right after `</SidebarInset>`, inside `SidebarProvider` |

## Interfaces

### Menu (T1)
Production `new-item-button.tsx` equals the prototype's parent version, so apply the prototype change with the
`@/proto/` prefix removed:
```bash
git diff fc49830~1 fc49830 -- web/proto/features/notes/components/new-item-button.tsx \
  | sed 's#@/proto/#@/#g; s#web/proto/features/#web/features/#g' | git apply
```
Afterwards `diff <(sed 's#@/proto/#@/#g' web/proto/features/notes/components/new-item-button.tsx) web/features/notes/components/new-item-button.tsx`
prints nothing. The real dialogs and `useMe` (`@/features/users/api`) have the same names and props as the mocks.

### Floating button (T1)
1. Apply the prototype change the same way:
```bash
git diff fc49830~1 fc49830 -- web/proto/features/time/components/log-time-button.tsx \
  | sed 's#@/proto/#@/#g; s#web/proto/features/#web/features/#g' | git apply
```
2. Then, in **both** `web/features/time/components/log-time-button.tsx` and its `web/proto/` twin (D3):
   - Add, after `const start = useRef…`:
     ```ts
     // True when the last press moved past TAP_SLOP, so the click that ends a swipe is ignored.
     const swiped = useRef(false);
     /** Runs `action` for a tap, a mouse click or a key press, not for the click that ends a swipe. */
     const onTap = (action: () => void) => () => {
       if (swiped.current) {
         swiped.current = false;
         return;
       }
       action();
     };
     ```
   - `onPointerDown`: `e.currentTarget.setPointerCapture?.(e.pointerId);` (jsdom has none), and `swiped.current = false;`.
   - `onPointerUp` body after `setDrag(null);`:
     ```ts
     swiped.current = moved;
     if (!moved) return;
     if (!hidden && dx > SWIPE_DISTANCE) setHidden(true);
     else if (hidden && dx < -SWIPE_DISTANCE) setHidden(false);
     ```
   - The `Button`: delete `onKeyDown`, add `onClick={onTap(() => setOpen(true))}`.
   - The edge-tab `button`: delete `onKeyDown`, add `onClick={onTap(() => setHidden(false))}`.
   - The JSDoc gains: "A tap, click, Enter or Space opens the dialog (on the tab: shows the button)."

Accessible names stay: the button **Log time** (`aria-hidden` and `tabIndex={-1}` while hidden), the tab **Show Log time
button** (`aria-hidden` and `tabIndex={-1}` while the button shows).

## Acceptance criteria
| AC | Case → expected | Test | Task |
| --- | --- | --- | --- |
| AC-1 | FR-NOTE-009: opening **New** lists the menu items in order **Project**, **Task**, **Note**, **To-do**, **Log** | `web/features/notes/components/new-item-button.ac.test.tsx` | T1 |
| AC-2 | **Project** → the "New project" dialog; **Log** → the "Log time" dialog with Date = today (the user's zone) and Project and Task empty | `web/features/notes/components/new-item-button.ac.test.tsx` | T1 |
| AC-3 | On `/app/project?id=p1`: **Task** → the "New task" dialog with that project selected; on `/app/tasks` (no `id`) → no project selected | `web/features/notes/components/new-item-button.ac.test.tsx` | T1 |
| AC-4 | FR-TLOG-011: clicking **Log time** opens the dialog for today; so does Enter on the focused button (native activation, D3) | `web/features/time/components/log-time-button.ac.test.tsx` | T1 |
| AC-5 | A pointer press on **Log time** moving 100 px right (`pointerDown` x 100 → `pointerMove` / `pointerUp` x 200, then `click`) → no dialog; the button has `aria-hidden="true"` and `tabIndex` −1; **Show Log time button** has `tabIndex` 0 | `web/features/time/components/log-time-button.ac.test.tsx` | T1 |
| AC-6 | While hidden: clicking **Show Log time button** shows the button again (no `aria-hidden="true"`); a press on the tab moving 100 px left also shows it; neither opens the dialog | `web/features/time/components/log-time-button.ac.test.tsx` | T1 |
| AC-7 | A press moving 30 px right (past the tap slop, short of the swipe distance) → the button stays shown and no dialog opens | `web/features/time/components/log-time-button.ac.test.tsx` | T1 |
| AC-8 | The header no longer renders `LogTimeButton`; the dashboard layout renders it once | `check` | T1 |
| AC-9 | Signed in locally, desktop and a phone width: the menu items create a project, task, note, to-do and log; the round button sits bottom right on every `/app/**` screen; a finger or mouse swipe hides it behind the **‹** tab and a tap or swipe back returns it; a reload shows it; light and dark themes | `manual` | T1 |

No typed stubs: every component and name already exists.

## Checks
```bash
# AC-8: Log time is out of the header and in the layout, once
! grep -q "LogTimeButton" "web/app/(dashboard-layout)/layout/vertical/header/index.tsx"
test "$(grep -c "<LogTimeButton />" "web/app/(dashboard-layout)/layout.tsx")" = 1
```

## Tasks
| # | Task | App | Size | Tier | Why this tier | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | New menu with Project, Task and Log; floating swipeable Log time button in the layout | web | S | haiku | Two scripted `git apply`s, a click handler written out in full, and two one-line layout edits | — |

## Open questions
None. OQ-241 and OQ-242 are resolved.

## Changelog
- 2026-10-25: Initial draft from prototype `fc49830` (OQ-241, OQ-242). Ready for review.
- 2026-10-25: Approved by the owner.
