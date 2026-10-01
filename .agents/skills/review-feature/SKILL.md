---
name: review-feature
description: Review a finished PM4 feature (all its tasks in status review) — or one task — against its feature spec, acceptance tests and Definition of Done using the Opus reviewer, then record the verdict in the task files. Use when the last task of a feature reaches review.
argument-hint: <specs/06-features/file.md | T-####>
---

# Review $ARGUMENTS

1. For a feature, every task of the spec should be in `review` (see `tasks/BOARD.md`). If some aren't,
   ask the owner whether to review what's there now (useful on large features).
2. Delegate to the `reviewer` agent (Opus, read-only). Prompt: "Review `$ARGUMENTS`. Follow your agent
   instructions. Don't edit files or change git state."
3. Write a short summary into each task's *Review* section: the verdict, the findings that concern
   that task, and the tier feedback.
4. Then, per task:
   - `approve` → leave it in `review`. Tell the owner the feature is ready for their review. After
     reviewing, the owner sets `done` (`pm4 status <T> done`) and commits the feature.
   - `changes-requested` → `pm4 status <T> in-progress`, and offer `implement-task <T>` with the
     findings, at the same tier, or one tier up if a finding is a design problem.
5. Show the owner the verdict and findings. Don't commit (AGENTS.md §3).
