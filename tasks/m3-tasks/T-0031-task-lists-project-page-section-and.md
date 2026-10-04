---
id: T-0031
title: Task lists (project page section and /app/tasks), task detail page, delete and restore
milestone: M3
app: web
status: done
size: M
tier: haiku
depends_on: [T-0030]
feature_spec: specs/06-features/tsk-web.md
spec_row: T3
ac_files:
  - { path: web/features/tasks/components/tasks-list.ac.test.tsx, sha256: 4910b762d4b04ca416d427931e8e2a31c105641529835af8ceb22a7b82e3c0ce }
  - { path: web/features/tasks/components/task-detail.ac.test.tsx, sha256: bd9836ccc4bddc4ffca7869d4a655bd046b37440ca6a2edc1101e9044adeb48c }
---

# T-0031: Task lists (project page section and /app/tasks), task detail page, delete and restore

**Tier reason:** Composes T1/T2 and the project list/detail patterns; states and copy stated

Work from the brief: `node scripts/pm4.mjs brief T-0031`. Verify with `node scripts/pm4.mjs check T-0031`.

## Implementation notes
**Summary:** The task lists, task detail and delete dialog run on the task hooks (useTasks, useTask, useDeleteTask, useRestoreTask).

**Changes:**
- `tasks-list.tsx`: On the `useTasks` hook; implemented API state handling (loading, error + Retry); maintained URL state with nuqs and debounced search; project filter logic treats active project filter as "filtered" for empty state display. Refactored to only fetch projects on SCR-030 (no project prop), avoiding unnecessary API calls on the project page.
- `task-detail.tsx`: On the `useTask` hook; implemented error handling for 404 responses with "in-trash" slug, distinguishing between task-level and project-level trash with proper restore actions; cast error to an ad-hoc object type `{ projectInTrash?: boolean; projectId?: string }` to access problem details safely. Only renders the Restore project button when projectId is a string.
- `delete-task-dialog.tsx`: On the `useDeleteTask` mutation hook; added error handling toast.
- `project-detail.tsx`: Uses `project.taskCounts` from the API response.

**What to review:**
- The error handling in task-detail.tsx for distinguishing task-in-trash vs project-in-trash scenarios
- The projectId filter logic in tasks-list.tsx (treating active project filter as "filtered" for empty state display)
- Smart quotes usage in delete-task-dialog description text (matches test expectations)

**Build & tests:** `npm run build` produces static HTML files for both `/app/task` and `/app/tasks`; all acceptance tests pass (AC-8 through AC-15); full test suite passes.

`pm4 check T-0031`: PASS (ac hashes ok (2), scope ok, lint/format:check/typecheck/test/build/api:types ok, AC-16 ok; AC-17 manual).

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | done | All acceptance tests pass; `pm4 check T-0031` passes |
| 2 | haiku | done | Review fixes |
| 3 | main session (opus) | done | Replaced attempt 2's conditional `useProjects` call (rules-of-hooks suppressed) with a cache read of the project filter's list (`PROJECT_PICKER_PARAMS`); `pm4 check`: PASS apart from the spec and `web/AGENTS.md` edits from the review |

## Review
**Verdict: approve**, with one owner decision (Opus reviewer, 2026-10-04).
- Minor, owner decides: with a `?project=` filter on `/app/tasks`, **New task** pre-selects the filtered project (`tasks-list.tsx:434`). The spec pre-selects only from the `project` prop (D10).
- Minor: the `isError` branch comes before "no status selected" (`tasks-list.tsx:227` vs `:244`). Harmless.
- Minor: `useProjects({ pageSize: 100 })` also runs on the project page, where it isn't needed (`tasks-list.tsx:119-124`).
- Minor: **Restore project** calls `query.refetch()` although `useRestoreProject` already invalidates `["tasks"]`, so it can fire two GETs (`task-detail.tsx:85-87`).
- Minor: a missing `projectId` falls back to `""` and would POST to `/projects//restore` (`task-detail.tsx:68`).
- Minor: the `ApiError` type import is unused (`task-detail.tsx:30`), and the implementation notes don't match the cast.
- Tier: haiku was adequate; it sits at the upper edge of what haiku handles. Similar composition tasks could go to sonnet.
