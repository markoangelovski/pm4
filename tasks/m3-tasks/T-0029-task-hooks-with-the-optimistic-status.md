---
id: T-0029
title: Task hooks with the optimistic status change, due state, formatWorkDate, status select and due badge
milestone: M3
app: web
status: done
size: M
tier: opus
depends_on: [T-0028, T-0027]
feature_spec: specs/06-features/tsk-web.md
spec_row: T1
ac_files:
  - { path: web/features/tasks/due.ac.test.ts, sha256: 5ab5d9ac167f96924511c6051878baed079e9564c99820ac4fc30cda5c6eaab0 }
  - { path: web/lib/time/format-work-date.ac.test.ts, sha256: ec290922de82e064799a1889a83d82c87826bd8c7fe2804b5076f5ef927f230b }
  - { path: web/features/tasks/api.ac.test.tsx, sha256: cfa8c639953372a1a563f615835d935eb3ba280ec95fbd7e5ac4e2627580b4b4 }
---

# T-0029: Task hooks with the optimistic status change, due state, formatWorkDate, status select and due badge

**Tier reason:** First optimistic update with rollback across several cached lists (D5)

Work from the brief: `node scripts/pm4.mjs brief T-0029`. Verify with `node scripts/pm4.mjs check T-0029`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- `web/features/tasks/api.ts`: the real hooks replace the stub (copying `features/projects/api.ts`).
  `useTasks` omits `status` when all three are selected and is disabled for `[]`. `projectId`/`q`
  are omitted when unset/empty. `useUpdateTaskStatus` works as D5: it cancels `taskKeys.all`,
  snapshots the lists and the detail, patches the task in place, rolls back and shows a toast on
  error. On success it sets the detail, patches the lists with the saved task, invalidates the lists
  with `refetchType: "none"`, and invalidates the project detail and the project lists.
  `useDeleteTask` doesn't await its invalidations (D12).
- `useUpdateTask(id)`: the old project id comes from the cached task in `onMutate` (its detail,
  else any cached list that holds it). That means both the old and the new project details get
  invalidated on a move. If the task isn't cached anywhere, only the new project is invalidated.
  The reviewer should check this.
- The returned bodies are cast to `Task`/`TaskList` (D14 narrowing of `Ref.id`).
- `task-status-select.tsx` now calls `useUpdateTaskStatus().mutate({ task, status })`.

pm4 check:
```
  ac hashes: ok (3)
  scope: ok
  pending ACs (later tasks, excluded): AC-6 … AC-17
  web lint: ok
  web format:check: ok
  web typecheck: ok
  web test: ok
  web build: ok
  web api:types: ok
  check AC-16: skipped (later task)
PASS T-0029
```

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | opus | done | Hooks + status select. AC-1…AC-5 pass, and `pm4 check` passes |

## Review
**Verdict: approve** (Opus reviewer, 2026-10-04). `pm4 check --feature`: PASS.
- Info: `useUpdateTask` reads the old project id from the cached detail or a cached list (`api.ts:132-159`). In every real flow the detail is cached, so both projects are invalidated. Acceptable.
- Minor, no change: `onMutate` cancels `taskKeys.all` as D5 specifies. If a new list key is still on its first fetch, that list can keep placeholder data until the next filter change, focus or remount. Watch for it during AC-17.
- Tier: opus was right.
