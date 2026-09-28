# CLAUDE.md

@AGENTS.md

---

## Claude Code specifics

The shared instructions above apply in full. This section adds only what is specific to Claude Code.

### Subagents (`.claude/agents/`)

| Agent | Default model | Use for |
| --- | --- | --- |
| `spec-writer` | opus | Feature specs and other files in `specs/`; resolving open questions with the owner |
| `task-planner` | sonnet | Creating task files from an approved feature spec's task list |
| `test-writer` | opus | Writing a feature's acceptance tests and typed stubs, before implementation |
| `api-engineer` | sonnet | Implementing `api/` tasks. `implement-task` sets the model from the task's `tier` |
| `web-engineer` | sonnet | Implementing `web/` tasks. `implement-task` sets the model from the task's `tier` |
| `reviewer` | opus | Comparing a task's diff against its spec and acceptance tests. Read-only |
| `Explore` (built-in) | pass `model: haiku` | Codebase searches for any of the above |

Subagents never commit (AGENTS.md §3). When you delegate, repeat that rule in the prompt, and check
afterwards that nothing was staged or committed. `.claude/hooks/guard-subagents.mjs` also blocks
subagents from changing git state, and implementers from editing acceptance tests, specs, agent config and the other app.

### Skills (`.claude/skills/` → symlink to `.agents/skills/`)

- `write-spec`: create or update a spec. Feature specs use `specs/06-features/_TEMPLATE.md`
- `write-task`: create task files from an approved feature spec
- `write-acceptance-tests <feature-spec>`: the test-first step
- `implement-task <T-####>`: delegate one task to the right engineer and model, run the gates, escalate
- `review-task <T-####>`: review the diff against the spec and write the verdict into the task

### Conventions for Claude

- Inside `web/` or `api/`, also follow that folder's `AGENTS.md`.
- Run `implement-task` from the main session (Opus). It orchestrates; the subagent does the coding.
- Use plan mode for Opus-tier tasks and for any task that touches both apps.
- Before claiming a task is done, run the app's lint, typecheck, test and build commands, and
  include the results in the task's *Implementation notes*.
- Commit only when the owner says so, after they've reviewed the diff (AGENTS.md §3). Never push.
