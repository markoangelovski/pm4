---
name: implement-task
description: Implement one PM4 task by ID. Delegates to api-engineer or web-engineer on the model set by the task's tier, runs the gates, and escalates on failure. Use when asked to implement, continue or finish a task.
argument-hint: <T-####>
---

# Implement a PM4 task: $ARGUMENTS

Run this from the main session. You orchestrate; the subagent writes the code.

## 1. Check it's ready
- Open the task file for `$ARGUMENTS` (find it via `tasks/BOARD.md`).
- Stop and report if any of these hold:
  - a `depends_on` task isn't `done`;
  - the feature spec isn't `approved`;
  - its *Open questions* isn't empty;
  - `ac_files` is empty, but the spec lists acceptance tests for this task (run `write-acceptance-tests` first).
- Older self-contained tasks (no `feature_spec`) are allowed. The engineer then reads the task's `specs:` list instead.

## 2. Start
- Set `status: in-progress` in the task file and in `tasks/BOARD.md`.
- Run `git status --short` and keep the output, so you can tell the subagent's changes from pre-existing ones.

## 3. Delegate
- `app: api` → `api-engineer`. `app: web` → `web-engineer`. `infra`/`spec` → do it yourself, or ask the owner.
- Call the Agent tool with `model` set to the task's `tier` (`haiku` / `sonnet` / `opus`). Prompt:
  "Implement `<T-####>`. Follow your agent instructions. Never stage, commit or push."
- The subagent returns a `RESULT:` report.

## 4. Check the result yourself
- `git status --short`: nothing staged, nothing committed, and no files outside the spec's *Files*
  for this task (other than the task file).
- `sha256sum` each `ac_files` entry and compare it with the recorded hash.
- Re-run the app's gates (AGENTS.md §7) and the acceptance tests. Trust your run over the report.

## 5. Escalate (`specs/05-quality/task-routing.md#escalation`)
- `BLOCKED` because of the spec → set `status: blocked` and write the question into the task.
  Tell the owner, with a proposed `OQ-###`. Don't retry.
- `FAILED`, or your checks in step 4 fail → add a row to *Attempts*, then re-delegate once at the next
  tier (haiku → sonnet → opus). Include the previous report and the failing output in the prompt.
- `FAILED` at opus → set `status: blocked` and ask the owner.

## 6. Hand off
- All green → set `status: review` (task file and BOARD). Don't set `done`.
- Tell the owner: the files changed, the gate results, the attempts, and a suggested commit message
  (`feat(api): … (T-####)`). Then suggest running `review-task <T-####>`.
- Don't commit. Commit only if the owner asks after reviewing (AGENTS.md §3).
