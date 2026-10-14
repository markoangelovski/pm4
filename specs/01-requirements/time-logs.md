---
id: req-time-logs
title: Time Capture (Workdays and Time Logs)
status: approved
owner: Marko Angelovski
last_updated: 2026-10-14
related: [req-projects, req-tasks, req-reporting, api-endpoints, api-data-model, web-screens]
---

# Time Capture: Workdays and Time Logs

## Purpose
Recording time spent. This is PM4's core feature. The owner works on several projects through the
day, and enters one log each time a block of work ends. The app then shows what was worked on, how
much, and whether any time is missing from the day.

## Model
| Entity | Fields | Rules |
| --- | --- | --- |
| **Workday** | `workDate`, `startMinute` | One per user per date. `startMinute` = the time of day the user started working, in 15-minute steps (0–1425). Set with the first log of the day (FR-TLOG-009). |
| **Time log** | `workDate`, `durationMinutes`, `text`, `title?`, `project?`, `task?`, `excludeFromStats` | `text` and the duration are required. Everything else is optional; `excludeFromStats` defaults to false. |

- **Log text:** plain text, 1–1000 characters after trimming. It describes what the log is for.
- **Duration:** minutes, a multiple of 15, 15–1440 (FR-TLOG-010).
- **Title:** optional, plain text, 1–100 characters after trimming. A short provisional name for the log.
- **Project / Task:** each optional and independent of the other, with one rule: a log with a task always
  belongs to **that task's project** (FR-TLOG-004). A log with neither is *unsorted*.
- **Order:** a day's logs have **no stored or editable order**. They are shown in the order they were
  entered. A log moved to another date takes its place among that date's logs by its entry time.
- **Dates:** a log's date is a calendar date in the user's time zone (FR-AUTH-006). It can be today or
  any past date, never a future one.
- **Clock times:** per-log start and end times are not shown or stored. Only the day-level figures in FR-TLOG-009 exist.
- **Excluded from statistics:** a log can be marked as not productive work (e.g. a commute). It still counts as
  logged time, but not as billable time (FR-TLOG-018). The logs that aren't excluded are the day's **billable** time.

## Requirements

### FR-TLOG-001: Day view and calendar
**Priority:** Must
**Statement:** The day view (`/app/time`) shows one date: the workday header (FR-TLOG-009), the charts
(FR-TLOG-016), the view switch and the day's logs. The date defaults to today in the user's time
zone. The view switch offers **By project** (the default, FR-TLOG-003), **By task** (FR-TLOG-015) and **Sequential**
(FR-TLOG-002), in that order. The selected date and view are kept in the URL.
The date is changed with a calendar picker, previous / next day buttons and a **Today** button. The page
always names the date being viewed in full (e.g. "Tuesday, 6 October 2026"). The calendar marks the
days that have logs, and future dates can't be picked.
**Acceptance criteria:**
- Given I pick a past date in the calendar, then the URL changes, the heading shows that date, and the list shows that day's logs.
- Given a day with no logs, then the list shows an empty state (no view switch), and the header shows `—` for the start.
- Given I open `/app/time` without parameters, then today is shown in the By project view.

### FR-TLOG-002: Sequential view
**Priority:** Must
**Statement:** Lists the day's logs in the order they were entered. Each row shows the title (when set),
the log text, an **Excluded from statistics** badge (when set), the duration, and the project and task (when set;
FR-TLOG-014 for deleted ones). Each row has a coloured dot, the colour of its slice in the pie chart (FR-TLOG-016).
**Acceptance criteria:**
- Given logs entered as "Specs review" (30 min), "Specs audit" (1 h 45 min) and "Chat with coworker" (15 min), the rows appear in exactly that order.

### FR-TLOG-003: Group-by-project view
**Priority:** Must
**Statement:** Shows each project **once**, with its log count, its subtotal and its logs under it (in entry order).
Logs excluded from statistics go into a **Non-prod** group, whatever their project. The other logs without a project
go into an **Unsorted** group. Project groups are ordered by the first appearance of their project in the day, then
come **Unsorted** and **Non-prod**. Every group can be expanded and collapsed; all are collapsed when the page opens,
and one button expands or collapses them all. A row in a group doesn't repeat what the group heading names:
- in a project group, rows show their task but not the project, and **no title** (a log with a project is
  recognisable by its project and text);
- in **Unsorted**, rows show their title;
- in **Non-prod**, rows show their project and task, and their title only when they have no project.
**Acceptance criteria:**
- Given the three logs above (the first two in project "Manhatan"), the view shows the group "Manhatan" (2 h 15 min) with two logs, and the group "Unsorted" (15 min) with one.
- Given a log in "Manhatan" marked as excluded from statistics, it is listed under "Non-prod", not under "Manhatan".
- The group subtotals add up to the day total.

### FR-TLOG-015: Group-by-task view
**Priority:** Must
**Statement:** As FR-TLOG-003, but grouped by **task**. A group's heading shows the project name, then the task name.
Logs without a task (including logs that only have a project) go into **Unsorted**; excluded logs go into **Non-prod**.
Rows in a task group show neither the project, the task nor the title. Rows in **Unsorted** show their project (when
set) and their title. Rows in **Non-prod** show their project and task, and their title only when they have no task.
**Acceptance criteria:**
- Given the three logs above, the view shows the groups "Manhatan · Specifications 01" (30 min), "Manhatan · Specifications 02" (1 h 45 min) and "Unsorted" (15 min).
- Given a log with only the project "Manhatan", it is listed under "Unsorted" and its row shows "Manhatan".

### FR-TLOG-004: Add log
**Priority:** Must
**Statement:** The user adds a log with the **log text** and the **duration** (required) and, optionally, a
**title**, a **project**, a **task** and **Exclude from statistics** (FR-TLOG-018), for a date (default: the date being
viewed, or today). Both pickers are searchable. A task is shown prefixed with its project name ("Manhatan ·
Specifications 01"), and typing matches the task title or the project name. Tasks of every status are offered. Picking a task sets the log's project to the task's project, and locks it. Picking
a project first narrows the task picker to that project's tasks. Clearing the project clears the task. When the date
has no workday start yet, the form also asks for it (FR-TLOG-009).
**Acceptance criteria:**
- Given an empty text, or no/invalid duration, a field error is shown and nothing is created.
- Given I pick only a project, the log shows that project and no task.
- Given I pick a task, the log shows the task's project too, and I can't pick another project for it.
- Given a log with neither project nor task, it is saved and shown as unsorted.
- Given I type "tesla" in the task picker, the tasks of the project "Tesla" are listed.
- Given a future date, the log is rejected.

### FR-TLOG-006: Edit log
**Priority:** Must
**Statement:** On any day, the text, duration, title, project, task, *Exclude from statistics* and date can be edited in a dialog
(same rules and fields as FR-TLOG-004). When the chosen date has no workday yet, the dialog asks for its start (FR-TLOG-009).

### FR-TLOG-008: Delete log
**Priority:** Must
**Statement:** After confirmation, the log is deleted **immediately**. Totals update.

### FR-TLOG-009: Workday start and day header
**Priority:** Must
**Statement:** A date's workday records when the user started working.
- **Setting it:** when a date has no start yet, the add-log form shows a required field **Day started at**
  (`HH:mm`, 24-hour, 15-minute steps). It is prefilled with the current time rounded to the nearest 15 minutes
  when the date is today, and empty for a past date. Saving the first log creates the workday with that start.
- **Changing it:** the day header's start is editable afterwards (15-minute steps).
- **The header** shows, in 24-hour `HH:mm` / durations:
  - **Start**: the day's start time (`—` when none).
  - **Now**: the current time, kept current while the page is open (today only).
  - **Logged**: the sum of the day's log durations (e.g. `1h`).
  - **Start + logged**: the start time plus the logged time (e.g. start 08:00 and 1h → `09:00`). Past midnight it reads
    e.g. `01:30 (+1 day)`.
  - **Unlogged** (today only): *now − (start + logged)*, e.g. `17m`. Hidden when it is zero or negative, or when
    the day has no start. It shows how much time hasn't been logged yet.
  - **% billable**: the day's billable time (FR-TLOG-018) as a percentage of the daily target (FR-TLOG-017),
    rounded to a whole number; it can exceed 100 %.
  - **Overtime**: the billable time above the daily target (`0h` when there is none).
- Time zone: "today" and "now" are in the user's time zone.
**Acceptance criteria:**
- Given start 08:00, now 09:17 and 1 h logged, the header shows `08:00`, `09:17`, `1h`, `09:00` and `Unlogged 17m`.
- Given it is 08:58 and the day has no start, the form's *Day started at* offers `09:00`.
- Given a past day, the header shows no *Now* and no *Unlogged*.
- Given a target of 7 h and 8 h 15 min logged, 1 h of it excluded from statistics, the header shows *Logged* `8h 15m`, *% billable* `104%` and *Overtime* `15m`.
- Given an empty day, the header shows *Logged* `0m`, *% billable* `0%` and *Overtime* `0h`.
- Given a day that already has a start, the add-log form has no *Day started at* field.

### FR-TLOG-010: Duration input
**Priority:** Must
**Statement:** One input accepts a duration in several forms and always stores **minutes**, in 15-minute steps (min 15 min, max 24 h):
| Input | Meaning |
| --- | --- |
| a number with a decimal point or comma (`0.25`, `1,5`) | hours → 15 min, 1 h 30 min |
| a whole number **below 15** (`1`, `8`) | hours → 1 h, 8 h |
| a whole number **15 or more** (`15`, `45`, `90`) | minutes → 15 min, 45 min, 1 h 30 min |
| `1h`, `45m`, `1h 15m`, `1:15` | as written |
Anything else, or a value that isn't a multiple of 15 minutes (`20`, `0.3`, `0`), or above 24 h, is a field error
("Use 15-minute steps, from 15 min to 24 h."). Durations are displayed as `1h 15m`, `45m`, `2h` (the existing `formatDuration`).
**Acceptance criteria:** `0.25` → 15 · `15` → 15 · `1` → 60 · `1.5` → 90 · `45` → 45 · `90` → 90 · `1h 15m` → 75 · `1:15` → 75 · `20` → error · `0` → error · `25h` → error.

### FR-TLOG-011: Quick log from anywhere
**Priority:** Should
**Statement:** A global **Log time** button in the header opens the add-log form from any screen (date: today).

### FR-TLOG-012: Logs on project and task pages
**Priority:** Must
**Statement:** The task page and the project page each have a **Logged time** section with the total hours logged
(across all days), the booked part of it (logs with a booking date, FR-BOOK-004), and the logs, newest date first (entry
order within a day), 25 per page. A row shows the work date (a link that opens that day), the log text (OQ-135), on the
project page the task, the booking date (if booked) and the duration.
The **task** total counts the logs linked to the task. The **project** total counts the logs linked to the project
directly **and** the logs of all its tasks (a log with a task always carries the task's project, so this is simply the project's logs).
**Acceptance criteria:**
- Given 1 h logged on project P directly and 30 min on a task of P, P's page shows 1 h 30 min and the task's page 30 min.
- Given a task moved to another project, its logs count towards the new project from then on.
- Given 1 h 30 min on P of which a 1 h log is booked, P's section shows the total 1 h 30 min and booked 1 h, and the booked row shows its booking date.

### FR-TLOG-014: Logs keep deleted task/project names
**Priority:** Must
**Statement:** Deleting a task or project never deletes its time logs. The log keeps showing the deleted task's or
project's name as plain text instead of a link, with a distinct deleted marker: a tombstone icon
(OQ-149; accessible label "deleted"). A log of a deleted task stays linked to the task's project while
that project exists. Hours still count in the totals. Such a log can be relinked to another project or task by editing
it (FR-TLOG-006); the new link replaces the deleted name.
**Acceptance criteria:**
- Given a log of a task I deleted, then it shows the task name as plain text with the deleted marker, and its project as a link.
- Given a log of a project I deleted, then it shows the project name (and its task's name, if any) as plain text with the deleted marker.
- Given a log of a deleted task, when I edit it and pick another task or project, then it links to that one and the deleted marker is gone.

### FR-TLOG-016: Charts
**Priority:** Must
**Statement:** The day view shows two charts of the viewed day, for any view:
- **Pie chart** (*Time by log*): every log is a slice, sized by duration and labelled "Project - Task - Log text"
  (the parts the log has). The **daily target** (FR-TLOG-017) is the whole pie: the part of the target not yet logged
  is one grey slice, **Remaining**. When the logged time reaches or exceeds the target there is no grey slice, and the
  pie is the logged time. The middle shows the logged time and "of" the target, and a legend lists every slice with its duration.
- **Bar chart** (*Time by project*): one bar per group of the By project view (FR-TLOG-003), including **Unsorted**
  and **Non-prod**, with the hours logged. In the By task view, one bar per group of that view instead (*Time by task*).
Both show the label and the duration on hover, and each can be expanded to fill the screen. An empty day shows an empty state.
**Acceptance criteria:**
- Given a target of 7 h and logs of 30 min, 1 h 45 min and 15 min, the pie has three coloured slices and a grey one of 4 h 30 min.
- Given 8 h logged and a target of 7 h, the pie has no grey slice.
- Given a log "Weekly with Peter." on the task "Meetings" of "Tesla", its slice is labelled "Tesla - Meetings - Weekly with Peter."; an unsorted log is labelled by its text alone.

### FR-TLOG-017: Daily target
**Priority:** Must
**Statement:** The user sets a **daily target** (hours worked per day) in Settings, in hours with quarter-hour steps
(0.25–24). The default is **7 h**. It drives the pie chart (FR-TLOG-016) and the header's *% billable* and *Overtime*
(FR-TLOG-009).

### FR-TLOG-018: Exclude from statistics
**Priority:** Must
**Statement:** A log can be marked **Exclude from statistics** when it is added or edited. Such a log still counts in the
day's *Logged*, *Start + logged* and *Unlogged* figures and in the pie chart, but not in *% billable* or *Overtime*. In the
grouped views and the bar chart it belongs to **Non-prod** (FR-TLOG-003/015/016), and its row shows an **Excluded from
statistics** badge.
**Acceptance criteria:**
- Given a day with 7 h on projects and 1 h excluded, and a target of 7 h, then *Logged* is `8h`, *% billable* `100%`, *Overtime* `0h`, and the bar chart has a "Non-prod" bar of 1 h.

## Out of scope
- Ordering, inserting or repeating logs, per-log clock times, break logs, the legacy "event" level.
- Per-day targets, a date-range view of the day screen, exports.
- Dashboard reporting over date ranges: [req-reporting](reporting.md).

## Removed requirement IDs (never reused)
FR-TLOG-005, FR-TLOG-007, FR-TLOG-013.

## Open questions
None.

## Changelog
- 2026-10-07: Rewritten from the owner's time-logging description (OQ-103…OQ-114).
- 2026-10-09: FR-TLOG-018 *Exclude from statistics* and the Non-prod group; By project is the default view; collapsible groups;
  what a grouped row shows; header *% billable* and *Overtime*; pie labels and full-screen charts; daily target in hours, default 7 h;
  task search by title or project name (OQ-115…OQ-121).
- 2026-10-09: Approved by the owner.
- 2026-10-11: FR-TLOG-012: the booked total and each log's booking date; the row shows the log text, and its date links to the day (OQ-135, prototype `fa9a030`). Sample names renamed (OQ-136). Back to `review` (feat-proto-sync-web).
- 2026-10-11: Approved by the owner.
