---
name: prototype
description: Build or change a PM4 screen in the frontend-only UI prototype (/proto/app/**, mocked session and in-memory data) together with the owner, until the owner confirms it. Use first for any feature or change that adds or changes web UI, before write-spec.
argument-hint: <screen or feature, e.g. "bookings: add a notes column">
---

# Prototype: $ARGUMENTS

Run this inline in the main (Opus) session, with the owner. No subagents. The rules are in
`specs/04-web/prototype.md`; read it once per session, plus `specs/04-web/screens.md` for the screen.

## 0. Branch
A new feature gets its own branch and worktree (AGENTS.md §6): `git fetch github && git worktree add
.worktrees/feat-<slug> -b feat/<slug> github/master`, then `npm ci` in `web/`. Work only in that worktree. A change to a
feature whose branch is still open continues on that branch. Several features in one session each get their own branch.

## 1. Start from what exists
- Open only this screen's prototype files: its `web/app/proto/app/<route>/page.dev.tsx`, the components it renders
  under `web/proto/features/<domain>/`, that domain's mock `api.ts`, and `web/proto/mock/seed.ts`.
- A new screen: mirror the production paths it will have (`prototype.md#layout-mirror-the-app`). A screen that
  exists in the app but not in the prototype yet: copy the production files to their `proto/` twins first, and
  point them at mock hooks.

## 2. Build
- Follow `specs/04-web/conventions.md` exactly (shadcn via the CLI, forms, `lib/time`, nuqs, loading / empty /
  error states). The code is promoted as is, so write it to production quality.
- `proto/features/<domain>/api.ts` is the real `features/<domain>/api.ts` (or what it will be) over
  `@/proto/mock/client`. A new endpoint goes into the mock client first; data the API doesn't serve yet goes into
  `proposed-types.ts`, shaped like a DTO.
- Seed the cases the owner needs to see (empty, typical, long text, edge values), with dates relative to today.
- Never import `@/features/*`, `@/lib/api/client` or `@/lib/auth/*` from the prototype, and never import
  `@/proto/*` from production code. Route files are `*.dev.tsx` only.

## 3. Show and iterate
- Run `npm run lint` and `npm run typecheck` in `web/` after each round (not the build or tests).
- Give the owner the URL (`http://localhost:3000/proto/app/...`) and say in a few lines what changed. Run the dev
  server yourself, from the feature's worktree: stop whatever serves port 3000 (`fuser -k 3000/tcp`), then
  `cd web && setsid nohup npm run dev > /tmp/pm4-<branch>-web.log 2>&1 &`.
- Unknown product behavior: ask the owner (`AskUserQuestion`, batched). Record the answers as `OQ-###` in
  `specs/open-questions.md` only when they affect the API or a layer spec.

## 4. Confirm
- The owner confirms the screen in words ("confirmed", "approved"). That is the go-ahead to commit it on the feature
  branch: the changed prototype files (and `specs/open-questions.md` if it changed), with the message
  `proto(web): <screen>: <what>`. The body lists, one line each, the decisions the owner made in this session that
  the files don't show (behavior, edge cases, what was rejected), so the spec can keep them. Leave out the
  `web/AGENTS.md` heading that `next dev` rewrites.
- Then give the owner the kickoff prompt for a **fresh session** (started in the main checkout), in one fenced block:
  ```
  /build-feature <slug>
  Branch feat/<slug> (worktree .worktrees/feat-<slug>), prototype <short sha>: <one line on the feature>.
  ```
  Add only what isn't in the commit or the specs. The build then runs without the owner (`build-feature`).
