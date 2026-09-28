---
name: review-task
description: Review one PM4 task's uncommitted diff against its feature spec, acceptance tests and Definition of Done using the Opus reviewer, then record the verdict in the task file. Use when a task is in status review.
argument-hint: <T-####>
---

# Review task $ARGUMENTS

1. Delegate to the `reviewer` agent (it runs on Opus and is read-only). Prompt: "Review `$ARGUMENTS`.
   Follow your agent instructions. Don't edit files or change git state."
2. Write a short summary into the task's *Review* section: the verdict, the findings list, and the tier feedback.
3. The verdict decides the status:
   - `approve` → leave `status: review`. Tell the owner the diff is ready for their review. The owner sets `done`.
   - `changes-requested` → set `status: in-progress` (task and BOARD). Offer to run `implement-task $ARGUMENTS`
     with the findings, at the same tier, or one tier up if a finding is a design problem.
4. Show the owner the verdict and the findings. Don't commit. Commit only if the owner asks after reviewing (AGENTS.md §3).
