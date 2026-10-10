---
id: T-0041
title: Data hooks (features/time/api.ts) and useUpdateMe
milestone: M4
app: web
status: done
size: S
tier: haiku
depends_on: []
feature_spec: specs/06-features/tlog-web.md
spec_row: T1
ac_files:
  - { path: web/features/time/api.ac.test.tsx, sha256: 6ca4f1fe7b88bdee05c371049c8e0bf1a84704f4e7b5022c156d63f22e7c90d5 }
---

# T-0041: Data hooks (features/time/api.ts) and useUpdateMe

**Tier reason:** Copies `features/tasks/api.ts`; every key, URL and invalidation is stated

Work from the brief: `node scripts/pm4.mjs brief T-0041`. Verify with `node scripts/pm4.mjs check T-0041`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- `web/features/time/api.ts`: real hooks replace the stubs (`useDay`, `useWorkdays`, `useCreateLog`, `useUpdateLog`, `useDeleteLog`, `useSetDayStart`, `useNowMinute`). `timeKeys` and the type re-exports are unchanged. `useUpdateLog` sends the input as given. `useNowMinute` re-reads every 15 s and does not set state synchronously in the effect, since the lint rule `react-hooks/set-state-in-effect` rejects that.
- Review fix (`useNowMinute`): also schedules an immediate `setTimeout(..., 0)` re-read when enabled, cleared with the interval in the cleanup, so "Now" is current after enabling (for example switching to Today). Still no synchronous setState in the effect.
- `web/features/users/api.ts`: `useUpdateMe` PATCHes `/api/v1/me` and sets `userKeys.me()` from the response.
- AC-8 (`features/time/api.ac.test.tsx`): 1 passed.
- `node scripts/pm4.mjs check T-0041`: `web lint ok`, `format:check ok`, `typecheck ok`, `build ok`; `web test FAIL` only on pre-existing sidebar tests (`sidebaritems.ac.test.ts`, `sidebaritems.test.ts`, which expect no Bookings item). Out-of-scope files are pre-existing uncommitted changes.

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | done | Hooks written, AC-8 passes, lint/typecheck/build ok; test gate fails only on pre-existing sidebar tests |
| 2 | haiku | done | review fix: review fix for useNowMinute (immediate re-read on enable). `npx vitest run features/time`: 5 files, 21 tests passed; `npx eslint features/time/api.ts`: clean |

## Review
**Verdict: approve** (Opus review, 2026-10-10)
- Minor, non-blocking (D4): `useNowMinute` (`web/features/time/api.ts:140`) sets the minute only at mount and on the 15 s interval. When `DayHeader` stays mounted and the user switches from a cached past day to **Today**, "Now" and "Unlogged" can be up to 15 s stale. Possible fix: an immediate `setTimeout(() => setNow(nowMinute(tz)), 0)` next to the interval.
- Tier: haiku was right. A mechanical copy of the tasks hooks, done correctly.
- Fixes applied (2026-10-10): every finding above except the native checkbox (kept; owner can revisit). `pm4 check --feature`: ac hashes, lint, format, typecheck, build, api:types and AC-22 ok. The only test failures are the 3 `sidebaritems` tests, which fail on a Bookings link that isn't part of this feature.
