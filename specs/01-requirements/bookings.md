---
id: req-bookings
title: Bookings
status: approved
owner: Marko Angelovski
last_updated: 2026-10-09
related: [req-time-logs, api-endpoints, api-data-model, web-screens, OQ-122, OQ-123, OQ-124, OQ-125]
---

# Bookings

## Purpose
The owner also records their hours in an external system ("booking" them). Bookings tracks which logs are booked, and to
which date, so the user can see, day by day, what's still left to book.

## Scope
**In:** a booking date on a log; the Bookings page (`/app/bookings`) with a time range, per-day figures, per-project rows
and their logs; booking, re-dating and removing the booking of one log; **Book all** for a project's logs of a day.
**Out:** any connection to the external system; booked hours on the dashboard and on the project and task pages (later features);
bookings on the Logs day view.

## Model
- A **booking** is a date stored on a time log (`bookingDate`). A log is **booked** when it has one. One log has at most one booking date.
- A log is **bookable** when it isn't excluded from statistics (FR-TLOG-018) and has a project (a deleted project counts, FR-TLOG-014).
  Unsorted and Non-prod logs can't be booked.
- The booking date can be **any date up to today** in the user's time zone, also before the day the log was worked; never a future date (OQ-123).
- A booking covers the log's whole duration.
- Groups, *billable* and *overtime* are those of the Logs day view: a log excluded from statistics is **Non-prod**; a log without a project is
  **Unsorted**; the other logs group by project. *Billable* = the logs not excluded; *Overtime* = billable above the daily target (FR-TLOG-017).

## Requirements

### FR-BOOK-001: Bookings page and time range
**Priority:** Must
**Statement:** `/app/bookings` lists, oldest first, every date in the selected range that has logs, or that a log worked on another day is
booked to. The range is picked with a start and end date in one calendar (future dates disabled) and applied with **Submit**. It defaults to
the current month up to today and is kept in the URL (OQ-125). The heading names the month ("October 2026") when the range is within one month,
else both dates. A range with no such dates shows an empty state.
**Acceptance criteria:**
- Given I open `/app/bookings` on 9 October 2026 without parameters, then the range is 1–9 October 2026 and the heading shows "October 2026".
- Given a log worked on 30 September and booked to 1 October, and no logs worked on 1 October, then the range 1–9 October lists 1 October.
- Given a range with no logs and no bookings, then "No logs in this range" is shown.

### FR-BOOK-002: Day figures
**Priority:** Must
**Statement:** Each date shows: **Logged** (all its logs), **Billable**, **Overtime**, **Booked current** (its own logs booked to it), **Booked from
external** (logs of other days booked to it) and **Booked total** (the two together).
**Acceptance criteria:**
- Given a day with 4 h on Nvidia booked to that day, 2 h 15 min on Anthropic not booked, and a 2 h log of the day before booked to it, with a 7 h target,
  then Logged is `6h 15m`, Billable `6h 15m`, Overtime `0h`, Booked current `4h`, Booked from external `2h`, Booked total `6h`.

### FR-BOOK-003: Project rows
**Priority:** Must
**Statement:** Each date has one row per project with logs that day, biggest first by hours worked, then **Unsorted** and **Non-prod**. A row shows
**Hours worked** (its logs of that day) and **Hours booked** (hours booked **to that day**: its own logs booked to that day plus logs of other days
booked to it, OQ-122), so the rows add up to *Booked total*. A row expands to its logs: the task, the log text, the booking date, and the hours worked
and booked. A log of another day booked to this one is listed under its project with "Worked on <date>", 0 hours worked and its hours booked; it
can only be changed from the day it was worked.
**Acceptance criteria:**
- Given a 2 h log worked on 6 October and booked to 7 October, then on 6 October its row shows 2 h worked and 0 h booked with the booking date
  7 October, and on 7 October it is listed as "Worked on 6 Oct 2026" with 0 h worked and 2 h booked.

### FR-BOOK-004: Book a log
**Priority:** Must
**Statement:** An unbooked, bookable log shows a date field (its work date by default) and **Book**. A booked log shows its booking date, in green
when it is the day the log was worked and in amber otherwise, with **Edit** (pick another date and save, or cancel) and **Remove**. An Unsorted log
says "Add the log to a Project or Task"; a Non-prod log has no booking controls.
**Acceptance criteria:**
- Given an unbooked log, when I pick 7 October and click **Book**, then it is booked to 7 October and both days' figures update.
- Given a booked log, when I click **Remove**, then it is unbooked.

### FR-BOOK-005: Book all
**Priority:** Must
**Statement:** A project row with unbooked logs of that day has **Book all**, which books each of them to the day they were worked.
**Acceptance criteria:**
- Given a project with two unbooked logs and one booked to another day, when I click **Book all**, then the two are booked to that day and the third is unchanged.

### FR-BOOK-006: Bookings when a log changes
**Priority:** Must
**Statement:** A booking stays when the log's text, title, duration, date or task changes. It is removed when the log stops being bookable
(it is excluded from statistics, or loses its project) (OQ-124). Deleting a log deletes its booking.
**Acceptance criteria:**
- Given a booked log, when I change its duration, then it stays booked to the same date with the new duration.
- Given a booked log, when I tick *Exclude from statistics*, then it is no longer booked.

## Open questions
None.

## Changelog
- 2026-10-09: Created from the owner's Bookings screen (OQ-122…OQ-125).
