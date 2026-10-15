---
id: req-projects
title: Projects
status: approved
owner: Marko Angelovski
last_updated: 2026-10-14
related: [req-tasks, req-time-logs, api-endpoints, api-data-model, sec]
---

# Projects

## Purpose
Covers creating and managing projects, the top-level container for tasks, and the **project lead**
field that projects and tasks share.

## Scope
**In:** create, list, view, edit, delete (permanent). Project lead as a PM4 user or a free-text name.
Per-project task statistics (counts per status, total, % completed). The project's task list with a
status filter (FR-TSK-002).
**Out (MVP):** sharing, templates, custom fields, colors. The project lead gets no access (FR-PRJ-007).
Logged time on the project page: FR-TLOG-012.

## Fields
| Field | Required | Rules |
| --- | --- | --- |
| title | yes | 1–200 chars, trimmed. Not unique. |
| description | no | ≤ 2000 chars, plain text |
| externalLink | no | A valid `http(s)` URL, ≤ 500 chars (OQ-079) |
| projectLead | no | A PM4 user **or** a free-text name (≤ 100 chars, trimmed), never both. See [Project lead](#project-lead). |

Derived (computed by the API, never stored): task counts per status (upcoming / in-progress /
completed), the total task count and the completed percentage, all over the project's tasks.

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
**Statement:** A paginated list of the user's projects. Each row shows the title, the
project lead, the task counts per status, a small completed-percentage bar (OQ-083), the logged time
(the project's total, FR-TLOG-012; OQ-132) and the created and updated dates (OQ-100). Can be searched by title or project lead name, with title matches listed
first (OQ-099, OQ-102), and sorted by title, created date or updated date (default: updated, descending).
**Acceptance criteria:**
- Given a project with 2 upcoming, 1 in-progress and 1 completed task, its row shows 2 / 1 / 1 and 25 %.
- Given a project with no tasks, its row shows zero counts and an empty bar (0 %).
- Given 1 h logged on a project directly and 30 min on one of its tasks, its row shows 1h 30m logged; with nothing logged, `—`.
- Given I search "web", only projects whose title or lead name contains "web" (case-insensitive) are listed (OQ-085, OQ-099).
- Given I search "ana", projects whose title matches come before projects that match only by lead name; each group keeps the selected sort (OQ-099).
- Given a user lead, the search matches the user's current name, never their email (OQ-102).
- Given a project created on 3 Oct 2026 and updated on 4 Oct 2026 (in my time zone), its row shows "3 Oct 2026" and "4 Oct 2026" (OQ-100).

### FR-PRJ-003: View project
**Priority:** Must
**Statement:** The project details (title, description, external link, lead, created and last
modified date and time, OQ-101), its task statistics
(FR-PRJ-008) and its task list with a status filter (FR-TSK-002). Opening a project that doesn't exist
(or was deleted) shows a "not found" state.
**Acceptance criteria:**
- Given an external link, it opens in a new tab.
- Given a project id that doesn't exist or belongs to another user, "not found" is shown.
- Given a project I deleted, "not found" is shown.
- Given a project created at 2026-10-03T08:00Z and updated at 2026-10-04T12:05Z, and my time zone Europe/Zagreb, the details show "Created 3 October 2026, 10:00" and "Last modified 4 October 2026, 14:05" (OQ-101).

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
- Given the project was deleted (e.g. in another tab) before I save, then saving fails with "not found" and nothing is changed.

### FR-PRJ-005: Delete project
**Priority:** Must
**Statement:** After confirmation, the project is deleted permanently. **All of its tasks are deleted
with it.** Time logs linked to the project or its tasks are **not** deleted; they keep the project/task
name (FR-TLOG-014).
**Acceptance criteria:**
- Given I click Delete, then a confirmation is shown first: "Delete project?" / "“<title>” and its tasks will be deleted permanently. Their logged time stays." (**Cancel**, **Delete**); given I cancel it, nothing changes.
- Given I confirm, then the project leaves the projects list and the cross-project task list no longer shows its tasks.
- Given I confirm on the project's own page, then I land on the projects list with a "Project deleted" toast (OQ-086).
- Given I open the project or one of its tasks afterwards, then "not found" is shown.
- Given time logs linked to the project or its tasks, then they still exist and show the project/task name as plain text with the deleted marker (FR-TLOG-014).

### FR-PRJ-008: Project task statistics
**Priority:** Must
**Statement:** The project view shows, over the project's tasks: the count per status
(upcoming, in progress, completed), the total count and the completed percentage (OQ-080). Logged time
is a separate section (FR-TLOG-012).
**Acceptance criteria:**
- Given 3 upcoming, 1 in-progress and 4 completed tasks, then the view shows 3 / 1 / 4, total 8, 50 % completed.
- Given a task I deleted, it isn't counted.
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
- 2026-10-03: Approved by the owner.
- 2026-10-04: FR-PRJ-002: created/updated dates in the list, search by title or lead name with title matches first (OQ-099, OQ-100, OQ-102). FR-PRJ-003: created and last modified date and time (OQ-101). Back to `review` (feat-prj-dates-lead-search).
- 2026-10-04: Approved by the owner.
- 2026-10-07: Logged time points to FR-TLOG-012. Back to `review`.
- 2026-10-09: Approved by the owner.
- 2026-10-11: FR-PRJ-002: the list shows each project's logged time (OQ-132, feat-proto-sync-web). Back to `review`.
- 2026-10-11: Approved by the owner.
