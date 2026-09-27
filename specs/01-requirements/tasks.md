---
id: req-tasks
title: Tasks
status: draft
owner: Marko Angelovski
last_updated: 2026-09-26
related: [req-projects, req-time-logs, req-trash, api-endpoints]
---

# Tasks

## Purpose
Covers creating and managing tasks inside a project. Fields and workflow follow the legacy app (OQ-006).

## Scope
**In:** create, list/filter (per project and across projects), view, edit, change status, delete (to
trash), move to another project, and total logged hours per task.
**Out (MVP):** subtasks, dependencies, attachments, comments, priorities, labels, configurable statuses.

## Fields
| Field | Required | Rules |
| --- | --- | --- |
| projectId | yes | A non-deleted project owned by the user |
| title | yes | 1–200 chars |
| description | no | ≤ 2000 chars, plain text |
| projectLead | TBD (OQ-028) | ≤ 100 chars (legacy `pl`, required in legacy UI) |
| externalLink | no | A valid `http(s)` URL, ≤ 500 chars (legacy `jiraLink`) |
| status | yes | `upcoming` \| `in-progress` \| `completed`, default `upcoming` |
| dueDate | TBD (OQ-028) | Calendar date `YYYY-MM-DD` (legacy defaulted to today) |

## Status workflow
| Status | Meaning | Allowed transitions |
| --- | --- | --- |
| `upcoming` | Not started | → in-progress, → completed |
| `in-progress` | Being worked on | → upcoming, → completed |
| `completed` | Done | → upcoming, → in-progress |

Any transition is allowed (as in legacy). Changing status has no side effects.

## Requirements

### FR-TSK-001: Create task
**Priority:** Must
**Statement:** Create a task in a project (from the project view with the project pre-selected, or from
the task list with a project picker).

### FR-TSK-002: List tasks in a project
**Priority:** Must
**Statement:** A paginated list of non-deleted tasks with title, status, due date, project lead and
total hours. Filter by status (multi-select) and search by title. Sort by due date, updated date or
title (default: updated, descending).

### FR-TSK-003: List tasks across projects
**Priority:** Must
**Statement:** The same as FR-TSK-002 across all non-deleted projects, plus the project name and a project filter.

### FR-TSK-004: View task
**Priority:** Must
**Statement:** The task details, its linked time logs and the total logged time.
A missing or deleted task shows "not found", with "Restore" offered if it's in the trash.

### FR-TSK-005: Edit task
**Priority:** Must
**Statement:** All fields can be edited. Moving a task to another project also moves the project
attribution of its linked time logs.

### FR-TSK-006: Quick status change
**Priority:** Must
**Statement:** The status can be changed inline from the list and detail views, without opening the edit form.

### FR-TSK-007: Delete task
**Priority:** Must
**Statement:** After confirmation, the task moves to the trash. Its time logs remain (FR-TRASH-006).

### FR-TSK-008: Due date indicator
**Priority:** Should
**Statement:** Lists show whether a non-completed task is overdue or due soon (legacy `DueDateCircle`).
TODO: define the "due soon" threshold.

## Open questions
OQ-028

## Changelog
- 2026-09-26: Initial scaffold.
- 2026-09-26: Updated with owner answers to OQ-001–018.
- 2026-09-26: OQ-026 resolved: text limits confirmed as listed.
