---
id: req-time-logs
title: Time Capture (Workdays and Time Logs)
status: draft
owner: Marko Angelovski
last_updated: 2026-09-26
related: [req-tasks, req-reporting, req-trash, api-endpoints, api-data-model]
---

# Time Capture: Workdays and Time Logs

## Purpose
Covers recording time spent. This is PM4's core feature.

## How the user works (OQ-019, owner's description)
During a day the user switches between several projects, **non-sequentially** and often in short
intervals. For example:

| # | Project | Duration |
| --- | --- | --- |
| 1 | Project 1 | 1 h |
| 2 | Project 2 | 15 min |
| 3 | Project 3 | 2 h |
| 4 | Project 1 | 15 min |
| 5 | Project 3 | 2 h |
| 6… | Project 1 / Project 2, alternating | 15 min each |

The user must be able to log **each** of these blocks, describe what was done, and link it to a
**task or a project**. The day is then viewed either **sequentially** (the blocks in order) or
**grouped by project** (each project once, with its logs listed under it).

## Model
Derived from the owner's description. This **replaces** the legacy three-level Day → Event → Log
model: each block is one self-contained log, and the link lives on the log.

| Entity | Fields | Rules |
| --- | --- | --- |
| **Workday** | workDate, startMinute (0–1439, nullable) | At most one per user per date. Holds the day start time (OQ-021). |
| **Time log** | workDate, position, durationMinutes, note, link (task \| project \| none?) | **Note required**, plain text, 1–1000 chars. Duration > 0, max per OQ-035. `position` = order within the day. Is a link required? TBD (OQ-020). |

**Derived clock times (proposed, OQ-036):** if the workday has a start time, each log's start and end
times are computed rather than stored: log *n* starts at `start + sum(durations of logs 1…n-1)`.
Example: with a start of 08:00, the table above becomes 08:00–09:00, 09:00–09:15, 09:15–11:15, and so on.
The day's end time (legacy header) is then the last log's end.

## Legacy behavior (reference only)
Legacy grouped logs under **events** (a title plus an optional task, with several logs of decimal-hour
duration), and kept a per-day start time with a "now · start · end" header (`backend_old/src/events`,
`days`, `frontend_old/src/components/pm/events`, `pm/time/TimeDisplay.tsx`). Carried over: the
workday start and end header, quarter-hour durations, the task link and the day view. Dropped: the
event level (see OQ-037).

## Requirements

### FR-TLOG-001: Day view
**Priority:** Must
**Statement:** A day view (default: today in the user's time zone) shows the logs of the selected
date and the day total. Previous and next day and a date picker change the date. The selected date and
view mode are kept in the URL.

### FR-TLOG-002: Sequential view
**Priority:** Must
**Statement:** Lists the day's logs in `position` order. Each row shows the position, the derived
clock time range (when the day has a start time, OQ-036), the duration, the task and project (or
"No project"), and the note.
**Acceptance criteria:**
- Given the 6-block example above, the logs appear in exactly that order, with Project 1 appearing at positions 1 and 4.

### FR-TLOG-003: Group-by-project view
**Priority:** Must
**Statement:** A toggle switches the day view to show **each project once**, with its subtotal and
its logs listed under it (in sequential order). Logs without a project go into a "No project"
group. Groups are sorted by subtotal, descending (TODO: or by first appearance?). Sub-grouping by task
inside a project: TBD (OQ-038).
**Acceptance criteria:**
- Given the 6-block example, the grouped view shows 3 groups (Project 1, 2, 3). Project 1's subtotal = 1 h 15 min plus its later 15-min blocks.
- The sum of the group subtotals equals the day total.

### FR-TLOG-004: Add log
**Priority:** Must
**Statement:** The user adds a log with a duration, a **required note** and a link (a searchable
picker of tasks, and of projects directly). It's appended to the end of the selected day.
**Acceptance criteria:**
- Given an empty note, a field error is shown and nothing is created.
- Given a task is selected, the log shows the task and its project. Given a project only, it shows the project.

### FR-TLOG-005: Fast repeated logging
**Priority:** Must
**Statement:** Because the user switches every ~15 minutes, adding a log must take a few seconds:
- the add form stays open or can be re-opened with one key or click after saving;
- the picker offers the **recently used tasks/projects** first;
- the duration defaults to 15 min (TODO: or to the last used duration?);
- **"Repeat"** on an existing log creates a new log at the end with the same link (the note is prefilled and editable).
TODO: confirm the exact shortcuts during screen design.

### FR-TLOG-006: Edit log
**Priority:** Must
**Statement:** The duration, note, link and work date can be edited inline or in a dialog. Moving a log to another date appends it to the end of that date.

### FR-TLOG-007: Reorder and insert logs
**Priority:** TBD (OQ-036)
**Statement:** The user can move a log up or down (drag and drop, or buttons), and insert a log at a
given position (e.g. a forgotten block), so the sequence matches reality.

### FR-TLOG-008: Delete log
**Priority:** Must
**Statement:** After confirmation, the log is deleted. Trash vs immediate delete: TBD (OQ-030a).

### FR-TLOG-009: Workday start and end
**Priority:** Must
**Statement:** The day view header shows the current time, the day's start time (editable, 15-minute
steps) and the end time = start + the day's total. How the start time is set: TBD (OQ-021).

### FR-TLOG-010: Duration input
**Priority:** Must
**Statement:** Durations are entered in 15-minute steps. Formats and the maximum: TBD (OQ-035). They're
displayed in one consistent format (TODO: `1.25h` as in legacy, or `1h 15m`?).

### FR-TLOG-011: Quick log from anywhere
**Priority:** Should
**Statement:** A global "Log time" action in the header opens the add-log form for today, from any screen.

### FR-TLOG-012: Logs on task and project views
**Priority:** Must
**Statement:** The task view lists all logs linked to the task (newest date first), with its total.
The project view shows the project total, and its logs grouped by date (TODO: confirm the project view needs the log list).

### FR-TLOG-013: Activity calendar
**Priority:** Could
**Statement:** A multi-month calendar highlights the dates that have logs. Clicking a date opens that day (legacy `MultiMonthCalendar`).

### FR-TLOG-014: Logs keep deleted task/project names
**Priority:** Must
**Statement:** If a linked task or project is deleted, the log keeps displaying its name, marked as deleted, and it can't be navigated to (FR-TRASH-006).

## Open questions
OQ-020, OQ-021, OQ-030, OQ-035, OQ-036, OQ-037, OQ-038

## Changelog
- 2026-09-26: Initial scaffold.
- 2026-09-26: Updated with owner answers to OQ-001–018 (legacy three-level model).
- 2026-09-26: OQ-019 answered. Flattened to Workday + Time log, with the link on the log, sequential and group-by-project views, and fast repeated logging.
- 2026-09-26: OQ-026 resolved: note limit 1000 chars confirmed.
