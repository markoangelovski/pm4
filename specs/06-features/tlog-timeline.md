---
id: feat-tlog-timeline
title: "Logs: Timeline view, the new default"
status: approved
owner: Marko Angelovski
last_updated: 2026-11-09
milestone: M4
requirements: [FR-TLOG-001, FR-TLOG-023, SCR-040]
related: [req-time-logs, web-screens, web-routing, feat-tlog-web, feat-land-redesign]
prototype: e850b50
---

# Logs: Timeline view, the new default

## Goal
On the Logs page (SCR-040), a **Timeline** view draws the day's logs as bars on a time axis from the day's start, as the
landing page's hero does (FR-TLOG-023). It comes first in the view switch and is the default (FR-TLOG-001).

## Decisions
| # | Decision | Source |
| --- | --- | --- |
| D1 | Tabs **Timeline**, **By Project**, **By Task**, **Sequential**; `view` absent = `timeline` (nuqs `clearOnDefault`), so **By Project** now writes `?view=project`. No **Expand all** on Timeline; the side charts stay By project. | Owner, prototype `bf576dc` |
| D2 | Rows are read-only (no ⋯ menu); bars use each log's own colour (`logColors`, as the dots and the pie), not per-project colours. | Owner, 2026-11-09 |
| D3 | Each log's range is derived (start + the logs before it), never stored; the requirement's *Clock times* rule now says so. A day without a start gets an elapsed axis: `0h` at 0, else `formatDuration` (`30m`, `2h 15m`). | Owner, prototype `bf576dc` |
| D4 | Two prototype fixes after `bf576dc`: the axis ends on a whole number of tick steps (so the last tick label is the axis end), and elapsed labels use D3's format instead of fractional hours (`0.5h`). | Main session, 2026-11-09; prototype `e850b50` |
| D5 | The production files are twins of the prototype's: copy, `@/proto/` → `@/`, then Prettier. Everything `log-timeline.tsx` imports already exists in production (`useNowMinute`, `DeletedName`, `Badge`, `formatClock`). | as feat-tlog-day-menu D5 |

## Scope
**In:** `features/time/day.ts` (`timeline()`), `features/time/components/day-view.tsx` (the tab and default),
`features/time/components/log-timeline.tsx` (new), all as twins of the prototype.

**Test step (main session, before T1):** writes the two new test files and the `timeline` stub, and changes
`day-view.ac.test.tsx` only where it relies on By Project being the default: every `renderView()` /
`renderView("?date=…")` whose test then reads By Project groups or their `+` gets `view=project` in its search string,
and AC-16's "By Project clears it" becomes "By Project sets `view` to `project`, Timeline clears it". Nothing else in
that file changes. Then `pm4 hash`.

**Non-goals** (implementers must not touch these):
- `api/` (no contract change), `web/proto/**`, `web/app/proto/**`, `web/components/ui/*`.
- `log-row.tsx`, `day-charts.tsx`, `day-header.tsx`, `features/time/api.ts`, `features/time/types.ts` (`DayView` stays
  `"project" | "task" | "sequential"`: it types `rowFields`, which the timeline doesn't use).
- The landing page and its `DayTimeline` (sample data, server component; not shared with the app).
- Any acceptance test (`*.ac.*`).

## Read first
| Path | Why / copy this |
| --- | --- |
| `web/proto/features/time/components/log-timeline.tsx` | The view; promoted as is (T1) |
| `web/proto/features/time/day.ts` | `timeline()`, `Timeline`, `TimelineRow` at the end (T1) |
| `web/proto/features/time/components/day-view.tsx` | `VIEWS` / `VIEW_LABELS`, the default, `grouped`, the Timeline `TabsContent` (T1) |

## Files
| App | File | C/M | Task | Notes |
| --- | --- | --- | --- | --- |
| web | `web/features/time/day-timeline.ac.test.ts` | C | tests | `timeline()` cases |
| web | `web/features/time/components/log-timeline.ac.test.tsx` | C | tests | Through `DayView` (no stub for the component) |
| web | `web/features/time/components/day-view.ac.test.tsx` | M | tests | `view=project` where By Project was the default only (*Scope*) |
| web | `web/features/time/day.ts` | M | tests, T1 | tests: the stub; T1: the twin |
| web | `web/proto/features/time/components/log-timeline.tsx` → `web/features/time/components/log-timeline.tsx` | P | T1 | No `@/proto/mock/` import; Prettier |
| web | `web/features/time/components/day-view.tsx` | M | T1 | The twin (command below) |

## Interfaces

### Web (T1)
From the repo root, after `pm4 promote` has copied `log-timeline.tsx`:
```bash
for f in day.ts components/day-view.tsx components/log-timeline.tsx; do
  sed 's#@/proto/#@/#g' web/proto/features/time/$f > web/features/time/$f
done
cd web && npx prettier --write features/time/day.ts features/time/components/day-view.tsx features/time/components/log-timeline.tsx
```
No other change. The exports the tests use:
```ts
// web/features/time/day.ts
export interface TimelineRow { log: TimeLog; from: number; to: number } // minutes after midnight (or after 0 without a start)
export interface Timeline {
  rows: TimelineRow[];   // API order; each `from` = the previous `to`, the first = startMinute ?? 0
  axisStart: number;     // floor(origin / 60) * 60
  axisEnd: number;       // axisStart + a whole number of `step`s covering the last `to` (and `now`)
  ticks: number[];       // axisStart, +step, … axisEnd; step = ceil(hours / 6) h, hours = max(1, ceil((last − axisStart) / 60))
  clock: boolean;        // startMinute !== null
}
export function timeline(startMinute: number | null, logs: TimeLog[], now: number | null): Timeline;
// `now` counts only when startMinute !== null; last = max(last `to`, now).

// web/features/time/components/log-timeline.tsx
export function LogTimeline(props: { day: Day; colors: Record<string, string>; isToday: boolean; timeZone: string }): JSX.Element;
```

Typed stub (test step), appended to `web/features/time/day.ts`: the two interfaces above and `timeline` with the body
`throw new Error("not implemented (feat-tlog-timeline)")`.

## Acceptance criteria
| AC | Case → expected | Test | Task |
| --- | --- | --- | --- |
| AC-1 | `timeline(480, [60, 15, 45 min], null)` → rows 480–540, 540–555, 555–600; axis 480–600; ticks 480, 540, 600; `clock` true | `web/features/time/day-timeline.ac.test.ts` | T1 |
| AC-2 | Same logs, `now` 860 → axis 480–960, ticks every 120 (480 … 960); `now` 500 (before the end) → axis 480–600 | `web/features/time/day-timeline.ac.test.ts` | T1 |
| AC-3 | `timeline(null, [60, 15, 45, 90 min], 860)` → rows from 0 (0–60 … 120–210), axis 0–240, ticks every 60, `clock` false (`now` ignored) | `web/features/time/day-timeline.ac.test.ts` | T1 |
| AC-4 | Start 510 (08:30), one 30 min log → axis 480–540, ticks 480, 540; start 1320, one 240 min log → rows 1320–1560, axis 1320–1560 (past midnight); no logs, start 480 → axis 480–540 | `web/features/time/day-timeline.ac.test.ts` | T1 |
| AC-5 | `DayView` without `view` → tabs exactly Timeline, By Project, By Task, Sequential; Timeline selected; no **Expand all**; `?view=project` selects By Project | `web/features/time/components/log-timeline.ac.test.tsx` | T1 |
| AC-6 | Clicking **By Project** → `view` = `project`; then **Timeline** → `view` removed | `web/features/time/components/log-timeline.ac.test.tsx` | T1 |
| AC-7 | Today 2026-10-07 09:17 Zagreb, start 08:00, the owner's four logs → rows in API order with ranges 08:00–08:30, 08:30–10:15, 10:15–10:30, 10:30–11:30 and durations 30m, 1h 45m, 15m, 1h; row 1 shows "Manhatan · Specifications 01", "Review" and "Specs review"; the excluded log's row has a **Non-prod** badge; ticks 08:00 … 12:00; "Now 09:17" is shown | `web/features/time/components/log-timeline.ac.test.tsx` | T1 |
| AC-8 | A past date → no "Now HH:mm" line under the axis | `web/features/time/components/log-timeline.ac.test.tsx` | T1 |
| AC-9 | A past date without a start, logs of 30 min and 1 h 45 min → ranges `0h–30m` and `30m–2h 15m`; ticks `0h`, `1h`, `2h`, `3h`; no "Now" under the axis | `web/features/time/components/log-timeline.ac.test.tsx` | T1 |
| AC-10 | A log of a deleted project and task → both names with the deleted marker (FR-TLOG-014); rows have no "Log actions" button | `web/features/time/components/log-timeline.ac.test.tsx` | T1 |
| AC-11 | The existing day-view tests pass with `view=project` where they read By Project (feat-tlog-web AC-13…AC-17 and the group `+` tests) | `web/features/time/components/day-view.ac.test.tsx` | T1 |
| AC-12 | The three files equal their prototype twins | check | T1 |

## Checks
```bash
# AC-12: twins equal
node scripts/pm4.mjs twins
```

## Tasks
| # | Task | App | Size | Tier | Why this tier | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | Timeline view on the Logs page: the three prototype twins | web | S | haiku | Twin copy, the commands under *Interfaces → Web* | — |

## Open questions
None.

## Changelog
- 2026-11-09: Initial draft from prototype `bf576dc`; D4's two prototype fixes in `e850b50`, the spec's `prototype:`. To `review`.
- 2026-11-09: Approved by the owner.
- 2026-11-10: feat-tlog-timeline-groups groups the Timeline by project; it changes AC-5 (Expand all) and AC-7 (row 1 without the project) here, and the rows need the groups open.
- 2026-11-12: D2 superseded by feat-tlog-views-actions: Timeline rows get the ⋯ menu and a **+** (owner, prototype `a28a67f`).
