---
id: req-tasks
title: Tasks
status: approved
owner: Marko Angelovski
last_updated: 2026-10-03
related: [req-projects, req-time-logs, req-trash, api-endpoints]
---

# Tasks

## Purpose
Covers creating and managing tasks inside a project. Fields and workflow follow the legacy app (OQ-006).

## Scope
**In:** create, list/filter (per project and across projects), view, edit, change status, delete (to
trash), move to another project (OQ-084), due-date indicator.
**Out (MVP):** subtasks, dependencies, attachments, comments, priorities, labels, configurable statuses.
**Deferred:** logged time on tasks (totals, the task's time logs). It comes with the time-capture specs (OQ-080).

## Fields
| Field | Required | Rules |
| --- | --- | --- |
| projectId | yes | A non-deleted project owned by the user |
| title | yes | 1–200 chars, trimmed. Not unique. |
| description | no | ≤ 2000 chars, plain text |
| externalLink | no | A valid `http(s)` URL, ≤ 500 chars (legacy `jiraLink`) |
| projectLead | no (OQ-028) | A PM4 user **or** a free-text name (≤ 100 chars), never both. Same rules as projects: [Project lead](projects.md#project-lead), FR-PRJ-006/007. Suggested on create: the signed-in user (OQ-078). |
| status | yes | `upcoming` \| `in-progress` \| `completed`, default `upcoming` |
| dueDate | no (OQ-028) | Calendar date `YYYY-MM-DD` in the user's calendar. No default. |

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
**Statement:** Create a task in a project: from the project view with the project pre-selected, or from
the cross-project task list with a project picker. Title and project are required; the other fields
are optional, and the lead is suggested as the signed-in user.
**Acceptance criteria:**
- Given I create a task from a project's view, then the project is pre-selected, and the task appears in that project's list and statistics.
- Given only a title and project (lead cleared), the task is created with status `upcoming` and no description, link, lead or due date.
- Given an empty or too-long title, or no project, a field error is shown and nothing is created.
- Given an invalid external link, a field error is shown and nothing is created.
- Given a project that is in the trash or belongs to another user, the API rejects the task (404) and nothing is created.

### FR-TSK-002: List tasks in a project
**Priority:** Must
**Statement:** In the project view, a paginated list of the project's non-deleted tasks with title,
status, due date (with the indicator, FR-TSK-008) and project lead. Filter by status (multi-select,
all statuses selected by default, OQ-081) and search by title. Sort by due date, updated date or title
(default: updated, descending).
**Acceptance criteria:**
- Given I open a project, then tasks of every status are listed.
- Given I select only "upcoming" and "in progress", then completed tasks are hidden.
- Given I deselect every status, then the list is empty and shows "No tasks match the filter" (OQ-085).
- Given I sort by due date, then tasks without a due date come last (OQ-085).
- Given I search "API", tasks whose title contains "api" in any case are listed (OQ-085).

### FR-TSK-003: List tasks across projects
**Priority:** Must
**Statement:** The same as FR-TSK-002 across all non-deleted projects, plus the project name and a
project filter (OQ-084).
**Acceptance criteria:**
- Given tasks whose project is in the trash, they aren't listed.

### FR-TSK-004: View task
**Priority:** Must
**Statement:** The task details: title, project, status, due date, lead, external link (opens in a new
tab) and description. A missing or deleted task shows "not found", with "Restore" offered if it's in
the trash (FR-TRASH-003). Logged time is not shown yet (deferred).
**Acceptance criteria:**
- Given a task with every field set, then each one is shown, and the project name links to the project's page.
- Given a task with only the required fields, then the empty optional fields don't show placeholders that look like data (no fake link or date).
- Given a task id that doesn't exist or belongs to another user, then "not found" is shown.
- Given a task in my trash, then "not found" is shown with "Restore"; given its project is in the trash, then "Restore project" is offered instead (FR-TRASH-003).

### FR-TSK-005: Edit task
**Priority:** Must
**Statement:** All fields can be edited, and optional fields can be cleared. Moving a task to another
non-deleted project also moves the project attribution of its linked time logs (OQ-084).
**Acceptance criteria:**
- Given I move a task from project A to project B, then it leaves A's list and statistics and appears in B's.
- Given I clear the description, external link, lead or due date and save, then the task has none.
- Given invalid input (empty or too-long title, invalid link), a field error is shown and the task is unchanged.
- Given I pick a project that is in the trash or isn't mine, the API rejects the change (404) and the task is unchanged.
- Given I cancel the edit, then nothing is changed.

### FR-TSK-006: Quick status change
**Priority:** Must
**Statement:** The status can be changed inline from the list and detail views, without opening the
edit form (OQ-084). The change counts as an update: the task's updated date changes, but the row
stays where it is until the list is reloaded or re-sorted (OQ-087).
**Acceptance criteria:**
- Given a task in a list, when I pick "completed" from its status control, then the task is saved as completed and the row shows it, without opening the form or leaving the page.
- Given the same on the task's detail page, then the status is saved and shown there.
- Given I change a status in a project's list, then the project statistics (FR-PRJ-008) update without reloading.
- Given the list is sorted by updated date, then the changed row doesn't move until I reload or re-sort.
- Given the list is filtered to "upcoming" and I change a row to "completed", then the row stays visible until I reload or change the filter (OQ-087).
- Given the save fails, then the previous status is shown again with an error message.

### FR-TSK-007: Delete task
**Priority:** Must
**Statement:** After confirmation, the task moves to the trash. Its time logs remain (FR-TRASH-006).
**Acceptance criteria:**
- Given I click Delete, then a confirmation is shown first; given I cancel it, nothing changes.
- Given I confirm, then the task leaves its project's list and the cross-project list, the project statistics no longer count it, and it appears in the trash.
- Given I confirm on the task's own page, then I land on its project's page with a "Moved to trash" toast (OQ-086).
- Given time logs linked to the task, then they still exist and show the task name marked "deleted" (FR-TRASH-006).

### FR-TSK-008: Due date indicator
**Priority:** Should
**Statement:** Lists show whether a non-completed task is **overdue** (due date before today) or **due
soon** (due today or tomorrow), with "today" in the user's time zone (OQ-082). Completed tasks and
tasks without a due date show no indicator (legacy `DueDateCircle`).
**Acceptance criteria:**
- Given today is 2026-10-03 in my zone: a task due 2026-10-02 is overdue; due 2026-10-03 or 2026-10-04 is due soon; due 2026-10-05 has no indicator.
- Given a completed task due yesterday, then no indicator is shown.

## Open questions
None.

## Changelog
- 2026-09-26: Initial scaffold.
- 2026-09-26: Updated with owner answers to OQ-001–018.
- 2026-09-26: OQ-026 resolved: text limits confirmed as listed.
- 2026-10-03: Owner requirements (OQ-028, OQ-076–OQ-085): lead as a PM4 user or text (suggested: the
  signed-in user), lead and due date optional, multi-select status filter (default all; none selected = empty list, OQ-085), due soon =
  today or tomorrow. Logged time deferred to the time-capture specs.
- 2026-10-03: Acceptance criteria for FR-TSK-004/005/006/007 (OQ-086, OQ-087).
- 2026-10-03: Approved by the owner.
