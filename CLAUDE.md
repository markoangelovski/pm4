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
| `test-engineer` | sonnet | Acceptance tests and typed stubs of one feature for one app (`write-acceptance-tests`). Never Haiku |
| `reviewer` | opus | One review per feature (`review-feature`): the diff against the spec. Read-only |
| `Explore` (built-in) | pass `model: haiku` | Wide codebase searches only; open known files directly |

Specs are written **inline in the main session**, not by subagents, so nothing is read twice. In an
autonomous run, the main session decides each open question itself and records it as an assumed decision. Acceptance tests are typing once the spec is approved: `test-engineer`
writes them, and the main session checks the diff against the spec before `pm4 hash`.

Subagents never commit (AGENTS.md §3). When you delegate, repeat that rule in the prompt, and check
afterwards that nothing was staged or committed. `.claude/hooks/guard-subagents.mjs` also blocks
subagents from changing git state or running `pm4 tasks`/`hash`/`status`, implementers from
editing acceptance tests, specs, agent config, the board and the other app, and `test-engineer` from
editing anything outside `api/` and `web/`.

### Skills (`.claude/skills/` → symlink to `.agents/skills/`)

- `prototype`: build or change a screen in the UI prototype with the owner, in the main session (Opus), on the
  feature's `feat/<slug>` branch. It ends with the prototype commit and a kickoff prompt for `build-feature`
- `build-feature <slug | description> [--revise …]`: the autonomous run from the confirmed prototype to a tested
  branch with local servers and a run report. It chains the skills below and commits each step
- `write-spec`: create or update a spec. Feature specs use `specs/06-features/_TEMPLATE.md`
- `write-task <feature-spec>`: create task files from an approved feature spec (runs `pm4 tasks`)
- `write-acceptance-tests <feature-spec>`: the test-first step: `test-engineer` (Sonnet) writes, the main session checks and runs `pm4 hash`
- `implement-task <T-####>`: delegate one task to the right engineer and model, run `pm4 check`, escalate
- `review-feature <feature-spec | T-####>`: one Opus review of the feature's diff, verdicts into the tasks
- `new-session [focus]`: write a short kickoff prompt to resume the current work in a fresh session

### Conventions for Claude

- Inside `web/` or `api/`, also follow that folder's `AGENTS.md`.
- Build the UI prototype inline in the main session (no subagent). Open only the screen's prototype files.
- Run `implement-task` from the main session (Opus). It orchestrates; the subagent does the coding.
- Keep the orchestrator lean: don't read the feature spec during `implement-task` unless a task fails.
  The `pm4` output and the subagent's report are enough.
- Before claiming a task is done, run `node scripts/pm4.mjs check <T-####>` and put its summary in
  the task's *Implementation notes*.
- Commit at the workflow's commit points on the work branch (AGENTS.md §6). Anything else waits until the owner
  says to commit (AGENTS.md §3). Never commit on `master`.
- An autonomous run doesn't ask questions (`AskUserQuestion`) or wait for approval. It decides, records the
  decision, and reports it (`specs/05-quality/task-routing.md#autonomous-runs`).
- Local servers for the owner's testing run from the feature's worktree on ports 3000/3001. Stop whatever
  serves those ports first (`build-feature` §6).
- Push only a work branch, from the main session, to open its pull request; never `master`, never
  `--force` (AGENTS.md §6 *Branches and pull requests*). `gh` must be logged in (`! gh auth login`).
