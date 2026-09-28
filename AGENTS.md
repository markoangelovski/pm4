# AGENTS.md — PM4

Instructions for AI coding agents (Claude Code, Codex, Cursor, etc.) working on **PM4**, a
single-user-per-account project management app. Users create **projects** and **tasks**, and log
**time spent**, with a required note on each log.

> This file is the entry point. It is intentionally short and points to the specs. Read it fully
> before doing anything, then read only the specs relevant to your task.

---

## 1. What this repository is

`pm4/` is a **monorepo** (ADR-0006). It holds the specifications, the task backlog, and both applications:

| Path | Role | Deploys to |
| --- | --- | --- |
| `specs/` | Product and technical specs, ADRs, open questions: **the source of truth** | — |
| `specs/06-features/` | Feature specs: the implementation plan an implementer works from | — |
| `tasks/` | Implementation backlog (`BOARD.md` = index) | — |
| `web/` | Frontend: Next.js static export + shadcn (own `AGENTS.md`) | GitHub Pages (`https://pm4.angelovski.top`) |
| `api/` | Backend: NestJS + Drizzle (own `AGENTS.md`) | Azure Web App (`*.azurewebsites.net`) |
| `.github/workflows/` | `ci.yml` (PR checks), `web-deploy.yml`, `api-deploy.yml` (path-filtered + manual) | — |
| `frontend_old/`, `backend_old/` | **Legacy** PM4 (own git repos, git-ignored). **Read-only reference.** | — |
| `next-shadcn-dashboard-main.zip` | Dashboard template, the base of `web/` (git-ignored) | — |

`web/` and `api/` are **independent npm projects**. Each has its own `package.json` and `package-lock.json`.
There are no npm workspaces and no shared code imports. The contract between them is the OpenAPI
document (ADR-0010): `api/openapi.json` → `web/lib/api/schema.d.ts` (`npm run api:types`).

## 2. Sources of truth (in priority order)

1. **Accepted ADRs** in `specs/decisions/`. Decisions already made. Do not re-open them silently.
2. **Specs** in `specs/` with `status: approved` (including feature specs).
3. **The task file** you are implementing (`tasks/**/T-*.md`).
4. Specs with `status: draft` or `review`. These are directional only. **Do not implement behavior
   that exists only in a draft spec.**
5. Existing code in `web/` / `api/`.
6. Legacy code (`frontend_old/`, `backend_old/`) and the template. These are **inspiration only**.
   The owner has said some legacy behavior carries over. Where it does, the specs spell it out.
   Never infer requirements from legacy code on your own.

If sources conflict, the higher one wins. If something is **unspecified**, do not invent product
behavior. Add an entry to `specs/open-questions.md` and ask the user (implementers: see §5, stop and report instead).

## 3. Non-negotiable constraints

- **The owner reviews before anything is committed.** Leave every change as an uncommitted,
  unstaged working-tree change. Commit only when the owner explicitly asks you to in the current
  conversation, after they have reviewed the diff, and then commit only the reviewed changes.
  **Subagents never commit. No agent ever pushes** (the owner pushes). Never run `git stash`,
  `git reset`, `git rebase`, `git merge`, `git checkout -- …`, `git restore` or `git clean`; if one
  seems necessary, ask the owner to run it. "Committed" in the specs (e.g. migrations,
  `openapi.json`) means "a tracked file in the repo".
- **Single user per account.** Nothing is shared between users. Every row belongs to exactly one
  user, and every API query is scoped to the authenticated user. → `specs/02-architecture/security.md`
- **Frontend is a static site** (`output: "export"`) on GitHub Pages, served from the domain root.
  There is no Node server at runtime: no Route Handlers, Server Actions, middleware/proxy, ISR,
  `cookies()`/`headers()`, image optimization or request-time rendering. → `specs/04-web/static-export.md`
- **The backend owns all data and business rules.** Postgres (Neon) through Drizzle. Redis (Redis Cloud)
  for sessions, OAuth state and rate limiting. → `specs/02-architecture/system-overview.md`
- **Cross-site auth.** The web app and the API are different sites, so there are no cookie sessions.
  Auth is Google OAuth handled by the API, and the web client sends bearer tokens. → `specs/02-architecture/security.md`
- **Storage-efficient schema.** The database has a fixed storage quota. Follow the storage rules in
  `specs/03-api/data-model.md` (column types, no stored derived data, lean indexes).
- **Time semantics.** Instants are stored as `timestamptz` and exchanged as ISO 8601 UTC. Work dates
  are stored as `date` and exchanged as ISO `YYYY-MM-DD` in the user's local calendar. The frontend
  computes ranges in the user's time zone. → `specs/03-api/conventions.md#dates-and-times`
- **Use the latest stable framework versions.** Next.js and NestJS evolve fast, and your training data
  may be out of date. Before using a framework API, check the docs bundled in `node_modules`
  (e.g. `web/node_modules/next/dist/docs/`) or the official docs.
- **npm** is the package manager for both apps. Never add pnpm/yarn/bun lockfiles.
- **TypeScript strict mode everywhere.** Type errors block the build.

## 4. Working rules

- **Never modify legacy code** (`frontend_old/`, `backend_old/`) or the template zip.
- **Never read, print, or copy secrets.** Do not open `.env*` files (except `.env.example`).
  Configuration is documented in `specs/02-architecture/environments.md`.
- **Stay in your app folder.** A `web` task changes only `web/`, and an `api` task only `api/`
  (plus its own task file). Cross-app changes need an explicit task.
- **Stay in scope.** Record necessary out-of-scope work as a proposal in the task's *Notes*.
- **Keep specs and code in sync.** If implementation shows the spec is wrong, stop and flag it.
- **Generate code with the framework CLIs, don't hand-write it.**
  - `web/`: every shadcn component via `npx shadcn@latest add <name>` from `web/`. Never hand-write
    component source into `components/ui/`. → `specs/04-web/conventions.md#components-shadcn`
  - `api/`: Nest building blocks via `npx nest generate <schematic> <name>` from `api/`.
    → `specs/03-api/conventions.md#code-generation-nest-cli`
- **Ask before hard-to-reverse actions**, such as creating repos, deploying, changing CI secrets,
  running migrations against Neon, adding or removing dependencies, or deleting files.

## 5. Rules for implementers

These apply to every agent implementing a task, whatever its model.

1. Read the task file, then the feature spec it points to, then **only** the files that spec lists
   under *Read first*. Don't explore beyond them unless the spec tells you to.
2. Reuse the utilities and patterns the spec names under *Reuse*. Don't invent new ones.
3. Don't touch anything listed under *Non-goals*, or any file not listed under *Files*.
4. **Never modify acceptance tests** (`*.ac.spec.ts`, `*.ac.e2e-spec.ts`, `*.ac.test.ts(x)`) to make
   them pass. You may add ordinary tests.
5. If the spec is ambiguous, contradictory or seems wrong, **stop and report**. Don't guess, and
   don't edit specs.
6. Don't add, remove or upgrade dependencies without asking.
7. If the acceptance tests still fail after **two** fix attempts, stop and report what you tried.
8. Before finishing, run lint, typecheck and tests for the affected app, and report the real output.

## 6. Workflow

Spec → acceptance tests → implement → review. Details: `specs/05-quality/task-routing.md`.

| Step | Who | Skill |
| --- | --- | --- |
| Write the feature spec (reads code first; no open questions left) | Opus, owner approves | `write-spec` |
| Create task files from the spec's task list | Sonnet | `write-task` |
| Write the acceptance tests (+ typed stubs), before any code | Opus | `write-acceptance-tests` |
| Implement one task | Tier on the task: Haiku / Sonnet / Opus | `implement-task` |
| Review the diff against the spec | Opus | `review-task` |

## 7. Commands

Run from the app folder (`cd web` / `cd api`). CI (`.github/workflows/ci.yml`) runs the same steps.

| App | Install | Dev | Lint | Typecheck | Test | Build |
| --- | --- | --- | --- | --- | --- | --- |
| `web/` | `npm ci` | `npm run dev` | `npm run lint` | `npm run typecheck` | `npm test` | `npm run build` (→ `out/`) |
| `api/` | `npm ci` | `npm run start:dev` | `npm run lint` | `npm run typecheck` | `npm test`, then `npm run test:e2e` (needs `docker compose up -d`) | `npm run build` |

Contract: `api/` → `npm run openapi:export`; `web/` → `npm run api:types`. Both must leave no diff when unchanged.

## 8. Glossary (short)

**Project**: a container for tasks. **Task**: a unit of work in a project. **Workday**: a user's
calendar day, with an optional start time. **Time log**: one block of work on a date (duration +
required note + task/project link), ordered by position and shown sequentially or grouped by project.
**Trash**: soft-deleted projects and tasks, purged after 31 days. Full glossary: `specs/00-product/glossary.md`.
