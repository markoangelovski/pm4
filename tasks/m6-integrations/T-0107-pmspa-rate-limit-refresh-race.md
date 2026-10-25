---
id: T-0107
title: The PMSPA rate-limit refresh no longer misses a PMSPA call that settles between two renders (AC-14 flake)
milestone: M6
app: web
status: done
size: S
tier: sonnet
depends_on: []
feature_spec: —
files:
  - web/features/integrations/api.ts
  - web/proto/features/integrations/api.ts
  - web/features/integrations/budget.ac.test.tsx
specs: [specs/06-features/int-budget.md]
ac_files: []
---

# T-0107: The PMSPA rate-limit refresh no longer misses a PMSPA call that settles between two renders (AC-14 flake)

## Goal
After every PMSPA read or mutation settles, the connection is read again (FR-INT-015), whatever the render timing,
and `budget.ac.test.tsx` AC-14 stops failing about 1 run in 10.

## Background
AC-14 (line 363, `waitFor(() => expect(connectionReads()).toHaveLength(2))`) sometimes sees 1 read, alone or in
the full suite (T-0089, T-0100, T-0106 notes). `useRefreshPmspaRateLimit` (`api.ts:94`) derives `busy` from
`useIsFetching` + `useIsMutating` and invalidates when a **render** sees `busy` go from > 0 to 0. TanStack Query
delivers those counts to React through `notifyManager`, which schedules (not synchronous). Likely cause (not
proven): when the fetch starts and settles inside one scheduling window, React never renders `busy > 0`, so the
effect never fires. The test's `await act(async () => {})` only flushes microtasks, which makes that window
likely under load. In the real app a PMSPA call takes network time, so users hardly hit it.

## Change
Time box: confirm the cause quickly (e.g. log `busy` per render in a failing run); don't go deeper than that.

1. **Test (main session, before delegating; implementers never edit `*.ac.*`):** in AC-14, replace
   `await act(async () => {});` after `fetchQuery` with a wait that lets TanStack's scheduled notifications run
   (e.g. `await act(() => new Promise((resolve) => setTimeout(resolve, 0)));`). Keep every assertion. Then update
   `budget.ac.test.tsx`'s `sha256` in `tasks/m6-integrations/T-0085-…md` (it is that task's recorded hash).
2. **Hook (implementer):** in `useRefreshPmspaRateLimit`, stop depending on render timing: in a `useEffect`,
   subscribe to `queryClient.getQueryCache()` and `queryClient.getMutationCache()`; on each event compute
   `queryClient.isFetching({ queryKey: integrationKeys.remote() }) + queryClient.isMutating()`, and invalidate
   `integrationKeys.connection()` (`exact: true`) when it goes from > 0 to 0, as today. Unsubscribe on cleanup.
   Keep the exported name, signature and JSDoc meaning. Same change in the prototype twin
   (`web/proto/features/integrations/api.ts`), so `pm4 twins` stays equal.

## Acceptance criteria
- [ ] AC-14 keeps all its assertions; its only change is the wait after `fetchQuery`, and T-0085's hash matches
- [ ] `useRefreshPmspaRateLimit` reacts to cache events, not to rendered counts; the twin is identical
- [ ] `npx vitest run features/integrations/budget.ac.test.tsx` passes 20 runs in a row (report the count)
- [ ] `pm4 check T-0107` passes

---

## Implementation notes
Main session (test step): cause confirmed, TanStack Query 5.104's `notifyManager` schedules with `setTimeout(0)`. AC-14's wait
after `fetchQuery` is now `await act(() => new Promise((resolve) => setTimeout(resolve, 0)))` with a one-line comment; every
assertion kept. `budget.ac.test.tsx`'s sha256 updated in T-0085.

`useRefreshPmspaRateLimit` (real and proto twin) now subscribes to the query and mutation caches in a `useEffect` and recomputes `queryClient.isFetching({queryKey: remote}) + isMutating()` on every event; it invalidates `connection` (exact) on a > 0 to 0 edge. `useIsFetching`/`useIsMutating`/`useRef` imports dropped. Look at: `wasBusy` is updated *before* `invalidateQueries`, because the invalidation emits cache events synchronously and re-enters the listener (first version recursed to a stack overflow).

AC-14: 20/20 runs pass. `pm4 check T-0107`: PASS (scope, lint, format, typecheck, test, build, twins 116 equal).

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | sonnet | pass | Cache-subscription hook in both twins; fixed re-entrancy by setting `wasBusy` before invalidating |

## Review
Owner approved (quick lane), 2026-10-25.
