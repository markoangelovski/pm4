# CLAUDE.md

@AGENTS.md

---

## Claude Code specifics

The shared instructions above apply in full. This section adds only what is specific to Claude Code.

### Subagents (`.claude/agents/`)

| Agent | Default model | Use for |
| --- | --- | --- |
| `api-engineer` | haiku | Implementing `api/` tasks. `implement-task` sets the model from the task's `tier` |
| `web-engineer` | haiku | Implementing `web/` tasks. `implement-task` sets the model from the task's `tier` |
| `reviewer` | opus | One review per feature (`review-feature`): the diff against the spec. Read-only |
| `Explore` (built-in) | pass `model: haiku` | Wide codebase searches only; open known files directly |

Specs and acceptance tests are written **inline in the main session**, not by subagents, so open
questions go straight to the owner and nothing is read twice.

Subagents never commit (AGENTS.md §3). When you delegate, repeat that rule in the prompt, and check
afterwards that nothing was staged or committed. `.claude/hooks/guard-subagents.mjs` also blocks
subagents from changing git state or running `pm4 tasks`/`hash`/`status`, and implementers from
editing acceptance tests, specs, agent config, the board and the other app.

### Skills (`.claude/skills/` → symlink to `.agents/skills/`)

- `write-spec`: create or update a spec. Feature specs use `specs/06-features/_TEMPLATE.md`
- `write-task <feature-spec>`: create task files from an approved feature spec (runs `pm4 tasks`)
- `write-acceptance-tests <feature-spec>`: the test-first step (ends with `pm4 hash`)
- `implement-task <T-####>`: delegate one task to the right engineer and model, run `pm4 check`, escalate
- `review-feature <feature-spec | T-####>`: one Opus review of the feature's diff, verdicts into the tasks

### Conventions for Claude

- Inside `web/` or `api/`, also follow that folder's `AGENTS.md`.
- Run `implement-task` from the main session (Opus). It orchestrates; the subagent does the coding.
- Keep the orchestrator lean: don't read the feature spec during `implement-task` unless a task fails.
  The `pm4` output and the subagent's report are enough.
- Before claiming a task is done, run `node scripts/pm4.mjs check <T-####>` and put its summary in
  the task's *Implementation notes*.
- Commit only when the owner says so, after they've reviewed the diff (AGENTS.md §3). Never push.
