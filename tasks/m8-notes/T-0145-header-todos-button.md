---
id: T-0145
title: Header To-dos button
milestone: M8
app: web
status: done
size: S
tier: haiku
depends_on: []
feature_spec: —
files: [web/features/notes/components/todos-button.tsx, web/app/(dashboard-layout)/layout/vertical/header/index.tsx, specs/04-web/screens.md]
specs: [specs/04-web/screens.md]
ac_files: []
---

# T-0145: Header To-dos button

## Goal
The owner's request (2026-11-06): a To-dos button in the header between the **New** menu and the notifications
bell, styled like the bell, with the To-dos icon, linking to `/app/notes?tab=todos`. The prototype change is
`a0598b8`; this task copies it to the app.

## Change
- `web/features/notes/components/todos-button.tsx`: the twin of `web/proto/features/notes/components/todos-button.tsx`
  (`routes` from `@/lib/routes`).
- `web/app/(dashboard-layout)/layout/vertical/header/index.tsx`: `<TodosButton />` between `<NewItemButton />` and
  `<NotificationsButton />`, as in `web/proto/mock/shell/header.tsx`.
- `specs/04-web/screens.md`: a **To-dos button** paragraph after the New menu; SCR-008's bell now sits after it.

## Acceptance criteria
- [x] `pm4 twins`: the new file equals its prototype twin.
- [x] The header shows the button between New and the bell; it opens `/app/notes?tab=todos`.

---

## Implementation notes
Main session. Copied the prototype's change (`a0598b8`) to the app and updated SCR-008 / the header notes in
`screens.md`.

`pm4 check T-0145`: PASS (scope ok; lint, format, typecheck, test, build ok; twins 129 equal).

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | main session (Opus) | PASS | Twin copy, header, spec |

## Review
Owner reviewed and approved (quick lane), 2026-11-06.
