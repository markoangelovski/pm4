---
id: qa-task-routing
title: Task Routing and Escalation
status: approved
owner: Marko Angelovski
last_updated: 2026-11-21
related: [qa-testing, qa-dod, feat-template, web-prototype, ADR-0012, OQ-189]
---

# Task Routing and Escalation

## Purpose
Decides which lane a change takes, which model tier implements each task, and what happens when an
implementer gets stuck. The aim: the expensive model makes every decision once, cheaper models do the
typing, and scripts (`scripts/pm4.mjs`) do the bookkeeping.

## Lanes
| Lane | Use when | Flow |
| --- | --- | --- |
| **Quick** | One app, ≤ 3 files, size S. The behavior is already in an approved spec, or it's a bug fix with an obvious expected result, or tooling/docs. No new pattern, no auth/security logic, no contract or schema change | The main session writes a quick-lane task file (`tasks/_TEMPLATE.md`) → `implement-task` → `pm4 check` → the owner reviews the diff. No feature spec, no Opus review |
| **Feature** | Everything else | *(web UI only)* `prototype` → owner confirms → owner commits → `write-spec` → owner approves → `write-task` (`pm4 tasks`) → `write-acceptance-tests` (+ `pm4 hash`) → owner commits → `implement-task` per task (`pm4 promote` first) → `review-feature` → owner commits |

**Prototype first.** A feature that adds or changes web UI starts in the UI prototype
(`specs/04-web/prototype.md`), including later changes to screens already promoted: the prototype stays ahead
of the app. API-only features, and quick-lane changes with no visible UI change, skip it. A quick-lane change
that does change UI is made in the prototype twin too (both files in the task's `files:`).

If the main session already has the files in context and the change is a few lines, it makes the
change itself. Delegating costs a fresh subagent context, which is more than the change.

## Roles
| Role | Model | Does |
| --- | --- | --- |
| Main session | opus | The UI prototype (with the owner), specs and quick-lane task files (inline, so it can ask the owner directly); orchestrates `write-acceptance-tests` (checks the test diff against the spec, runs `pm4 hash`) and `implement-task` |
| Test writer | sonnet | The acceptance tests and typed stubs of one feature for one app (`test-engineer`), from the approved spec. Never Haiku: implementers are graded against these tests. An app with 3 or more independent test files gets one agent per file (`write-acceptance-tests`) |
| Implementer | tier on the task, or the agent the owner names | Code for one task (`api-engineer` / `web-engineer`, or an OpenCode agent briefed with the same instructions), from `pm4 brief` |
| Reviewer | opus | One review per feature: the diff against the spec, risks, DoD |
| Explorer | haiku (built-in `Explore`) | Wide codebase searches only. Read a known file directly |
| `scripts/pm4.mjs` | — | Task files, BOARD, hashes, readiness, briefs, prototype promotion, scope check, gates |

## Choosing a tier
**Haiku first, Sonnet at most** (OQ-189). Every task starts at `haiku` unless a sonnet trigger below applies.
No task is written for `opus`: the main session spells out the decisions an opus task would have made, so Sonnet
types them, and the Opus feature review checks them. Escalation (below) catches the tasks Haiku can't finish, so a
tier is never raised "to be safe".

| Tier | When |
| --- | --- |
| **sonnet** | Any of: the **first** instance of a pattern (the first feature module, repository, `features/<domain>/api.ts`, form); auth, tokens or ownership checks beyond copying an existing guard; concurrency or ordering (e.g. dense log positions); writes over several tables or systems, partial failure, locks; performance-sensitive queries. These stay above Haiku because passing tests don't prove them correct, so a weak attempt wouldn't surface as `FAILED`. For each, the spec's *Interfaces* spells out the algorithm step by step (order, what's written when, what each failure does). Also: the spec deliberately leaves code-level judgment open: non-trivial React state or effects, cache invalidation spread over several hooks, a large port that maps onto new data access, or a refactor of existing code across many (≳ 8) files |
| **haiku** | Everything else: one app, every file either has a pattern to copy (*Read first*) or is fully specified in *Interfaces*, the business rules are stated in the spec. Size and file count don't matter |

Rules of thumb:
- A decision Haiku would have to make that the spec doesn't make is a spec gap, not a tier problem:
  fill *Interfaces* until it's typing, or the implementer stops with `BLOCKED: spec`.
- When a pattern appears for the first time, make it its own (sonnet) task. Later tasks copy it at haiku.
- A task too big or too risky for one Sonnet context is split along pure/I-O lines (pure mappers and row builders
  at haiku or sonnet, the orchestration at sonnet), not raised to opus.
- Don't split below what one subagent context handles well: every task costs a fresh context
  (roughly 10–15k tokens before any work). Two small edits to the same files are one task.
- **Promoting a confirmed prototype screen is haiku** ("promote `proto/…`; wire per *Interfaces*"): the
  prototype made the UI decisions, and the spec lists the delta. One task per screen (promote + wire), not
  separate UI and data tasks. A sonnet trigger in the wiring (e.g. the first `api.ts` of a domain) still applies.
- A contract change is two tasks: the `api` task (exports `openapi.json`), then a `web` task that depends on it.
- Write a one-line reason next to every tier: for haiku, the pattern it copies (e.g. "copy `x.dto.ts`");
  for sonnet, the trigger.
- Revisit the triggers from the *Attempts* tables after each feature. If more than about a third of
  haiku attempts end in `FAILED`, a sonnet trigger is missing.

## Escalation
The implementer stops and returns one of:

| Result | When | `implement-task` then |
| --- | --- | --- |
| `BLOCKED: spec` | The spec is ambiguous, contradictory or wrong, or a needed file, pattern or dependency is missing | `status: blocked`, the question goes into the task, and a proposed `OQ-###` goes to the owner. A higher tier won't help |
| `BLOCKED: test` | An acceptance test contradicts the spec, or can't pass as written | The main session checks it. If the test is wrong, it fixes the test, re-runs `pm4 hash`, records it in *Attempts*, and re-delegates at the same tier. If the test is right, it re-delegates and explains why |
| `FAILED` | The acceptance tests still fail after **two** fix attempts | Re-delegate at the next tier (haiku → sonnet), with the previous report and the failing `pm4 check` output. The diff stays |

- Each `FAILED` climbs one tier. A task is never retried at the same tier after `FAILED`.
- `FAILED` at sonnet → `status: blocked`, ask the owner (an opus attempt is the owner's call).
- Every attempt gets a row in the task's *Attempts* table, signed with the agent that made it.

## Agent signatures
Every step of a feature records the agent that did it, so the review can judge each model on evidence.

**Format:** `<harness>/<model-id>[@effort]`, e.g. `claude-code/claude-opus-5-5`, `claude-code/claude-haiku-5-5`,
`opencode/opencode/deepseek-v4.1-flash-free`, `ori-opencode/deepseek/deepseek-v4.1-flash@high`. The harness is
`claude-code`, `opencode` (plain OpenCode, OpenCode Zen models) or `ori-opencode` (OpenCode through Ori, OpenRouter
models). The model ID is the exact one the harness ran (a Claude alias like `haiku` is written as its full ID).
`@effort` only when one was set. A change the owner made by hand is signed `owner`.

**Who writes it:** the session that launched the agent, from the launch command, never the agent itself (models
misreport who they are). Implementers don't write their own *Attempts* rows; `implement-task` does.

| Step | Where |
| --- | --- |
| Prototype, spec, tasks (`pm4 tasks`), acceptance tests | The feature spec's *Agents* table, filled in as each step finishes (all before the test-first commit). The acceptance tests row names the test writer and the main session that checked them |
| Implementation | The task file: one *Attempts* row per attempt (*Agent* column), and `implementer:` = the agent of the attempt that finished it |
| Review | The task's *Review*: the verdict line names the reviewer's signature, and the *Implementer assessment* row grades the implementer |
| Quick-lane task | The task file: `written_by:` (the task file's author), *Attempts*, `implementer:` |

**Implementer assessment** (by the reviewer, one row per task, in its *Review*):

| Agent | Attempts | ACs first try | Rules kept | Blocks right | Code | Grade | Fit |
| --- | --- | --- | --- | --- | --- | --- | --- |

- *Rules kept*: no commit or staging, no edits to acceptance tests, specs or agent config, nothing outside *Files*
  (OpenCode agents have no guard hook, so this is checked here). *Blocks right*: each `BLOCKED` was a real gap,
  and no gap was worked around. *Code*: quality beyond the tests.
- *Grade*: **A** done on the first attempt, at most minor findings · **B** done, with an extra fix round or a major
  finding · **C** needed escalation or a main-session fix · **D** `FAILED`, a rule broken, or a wrong `BLOCKED`.
- *Fit*: `right`, `too strong` (a cheaper agent would do) or `too weak`, with one line of evidence.
- Finished tasks from before 2026-11-20 keep their tier-only rows; they aren't back-filled.

## Changelog
- 2026-09-28: Initial version.
- 2026-10-01: Lanes (quick / feature). Specs and tests are written inline by the main session. One
  review per feature. `BLOCKED: test`. Each `FAILED` climbs one tier. Mechanical steps moved to `scripts/pm4.mjs`.
- 2026-10-04: Haiku first. Every task starts at haiku unless an opus or sonnet trigger applies; the
  file-count and size limits on haiku are gone. Escalation unchanged.
- 2026-10-11: Prototype first for web UI (ADR-0012); promoting a confirmed prototype screen is a haiku task.
- 2026-10-17: Sonnet is the highest task tier (OQ-189): the opus triggers became sonnet triggers that need the algorithm spelled out in *Interfaces*; `FAILED` at sonnet → blocked.
- 2026-11-20: Agent signatures on every step (`<harness>/<model-id>[@effort]`), written by the launching session; the spec's *Agents* table, `implementer:` and an *Agent* column in *Attempts*; the reviewer's *Implementer assessment* replaces the tier feedback. OpenCode agents can implement tasks.
- 2026-11-21: Sonnet `test-engineer` subagents write the acceptance tests (one per app, one per file when an app has 3 or more); the main session checks their diff against the spec and runs `pm4 hash`.
