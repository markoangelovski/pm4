---
id: T-0043
title: Day view: header, day picker with calendar, charts, rows, grouped views, delete
milestone: M4
app: web
status: done
size: L
tier: sonnet
depends_on: [T-0041, T-0042]
feature_spec: specs/06-features/tlog-web.md
spec_row: T3
ac_files:
  - { path: web/features/time/components/day-view.ac.test.tsx, sha256: dc90f6114b9c9d885cb2844865f34f5856dca1f59d0b1fbdcf7670c334a97fda }
---

# T-0043: Day view: header, day picker with calendar, charts, rows, grouped views, delete

**Tier reason:** Several interacting pieces (URL state, accordion state per view, calendar marks, charts)

Work from the brief: `node scripts/pm4.mjs brief T-0043`. Verify with `node scripts/pm4.mjs check T-0043`.

## Implementation notes
- `DayView` uses `useMe` and `useDay`, and shows an error state with Retry and skeletons while pending. Rows get `show={rowFields(l, by, g.key)}`.
- `DayHeader` uses `useNowMinute` and `useSetDayStart`. Its figures come from `dayFigures`, and it toasts "Couldn't save the start time." when saving fails.
- `DayPicker` takes a `timeZone` prop and reads `useWorkdays(...).data?.items`.
- `LogRow` takes one `show` prop instead of `showProject` / `showTask` / `showTitle`.
- `DeleteLogDialog` uses `useDeleteLog`.
- `day-charts.tsx` and `app/time/page.tsx` needed no change.
- Acceptance test fix (orchestrator): AC-18 left `2026-10-07` empty after the empty-state case, so after Retry the day still showed `0m`. The fix resets `ownerLogs` before the error case, and the hashes were re-recorded (`pm4 hash`).
- Review fix: `day-view.tsx` `isRealDate` also requires `format(parseISO(d), "yyyy-MM-dd") === d` (after `isValid`), so impossible dates fall back to today. vitest day-view 6/6 and eslint pass.
- `pm4 check T-0043`: ac hashes ok, lint/format/typecheck/build/api:types ok, day-view.ac 6/6. Two things still fail, and neither comes from this task. Scope lists the other uncommitted features' files, and the `sidebaritems` tests fail on the uncommitted Bookings link (feat-book-web).

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | sonnet | BLOCKED: test | Implementation complete; AC-18 test state bug, fixed by the orchestrator, then 6/6 pass |
| 2 | haiku | done | review fix (`isRealDate` rejects impossible dates like 2026-02-31) |

## Review
**Verdict: approve** (Opus review, 2026-10-10)
- Minor, non-blocking (D5): `day-view.tsx:57-60` accepts a well-formed but impossible `?date=` (e.g. `2026-02-31`). That date reaches the API and the page shows the error state instead of falling back to today. Fix: also require `format(parseISO(d), "yyyy-MM-dd") === d`.
- Also inherits the stale "Now" note from T-0041.
- Tier: sonnet was right. Many interacting pieces, done cleanly.
- Fixes applied (2026-10-10): every finding above except the native checkbox (kept; owner can revisit). `pm4 check --feature`: ac hashes, lint, format, typecheck, build, api:types and AC-22 ok. The only test failures are the 3 `sidebaritems` tests, which fail on a Bookings link that isn't part of this feature.
