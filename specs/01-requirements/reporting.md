---
id: req-reporting
title: Dashboard and Reporting
status: draft
owner: Marko Angelovski
last_updated: 2026-09-26
related: [req-time-logs, api-endpoints]
---

# Dashboard and Reporting

## Purpose
Summary views that show where time went (OQ-009).

## Scope
**In:** a dashboard with a date-range selector, the total hours for the range, a per-project
breakdown, and a line chart of hours per day with an optional per-project series.
**Out (MVP):** exports, per-task reports, weekly or monthly aggregation (TODO: confirm), comparisons with previous periods.

## Shared rules
- All ranges are **inclusive work-date ranges** (`from`, `to` as `YYYY-MM-DD`), computed in the
  user's time zone (FR-AUTH-006).
- The default range is the **current month**: from the 1st to the last day of the month, in the user's zone.
- Hours are the sum of log durations. They're displayed as hours with up to 2 decimals.
- The range and the selected projects are kept in the URL (bookmarkable, and they survive a reload).
- Handling of logs with no project and of deleted projects: TBD (OQ-029a/b).

## Requirements

### FR-RPT-001: Date range selection
**Priority:** Must
**Statement:** The user picks a range with a date-range picker. Presets: this month (default), last
month, this week, last week, last 30 days (TODO: confirm the presets). One range drives every
dashboard widget (OQ-029c).

### FR-RPT-002: Total hours for the range
**Priority:** Must
**Statement:** Shows the total logged hours in the selected range.

### FR-RPT-003: Per-project breakdown
**Priority:** Must
**Statement:** Lists every project that has logs in the range, with its hours and share of the total
(%), sorted by hours descending. The breakdown's totals add up to FR-RPT-002.

### FR-RPT-004: Hours-per-day line chart
**Priority:** Must
**Statement:** A line chart with one point per calendar day in the range (days with no logs show 0),
where x = date and y = hours.

### FR-RPT-005: Per-project series
**Priority:** Must
**Statement:** The user can select **individual projects** (a multi-select, listing projects that
have logs in the range). The chart then shows one line per selected project, with a legend. Clearing
the selection returns to the single total line. A "Total" line alongside: TBD (OQ-029d).

## Acceptance criteria (cross-cutting)
- Given logs on 2026-09-30 at 23:30 Zagreb time, the work date is 2026-09-30, and they count in September's range.
- Given the range 2026-09-01..2026-09-30, the chart has exactly 30 points.

## Open questions
OQ-029

## Changelog
- 2026-09-26: Initial scaffold.
- 2026-09-26: Updated with owner answers to OQ-001–018.
- 2026-09-26: OQ-025 resolved: ranges use the profile time zone (FR-AUTH-006).
