# CLAUDE.md

@AGENTS.md

---

## Claude Code specifics

The shared instructions above apply in full. This section adds only what is specific to Claude Code.

### Subagents (`.claude/agents/`)

| Agent | Use for |
| --- | --- |
| `spec-writer` | Drafting and refining files in `specs/`, and resolving open questions with the user |
| `task-planner` | Breaking approved specs into task files in `tasks/` |
| `api-engineer` | Implementing `api/` tasks (NestJS) |
| `web-engineer` | Implementing `web/` tasks (Next.js static export + shadcn) |
| `reviewer` | Reviewing a completed task against its specs, acceptance criteria and DoD |

No subagent may stage, commit, stash or push (AGENTS.md §3). When you delegate to a subagent,
repeat this rule in its prompt. Before reporting back, check that the subagent left its changes
uncommitted.

### Skills (`.claude/skills/` → symlink to `.agents/skills/`)

- `write-spec`: create or update a spec file using the standard structure
- `write-task`: create a task file from approved specs
- `implement-task`: the end-to-end loop for implementing one task

### Conventions for Claude

- Inside `web/` or `api/`, also follow that folder's own `AGENTS.md`/`CLAUDE.md` once it exists.
  Those files hold app-specific commands and must not contradict this file or the specs.
- Use plan mode for tasks sized `L`, and for any task that touches both apps.
- Before claiming a task is done, run the app's lint, type-check, test and build commands, and
  include the results in the task's *Implementation notes*.
