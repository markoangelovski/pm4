---
id: qa-task-routing
title: Task Routing and Escalation
status: review
owner: Marko Angelovski
last_updated: 2026-10-01
related: [qa-testing, qa-dod, feat-template]
---

# Task Routing and Escalation

## Purpose
Decides which lane a change takes, which model tier implements each task, and what happens when an
implementer gets stuck. The aim: the expensive model makes every decision once, cheaper models do the
typing, and scripts (`scripts/pm4.mjs`) do the bookkeeping.

## Lanes
| Lane | Use when | Flow |
| --- | --- | --- |
| **Quick** | One app, ≤ 3 files, size S. The behavior is already in an approved spec, or it's a bug fix with an obvious expected result, or tooling/docs. No new pattern, no auth/security logic, no contract or schema change | The main session writes a quick-lane task file (`tasks/_TEMPLATE.md`) → `implement-task` → `pm4 check` → the owner reviews the diff. No feature spec, no Opus review (unless the tier is opus) |
| **Feature** | Everything else | `write-spec` → owner approves → `write-task` (`pm4 tasks`) → `write-acceptance-tests` (+ `pm4 hash`) → owner commits → `implement-task` per task → `review-feature` → owner commits |

If the main session already has the files in context and the change is a few lines, it makes the
change itself. Delegating costs a fresh subagent context, which is more than the change.

## Roles
| Role | Model | Does |
| --- | --- | --- |
| Main session | opus | Specs, acceptance tests and quick-lane task files (inline, so it can ask the owner directly); orchestrates `implement-task` |
| Implementer | tier on the task | Code for one task (`api-engineer` / `web-engineer`), from `pm4 brief` |
| Reviewer | opus | One review per feature: the diff against the spec, risks, DoD |
| Explorer | haiku (built-in `Explore`) | Wide codebase searches only. Read a known file directly |
| `scripts/pm4.mjs` | — | Task files, BOARD, hashes, readiness, briefs, scope check, gates |

## Choosing a tier
Pick the **lowest** tier for which every condition in its row holds. If any condition fails, go up.

| Tier | All of these hold |
| --- | --- |
| **haiku** | ≤ 3 files. Every file has a named pattern to copy (*Read first*) or is fully specified (e.g. a DTO from a field table, a migration from a column table). No new decisions. No shared state, concurrency, auth or security logic. No contract change. Examples: DTOs, a schema table + generated migration, ordinary unit tests, renames, docs, adding a shadcn component with the CLI |
| **sonnet** | One app. Composes existing patterns, even across several files and layers (controller → service → repository, or page → hooks → form). Business rules are fully stated in the spec. No new cross-cutting pattern |
| **opus** | Any of: the **first** instance of a pattern (the first feature module, repository, `features/<domain>/api.ts`, form); auth, tokens or ownership checks beyond copying an existing guard; concurrency or ordering (e.g. dense log positions); transactions over several tables; performance-sensitive queries |

Rules of thumb:
- A task sized `M` is rarely `haiku`. Split it until the mechanical part stands alone.
- When a pattern appears for the first time, make it its own task. Later tasks copy it at a lower tier.
- Don't split below what one subagent context handles well: every task costs a fresh context
  (roughly 10–15k tokens before any work). Two haiku-sized edits to the same files are one task.
- A contract change is two tasks: the `api` task (exports `openapi.json`), then a `web` task that depends on it.
- Write a one-line reason next to every tier (e.g. "haiku: DTOs from the field table, copy `x.dto.ts`").

## Escalation
The implementer stops and returns one of:

| Result | When | `implement-task` then |
| --- | --- | --- |
| `BLOCKED: spec` | The spec is ambiguous, contradictory or wrong, or a needed file, pattern or dependency is missing | `status: blocked`, the question goes into the task, and a proposed `OQ-###` goes to the owner. A higher tier won't help |
| `BLOCKED: test` | An acceptance test contradicts the spec, or can't pass as written | The main session (test author) checks it. If the test is wrong, it fixes the test, re-runs `pm4 hash`, records it in *Attempts*, and re-delegates at the same tier. If the test is right, it re-delegates and explains why |
| `FAILED` | The acceptance tests still fail after **two** fix attempts | Re-delegate at the next tier (haiku → sonnet → opus), with the previous report and the failing `pm4 check` output. The diff stays |

- Each `FAILED` climbs one tier. A task is never retried at the same tier after `FAILED`.
- `FAILED` at opus → `status: blocked`, ask the owner.
- Every attempt gets a row in the task's *Attempts* table.

## Changelog
- 2026-09-28: Initial version.
- 2026-10-01: Lanes (quick / feature). Specs and tests are written inline by the main session. One
  review per feature. `BLOCKED: test`. Each `FAILED` climbs one tier. Mechanical steps moved to `scripts/pm4.mjs`.
