---
id: T-0180
title: Deleting a project or task unlinks it from every form draft
milestone: M0
app: web
status: done
size: S
tier: haiku
written_by: claude-code/claude-opus-5-5
implementer: claude-code/claude-opus-5-5
depends_on: []
feature_spec: —
files: [web/features/system/form-drafts.ts, web/features/projects/api.ts, web/features/tasks/api.ts, web/features/system/form-drafts.test.tsx, specs/04-web/conventions.md]
specs: [specs/04-web/conventions.md#forms]
ac_files: []
---

# T-0180: Deleting a project or task unlinks it from every form draft

## Goal
Follow-up from T-0166's review (OQ-310): a saved form draft must not keep a link to a project or task deleted
since, which made its submit fail API validation. Prototype: PR #18 (`4e62337` on `master`).

## Change
Copy the prototype's change into the three production twins (they stay equal after `@/proto/` → `@/`; the twin
check in `pm4 check` enforces it):
- `web/features/system/form-drafts.ts`: add `forgetDraftLinksTo(id)` exactly as in
  `web/proto/features/system/form-drafts.ts` (between `forgetDraftsOf` and `clearFormDrafts`). For every draft, a
  `task` whose `id` or `project.id` is `id` becomes `null`; a `project` whose `id` is `id` becomes `null` and, when
  the draft has `serviceId`, that becomes `null` too. Other fields stay; an unchanged draft isn't rewritten.
- `web/features/projects/api.ts` (`useDeleteProject` `onSuccess`) and `web/features/tasks/api.ts`
  (`useDeleteTask` `onSuccess`): import `forgetDraftLinksTo` next to `forgetDraftsOf` and call it right after
  `forgetDraftsOf(id)` / `forgetDraftsOf(task.id)`.
- New ordinary test `web/features/system/form-drafts.test.tsx` (the setup of `form-drafts.ac.test.tsx`:
  `renderHook`, mocked `@/lib/api/client`), covering the acceptance criteria below.

## Acceptance criteria
- [x] Deleting a task clears `task` (keeps `project` and the other fields) in a draft that links it.
- [x] Deleting a project clears `project`, `task` (a task of that project) and `serviceId` in drafts that link it.
- [x] A draft linking another project or task is unchanged.
- [x] `form-drafts.ac.test.tsx` (feat-shell-form-drafts) still passes.

---

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- Done in the main session (a mechanical copy of the prototype, task-routing allows it). The three production
  files are the prototype twins with `@/proto/` → `@/`; their diff is the same as PR #18's.
- `specs/04-web/conventions.md#forms` gains the OQ-310 rule (main session, added to `files:`).
- New ordinary test `form-drafts.test.tsx`: 4 cases (task unlinked, project unlinked with its task and service,
  other drafts unchanged, the two delete hooks wired). The 6 acceptance tests of feat-shell-form-drafts still pass.
- Quick lane with 5 files instead of ≤ 3: 3 are the mechanical twin copy, plus the test and the spec line.
- `pm4 check T-0180`: scope ok; web lint, format:check, typecheck, test, build ok; twins ok (158 equal). Two twin
  warnings (`sign-in-page.tsx`, `settings-view.tsx`) predate this task: prototypes ahead of the app (feat-mcp-web).
- No route changed, so no `out/` deep-route check.

### Attempts
| # | Agent | Result | Summary |
| --- | --- | --- | --- |
| 1 | claude-code/claude-opus-5-5 | PASS | Twin copy of forgetDraftLinksTo + delete-hook calls; unit test; spec line |

## Review
_The owner's review (quick lane), or `review-feature`'s verdict._

- Owner (2026-11-21): diff reviewed and approved (quick lane), committed e610d23.
