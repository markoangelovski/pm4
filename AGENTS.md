# AGENTS.md — PM4

Instructions for AI coding agents (Claude Code, Codex, Cursor, etc.) working on **PM4**, a
single-user-per-account project management app. Users create **projects** and **tasks**, and log
**time spent**, with a required note on each log.

> This file is the entry point. It is intentionally short and points to the specs. Read it fully
> before doing anything, then read only the specs relevant to your task.

---

## 1. What this repository is

`pm4/` is a **monorepo** (ADR-0006). It holds the specifications, the task backlog, and both applications:

| Path | Role | Deploys to | Status |
| --- | --- | --- | --- |
| `specs/` | Product and technical specs, ADRs, open questions: **the source of truth** | — | In progress |
| `tasks/` | Implementation backlog | — | In progress |
| `web/` | Frontend: Next.js static export + shadcn (from the dashboard template) | GitHub Pages at a custom domain (`https://pm4.angelovski.top`) | Bootstrapped (T-0002) |
| `api/` | Backend: NestJS + Drizzle | Azure Web App (`*.azurewebsites.net`) | Bootstrapped (T-0001) |
| `.github/workflows/` | Separate build and deploy workflows for `web` and `api` | — | To be created (T-0003, T-0004) |
| `frontend_old/`, `backend_old/` | **Legacy** PM4 (own git repos, git-ignored). **Read-only reference.** | — | Frozen |
| `next-shadcn-dashboard-main.zip` | Dashboard template, the **base of `web/`** (git-ignored) | — | Input to T-0002 |

`web/` and `api/` are **independent npm projects**. Each has its own `package.json` and `package-lock.json`.
There are no npm workspaces and no shared code imports. The contract between them is the OpenAPI
document (ADR-0010).

```
pm4/
├── AGENTS.md  CLAUDE.md          # agent entry points (CLAUDE.md imports this file)
├── .agents/skills/               # reusable agent skills (canonical; .claude/skills symlinks here)
├── .claude/                      # Claude Code settings + subagents
├── .github/workflows/            # web-deploy.yml, api-deploy.yml (path-filtered + manual trigger)
├── specs/                        # see specs/README.md
│   ├── 00-product/  01-requirements/  02-architecture/  03-api/  04-web/  05-quality/
│   ├── decisions/                # ADRs
│   └── open-questions.md         # unresolved decisions (OQ-*): check before assuming anything
├── tasks/                        # see tasks/README.md (BOARD.md = index)
├── web/                          # Next.js app (own AGENTS.md once bootstrapped)
└── api/                          # NestJS app (own AGENTS.md once bootstrapped)
```

## 2. Sources of truth (in priority order)

1. **Accepted ADRs** in `specs/decisions/`. Decisions already made. Do not re-open them silently.
2. **Specs** in `specs/` with `status: approved`.
3. **The task file** you are implementing (`tasks/**/T-*.md`).
4. Specs with `status: draft` or `review`. These are directional only. **Do not implement behavior
   that exists only in a draft spec.**
5. Existing code in `web/` / `api/`.
6. Legacy code (`frontend_old/`, `backend_old/`) and the template. These are **inspiration only**.
   The owner has said some legacy behavior carries over. Where it does, the specs spell it out.
   Never infer requirements from legacy code on your own.

If sources conflict, the higher one wins. If something is **unspecified**, do not invent product
behavior. Add an entry to `specs/open-questions.md` and ask the user.

## 3. Non-negotiable constraints

- **Agents never commit.** This applies to every agent, including subagents and any agent spawned
  by another agent. Leave every change as an uncommitted, unstaged working-tree change so the
  owner can review the diff and commit it themselves. Do not run `git add`, `git commit`,
  `git commit --amend`, `git stash`, `git reset`, `git rebase`, `git merge` or `git push`, even if a
  task, spec or skill seems to call for a commit. "Committed" in the specs (e.g. migrations,
  `openapi.json`) means "a tracked file in the repo", which the owner commits.
- **Single user per account.** Nothing is shared between users. Every row belongs to exactly one
  user, and every API query is scoped to the authenticated user. → `specs/02-architecture/security.md`
- **Frontend is a static site** (`output: "export"`) on GitHub Pages, served from the domain root.
  There is no Node server at runtime: no Route Handlers, Server Actions, middleware/proxy, ISR,
  `cookies()`/`headers()`, image optimization or request-time rendering. → `specs/04-web/static-export.md`
- **The template is built for a server, so it must be adapted** (standalone output, `app/api/**`, SWR).
  → `specs/04-web/template-adaptation.md`
- **The backend owns all data and business rules.** Postgres (Neon) through Drizzle. Redis (Redis Cloud)
  for sessions, OAuth state and rate limiting. → `specs/02-architecture/system-overview.md`
- **Cross-site auth.** The web app (custom domain) and the API (`*.azurewebsites.net`) are different
  sites, so there are no cookie sessions. Auth is Google OAuth handled by the API, and the web client
  sends bearer tokens. → `specs/02-architecture/security.md`
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
  (plus task/spec bookkeeping). Cross-app changes need an explicit task.
- **Stay in scope.** Record necessary out-of-scope work as a proposal in the task's *Notes*.
- **Keep specs and code in sync.** If implementation shows the spec is wrong, stop and flag it.
- **Commits are made by the owner, not agents** (see §3). When reporting back, you may suggest a
  conventional commit message (`feat(api): …`, `fix(web): …`, referencing `T-####`).
- **Generate code with the framework CLIs, don't hand-write it.**
  - `web/`: add every shadcn component, whether a primitive (`button`, `dialog`) or a block
    (`dashboard-01`, `sidebar-07`), with the shadcn CLI: `npx shadcn@latest add <name>`, run from
    `web/`. Never hand-write or copy-paste component source into `components/ui/`. A custom component
    is allowed only when no suitable shadcn component exists or it is behind a paywall.
    → `specs/04-web/conventions.md#components-shadcn`
  - `api/`: create modules, controllers, services, guards, pipes, filters, interceptors and other
    Nest building blocks with the Nest CLI: `npx nest generate <schematic> <name>`, run from `api/`.
    → `specs/03-api/conventions.md#code-generation-nest-cli`
- **Ask before hard-to-reverse actions**, such as creating repos, deploying, changing CI secrets,
  running migrations against Neon, or deleting files.

## 5. Agent workflow

**Implementing a task** (skill: `implement-task`):
1. Open `tasks/BOARD.md` and pick a `ready` task whose `depends_on` tasks are all `done`.
2. Read the task file, the specs it links to, and the relevant ADRs.
3. Set it to `in-progress` (task frontmatter + BOARD).
4. Implement it in `web/` or `api/`, including tests.
5. Verify the acceptance criteria and the Definition of Done (`specs/05-quality/definition-of-done.md`).
6. Fill in *Implementation notes*, set the task to `review`, and report back.

**Writing specs** (skill: `write-spec`): follow `specs/README.md`.
**Creating tasks** (skill: `write-task`): follow `tasks/README.md`.

## 6. Commands

Run from the app folder (`cd web` / `cd api`). They will be confirmed after bootstrap.

| App | Install | Dev | Lint | Test | Build |
| --- | --- | --- | --- | --- | --- |
| `web/` | `npm ci` | `npm run dev` | `npm run lint` | `npm test` | `npm run build` (→ `out/`) |
| `api/` | `npm ci` | `npm run start:dev` | `npm run lint` | `npm test` / `npm run test:e2e` | `npm run build` |

## 7. Glossary (short)

**Project**: a container for tasks. **Task**: a unit of work in a project. **Workday**: a user's
calendar day, with an optional start time. **Time log**: one block of work on a date (duration +
required note + task/project link), ordered by position and shown sequentially or grouped by project.
**Trash**: soft-deleted projects and tasks, purged after 31 days. Full glossary: `specs/00-product/glossary.md`.
