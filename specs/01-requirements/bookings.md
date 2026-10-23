---
id: req-bookings
title: Bookings
status: approved
owner: Marko Angelovski
last_updated: 2026-10-23
related: [req-time-logs, api-endpoints, api-data-model, web-screens, OQ-122, OQ-123, OQ-124, OQ-125, OQ-212, OQ-213, OQ-214, OQ-215]
---

# Bookings

## Purpose
The owner also records their hours in an external system ("booking" them). Bookings tracks how much of each log is booked, and to
which dates, so the user can see, day by day, what's still left to book.

## Scope
**In:** a log's bookings (part or all of its time, on one or more dates); the Bookings page (`/app/bookings`) with a time range, per-day figures,
per-project rows and their logs; booking part or all of a log, changing and removing one booking; **Book all** for a project's logs of a day.
**Out:** any connection to the external system, and syncing bookings with PMSPA (OQ-215); booked hours on the dashboard and on the project and task pages (later features);
bookings on the Logs day view.

## Model
- A **booking** is part of a log's time booked to a date: a date and minutes, in 15-minute steps. A log has **at most one booking per date**,
  and its bookings add up to at most its duration; the rest is **unbooked**. A log is **booked** when it has a booking, and **fully booked** when its
  bookings add up to its duration (OQ-212).
- A log is **bookable** when it isn't excluded from statistics (FR-TLOG-018) and has a project (a deleted project counts, FR-TLOG-014).
  Unsorted and Non-prod logs can't be booked.
- A booking date can be **any date up to today** in the user's time zone, also before the day the log was worked; never a future date (OQ-123).
- A log's **booked time** is the sum of its bookings' minutes.
- Groups, *billable* and *overtime* are those of the Logs day view: a log excluded from statistics is **Non-prod**; a log without a project is
  **Unsorted**; the other logs group by project. *Billable* = the logs not excluded; *Overtime* = billable above the daily target (FR-TLOG-017).

## Requirements

### FR-BOOK-001: Bookings page and time range
**Priority:** Must
**Statement:** `/app/bookings` lists, oldest first, every date in the selected range that has logs, or that a booking of a log worked on another
day is dated. The range is picked with a start and end date in one calendar (future dates disabled) and applied with **Submit**. It defaults to
the current month up to today and is kept in the URL (OQ-125). The heading names the month ("October 2026") when the range is within one month,
else both dates. A range with no such dates shows an empty state.
**Acceptance criteria:**
- Given I open `/app/bookings` on 9 October 2026 without parameters, then the range is 1–9 October 2026 and the heading shows "October 2026".
- Given a log worked on 30 September and booked to 1 October, and no logs worked on 1 October, then the range 1–9 October lists 1 October.
- Given a range with no logs and no bookings, then "No logs in this range" is shown.

### FR-BOOK-002: Day figures
**Priority:** Must
**Statement:** Each date shows: **Logged** (all its logs), **Billable**, **Overtime**, **Booked current** (the minutes of its own logs' bookings dated
that day), **Booked from external** (the minutes of other days' logs' bookings dated that day) and **Booked total** (the two together).
**Acceptance criteria:**
- Given a day with 4 h on Nvidia booked to that day, 2 h 15 min on Anthropic not booked, and a 2 h log of the day before booked to it, with a 7 h target,
  then Logged is `6h 15m`, Billable `6h 15m`, Overtime `0h`, Booked current `4h`, Booked from external `2h`, Booked total `6h`.
- Given a 2 h log of that day with 30 min booked to it and 1 h 30 min booked to the next day, then it adds `30m` to that day's Booked current and
  `1h 30m` to the next day's Booked from external.

### FR-BOOK-003: Project rows
**Priority:** Must
**Statement:** Each date has one row per project with logs that day, biggest first by hours worked, then **Unsorted** and **Non-prod**. A row shows
**Hours worked** (its logs of that day) and **Hours booked** (minutes booked **to that day**: its own logs' bookings dated that day plus other days' logs' bookings
dated that day, OQ-122), so the rows add up to *Booked total*. A row expands to its logs. A log of the day has **one line per booking** (by date),
then one line for its **unbooked** part while there is one; its task, text and hours worked show on its first line only. Each line shows its
**Booking date**, its **Booking time** and its hours booked (the line's minutes when its booking is dated that day, else 0). A booking of a log of
another day dated this one is one line under its project, with "Worked on <date>", 0 hours worked and the booking's minutes booked; it can only
be changed from the day the log was worked.
**Acceptance criteria:**
- Given a 2 h log worked on 6 October and booked to 7 October, then on 6 October its row shows 2 h worked and 0 h booked with the booking date
  7 October, and on 7 October it is listed as "Worked on 6 Oct 2026" with 0 h worked and 2 h booked.
- Given a 2 h log of 6 October with 30 min booked to 6 October and 1 h to 7 October, then on 6 October it has three lines: 6 October · 30m
  (30m booked), 7 October · 1h (0h booked) and the unbooked 30m with a date field and **Book**; the row's hours booked are 30m.

### FR-BOOK-004: Book a log
**Priority:** Must
**Statement:** The unbooked line of a bookable log shows a date field (its work date by default), a **Booking time** field and **Book**. The time
field takes the log dialog's duration input, in 15-minute steps, at most the log's unbooked time, and starts at all of it, so **Book** without an
edit books everything left (OQ-212). Booking time to a date the log already has a booking on adds it to that booking. A booking's line shows its date,
in green when it is the day the log was worked and in amber otherwise, and its time, with **Edit** (change the date and the time, at most the booking's
minutes plus the unbooked time, and save, or cancel) and **Remove**. An Unsorted log says "Add the log to a Project or Task"; a Non-prod log has no
booking controls.
**Acceptance criteria:**
- Given an unbooked 2 h log, when I pick 7 October and click **Book**, then 2 h of it is booked to 7 October and both days' figures update.
- Given an unbooked 2 h log, when I enter `30m` and click **Book**, then 30 min is booked to its work date and a line with 1 h 30 min unbooked remains.
- Given a log with 1 h unbooked, when I enter `1h 15m` or `20m`, then **Book** is disabled with "At most 1h." or "Use 15-minute steps.".
- Given a log with 30 min booked to 7 October, when I book another 30 min to 7 October, then it has one booking of 1 h on 7 October.
- Given a booked log, when I click **Remove** on one of its bookings, then that booking is gone and its time is unbooked.

### FR-BOOK-005: Book all
**Priority:** Must
**Statement:** A project row whose logs of that day have unbooked time has **Book all**, which books each log's unbooked time to the day it was
worked, added to a booking already on that day (OQ-212).
**Acceptance criteria:**
- Given a project with two unbooked logs and one fully booked to another day, when I click **Book all**, then the two are fully booked to that day and the third is unchanged.
- Given a 2 h log with 30 min booked to that day and 1 h to the next, when I click **Book all**, then it has 1 h on that day and 1 h on the next.

### FR-BOOK-006: Bookings when a log changes
**Priority:** Must
**Statement:** A log's bookings stay when its text, title, duration, date or task changes. A longer duration leaves the extra time unbooked. The
duration can't be shortened below the log's booked time: the log dialog's **Duration** says "<booked> of this log is booked. Remove bookings first,
or keep at least <booked>." (OQ-213). All its bookings are removed when the log stops being bookable (it is excluded from statistics, or loses its
project) (OQ-124), whatever its new duration. Deleting a log deletes its bookings.
**Acceptance criteria:**
- Given a 2 h log fully booked to one date, when I change its duration to 3 h, then it keeps its 2 h booking and 1 h is unbooked.
- Given a log with 1 h 30 min booked, when I save it with a duration of 1 h, then the dialog shows "1h 30m of this log is booked. Remove bookings first, or keep at least 1h 30m." on Duration and nothing changes.
- Given a booked log, when I tick *Exclude from statistics* (also together with a shorter duration), then it has no bookings.

## Open questions
None.

## Changelog
- 2026-10-09: Created from the owner's Bookings screen (OQ-122…OQ-125).
- 2026-10-23: Partial bookings (OQ-212…OQ-215): a log's time can be booked in parts to several dates, with a Booking time per line; Book all books
  the unbooked time; a duration can't drop below the booked time. Back to `review` (feat-book-partial, prototype `f3851c1`).
