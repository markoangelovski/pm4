---
id: feat-tlog-timeline-groups
title: "Logs: Timeline grouped by project"
status: approved
owner: Marko Angelovski
last_updated: 2026-11-10
milestone: M4
requirements: [FR-TLOG-023, SCR-040]
related: [feat-tlog-timeline, feat-tlog-web, req-time-logs, web-screens]
prototype: ccad52f
---

# Logs: Timeline grouped by project

## Goal
The Logs page's Timeline view (SCR-040, FR-TLOG-023) groups the logs by project, like By Project. Each group can be
collapsed or expanded and shows the sum of its logs. A collapsed group draws all its logs on one bar at their places on
the day's axis. An open group shows a row and a bar per log, as before.

## Decisions
| # | Decision | Source |
| --- | --- | --- |
| D1 | A collapsed group's bar has every log of the group where it falls on the day's axis, each in its own colour (`logColors`, as the pie). Other projects' time shows as gaps. | Owner, 2026-11-10 |
| D2 | The groups are `groupLogs(day.logs, "project")`: the same groups and order as By Project. All are collapsed when the page opens. Timeline gets **Expand all** / **Collapse all**. | Owner, 2026-11-10 |
| D3 | No **+** on the groups: Timeline stays read-only (feat-tlog-timeline D2). Timeline keeps its own open groups, separate from By Project's. | Owner, 2026-11-10 |
| D4 | In a project's group, a row leaves out the project name (the heading has it). In Unsorted, Non-prod and a deleted project's group, the row still shows it. The rows' bars span the full card width, so they line up with the shared axis. Only the text is indented. | Owner, prototype `ccad52f` |
| D5 | This changes feat-tlog-timeline's AC-5 (Timeline now has **Expand all**) and AC-7 (row 1 no longer shows "Manhatan"; the Non-prod heading). AC-10's deleted row moves up. Its rows are visible only once the groups are open. The test step edits `log-timeline.ac.test.tsx` for that and nothing else (*Scope*). | Main session, 2026-11-10 |

## Scope
**In:** `features/time/day.ts` (`timelineGroups()`), `features/time/components/log-timeline.tsx` (the groups),
`features/time/components/day-view.tsx` (Timeline's open state, its **Expand all**, the new `LogTimeline` props), all
as twins of the prototype.

**Test step (main session, before T1):** writes the two new test files and the `timelineGroups` stub. It changes
`log-timeline.ac.test.tsx` only where the grouping breaks it:
- `timelineRows()` first clicks **Expand all**, then waits for the rows.
- AC-5 expects **Expand all** on Timeline instead of none.
- AC-7's row 1 shows "Specifications 01" and not "Manhatan", and the **Non-prod** badge is counted in the rows only
  (the Non-prod group heading has the same text).
- AC-10 finds the deleted log's row by its text ("Old fixes"), not as the 5th row (its group comes before Unsorted).

Then `pm4 hash`.

**Non-goals** (implementers must not touch these):
- `api/` (no contract change), `web/proto/**`, `web/app/proto/**`, `web/components/ui/*`.
- `log-row.tsx`, `day-charts.tsx`, `day-header.tsx`, `features/time/api.ts`, `features/time/types.ts`, `groupLogs`,
  `timeline`.
- Any acceptance test (`*.ac.*`).

## Read first
| Path | Why / copy this |
| --- | --- |
| `web/proto/features/time/day.ts` | `TimelineGroup`, `timelineGroups()` at the end (T1) |
| `web/proto/features/time/components/log-timeline.tsx` | The grouped view (T1) |
| `web/proto/features/time/components/day-view.tsx` | `open.timeline`, `grouped` / `keys` / `allOpen`, the `LogTimeline` props (T1) |

## Files
| App | File | C/M | Task | Notes |
| --- | --- | --- | --- | --- |
| web | `web/features/time/day-timeline-groups.ac.test.ts` | C | tests | `timelineGroups()` cases |
| web | `web/features/time/components/log-timeline-groups.ac.test.tsx` | C | tests | Through `DayView` |
| web | `web/features/time/components/log-timeline.ac.test.tsx` | M | tests | The changes under *Scope* only |
| web | `web/features/time/day.ts` | M | tests, T1 | tests: the stub; T1: the twin |
| web | `web/features/time/components/log-timeline.tsx` | M | T1 | The twin (command below) |
| web | `web/features/time/components/day-view.tsx` | M | T1 | The twin (command below) |

## Interfaces

### Web (T1)
From the repo root:
```bash
for f in day.ts components/day-view.tsx components/log-timeline.tsx; do
  sed 's#@/proto/#@/#g' web/proto/features/time/$f > web/features/time/$f
done
cd web && npx prettier --write features/time/day.ts features/time/components/day-view.tsx features/time/components/log-timeline.tsx
```
Make no other change. Everything the files import already exists in production (`ProjectIcon`, `Accordion`,
`useNowMinute`, `DeletedName`). The exports the tests use:
```ts
// web/features/time/day.ts
export interface TimelineGroup { group: LogGroup; rows: TimelineRow[] } // rows: the group's logs' rows from `t`, API order
export function timelineGroups(t: Timeline, groups: LogGroup[]): TimelineGroup[]; // one per group, same order

// web/features/time/components/log-timeline.tsx
export function LogTimeline(props: {
  day: Day; groups: LogGroup[]; colors: Record<string, string>; isToday: boolean; timeZone: string;
  open: string[]; onOpenChange: (open: string[]) => void; // keys of the open groups
}): JSX.Element;
```
A collapsed group's bar is the element with `data-testid="timeline-group-track"`. Its log bars are the `span`s without
`aria-hidden` (the now line has it).

Typed stub (test step), appended to `web/features/time/day.ts`: `TimelineGroup` and `timelineGroups` with the body
`throw new Error("not implemented (feat-tlog-timeline-groups)")`.

## Acceptance criteria
The owner's four logs (feat-tlog-web), start 08:00: l1 30 min and l2 1 h 45 min on Manhatan, l3 15 min with no project,
l4 1 h on Manhatan excluded from statistics.

| AC | Case → expected | Test | Task |
| --- | --- | --- | --- |
| AC-1 | `timelineGroups(timeline(480, owner logs, null), groupLogs(owner logs, "project"))` → keys `p1`, `unsorted`, `nonprod`. `p1` has rows l1 480–510 and l2 510–615. `unsorted` has l3 615–630. `nonprod` has l4 630–690. | `web/features/time/day-timeline-groups.ac.test.ts` | T1 |
| AC-2 | Logs A 60, B 30, A 15 (projects pA, pB), start 480 → `pA` rows 480–540 and 570–585, `pB` 540–570. No logs → `[]`. | `web/features/time/day-timeline-groups.ac.test.ts` | T1 |
| AC-3 | Today, Timeline → the group headings in order: Manhatan "2 logs" "2h 15m", Unsorted "1 log" "15m", Non-prod "1 log" "1h". All are collapsed (`aria-expanded` false). There are no log rows (`listitem`). There are 3 collapsed bars, with 2, 1 and 1 log bars. **Expand all** is shown. The ticks and "Now 09:17" are still shown. | `web/features/time/components/log-timeline-groups.ac.test.tsx` | T1 |
| AC-4 | Clicking Manhatan's heading → its two rows (08:00–08:30 30m, 08:30–10:15 1h 45m). Row 1 has "Specifications 01" and no "Manhatan". 2 collapsed bars are left, and Unsorted is still collapsed. Clicking it again → no rows, 3 collapsed bars. | `web/features/time/components/log-timeline-groups.ac.test.tsx` | T1 |
| AC-5 | **Expand all** on Timeline → 4 rows, the button reads **Collapse all**, no collapsed bars. Then **By Project** → its groups are collapsed and the button reads **Expand all**. Back to **Timeline** → still 4 rows. | `web/features/time/components/log-timeline-groups.ac.test.tsx` | T1 |
| AC-6 | A log of a deleted project "Old site" → its group heading shows "Old site" with the deleted marker, after Manhatan and before Unsorted. Its row (opened) shows "Old site" too. | `web/features/time/components/log-timeline-groups.ac.test.tsx` | T1 |
| AC-7 | feat-tlog-timeline's AC-5…AC-10 pass with the *Scope* changes | `web/features/time/components/log-timeline.ac.test.tsx` | T1 |
| AC-8 | The three files equal their prototype twins | check | T1 |

## Checks
```bash
# AC-8: twins equal
node scripts/pm4.mjs twins
```

## Tasks
| # | Task | App | Size | Tier | Why this tier | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | Timeline grouped by project on the Logs page: the three prototype twins | web | S | haiku | Twin copy, the commands under *Interfaces → Web* | — |

## Open questions
None.

## Changelog
- 2026-11-10: Initial draft from prototype `ccad52f` (owner's answers 2026-11-10: D1–D3). To `review`.
- 2026-11-10: Approved by the owner.
- 2026-11-10: Test step: the old AC-7's Non-prod count and AC-10's row lookup also change (the grouping moves them); *Scope* lists them.
- 2026-11-12: D3 superseded by feat-tlog-views-actions: Timeline groups get the **+** (owner, prototype `a28a67f`).
