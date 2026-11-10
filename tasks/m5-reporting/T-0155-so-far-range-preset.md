---
id: T-0155
title: So far range preset, first and default in Statistics
milestone: M5
app: web
status: review
size: S
tier: haiku
depends_on: []
feature_spec: —
files: [web/features/dashboard/range.ts, web/features/dashboard/components/range-picker.tsx, web/features/dashboard/components/dashboard-view.tsx, web/features/dashboard/stats.ac.test.ts, web/features/dashboard/components/dashboard-view.ac.test.tsx, specs/01-requirements/reporting.md, specs/01-requirements/bookings.md, specs/01-requirements/notes.md, specs/04-web/screens.md, specs/06-features/rpt-web.md, specs/06-features/book-web-nav.md, tasks/m5-reporting/T-0155-so-far-range-preset.md, tasks/BOARD.md]
specs: [specs/01-requirements/reporting.md, specs/04-web/screens.md, specs/06-features/rpt-web.md]
ac_files: []
---

# T-0155: So far range preset, first and default in Statistics

## Goal
The owner's request (2026-11-10): the Dashboard > Statistics range select gets a **So far** option, the 1st of the current
month to today (today included), placed first and selected by default. The prototype change is `db46306`. This task copies it to the app.

Owner's answers (2026-11-10): weekdays without work and weekends inside the range are treated as in any other range (weekdays
shown and counted in the target, weekends only when worked); today is included; Statistics only (Notes and Bookings keep their
presets); absent, invalid or too-long URL ranges fall back to So far.

## Change
- `web/features/dashboard/range.ts`, `components/range-picker.tsx`: equal to their prototype twins (`STATS_PRESETS`,
  `StatsPreset`, `presetRange("so-far")`, `matchPreset(…, presets)`, `parseRange(…, fallback)`, the picker's `presets` prop).
- `components/dashboard-view.tsx`: the twin's change (`parseRange(…, "so-far")`, `presetRange("so-far")` clears the URL,
  `presets={STATS_PRESETS}`); only the `useMe` import differs from the twin.
- Acceptance tests (main session, owner-requested spec change): stats AC-1 checks `STATS_PRESETS` and so-far; view AC-7 / AC-8
  check So far as the default and the option list; AC-9 on open `?from=2026-10-01&to=2026-10-31` so they keep testing a whole month.
- Specs: FR-RPT-001 and the shared rules, SCR-010, feat-rpt-web D11 / `range.ts` contract / AC-1, AC-7, AC-8; Notes and Bookings
  specs say their presets leave out So far.

## Acceptance criteria
- [x] `pm4 twins`: the three files equal their prototype twins (dashboard-view apart from the `useMe` import).
- [x] The updated acceptance tests pass; the other tests still pass (Notes and Bookings unchanged).

---

## Implementation notes
Main session. Copied the prototype's change (`db46306`) to the app; updated the acceptance tests and the specs as the owner asked.

`pm4 check T-0155`: PASS (scope ok; lint, format, typecheck, test, build ok; twins 140 equal).

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |

## Review
_The owner's review (quick lane)._
