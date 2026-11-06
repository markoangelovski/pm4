---
id: T-0144
title: Today range preset in Statistics and Bookings
milestone: M5
app: web
status: done
size: S
tier: haiku
depends_on: []
feature_spec: —
files: [web/features/dashboard/range.ts, web/features/dashboard/stats.ac.test.ts, web/features/bookings/days.ac.test.ts, web/features/bookings/components/bookings-view.ac.test.tsx, specs/01-requirements/reporting.md, specs/01-requirements/bookings.md, specs/04-web/screens.md, specs/06-features/rpt-web.md, specs/06-features/book-web-nav.md]
specs: [specs/01-requirements/reporting.md, specs/01-requirements/bookings.md, specs/04-web/screens.md, specs/06-features/rpt-web.md, specs/06-features/book-web-nav.md]
ac_files: []
---

# T-0144: Today range preset in Statistics and Bookings

## Goal
The owner's request (2026-11-06): the Dashboard > Statistics range select gets a **Today** option (today..today), between
**Last month** and **Last 7 days**. The Bookings range select shares the presets and gets it too (owner: "Both"). The
prototype change is `4cb07ca`; this task copies it to the app.

## Change
- `web/features/dashboard/range.ts`: the twin of `web/proto/features/dashboard/range.ts` (`"today"` in `RANGE_PRESETS`
  and `PRESET_LABELS`, `presetRange("today")` = today..today). Bookings picks it up through `bookingPresetRange`.
- Acceptance tests (main session, owner-requested spec change): the option lists in stats AC-1 and bookings-view AC-4
  include "Today"; stats AC-1 and days AC-1 check its range.
- Specs: FR-RPT-001, SCR-010, SCR-045, feat-rpt-web AC-1 / `range.ts` contract, feat-book-web-nav AC-1 / AC-4.

## Acceptance criteria
- [x] `pm4 twins`: the file equals its prototype twin.
- [x] The updated acceptance tests pass; the other tests still pass.

---

## Implementation notes
Main session. Copied the prototype's change (`4cb07ca`) to the twin; updated the acceptance tests and the specs as the owner asked.

`pm4 check T-0144`: PASS (scope ok; lint, format, typecheck, test, build ok; twins 128 equal).

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | main session (Opus) | PASS | Twin copy, AC tests and specs |

## Review
Owner reviewed and approved (quick lane), 2026-11-06.
