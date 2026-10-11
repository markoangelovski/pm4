---
id: T-0050
title: Dashboard page: range picker in the URL, count tiles, workday chart and table, worked / target / booked, running totals, hours by project
milestone: M5
app: web
status: done
size: L
tier: sonnet
depends_on: [T-0049]
feature_spec: specs/06-features/rpt-web.md
spec_row: T2
ac_files:
  - { path: web/features/dashboard/components/dashboard-view.ac.test.tsx, sha256: c6bc31d543637e0313ca96af2b656316af8bcb559d6ca260fd6347f601701612 }
---

# T-0050: Dashboard page: range picker in the URL, count tiles, workday chart and table, worked / target / booked, running totals, hours by project

**Tier reason:** Two synced recharts panels with custom tooltips and click-through, a range picker with a draft and URL state, loading and error states across six components

Work from the brief: `node scripts/pm4.mjs brief T-0050`. Verify with `node scripts/pm4.mjs check T-0050`.

## Implementation notes
Implemented DashboardView, RangePicker, KpiTiles, WorkdayChart, HoursSummary, RunningTotals, ProjectHours and the /app page. Reviewer: chart click-through and shared hover (AC-13) are untested in jsdom.

`pm4 check T-0050` summary:

```
  ac hashes: ok (1)
  scope: ok
  web lint: ok (7s)
  web format:check: ok (1s)
  web typecheck: ok (2s)
  web test: ok (19s)
  web build: ok (6s)
  web api:types: ok (1s)
  manual (owner verifies): AC-13
PASS T-0050
```

Attempt 2 (review findings 1 and 4): the range picker footer shows "End date" until an end is picked (Apply still uses `to ?? from`); HoursSummary shows "On target" (`Target` icon) when worked equals target. All gates ok. `pm4 check` scope lists only the spec edits for "On target", made by the main session on the owner's decision (`specs/01-requirements/reporting.md` FR-RPT-004, `specs/04-web/screens.md` SCR-010); they're part of this feature's commit.

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | sonnet | PASS | All components written, AC-7..12 pass |
| 2 | sonnet | PASS | Review fixes: footer shows "End date" until an end is picked; "On target" when worked equals target |

## Review
**Verdict: approve** (Opus, feature review of `specs/06-features/rpt-web.md`; `pm4 check --feature`: PASS). Minor findings, none blocking:

1. `range-picker.tsx:52`: with only a start picked, the footer shows the start date instead of "End date" (SCR-010). Apply's `to ?? from` fallback is correct.
2. `dashboard-view.tsx:152-163`: the report is requested with a UTC "today" while `useMe` loads (same as `bookings-view.tsx`); can fetch the wrong default month once near a month boundary. Cards stay skeletons, so not a correctness bug.
3. `dashboard-view.tsx:168-176`: `keepPreviousData` (D4) + `dayStats(newRange, oldData)` briefly shows old numbers cut to the new range. Follows the spec; dimming on `isPlaceholderData` is the owner's call.
4. `formatDuration(0)` → `0m` in HoursSummary, RunningTotals and the daily-target legend (e.g. "0m over target"); spec only defines `0h` for WorkdayChart.
5. `dashboard-view.tsx:187,224`: a failed `/me` also shows the report error with Retry. Drift beyond the spec, harmless.
6. `project-hours.tsx:20-26`: deleted project rows have no icon; SCR-010 ambiguous, owner to confirm.

Tier feedback: sonnet was right (one attempt, only edge-case findings). AC-13 and the DoD manual checks remain for the owner.
