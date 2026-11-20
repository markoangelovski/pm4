---
name: implement-task
description: Implement one PM4 task by ID. Delegates to api-engineer or web-engineer on the model set by the task's tier (or to an OpenCode agent the owner names, in a Herdr pane), signs each attempt, runs the gates, and escalates on failure. Use when asked to implement, continue or finish a task.
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
- `node scripts/pm4.mjs promote $ARGUMENTS`. It copies the task's prototype files (`P` rows) into place and
  prints what's left for the implementer; it does nothing for a task without `P` rows. On a retry, skip it
  (the files are already there).
- `app: api` → `api-engineer`, `app: web` → `web-engineer`, with `model` = the task's `tier`, unless the owner
  names another agent (e.g. an OpenCode model) for this task. `infra`/`spec` tasks: do them yourself, or ask the owner.
- Note the attempt's **signature** from what you launch (`specs/05-quality/task-routing.md#agent-signatures`): a
  Claude subagent is `claude-code/<full model ID>` (`haiku` → `claude-haiku-5-5`), an OpenCode agent is
  `opencode/…` or `ori-opencode/…` with the model from its launch command. Never take it from the agent's report.
- Prompt: "Implement `$ARGUMENTS`. Follow your agent instructions. Never stage, commit or push." On a
  retry, add the previous `RESULT` report and the failing `pm4 check` output.

### OpenCode agent (when the owner names one)
Same steps, same rules. The agent runs in a Herdr pane in the feature's worktree, where the owner can watch it.
The launcher depends on the model (AGENTS.md §7 *OpenCode with a free model*).
1. **Brief:** write `.pm4-brief.md` at the worktree root (git-ignored). It holds the engineer's instructions plus the task.
   OpenCode reads `AGENTS.md` itself, but not Claude's agent files or the app's `AGENTS.md`:
   ```bash
   A=web   # the task's app
   { awk 'n>=2; /^---$/{n++}' .claude/agents/$A-engineer.md |
       sed "s#, and \`$A/AGENTS.md\` loads when you work in \`$A/\`. Don't re-read them.#. Read \`$A/AGENTS.md\` once yourself: it isn't loaded for you.#"
     printf '\n## Your task\nImplement `%s`. Never stage, commit or push.\n' T-####
   } > .pm4-brief.md
   ```
   On a retry, append the previous `RESULT` report and the failing `pm4 check` output.
2. **Permissions:** `.agents/opencode/implementer.json` denies git writes, `pm4 tasks|hash|status|promote`, and edits to
   `*.ac.*`, specs, agent config, `AGENTS.md`/`CLAUDE.md`, the board and the brief. Everything else is allowed, with
   `--auto`, so there are no prompts. It stands in for the Claude guard hook. It can't see edits made through the shell or to
   the other app, so step 3 still checks those.
3. **Launch** (a pane to the right; `hc` names match `[a-z0-9][a-z0-9_.-]{0,31}`):
   ```bash
   P='Read .pm4-brief.md and follow it.'
   # OpenCode Zen model (opencode/…): starts working at once
   CFG=$(jq -c --arg m opencode/<name>-free '. + {model: $m}' .agents/opencode/implementer.json)
   herdr-app do terminal.open --place right --name impl-t#### --folder "$PWD" \
     --argv "$(jq -cn --arg c "OPENCODE_CONFIG_CONTENT=$CFG" --arg p "$P" --arg o "$HOME/.opencode/bin/opencode" '["env",$c,$o,"--standalone","--auto","--prompt",$p]')"
   # OpenRouter model (<vendor>/<model>:free): Ori adds the key and merges the permissions
   CFG=$(jq -c . .agents/opencode/implementer.json)
   herdr-app do terminal.open --place right --name impl-t#### --folder "$PWD" \
     --argv "$(jq -cn --arg c "OPENCODE_CONFIG_CONTENT=$CFG" --arg m <vendor>/<model>:free --arg p "$P" '["env",$c,"ori","opencode","--model",$m,"--auto","--prompt",$p]')"
   ```
   Through Ori, `--prompt` only fills the input:
   `hc wait tN --output commands`, then `hc keys tN enter`.
4. **Manage:** `hc wait tN` until `idle` (a first return can still say `working`; wait again), then
   `hc read tN | grep -A6 'RESULT:'`. Answer a question or steer it by typing keys (`hc keys tN …`, spaces as `space`).
   `hc send` wraps text in `<hc>` tags. For more than a line, append to the brief and type `Read .pm4-brief.md again.`
5. **Finish:** take the `RESULT` report from the screen, then run step 3 as usual. Also check that nothing is staged
   (`git diff --cached --quiet`). Then `hc kill tN` (the pane closes with it) and delete `.pm4-brief.md`.

## 3. Verify (trust your run over the report)
- `node scripts/pm4.mjs check $ARGUMENTS`. It checks hashes, scope and staging, and runs the gates and
  the spec's checks. Later tasks' ACs are excluded.
- `git log -1 --format=%H` must be unchanged since step 1 (the subagent didn't commit).

Then record the attempt yourself: one row in *Attempts* (`| # | <signature> | <RESULT> | <one-line summary> |`).
A fix you make in the main session is its own row with your signature.

## 4. Escalate (`specs/05-quality/task-routing.md#escalation`)
- `BLOCKED: spec` → `pm4 status $ARGUMENTS blocked`, write the question into the task, propose an `OQ-###` to the owner.
- `BLOCKED: test` → check the test yourself. Fix it and re-run `pm4 hash <spec>` if it's wrong; then re-delegate at the same tier.
- `FAILED`, or the check fails → re-delegate at the next tier. `FAILED` at sonnet → blocked, ask the owner.

## 5. Hand off
- Set `implementer:` in the task's frontmatter to the signature of the attempt that finished it.
- `node scripts/pm4.mjs status $ARGUMENTS review`. This unblocks dependent tasks.
- Tell the owner in a few lines: the files changed, the check summary, and the attempts.
- Next: the next `ready` task of the feature. After the last one, suggest `review-feature <spec>`.
  A quick-lane task goes straight to the owner's review, then its own pull request.
- Don't commit. The owner commits after their review (AGENTS.md §3). Work happens on the feature's
  `task/T-####` branch, never on `master` (AGENTS.md §6 *Branches and pull requests*).
