---
id: prod-glossary
title: Glossary
status: draft
owner: Marko Angelovski
last_updated: 2026-10-09
related: [prod-vision, api-data-model]
---

# Glossary

Use these terms consistently in specs, code, UI copy and API names.

| Term | Definition | Code / API name | Legacy name |
| --- | --- | --- | --- |
| User | A person with an account. Owns all of their data. Nothing is shared (other users appear only as project leads, by name, avatar and email in the picker; OQ-076/077). | `User`, `/me` | User |
| Identity | A link between a user and an external sign-in provider account (e.g. Google) | `UserIdentity` | — |
| Project | A named container for tasks | `Project`, `/projects` | Project |
| Project lead | The person leading a project/task: a registered PM4 user **or** a free-text name. Informational only: gives that user no access (OQ-076). | `projectLead` | `pl` |
| Task | A unit of work in exactly one project | `Task`, `/tasks` | Task |
| Task status | `upcoming` → `in-progress` → `completed` | `TaskStatus` | same |
| External link | A URL to an external tracker item (Jira, GitHub, etc.) | `externalLink` | `jiraLink` |
| Workday | One calendar date for the user, with the time the user started working (15-minute steps), set with the date's first log. | `Workday`, `/workdays` | Day |
| Time log (log) | One block of work on a work date: a duration and a **required** log text, plus an optional title, project and task. Shown in the order entered. | `TimeLog`, `/time-logs` | Event + Log (merged) |
| Booking | The date a log's hours are booked to in the user's external system; a log is *booked* when it has one. Only logs with a project that aren't excluded from statistics can be booked. | `bookingDate`, `/bookings` | — |
| Group-by-project / Group-by-task / Sequential view | The ways of showing a day's logs: grouped by project (the default) or by task, or in the order entered | `view=project\|task\|sequential` | — |
| Unsorted | The group of logs without a project (project view) or without a task (task view) | — | — |
| Log text | The required plain-text description on a log | `TimeLog.text` | `Log.title` |
| Title | An optional short name for a log | `TimeLog.title` | — |
| Daily target | The hours the user aims to work per day (default 7 h); the whole pie chart, and the base of % billable and overtime | `dailyTargetMinutes` | — |
| Excluded from statistics / Non-prod | A log that counts as logged time but not as billable time (e.g. a commute); the grouped views collect such logs in the **Non-prod** group | `excludeFromStats` | — |
| Billable time | A day's logged time without the logs excluded from statistics | — | — |
| % billable / Overtime | Billable time as a percentage of the daily target / billable time above the daily target | — | — |
| Duration | Time spent, stored as **integer minutes** | `durationMinutes` | `duration` (decimal hours) |
| Work date | The user's local calendar date the work belongs to (`YYYY-MM-DD`) | `workDate` | `day` |
| Trash | Soft-deleted projects and tasks. Restorable for 31 days, then purged. | `/trash` | — |
| Retained name | The title of a deleted task/project that a time log keeps showing after deletion | `task.title` + `task.deleted` | — |

> The legacy Event level is dropped. The legacy names (Day, Event) are not used in new code.

## Terms to avoid
- "Event", "Time entry" → **Time log**. "Day" → **Workday**.
- "Ticket", "Issue" → **Task**. "PL" → **Project lead**. "Jira link" → **External link**.

## Changelog
- 2026-09-26: Initial scaffold.
- 2026-09-26: Legacy time model terms, trash, identity, external link, project lead.
- 2026-10-03: Project lead can be a PM4 user or a free-text name (OQ-076).
- 2026-10-07: Time-capture terms rewritten from the owner's description: no position, added log text, title, unsorted, daily target.
- 2026-10-09: Excluded from statistics, Non-prod, billable time, % billable and overtime; the daily target defaults to 7 h; By project is the default view.
- 2026-10-09: Added *Booking*.
