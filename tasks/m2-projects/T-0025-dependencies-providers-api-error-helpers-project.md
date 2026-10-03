---
id: T-0025
title: Dependencies, providers, API error helpers, project and user-search hooks, lead helpers
milestone: M2
app: web
status: done
size: M
tier: opus
depends_on: [T-0024, T-0021]
feature_spec: specs/06-features/prj-web.md
spec_row: T1
ac_files:
  - { path: web/lib/api/problem.ac.test.ts, sha256: f9edc16d2deecfc3007b47b7be5cb2269c7f0271211d828d76349e86f5ccba47 }
  - { path: web/features/projects/stats.ac.test.ts, sha256: ce50d6981841307274368999b1f4db3be535fc28f8f341b972ee00df231b94cd }
  - { path: web/features/users/lead.ac.test.ts, sha256: 5a40e5aefa7b7e66955e328b907cf63b28370f12ffe187059bb3fd4aea64b831 }
  - { path: web/features/projects/api.ac.test.tsx, sha256: 6f69c8aac560a33f0c5c7d2cd7a433ebfdec0bdff133d3a31ffc376b810845e3 }
---

# T-0025: Dependencies, providers, API error helpers, project and user-search hooks, lead helpers

**Tier reason:** First `ApiError`/`unwrap`/`applyFieldErrors` and first domain mutations with invalidations; new deps

Work from the brief: `node scripts/pm4.mjs brief T-0025`. Verify with `node scripts/pm4.mjs check T-0025`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- Dependencies (`nuqs`, `sonner`), `features/tasks/status.ts` and `lib/use-debounced-value.ts` were already in the tree (prototype / test writer); nothing installed.
- `lib/api/problem.ts`: `ApiError`, `unwrap`/`unwrapVoid` (Problem Details detected by a string `type` and numeric `status` on openapi-fetch's `error`), `isApiError`, `applyFieldErrors` (sets one error per form field, the first API entry wins, e.g. `projectLeadUserId`/`projectLeadName` → `lead`).
- `features/projects/api.ts`: hooks per the Interfaces. `useProject` retry = `!isApiError(e, 404) && failureCount < 1` (keeps the app default of one retry otherwise). Mutation `onSuccess` returns the invalidation promises, so the mutation stays pending until they settle.
- `features/projects/stats.ts`, `features/users/lead.ts`, `useUserSearch` + `userKeys.search` in `features/users/api.ts`, `NuqsAdapter` inside `QueryProvider` in `app/layout.tsx`.

```
pm4 check T-0025
  ac hashes: ok (4)
  scope: ok
  pending ACs (later tasks, excluded): AC-7 … AC-18
  web lint: ok
  web format:check: ok
  web typecheck: ok
  web test: ok
  web build: ok
  web api:types: ok
  check AC-16, AC-18: skipped (later task)
PASS T-0025
```

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | opus | done | AC-1…AC-6 pass first try; pm4 check PASS |

## Review
**Verdict: approve** (Opus review of feat prj-web, 2026-10-04; `pm4 check --feature` PASS).
- Accepted as is: `onSuccess` waits for the invalidations; `applyFieldErrors` keeps the first error per field; `useProject` never retries a 404 (D6).
- Minor, optional (finding 5, shared with T-0027): `useDeleteProject` removes the detail query, then waits for the invalidations before the dialog's `onDeleted` disables the query, which leaves a small window to refetch the trashed project (D13). Fix: `void` the invalidations instead of returning them. Nothing triggers it today; AC-15 passes.
- Tier: opus was right (base pattern for later domains; passed first try).
