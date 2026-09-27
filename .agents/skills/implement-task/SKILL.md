---
name: implement-task
description: End-to-end loop for implementing a single PM4 task from tasks/ in the web/ or api/ folder of the monorepo, from reading specs through verification and status updates. Use when asked to implement, continue or finish a task.
---

# Implement a PM4 task

## 1. Prepare
- Read `AGENTS.md`, then the task file.
- Check that every `depends_on` task is `done`. If one isn't, stop and report.
- Read every linked spec section and ADR. Also read the app folder's own `AGENTS.md`, if present.
- If anything is ambiguous or missing from the specs, stop, add an OQ to
  `specs/open-questions.md`, and ask the user. Don't guess.

## 2. Start
- Set `status: in-progress` in the task frontmatter and in `tasks/BOARD.md`.
- For `L` tasks or tasks that touch several modules, write a short plan in *Implementation notes* first.

## 3. Build
- Work only in the target app folder (`web/` or `api/`). Match its existing conventions.
- Write tests alongside the code, as `specs/05-quality/testing.md` requires.
- For framework APIs, check the installed version's docs. Don't rely on memory.

## 4. Verify
- Run lint, type-check, tests and build. Everything must pass.
- Tick each acceptance criterion only when you have evidence (a test name, a command output, a screenshot).
- Go through `specs/05-quality/definition-of-done.md`.
- Web tasks: confirm `npm run build` produces `out/` and the feature works when that folder is served
  statically from the site root (e.g. `npx serve out`).

## 5. Hand off
- Fill in *Implementation notes*: what changed, decisions made, commands run with their results,
  and any follow-ups.
- Set `status: review` (task file and BOARD). Don't set `done`. That happens after review.
- Summarize for the user and suggest a commit message. Never stage, commit or push: the owner
  reviews the diff and commits (AGENTS.md §3).
