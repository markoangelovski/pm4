---
name: implement-task
description: Implement one PM4 task by ID. Delegates to api-engineer or web-engineer on the model set by the task's tier, runs the gates, and escalates on failure. Use when asked to implement, continue or finish a task.
argument-hint: <T-####>
---

# Implement a PM4 task: $ARGUMENTS

Run from the main session. You orchestrate; the subagent writes the code. Don't read the feature spec
yourself unless something goes wrong. The script and the subagent's report are enough.

## 1. Check it's ready
- `node scripts/pm4.mjs ready $ARGUMENTS`. If it says NOT READY, report the reasons and stop.
- `node scripts/pm4.mjs check $ARGUMENTS --no-gates`. If the scope check lists files, they were
  there before this task started. Ask the owner to commit or remove them, unless they belong to earlier
  tasks of the same feature (the check allows those).

## 2. Delegate
- `node scripts/pm4.mjs status $ARGUMENTS in-progress`.
- `app: api` → `api-engineer`, `app: web` → `web-engineer`, with `model` = the task's `tier`.
  `infra`/`spec` tasks: do them yourself, or ask the owner.
- Prompt: "Implement `$ARGUMENTS`. Follow your agent instructions. Never stage, commit or push." On a
  retry, add the previous `RESULT` report and the failing `pm4 check` output.

## 3. Verify (trust your run over the report)
- `node scripts/pm4.mjs check $ARGUMENTS`. It checks hashes, scope and staging, and runs the gates and
  the spec's checks. Later tasks' ACs are excluded.
- `git log -1 --format=%H` must be unchanged since step 1 (the subagent didn't commit).

## 4. Escalate (`specs/05-quality/task-routing.md#escalation`)
- `BLOCKED: spec` → `pm4 status $ARGUMENTS blocked`, write the question into the task, propose an `OQ-###` to the owner.
- `BLOCKED: test` → check the test yourself. Fix it and re-run `pm4 hash <spec>` if it's wrong; then re-delegate at the same tier.
- `FAILED`, or the check fails → one row in *Attempts*, then re-delegate at the next tier. `FAILED` at opus → blocked, ask the owner.

## 5. Hand off
- `node scripts/pm4.mjs status $ARGUMENTS review`. This unblocks dependent tasks.
- Tell the owner in a few lines: the files changed, the check summary, and the attempts.
- Next: the next `ready` task of the feature. After the last one, suggest `review-feature <spec>`.
  A quick-lane task goes straight to the owner's review (or to `review-feature <T-####>` if its tier is opus).
- Don't commit. The owner commits after their review (AGENTS.md §3).
