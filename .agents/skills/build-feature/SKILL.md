---
name: build-feature
description: Autonomous build of one PM4 feature or quick-lane change, from a confirmed prototype (or the owner's written description) to a tested branch with local servers running: spec, tasks, acceptance tests, implementation, review and fix rounds, with commits on the feature branch and a run report. Also revises a built feature from the owner's feedback (--revise). Use when the owner starts a session with the kickoff prompt from `prototype`, or asks to build a feature without the prototype step.
argument-hint: <feature slug | branch | description> [--revise <owner feedback>]
---

# Build $ARGUMENTS

Run in the main (Opus) session. The owner isn't watching: don't ask questions, decide and record. The rules are in
`specs/05-quality/task-routing.md#autonomous-runs`. Read that section once. The steps below don't repeat it.

## 0. Set up
- **Branch.** A web UI feature continues on the branch its prototype was committed on (`feat/<slug>`, worktree
  `.worktrees/feat-<slug>`). An API-only feature or a quick-lane change gets a new one:
  `git fetch github && git worktree add .worktrees/<name> -b <branch> github/master`, where the branch is
  `feat/<slug>` (new or changed behavior) or `fix/<slug>` (a bug fix). Work only in that worktree.
- **State.** `git status --short` must be clean. `git log --oneline github/master..HEAD` shows what's done. On a
  resumed run, continue from the first unfinished step, judging by the commits and the task statuses.
- **Node.** Prefix `export PATH=$HOME/.nvm/versions/node/v24.12.0/bin:$PATH;` before `npm`, `npx` and `node`.
  Run `npm ci` in `api/` and `web/` once.

## 1. Spec (`write-spec`, autonomous mode)
- Pick the lane (`write-spec` §0). **Quick lane:** write the task file (`written_by:` = your signature), set its
  status to `ready`, then go to step 4. It has no spec, no acceptance-test step and no Opus review.
- **Feature lane:** write the feature spec as `write-spec` describes. The prototype commit's message
  (`git log -1 <sha>`) lists the owner's decisions from the prototype session. Each one becomes a *Decisions* row
  sourced `Owner, prototype <sha>`. Every unknown gets the recommended answer,
  recorded as an *assumed* decision. Fill *Dependencies* with the packages the feature adds, or `—`.
- When *Open questions* is empty, set `status: approved` and `approved_by: <your signature>`. Add the changelog line
  "Approved by an autonomous run; the owner reviews it with the run report."

## 2. Tasks (`write-task`)
`node scripts/pm4.mjs tasks <spec>`, then the *Agents* row.

## 3. Acceptance tests (`write-acceptance-tests`)
Follow the skill. Install the spec's *Dependencies* first, from the app folder with `npm install <pkg>@<version>`,
so stubs and tests can import them. Then commit everything so far:
`test(<scope>): <feature> spec, tasks and acceptance tests`.

## 4. Implement (`implement-task`, one task at a time)
For each task in dependency order (`ready` in `tasks/BOARD.md`), follow the skill. After its check passes, commit
the task: `feat(<app>): T-#### <title>` (or `fix(…)`). The commit holds the code, the task file and the board.
A task that ends `blocked` stays blocked. Its dependents are skipped, and the other tasks continue.

## 5. Review (`review-feature`, feature lane only)
Follow the skill. On `changes-requested`, run `implement-task` with the findings, commit
(`fix(<app>): T-#### review findings`), and review again. Stop after **2** fix rounds, and leave the remaining
findings for the report.

## 6. Serve (both apps, for the owner's local testing)
```bash
M=$(git worktree list --porcelain | sed -n '1s/^worktree //p')       # the main checkout
ln -sfn "$M/api/.env" api/.env; ln -sfn "$M/web/.env.local" web/.env.local   # link, never read or copy
fuser -k 3000/tcp 3001/tcp 2>/dev/null || true                         # stop whatever serves the ports now
(cd api && docker compose up -d && npm run db:migrate)                 # the shared local DB, never Neon
B=$(git branch --show-current | tr / -)
(cd api && setsid nohup npm run start:dev > /tmp/pm4-$B-api.log 2>&1 &)
(cd web && setsid nohup npm run dev > /tmp/pm4-$B-web.log 2>&1 &)
```
- Wait until `curl -sf http://localhost:3001/health` answers and `http://localhost:3000` returns 200.
- Open the feature's pages with `agent-browser` and check they render without console errors, as far as that's
  possible without signing in.
- `next dev` rewrites a heading in `web/AGENTS.md`. Leave that change out of every commit. The symlinks are
  git-ignored.

## 7. Report
1. Fill the spec's *Run report* (quick lane: the task's *Implementation notes*). Follow
   `task-routing.md#run-report` for what goes in it.
2. Commit it: `docs(<scope>): <feature> run report`.
3. Give the owner the same report in chat. Add the URLs to test, the log files, and the next step: test locally,
   then either give feedback (`/build-feature <slug> --revise …`) or say the branch is ready for a pull request.

## Revise (`--revise <feedback>`)
The owner tested the branch and gave feedback. That feedback is an owner decision: record it as one.
1. For each point, find the decision, AC or code it changes. Answered OQs: replace `Assumed` with `Owner (date)`.
   Changed decisions: update *Decisions*, *Interfaces*, *Acceptance criteria* and the changelog. A UI change goes
   into the prototype twin as well as production (`specs/04-web/prototype.md#workflow`).
2. Changed or new ACs: add *Tasks* rows for new work (`pm4 tasks` skips existing rows), or set the affected tasks
   back to `in-progress`. Have `test-engineer` update the tests, then run `pm4 hash`.
3. Commit (`docs(<scope>): <feature> revision N`), then run steps 4–7 for the affected tasks only. Use one review
   round, scoped to the revision. The run report gets a *Revision N* part.

## Never
- Push, open a pull request, merge, or touch `master`. The owner says when the branch is ready (AGENTS.md §6).
- Anything on the hard-stop list (`task-routing.md#autonomous-runs`). Record it as an owner action instead.
- Commit secrets, the `.env` symlinks, or files outside the spec's *Files* table (plus the task files, the board
  and the specs it updates).
