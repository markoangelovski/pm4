---
name: review-feature
description: Review a finished PM4 feature (all its tasks in status review) — or one task — against its feature spec, acceptance tests and Definition of Done using the Opus reviewer, then record the verdict in the task files. Use when the last task of a feature reaches review.
argument-hint: <specs/06-features/file.md | T-####>
---

# Review $ARGUMENTS

1. For a feature, every task of the spec should be in `review` (see `tasks/BOARD.md`). If some aren't,
   ask the owner whether to review what's there now (useful on large features). Autonomous: review what's there, and
   name the blocked tasks in the prompt so the reviewer doesn't count their missing work as findings. Every task's *Attempts* rows and
   `implementer:` should be signed (`specs/05-quality/task-routing.md#agent-signatures`); tasks finished before
   2026-11-20 keep their tier-only rows.
2. Delegate to the `reviewer` agent (Opus, read-only). Prompt: "Review `$ARGUMENTS`. The change is everything after
   the test-first commit `<sha>`. Follow your agent instructions. Don't edit files or change git state." Find the SHA
   with `git log --format='%h %s' github/master..HEAD`. For a single task, give the commit before that task's commit.
3. Write a short summary into each task's *Review* section: the verdict line with the reviewer's signature
   (`**Verdict: approve** (reviewer `claude-code/claude-opus-5-5`, YYYY-MM-DD)`), the findings that concern that
   task, and its *Implementer assessment* row (the table header from `task-routing.md#agent-signatures`).
4. Then, per task:
   - `approve` → leave it in `review`. The owner tests the branch locally (`build-feature` §6–7). When they say
     it's ready, set `done` (`pm4 status <T> done`) in a commit on the branch, then push it and open its pull
     request (AGENTS.md §6 *Branches and pull requests*).
   - `changes-requested` → `pm4 status <T> in-progress`, and run `implement-task <T>` with the findings, at the
     same tier, or one tier up if a finding is a design problem. Then review again: at most 2 fix rounds
     (`build-feature` §5), after which the remaining findings go into the run report. A finding that changes UI
     is fixed in the prototype twin too (add it to *Files* if it isn't there), so the prototype stays ahead.
5. Put the verdict and findings into the run report. The *Review* sections are committed with the fix round, or
   with the run report.
