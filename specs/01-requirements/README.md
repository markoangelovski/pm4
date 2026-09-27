---
id: req-overview
title: Requirements Overview
status: draft
owner: Marko Angelovski
last_updated: 2026-09-27
related: [prod-scope]
---

# Requirements Overview

## Purpose
Explains how requirements are written, and indexes the requirement specs.

## Files
| Area | Code | File |
| --- | --- | --- |
| Auth and accounts | AUTH | [auth.md](auth.md) |
| Public landing page | LAND | [landing.md](landing.md) |
| Projects | PRJ | [projects.md](projects.md) |
| Tasks | TSK | [tasks.md](tasks.md) |
| Time capture | TLOG | [time-logs.md](time-logs.md) |
| Dashboard and reporting | RPT | [reporting.md](reporting.md) |
| Trash and soft delete | TRASH | [trash.md](trash.md) |
| Non-functional | NFR | [non-functional.md](non-functional.md) |

## Requirement format
```markdown
### FR-PRJ-001: Create project
**Priority:** Must | Should | Could
**Statement:** The user can create a project by providing a name (required) and a description (optional).
**Rules:**
- Name: 1–120 characters, trimmed, unique per user (TBD)
**Acceptance criteria:**
- Given I am signed in, when I submit a valid name, then the project is created and appears in my project list.
- Given I submit an empty name, then I see a validation error and nothing is created.
**API:** API-PRJ-001 · **Screens:** SCR-003
```

Requirements describe **behavior**, not implementation. Every Must requirement needs acceptance criteria
before the spec can move to `review`.

## Changelog
- 2026-09-26: Initial scaffold.
- 2026-09-27: Added the public landing page area (LAND).
