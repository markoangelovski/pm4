---
id: req-reporting
title: Dashboard and Reporting
status: approved
owner: Marko Angelovski
last_updated: 2026-10-09
related: [req-time-logs, req-bookings, api-endpoints, web-screens, OQ-029, OQ-126, OQ-127, OQ-128, OQ-129, OQ-130]
---

# Dashboard and Reporting

## Purpose
The dashboard (`/app`) shows how much there is (projects, tasks) and how a date range went: when the workdays started, the
hours worked against the daily target, how much of it is booked, and where the hours went per project (OQ-009).

## Scope
**In:** the dashboard with a date range, count tiles, the workday chart, the worked / target / booked summary, running
totals and the hours per project.
**Out:** exports; per-task reports; comparisons with previous periods; a chart with one line per selected project (dropped,
OQ-126); booked hours by booking date (that's the Bookings page, FR-BOOK-002).

## Shared rules
- A range is an **inclusive work-date range** (`from`, `to`, `YYYY-MM-DD`), at most 366 days apart. "Today" is in the user's
  time zone (FR-AUTH-006). The range is kept in the URL (`?from=&to=`); absent, invalid or too long → **this month**.
- **Worked**: the sum of the durations of the logs whose work date is in the range, the logs excluded from statistics
  included (they are logged time, FR-TLOG-018).
- **Booked**: the part of *Worked* whose logs have a booking date, whatever that date is: a booked log counts on the day it
  was worked (OQ-127). Only bookable logs can be booked (req-bookings §Model), so Unsorted and Non-prod hours are never booked.
- **Workday**: a date with a start time (FR-TLOG-009). **Target**: the range's workdays × the **current** daily target
  (FR-TLOG-017); the target has no history.
- Hours are shown as `7h 30m` (`0h` for none), start times as `HH:mm`.
- One range drives every widget except the Projects and Tasks counts, which are totals.

## Requirements

### FR-RPT-001: Date range
**Priority:** Must
**Statement:** A preset select offers **This month** (default: the 1st to the last day of the month, also the days still
ahead), **Last month**, **Last 7 days**, **Last 30 days**, **Last 90 days** (each ending today), **This year** (1 January to
today) and **Custom range**. It shows the preset the range matches, else *Custom range*. Next to it, a button with the range's
dates opens a two-month calendar; **Apply** applies the picked range (a start alone = one day). Apply is disabled until a start
is picked, and while the picked range is over 366 days, with the hint "Pick at most 366 days." (OQ-130). Under the heading,
the range is named: "October 2026" for a whole calendar month, else "1 Sep 2026 – 9 Oct 2026".
**Acceptance criteria:**
- Given I open `/app` on 9 October 2026 without parameters, then the range is 1–31 October 2026, the select shows *This month*
  and the heading shows "October 2026".
- Given I pick *Last 7 days*, then the URL is `?from=2026-10-03&to=2026-10-09`; picking *This month* again removes both parameters.
- Given `?from=2025-01-01&to=2026-10-09` (over 366 days), then the dashboard shows this month.

### FR-RPT-002: Count tiles
**Priority:** Must
**Statement:** Four tiles: **Projects** (projects not in the trash; footer: how many projects have hours in the range; links
to the project list), **Tasks** (tasks not deleted; footer: a bar split by status and the count per status; links to the task
list), **Workdays** (the range's workdays; footer: "Days with a start time, of N weekdays so far", N = the Monday–Friday dates
of the range up to today) and **Average start** (the mean of the range's start times, to the minute; footer: the earliest and
latest start; "—" and "No workdays in this range" when there are none).
**Acceptance criteria:**
- Given workdays starting 08:00, 08:30 and 09:15 in the range, then *Workdays* is 3 and *Average start* `08:35`, "Earliest 08:00 · latest 09:15".

### FR-RPT-003: Workday chart
**Priority:** Must
**Statement:** A chart of the range: above, the **start time** of each day as a line (no point on a day without a start), with
the average start as a dotted line; below, on the same date axis, the **hours worked** as a bar split into booked and not booked,
with the daily target as a dashed line. A range of up to 62 days has one bar per day; a longer one has one bar per Monday–Sunday
week (the days of it inside the range), whose start is the average of its workdays and whose target is its workdays × the daily
target. Per day, a Saturday or Sunday with no start and no logs is left out; one with work is shown (OQ-128). Hovering a bar
shows its date (or week), start, worked, booked, not booked and target. Clicking a day's bar (today or earlier) opens that date
in Logs. A **Table** tab lists the same days or weeks: date, start, worked, booked, target.
**Acceptance criteria:**
- Given the range 1–31 October 2026, then the chart has one bar per weekday and per weekend day with work.
- Given the range 1 January – 30 June 2026, then the chart has one bar per week, the first one for 1–4 January.
- Given a day with 6 h worked of which 4 h booked, then its bar shows 4 h booked and 2 h not booked.

### FR-RPT-004: Worked, target and booked
**Priority:** Must
**Statement:** The range's **Worked**, **Target** ("N days × 7h") and **Booked** side by side; one bar that shows worked, the
booked part inside it, and a mark at the target; how far worked is over or under the target ("On target" when they are equal, "No workdays in
this range yet." when the target is 0); **Worked of target** and **Booked of worked** as percentages (rounded down) with their hours, "Xh still to
book" or "Everything is booked".
**Acceptance criteria:**
- Given 10 workdays, a 7 h target, 72 h 30 m worked and 60 h booked, then Target is `70h`, "2h 30m over target", *Worked of
  target* 103 %, *Booked of worked* 82 % and "12h 30m still to book".

### FR-RPT-005: Running totals
**Priority:** Must
**Statement:** Three lines over the range: worked, target and booked, each added up day by day, ending at today. The legend
shows each total up to today.
**Acceptance criteria:**
- Given the range is this month, then the lines stop at today, and the legend's totals equal FR-RPT-004's.

### FR-RPT-006: Hours by project
**Priority:** Must
**Statement:** One row per project with hours in the range, most hours first, then **Unsorted** (no project) and **Non-prod**
(excluded from statistics) when they have hours. A row shows the project's icon and name (a link to the project; a deleted
project: plain text and "(deleted)"), its hours worked and booked, and a bar of its booked and not booked hours, scaled to the
biggest row. Unsorted and Non-prod show no booked hours. No hours in the range → "Nothing logged in this range."
**Acceptance criteria:**
- Given 4h 15m on Anthropic (2h booked), 4h on Nvidia (all booked), 45m unsorted and 1h 30m excluded, then the rows are Anthropic,
  Nvidia, Unsorted, Non-prod, and Anthropic shows `4h 15m` and `2h booked`.

## Acceptance criteria (cross-cutting)
- Given a log on 2026-09-30 at 23:30 Zagreb time, its work date is 2026-09-30, and it counts in September's range.
- Given a log worked on 30 September and booked to 1 October, then it counts as booked in September, not in October.

## Open questions
None.

## Changelog
- 2026-09-26: Initial scaffold.
- 2026-09-26: Updated with owner answers to OQ-001–018.
- 2026-09-26: OQ-025 resolved: ranges use the profile time zone (FR-AUTH-006).
- 2026-10-09: Rewritten from the owner's Dashboard screen: count tiles, workday chart, worked / target / booked, running
  totals, hours by project (OQ-126…OQ-130). The per-project line chart is dropped. Ready for review.
