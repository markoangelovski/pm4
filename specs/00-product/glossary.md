---
id: prod-glossary
title: Glossary
status: draft
owner: Marko Angelovski
last_updated: 2026-09-26
related: [prod-vision, api-data-model]
---

# Glossary

Use these terms consistently in specs, code, UI copy and API names.

| Term | Definition | Code / API name | Legacy name |
| --- | --- | --- | --- |
| User | A person with an account. Owns all of their data. Nothing is shared. | `User`, `/me` | User |
| Identity | A link between a user and an external sign-in provider account (e.g. Google) | `UserIdentity` | — |
| Project | A named container for tasks | `Project`, `/projects` | Project |
| Project lead | A free-text name of the person leading the project/task (informational only, not a user) | `projectLead` | `pl` |
| Task | A unit of work in exactly one project | `Task`, `/tasks` | Task |
| Task status | `upcoming` → `in-progress` → `completed` | `TaskStatus` | same |
| External link | A URL to an external tracker item (Jira, GitHub, etc.) | `externalLink` | `jiraLink` |
| Workday | One calendar date for the user, with an optional start time. Used for the start → end display. | `Workday`, `/workdays` | Day |
| Time log (log) | One block of work on a work date: a duration, a **required** note, and a link to a task or project. Ordered within the day by `position`. | `TimeLog`, `/time-logs` | Event + Log (merged) |
| Position | The order of a log within its day (1…n). Drives the sequential view and the derived clock times. | `position` | — |
| Sequential view / Group-by-project view | The two ways of showing a day's logs: in order, or grouped by project | `view=sequential\|project` | — |
| Note | The plain-text description on a log | `TimeLog.note` | `Log.title` |
| Duration | Time spent, stored as **integer minutes** | `durationMinutes` | `duration` (decimal hours) |
| Work date | The user's local calendar date the work belongs to (`YYYY-MM-DD`) | `workDate` | `day` |
| Trash | Soft-deleted projects and tasks. Restorable for 31 days, then purged. | `/trash` | — |
| Retained name | The title of a deleted task/project that a time log keeps showing after deletion | `task.title` + `task.deleted` | — |

> The legacy Event level is dropped (OQ-019, confirm in OQ-037). The legacy names (Day, Event) are not used in new code.

## Terms to avoid
- "Event", "Time entry" → **Time log**. "Day" → **Workday**.
- "Ticket", "Issue" → **Task**. "PL" → **Project lead**. "Jira link" → **External link**.

## Changelog
- 2026-09-26: Initial scaffold.
- 2026-09-26: Legacy time model terms, trash, identity, external link, project lead.
- 2026-09-26: OQ-019: Time entry removed, the link moves to the Time log. Added position and views.
