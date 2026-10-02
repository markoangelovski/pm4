---
id: req-projects
title: Projects
status: review
owner: Marko Angelovski
last_updated: 2026-10-03
related: [req-tasks, req-trash, req-time-logs, api-endpoints, api-data-model, sec]
---

# Projects

## Purpose
Covers creating and managing projects, the top-level container for tasks, and the **project lead**
field that projects and tasks share.

## Scope
**In:** create, list, view, edit, delete (to trash). Project lead as a PM4 user or a free-text name.
Per-project task statistics (counts per status, total, % completed). The project's task list with a
status filter (FR-TSK-002).
**Out (MVP):** sharing, templates, custom fields, colors. The project lead gets no access (FR-PRJ-007).
**Deferred:** logged time on projects (totals, breakdowns). It comes with the time-capture specs (OQ-080).

## Fields
| Field | Required | Rules |
| --- | --- | --- |
| title | yes | 1–200 chars, trimmed. Not unique. |
| description | no | ≤ 2000 chars, plain text |
| externalLink | no | A valid `http(s)` URL, ≤ 500 chars (OQ-079) |
| projectLead | no | A PM4 user **or** a free-text name (≤ 100 chars, trimmed), never both. See [Project lead](#project-lead). |

Derived (computed by the API, never stored): task counts per status (upcoming / in-progress /
completed), the total task count and the completed percentage, all over the project's non-deleted tasks.

## Project lead
Projects and tasks (FR-TSK-001) share these rules. The project lead is **informational only** (OQ-076).

- **Two kinds.** The lead is either a reference to a registered PM4 user or a plain-text name. An
  empty lead is allowed.
- **Any registered user can be picked** (OQ-076), not only the signed-in user. This is the one place
  where a user sees other users: their name, avatar and email, in the picker only (OQ-077).
- **Suggested on create** (OQ-078): a new project or task starts with the signed-in user as its lead.
  The user can change or clear it before saving. Editing an existing item never changes its lead on
  its own.
- **Display** (OQ-077): a user lead shows that user's **current** avatar and name (it follows their
  Google profile, FR-AUTH-002). A text lead shows the text. If the referenced account no longer exists,
  the lead becomes a text lead with the last known name.

### FR-PRJ-006: Project lead input
**Priority:** Must
**Statement:** The lead is entered in one combobox (OQ-078). Typing searches registered users by name
and email. Picking a user sets a user lead; keeping the typed text sets a text lead. A clear button
removes the lead.
**Acceptance criteria:**
- Given I open the create form, then the lead shows me (my avatar and name) as a user lead.
- Given I type "ana", then the picker lists registered users whose name or email contains "ana", each with avatar, name and email, plus an option to use "ana" as a name.
- Given I pick a user, then the saved lead is that user; given I choose the typed text, then the saved lead is the text "ana", even if a user is called Ana.
- Given I clear the lead and save, then the item has no lead.
- Given I type 101 characters as a text lead, then I see a field error and nothing is saved.
- Given the lead is user X and X later changes their Google name, then the item shows X's new name.

### FR-PRJ-007: Project lead gives no access
**Priority:** Must
**Statement:** Being someone's project lead changes nothing for the lead's account. Projects and tasks
stay visible only to their owner (single user per account). The lead is not notified.
**Acceptance criteria:**
- Given I set user X as the lead of my project, when X signs in, then X sees nothing of my project or its tasks, and the API returns 404 for them to X.
- Given I am X, then nothing in the API tells me which items list me as their lead.

## Requirements

### FR-PRJ-001: Create project
**Priority:** Must
**Statement:** The user creates a project with a title, and optionally a description, an external link
and a project lead (suggested: the signed-in user).
**Acceptance criteria:**
- Given valid input, the project is created and appears in the list.
- Given only a title (lead cleared), the project is created with no description, link or lead.
- Given an empty or too-long title, a field error is shown and nothing is created.
- Given an external link that isn't an `http(s)` URL, or is longer than 500 chars, a field error is shown and nothing is created.

### FR-PRJ-002: List projects
**Priority:** Must
**Statement:** A paginated list of the user's non-deleted projects. Each row shows the title, the
project lead, the task counts per status and a small completed-percentage bar (OQ-083). Can be
searched by title and sorted by title, created date or updated date (default: updated, descending).
**Acceptance criteria:**
- Given projects in the trash, they don't appear in the list.
- Given a project with 2 upcoming, 1 in-progress and 1 completed task, its row shows 2 / 1 / 1 and 25 %.
- Given a project with no tasks, its row shows zero counts and an empty bar (0 %).
- Given I search "web", only projects whose title contains "web" (case-insensitive) are listed (OQ-085).

### FR-PRJ-003: View project
**Priority:** Must
**Statement:** The project details (title, description, external link, lead), its task statistics
(FR-PRJ-008) and its task list with a status filter (FR-TSK-002). Opening a project that doesn't exist
or is in the trash shows a "not found" state. If it's in the trash, a "Restore" action is offered
(FR-TRASH-002).
**Acceptance criteria:**
- Given an external link, it opens in a new tab.
- Given a project id that doesn't exist or belongs to another user, "not found" is shown.
- Given a project in my trash, "not found" is shown with a "Restore" action.

### FR-PRJ-004: Edit project
**Priority:** Must
**Statement:** Any field can be edited, and optional fields can be cleared. The same validation as
create applies.
**Acceptance criteria:**
- Given I change the title and save, then the new title shows in the project view and the list, and the project's updated date changes.
- Given I clear the description, external link or lead and save, then the project has none.
- Given an empty or too-long title, or an invalid external link, a field error is shown and the project is unchanged.
- Given I cancel the edit, then nothing is changed.
- Given the project's lead is a user, editing other fields keeps that user as the lead (no new suggestion).
- Given the project was moved to the trash (e.g. in another tab) before I save, then saving fails with "not found" and nothing is changed.

### FR-PRJ-005: Delete project
**Priority:** Must
**Statement:** After confirmation, the project moves to the trash. **All of its tasks are treated as
deleted too.** Time logs linked to the project or its tasks are **not** deleted (FR-TRASH-006).
**Acceptance criteria:**
- Given I click Delete, then a confirmation is shown first; given I cancel it, nothing changes.
- Given I confirm, then the project leaves the projects list, the cross-project task list no longer shows its tasks, and it appears in the trash with its tasks grouped under it (FR-TRASH-001).
- Given I confirm on the project's own page, then I land on the projects list with a "Moved to trash" toast (OQ-086).
- Given I open one of its tasks afterwards, then "not found" is shown, with "Restore project" offered (FR-TRASH-003).
- Given time logs linked to the project or its tasks, then they still exist and show the project/task name marked "deleted" (FR-TRASH-006).

### FR-PRJ-008: Project task statistics
**Priority:** Must
**Statement:** The project view shows, over the project's non-deleted tasks: the count per status
(upcoming, in progress, completed), the total count and the completed percentage (OQ-080). Logged time
is not shown yet (deferred).
**Acceptance criteria:**
- Given 3 upcoming, 1 in-progress and 4 completed tasks, then the view shows 3 / 1 / 4, total 8, 50 % completed.
- Given a task I deleted individually, it isn't counted.
- Given I change a task's status, then the statistics reflect it without reloading the page.
- Given no tasks, then all counts are 0 and the percentage is 0 %.
- The percentage is rounded to a whole number (OQ-085).
- The statistics don't change when the status filter of the task list changes.

## Open questions
None.

## Changelog
- 2026-09-26: Initial scaffold.
- 2026-09-26: Updated with owner answers to OQ-001–018.
- 2026-09-26: OQ-026 resolved: text limits confirmed as listed.
- 2026-10-03: Owner requirements (OQ-028, OQ-076–OQ-085): external link on projects, project lead as a
  PM4 user or text (suggested: the signed-in user, informational only), task statistics with
  % completed, list rows with status counts. Logged time deferred to the time-capture specs.
- 2026-10-03: Acceptance criteria for FR-PRJ-004/005 (OQ-086).
