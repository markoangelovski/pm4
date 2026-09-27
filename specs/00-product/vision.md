---
id: prod-vision
title: Product Vision
status: draft
owner: Marko Angelovski
last_updated: 2026-09-26
related: [prod-scope, prod-glossary]
---

# Product Vision

## Purpose
Explains why PM4 exists and what success looks like, so that detailed decisions can be checked against it.

## Problem
TODO: Describe the problem in the owner's words. Working assumption: individuals need a lightweight
way to organize their work into projects and tasks, and to keep an accurate record of time spent on
each task, with a note describing what was done, for their own insight or for reporting and invoicing.

## Target users
An individual professional (developer, consultant, freelancer) organizing and tracking **their own**
work. PM4 is **single-user per account** (OQ-002). There is no sharing, no teams and no roles. Each user
sees only their own projects, tasks and time.

## Core value proposition
1. **Organize**: create projects and break them into tasks.
2. **Track**: log each block of work quickly, even when switching projects every 15 minutes, with a note per log.
3. **Understand**: see where time went, by project, task and period.

## Product principles
- Logging time must be fast. It should take a few seconds from any screen.
- Keep it simple, with no enterprise PM bloat (no Gantt charts, sprints or resource planning) unless scope says otherwise.
- The user's data is private to that user. Nothing is ever shared.
- It must work well on desktop, and be usable on mobile for quick logging.

## Success criteria
TODO: Define measurable goals (e.g. "a time log can be created in ≤ 3 interactions from the dashboard").

## Relationship to the legacy app
PM4 is a **greenfield rebuild** (ADR-0004). The code is new, but the owner wants the legacy
**task fields/workflow** and **time-capture model** kept (OQ-006, OQ-007). In the new names, that's
workdays with a start time, and quarter-hour logs linked to a task/project (the legacy event level is
dropped, OQ-019). The specs describe this explicitly. Everything else carries over only if a spec says so.

## Open questions
OQ-019, OQ-020

## Changelog
- 2026-09-26: Initial scaffold.
- 2026-09-26: Single-user decision; legacy time model retained.
