---
name: new-session
description: Hand off the current work to a fresh session. Writes a short kickoff prompt with everything the next session needs to resume. Use when the owner wants to continue the current work in a new session.
argument-hint: [focus for the next session]
disable-model-invocation: true
---

# Hand off to a new session

The current work will be resumed in a **different session** that has none of this conversation's
context, only the repo and the auto-loaded instructions (`AGENTS.md`, `CLAUDE.md`, memory). Write a
short prompt the owner can paste to kick it off. If `$ARGUMENTS` is given, focus the hand-off on it.

1. Check the real state first, don't rely on memory of the conversation: `git status --short`,
   `git branch --show-current`, `git worktree list`, and the status of any task involved
   (`tasks/BOARD.md` or the task file).
2. Write the prompt in one fenced block, at most ~15 lines, with:
   - **Goal**: what we're doing and why, in one or two sentences.
   - **State**: branch / worktree, what's done, what's uncommitted, task IDs and their status.
   - **Next steps**: the concrete next action(s), including the skill to run (e.g. `/implement-task T-0082`).
   - **Decisions and constraints** made in this session that aren't in the specs, ADRs or memory yet.
   - **Open questions / blockers**, if any (with `OQ-###` IDs).
   - **Read first**: only the files the next session needs (paths, with anchors where useful).
3. Don't repeat what `AGENTS.md`, `CLAUDE.md` or memory already say. Link to specs instead of
   restating them. No secrets.
4. If a decision from this session should outlive the hand-off, say so and propose recording it
   (spec, open question or memory) instead of only putting it in the prompt.

Output only the prompt block plus, if needed, one line on anything that must be done before switching
(e.g. an owner commit). Don't change any files.
