---
id: qa-task-routing
title: Task Routing and Escalation
status: draft
owner: Marko Angelovski
last_updated: 2026-09-28
related: [qa-testing, qa-dod, feat-template]
---

# Task Routing and Escalation

## Purpose
Decides which model tier implements a task, and what happens when an implementer gets stuck.
The spec writer applies it when writing a feature spec's *Tasks* section. `implement-task` reads
the resulting `tier` from the task file.

## Roles
| Role | Model | Does |
| --- | --- | --- |
| Planner / spec writer | opus | Feature specs, routing, resolving questions with the owner |
| Test writer | opus | Acceptance tests and typed stubs, before implementation |
| Implementer | tier on the task | Code for one task |
| Reviewer | opus | Diff vs spec, acceptance tests, DoD |
| Explorer | haiku (built-in `Explore`) | Codebase searches for any role |

## Choosing a tier
Pick the **lowest** tier for which every condition in its row holds. If any condition fails, go up.

| Tier | All of these hold |
| --- | --- |
| **haiku** | ≤ 3 files. Every file has a named pattern to copy (*Reuse*) or is fully specified (e.g. a DTO from a field table, a migration from a column table). No new decisions. No shared state, concurrency, auth or security logic. No contract change. Examples: DTOs, a schema table + generated migration, ordinary unit tests, renames, docs, adding a shadcn component with the CLI |
| **sonnet** | One app. Composes existing patterns, even across several files and layers (controller → service → repository, or page → hooks → form). Business rules are fully stated in the spec. No new cross-cutting pattern |
| **opus** | Any of: the **first** instance of a pattern (the first feature module, repository, `features/<domain>/api.ts`, form); auth, tokens or ownership checks beyond copying an existing guard; concurrency or ordering (e.g. dense log positions); transactions over several tables; cross-app contract changes; performance-sensitive queries; a task a lower tier handed back |

Rules of thumb:
- A task sized `M` is rarely `haiku`. Split it until the mechanical part stands alone.
- When a pattern appears for the first time, make it its own `opus` or `sonnet` task. Later tasks
  can then copy it at a lower tier.
- Write a one-line reason next to every tier in the spec (e.g. "haiku: DTOs from the field table, copy `x.dto.ts`").

## Escalation
1. The implementer stops and returns `BLOCKED` when the spec is ambiguous, contradictory or wrong,
   or when a needed file, pattern or dependency is missing. It never guesses and never edits specs.
2. The implementer stops and returns `FAILED` when the acceptance tests still fail after **two** fix
   attempts.
3. `implement-task` records the attempt in the task's *Implementation notes*, then:
   - `BLOCKED` on the spec → back to the spec writer (opus) and the owner. Retrying at a higher tier won't help.
   - `FAILED` → retry once at the next tier (haiku → sonnet → opus), keeping the previous diff.
   - `FAILED` at opus → stop and ask the owner.
4. A task is never retried at the same tier after `FAILED`.

## Changelog
- 2026-09-28: Initial version.
