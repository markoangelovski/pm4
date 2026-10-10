---
id: T-0042
title: Log dialog, date field, project and task pickers, header **Log time** button
milestone: M4
app: web
status: done
size: M
tier: sonnet
depends_on: [T-0041]
feature_spec: specs/06-features/tlog-web.md
spec_row: T2
ac_files:
  - { path: web/features/time/components/log-form-dialog.ac.test.tsx, sha256: 9db09ae5f416dec40702b4a71a592e48342246a837230133fefd1f45638ee8a1 }
---

# T-0042: Log dialog, date field, project and task pickers, header **Log time** button

**Tier reason:** Cascading pickers, a date-dependent required field, partial PATCH and field-error mapping

Work from the brief: `node scripts/pm4.mjs brief T-0042`. Verify with `node scripts/pm4.mjs check T-0042`.

## Implementation notes
Log dialog repointed to real hooks (useMe, useDay, useCreateLog/useUpdateLog, useProjects, useTasks). Exclude-from-statistics is a native checkbox: the base-ui Checkbox throws in jsdom (PointerEvent missing). Task picker filters client-side (filter={null}) by the typed text and projectId on top of the server `q`. Submit while the day is loading awaits `day.refetch({cancelRefetch:false})`.
pm4 check: lint ok, format ok, typecheck ok, build ok, api:types ok; scope FAIL and test FAIL only from other tasks' files (day-view AC-15..20, sidebaritems); log-form-dialog.ac 7/7 pass.
Review fixes: task picker loads tasks once per projectId without `q` and filters in the browser on the project and task label; a failed day load on submit shows an error toast.

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | sonnet | done | AC-9..14 pass |
| 2 | sonnet | done | review fixes |

## Review
**Verdict: changes-requested** (Opus review, 2026-10-10)
- Blocker (SCR-041, D7, AC-11): `task-picker.tsx:33` sends `q` to `useTasks` on every keystroke. The API matches `q` against task titles only (`api/src/tasks/tasks.repository.ts:110`), so searching by project name returns nothing against the real API. AC-11 passes only because its GET mock ignores `q`. Fix: load once per `projectId` without `q`, keep the in-browser filter on `label(t)`, and drop the refetch that `setQ` drives.
- Minor: `log-form-dialog.tsx:133-134`. When `useDay(date)` fails, submit returns silently. Show `toast.error("Couldn't save the log.")` in that branch.
- Minor: `log-form-dialog.tsx:321` uses a native checkbox instead of the shadcn `Checkbox` because base-ui needs `PointerEvent` in jsdom. The owner decides whether to accept it, or to polyfill `PointerEvent` in `vitest.setup.ts` and switch.
- Tier: sonnet was right. A weak test mock hid the D7 nuance; the tier wasn't too low.
- Fixes applied (2026-10-10): every finding above except the native checkbox (kept; owner can revisit). `pm4 check --feature`: ac hashes, lint, format, typecheck, build, api:types and AC-22 ok. The only test failures are the 3 `sidebaritems` tests, which fail on a Bookings link that isn't part of this feature.
