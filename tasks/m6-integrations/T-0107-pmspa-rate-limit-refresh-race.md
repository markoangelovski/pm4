---
id: T-0107
title: The PMSPA rate-limit refresh no longer misses a PMSPA call that settles between two renders (AC-14 flake)
milestone: M6
app: web
status: ready
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
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |

## Review
_The owner's review (quick lane), or `review-feature`'s verdict._
