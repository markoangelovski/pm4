---
id: req-projects
title: Projects
status: draft
owner: Marko Angelovski
last_updated: 2026-09-26
related: [req-tasks, req-trash, api-endpoints, api-data-model]
---

# Projects

## Purpose
Covers creating and managing projects, the top-level container for tasks.

## Scope
**In:** create, list, view, edit, delete (to trash). Per-project task counts by status and total logged hours.
**Out (MVP):** sharing, templates, custom fields, colors (TODO: confirm no color is needed for chart series).

## Fields (legacy; limits per OQ-026, required-ness per OQ-028)
| Field | Required | Rules |
| --- | --- | --- |
| title | yes | 1–200 chars, trimmed. Not unique. |
| description | no | ≤ 2000 chars, plain text |
| projectLead | no | ≤ 100 chars (legacy `pl`) |

Derived (computed by the API, never stored): task counts per status (upcoming / in-progress / completed)
and total logged minutes (all time).

## Requirements

### FR-PRJ-001: Create project
**Priority:** Must
**Statement:** The user creates a project with a title and an optional description and project lead.
**Acceptance criteria:**
- Given valid input, the project is created and appears in the list.
- Given an empty or too-long title, a field error is shown and nothing is created.

### FR-PRJ-002: List projects
**Priority:** Must
**Statement:** A paginated list of the user's non-deleted projects, showing the title, project lead,
task counts per status and total hours. Can be searched by title and sorted by title, created date or
updated date (default: updated, descending).

### FR-PRJ-003: View project
**Priority:** Must
**Statement:** The project details, its task list (FR-TSK-002) and its time totals. Opening a
project that doesn't exist or is in the trash shows a "not found" state. If it's in the trash, a
"Restore" action is offered (FR-TRASH-003).

### FR-PRJ-004: Edit project
**Priority:** Must
**Statement:** Any field can be edited. The same validation as create applies.

### FR-PRJ-005: Delete project
**Priority:** Must
**Statement:** After confirmation, the project moves to the trash. **All of its tasks are treated as
deleted too.** Time logs linked to the project or its tasks are **not** deleted (FR-TRASH-006).

## Open questions
OQ-028

## Changelog
- 2026-09-26: Initial scaffold.
- 2026-09-26: Updated with owner answers to OQ-001–018.
- 2026-09-26: OQ-026 resolved: text limits confirmed as listed.
