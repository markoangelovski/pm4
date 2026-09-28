---
name: write-acceptance-tests
description: Test-first step for a PM4 feature. Writes the *.ac.* acceptance tests and typed stubs listed in an approved feature spec, confirms they fail for the right reason, and records their hashes in the task files. Use after write-task and before implement-task.
argument-hint: <specs/06-features/file.md>
context: fork
agent: test-writer
---

Write the acceptance tests for the feature spec `$ARGUMENTS`. Follow your agent instructions.

- Tasks must already exist for this spec (`write-task`). Record each test file's `sha256sum` in the
  `ac_files` of every task whose *Done when* column names one of its ACs.
- Never stage, commit, stash or push.
- Final report: the files written, each AC with its expected failure reason, the gate results, and the task files updated.
