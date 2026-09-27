---
id: req-trash
title: Trash and Soft Delete
status: draft
owner: Marko Angelovski
last_updated: 2026-09-27
related: [req-projects, req-tasks, req-time-logs, api-data-model, ADR-0011]
---

# Trash and Soft Delete

## Purpose
Deleting projects and tasks is recoverable for 31 days (OQ-016).

## Rules
- A deleted project or task gets a `deletedAt` timestamp. It disappears from every list, picker and report filter.
- **Project → tasks:** when a project is deleted, **all of its tasks are treated as deleted**, without
  modifying the tasks themselves. Restoring the project brings back its tasks, except tasks that were
  deleted individually (OQ-030b).
- **Time logs are independent:** deleting a task/project never deletes time logs.
- **Retention:** items stay in the trash for **at least 31 days**. After that they are **due for purge**,
  and a background job deletes them permanently some time later (ADR-0011). The purge date doesn't have to
  be exact (OQ-031). **Until the purge actually runs, a due item is still listed and can still be restored.**
- **Retained names:** after a task/project is purged, the logs that referenced it keep its title (see data-model.md §Retained names).

## Requirements

### FR-TRASH-001: Trash view
**Priority:** Must
**Statement:** Lists deleted projects and individually deleted tasks, with the deletion date and the
days left before purge. An item past 31 days shows "Scheduled for deletion" instead. Tasks of a deleted project are shown grouped under that project (not separately).

### FR-TRASH-002: Restore project
**Priority:** Must
**Statement:** Restoring a project brings it back with its tasks (the rules above).

### FR-TRASH-003: Restore task
**Priority:** Must
**Statement:** Restores a deleted task. If its project is in the trash, the task can't be restored on
its own, and the user is offered "Restore project" instead (OQ-030c).

### FR-TRASH-004: Permanent delete
**Priority:** Must
**Statement:** After a strong confirmation, the user can permanently delete an item from the trash
right away. Permanently deleting a project also permanently deletes all of its tasks.

### FR-TRASH-005: Automatic purge
**Priority:** Must
**Statement:** Projects and tasks whose `deletedAt` is more than 31 days ago are **purged** eventually. When the user opens the app (sign-in or session refresh), the API queues a
`trash.purge` job for that user, at most once per day (ADR-0011). The job permanently deletes that
user's expired items, handling retained names first (data-model.md §Retained names).
**Acceptance criteria:**
- Given a task deleted 32 days ago that hasn't been purged yet, when I open the trash, then it's listed as "Scheduled for deletion", and I can still restore it.
- Given I have expired items, when I open the app, then a purge job runs, and afterwards the rows are gone from the database while their logs keep the retained names.
- Given I open the app several times on the same day, then at most one purge job runs for me that day.
- Given the API was asleep when the job was queued, then the job runs after the API starts again.

### FR-TRASH-006: Time logs survive deletion
**Priority:** Must
**Statement:** Time logs linked to a deleted (trashed or purged) task/project stay visible
everywhere, with the task/project name marked "deleted". Their hours still count in totals.

### FR-TRASH-007: Time log deletion
**Priority:** TBD (OQ-030a)
**Statement:** Whether deleted time logs go to the trash, or are deleted immediately.

## Open questions
OQ-030

## Changelog
- 2026-09-26: Created from the OQ-016 answer.
- 2026-09-27: OQ-031 resolved: expiry at 31 days, best-effort purge via a per-user BullMQ job when the user opens the app (ADR-0011).
- 2026-09-27: Owner decision: items stay restorable until the purge actually runs.
