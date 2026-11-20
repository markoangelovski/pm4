---
id: feat-shell-form-drafts
title: Unsaved drafts in form dialogs
status: approved
owner: Marko Angelovski
last_updated: 2026-11-20
milestone: M0
requirements: [SCR-022, SCR-032, SCR-041, SCR-071, SCR-072]
related: [web-conventions, web-screens, web-prototype, ADR-0012, OQ-284, OQ-285, feat-tlog-logged-range]
prototype: b2d6976
---

# Unsaved drafts in form dialogs

## Goal
Closing a form dialog by accident (click outside, Escape, the X) no longer loses what was typed: the same dialog opens again with
the draft and "Unsaved draft restored · Discard" ([conventions.md#forms](../04-web/conventions.md#forms), OQ-284). Applies to the
log, project, task, note and to-do dialogs.

## Decisions
| # | Decision | Source |
| --- | --- | --- |
| D1 | Drafts live in module memory: lost on reload, sign-out and session end. One draft per form and item (`draftKey("log")` new, `draftKey("log", id)` editing). Click outside, Escape and X keep it; **Cancel** and a successful submit drop it; values equal to the starting ones leave none. Deleting an item drops its edit drafts. | OQ-284 (owner, prototype `b2d6976`) |
| D2 | A session that ends without a sign-out (rejected refresh, another tab) drops every draft too, where `AuthGuard` already clears the cache and the last log link. | OQ-285 (owner, 2026-11-20) |
| D3 | `features/time/api.ts` (deleting a log drops its drafts) is copied from its twin by feat-tlog-logged-range T2, which changes the same file; this feature doesn't touch it. | Agent (one branch for both, owner 2026-11-20) |

## Scope
**In:** the promoted `form-drafts.ts` and `DraftNotice`; the five dialogs and the projects, tasks and notes `api.ts` replaced by their
twins; `clearFormDrafts()` in `useSignOut` and in `AuthGuard`'s session-ended handler.

**Non-goals** (implementers must not touch these):
- `web/features/time/api.ts` and its twin (D3), `web/proto/**` (every prototype file stays as it is).
- The inline note and to-do forms (`note-inline-form.tsx`, `todo-inline-form.tsx`), the day prompt dialog, every other form.
- `web/lib/**`, `web/components/ui/**`, any acceptance test (`*.ac.*`).

## Read first
| Path | Why / copy this |
| --- | --- |
| `web/proto/features/system/form-drafts.ts` | `useDraftForm`, `draftKey`, `forgetDraftsOf`, `clearFormDrafts` (promoted unchanged) |
| `web/proto/features/auth/use-sign-out.ts` | Where the prototype calls `clearFormDrafts()` (its production twin differs by design) |
| `specs/04-web/prototype.md#twin-check` | What "equals its twin" means |

## Files
| App | File | C/M | Task | Notes |
| --- | --- | --- | --- | --- |
| web | `web/features/system/form-drafts.ac.test.tsx` | C | tests | AC-1…AC-6 |
| web | `web/features/projects/components/project-form-dialog.ac.test.tsx` | M | tests | AC-7, AC-8 |
| web | `web/features/auth/use-sign-out.ac.test.tsx`, `web/features/auth/components/auth-guard.ac.test.tsx` | M | tests | AC-9 |
| web | `proto/features/system/form-drafts.ts` → `features/system/form-drafts.ts` | P | T1 | No `@/proto/` imports |
| web | `proto/features/system/components/draft-notice.tsx` → `features/system/components/draft-notice.tsx` | P | T1 | No `@/proto/` imports |
| web | `web/features/time/components/log-form-dialog.tsx`, `web/features/projects/components/project-form-dialog.tsx`, `web/features/tasks/components/task-form-dialog.tsx`, `web/features/notes/components/note-form-dialog.tsx`, `web/features/notes/components/todo-form-dialog.tsx` | M | T1 | Replaced by their twins |
| web | `web/features/projects/api.ts`, `web/features/tasks/api.ts`, `web/features/notes/api.ts` | M | T1 | Replaced by their twins |
| web | `web/features/auth/use-sign-out.ts`, `web/features/auth/components/auth-guard.tsx` | M | T1 | `clearFormDrafts()` |

## Interfaces

### Web (T1)
`pm4 promote` copies the two new files. Then, from `web/`, the existing files become their twins:
```bash
for f in features/time/components/log-form-dialog.tsx features/projects/components/project-form-dialog.tsx \
         features/tasks/components/task-form-dialog.tsx features/notes/components/note-form-dialog.tsx \
         features/notes/components/todo-form-dialog.tsx features/projects/api.ts features/tasks/api.ts features/notes/api.ts; do
  sed 's#@/proto/mock/client#@/lib/api/client#; s#@/proto/#@/#g' "proto/$f" > "$f"
done
npx prettier --write features/time/components features/projects features/tasks features/notes
```
Not `features/time/api.ts` (D3). Until feat-tlog-logged-range T2, `node ../scripts/pm4.mjs twins` warns on that one pair (unchanged
production file); every other pair is equal.

By hand, in both places importing `import { clearFormDrafts } from "@/features/system/form-drafts";`:
- `web/features/auth/use-sign-out.ts`: `clearFormDrafts();` right after `setLastLogLink(NO_LOG_LINK);`, and the doc comment gains
  "the unsaved form drafts" next to the query cache.
- `web/features/auth/components/auth-guard.tsx`: in the `onSessionEnded` listener, `clearFormDrafts();` right after `setLastLogLink(NO_LOG_LINK);`.

## Acceptance criteria
AC-1…AC-6 drive `useDraftForm` with `renderHook` (a `{ title: string }` form, `defaultValues: { title: "" }`); each test starts with `clearFormDrafts()`.

| AC | Case → expected | Test | Task |
| --- | --- | --- | --- |
| AC-1 | Set `title` to "Draft", unmount, mount again with the same key → the value is "Draft", `draft.restored` true | `web/features/system/form-drafts.ac.test.tsx` | T1 |
| AC-2 | Set `title` to "Draft" then back to "" → a new mount starts empty, `restored` false | `web/features/system/form-drafts.ac.test.tsx` | T1 |
| AC-3 | After a restore, `draft.discard()` → the value is "", `restored` false, and a new mount starts empty | `web/features/system/form-drafts.ac.test.tsx` | T1 |
| AC-4 | `draft.clear()` after an edit → a new mount starts empty | `web/features/system/form-drafts.ac.test.tsx` | T1 |
| AC-5 | Drafts under `draftKey("task")`, `draftKey("task", "a")`, `draftKey("task", "b")` are separate; `forgetDraftsOf("a")` drops only the `a` one | `web/features/system/form-drafts.ac.test.tsx` | T1 |
| AC-6 | `useDeleteProject`, `useDeleteTask`, `useDeleteNote`, `useDeleteTodo` succeed → that item's edit draft is gone, others stay; `clearFormDrafts()` drops all | `web/features/system/form-drafts.ac.test.tsx` | T1 |
| AC-7 | New project dialog: type a title, press Escape, open it again → the title is back with "Unsaved draft restored"; **Discard** empties it and the notice goes | `web/features/projects/components/project-form-dialog.ac.test.tsx` | T1 |
| AC-8 | Type a title, **Cancel**, open again → empty, no notice; type a title, submit (201), open again → empty, no notice | `web/features/projects/components/project-form-dialog.ac.test.tsx` | T1 |
| AC-9 | `useSignOut()` and `AuthGuard`'s session-ended listener → a draft saved before is gone | `web/features/auth/use-sign-out.ac.test.tsx`, `web/features/auth/components/auth-guard.ac.test.tsx` | T1 |
| AC-10 | `npm run dev`: log, task, note and to-do dialogs (new and edit) keep a draft through Escape and reopen with it | manual | T1 |

## Tasks
| # | Task | App | Size | Tier | Why this tier | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | Promote `form-drafts.ts` and `DraftNotice`, replace the five dialogs and three `api.ts` with their twins, `clearFormDrafts()` in sign-out and session end | web | S | haiku | Copy commands spelled out; two one-line edits | — |

## Agents
| Step | Agent | Date |
| --- | --- | --- |
| Prototype | `claude-code/claude-opus-5-5` | 2026-11-20 |
| Spec | `claude-code/claude-opus-5-5` | 2026-11-20 |
| Tasks (`pm4 tasks`) | `claude-code/claude-opus-5-5` | 2026-11-20 |
| Acceptance tests | `claude-code/claude-opus-5-5` | 2026-11-20 |

## Open questions
None. OQ-284 and OQ-285 are resolved.

## Changelog
- 2026-11-20: Initial draft from prototype `b2d6976` (OQ-284, OQ-285). Ready for review.
- 2026-11-20: Approved by the owner.
