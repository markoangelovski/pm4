---
name: write-task
description: Create PM4 implementation task files in tasks/ from the Tasks table of an approved feature spec, with tier, dependencies and acceptance tests. Use when planning or grooming the backlog.
argument-hint: <specs/06-features/file.md>
---

# Create tasks for $ARGUMENTS

1. Run `node scripts/pm4.mjs tasks $ARGUMENTS`. It refuses specs that aren't `approved`. It creates one
   thin task file per *Tasks* row (in the milestone's folder), adds the BOARD rows, and updates the next
   free ID. It's idempotent: rows that already have a task are skipped.
2. New tasks start `blocked`. They become `ready` when `pm4 hash` records their acceptance tests and their dependencies are met.
3. Report the row → ID mapping to the owner. Don't edit the generated files unless the owner asks.

Quick-lane tasks (no feature spec) are written by hand from `tasks/_TEMPLATE.md` (see `write-spec` §0).
