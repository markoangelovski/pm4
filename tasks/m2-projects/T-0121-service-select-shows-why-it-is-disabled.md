---
id: T-0121
title: The Service select shows why it is disabled
milestone: M2
app: web
status: done
size: S
tier: haiku
depends_on: []
feature_spec: —
files: [web/features/tasks/components/service-select.tsx, web/proto/features/tasks/components/service-select.tsx, web/features/tasks/components/service-select.test.tsx]
specs: [specs/06-features/prj-services.md]
ac_files: []
---

# T-0121: The Service select shows why it is disabled

## Goal
Fix the feat-prj-services review finding 3 (T-0119), and the cause found while fixing it: the Service select
(SCR-032) always reads **No service**. Base UI shows the label of the `null` item for a `null` value, so the
placeholders ("Choose a project first", "Loading…", "This project has no services") never showed, not even in
the prototype. Owner (2026-10-26): show the state texts.

## Change
In `service-select.tsx` and its twin under `web/proto/` (the twins stay equal after `sed 's#@/proto/#@/#g'`):
- `const disabled = services.length === 0;` and `items={disabled ? [] : items}`, so a disabled box shows the
  placeholder. The options list is unchanged.
- A new placeholder branch after `isPending`: `project.isError` → **Couldn't load the services**.

The box now says, when disabled: **Choose a project first** (no project), **Loading…**, **Couldn't load the
services** (the project request failed), **This project has no services**. When enabled: **No service** as before.

New ordinary test `web/features/tasks/components/service-select.test.tsx` covers the four texts and the disabled state.

## Acceptance criteria
- [x] The four cases in `service-select.test.tsx`.
- [x] The feat-prj-services and feat-tsk-web acceptance tests still pass.
- [ ] Owner: in the prototype task dialog, the Service box reads "Choose a project first" before a project is
  picked, and "This project has no services" for a project without services.

---

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- Done in the main session (a few lines; task-routing allows it).
- The test's failing request is a 500 problem response; with `mockRejectedValue`, Vitest reports the rejected
  error as the test's failure.
- `pm4 check T-0121`: web lint, format:check, typecheck, test, build ok; twins ok (120 equal). Scope lists only T-0120's `api/src/projects/projects.repository.ts`, which shares the branch `task/T-0120`.

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | main | PASS | Disabled box shows the placeholder; error branch; test |

## Review
_The owner's review (quick lane), or `review-feature`'s verdict._
