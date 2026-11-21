---
name: write-acceptance-tests
description: Test-first step for a PM4 feature. Delegates the *.ac.* acceptance tests and typed stubs listed in an approved feature spec to test-engineer (Sonnet) subagents, checks their diff against the spec, confirms the tests fail for the right reason, and records their hashes in the task files. Use after write-task and before implement-task.
argument-hint: <specs/06-features/file.md>
---

# Acceptance tests for $ARGUMENTS

Run from the main (Opus) session. It orchestrates and checks; `test-engineer` subagents on Sonnet write the
tests (`specs/05-quality/task-routing.md#roles`). If the spec was just written in this conversation, it's
already in context: don't re-read it.

## 1. Check it's ready
Refuse if the spec isn't `approved`, if *Open questions* isn't empty, or if `pm4 tasks` hasn't run.

## 2. Plan the split
From the *Acceptance criteria* table, group the `*.ac.*` files by app (`manual` rows have no file).

- **One agent per app** by default. A feature with tests in both apps gets two, launched in parallel in one message.
- **An app with 3 or more independent test files** splits further: one agent per file. Then:
  - the typed stubs come first, written by one agent (the stubs agent: it may also take a test file) and
    finished before the other agents of that app start, since several test files import them;
  - one agent owns the updates to **existing** acceptance tests the feature breaks, so two agents never edit
    the same file;
  - api e2e files (`*.ac.e2e-spec.ts`) always stay with one agent: they share one Postgres.
- Every agent gets its assignment spelled out: the spec path, the app, its files, and whether it owns the
  stubs and the existing-test updates.

Launch each with `subagent_type: test-engineer`, `model: sonnet`. Repeat in the prompt that subagents never
stage or commit.

## 3. Handle the reports
- `BLOCKED: spec` → the spec doesn't say enough to test without guessing. Ask the owner (`OQ-###`), update the
  spec once answered, and re-delegate. Don't answer the question yourself.
- `FAILED` → read the failure. Fix it yourself if it's small (a setup or import error), otherwise re-delegate
  once with the report. Still failing → ask the owner.

## 4. Check the diff (trust your read over the report)
`git status` and `git diff` must show only `*.ac.*` files and the listed stubs, nothing staged. Then read every
test against the *Acceptance criteria* table, row by row:
- each AC has its `it`, named `AC-# FR-…: …`, testing the stated case and expected value: no case left out,
  no behavior the spec doesn't state, no assertion weaker than the row;
- fixtures match the table's fixture line; stubs have the exact signature and only throw;
- the existing acceptance tests the feature breaks were found: request bodies of a changed input type,
  count or exact-text assertions on a changed screen, API mocks the new code calls through an unanswered route.
  An implementer may not edit those tests, so a fixture missed here blocks the task.

Fix small gaps yourself. A wrong or missing test goes back to its agent with the exact rows.

## 5. Run the gates
From each affected app: `npm run lint` and `npm run typecheck` pass, every new acceptance test **fails for the
expected reason** (not implemented, 404, missing route; never a syntax, import or setup error), and the existing
tests still pass. With a split, this is the first time the app's files are checked together.

## 6. Record
1. `node scripts/pm4.mjs hash $ARGUMENTS`. It records each file's sha256 in the tasks that own its ACs, and
   moves tasks with no unmet dependencies to `ready`.
2. Add the **Acceptance tests** row to the spec's *Agents* table: the test-engineer's signature (e.g.
   `claude-code/claude-sonnet-5-5`), then `, checked by` and your own, and today's date. Fixes you made
   yourself go in the same cell (`…, fixes by claude-code/claude-opus-5-5`). It's part of the test-first commit.

## 7. Report
The files written (and by which agent), each AC with its failure reason, the gate results, and what you fixed
in the check. Then ask the owner to review and **commit the test-first step** (spec, tasks, tests, stubs) as
the first commit on the feature's `task/T-####` branch, so each implementation diff contains only
implementation. It isn't pushed to `master` on its own: its tests fail until the implementation lands in the
same pull request. Never stage or commit yourself.
