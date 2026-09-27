---
id: arch-repos
title: Repository Layout
status: approved
owner: Marko Angelovski
last_updated: 2026-09-27
related: [ADR-0006]
---

# Repository Layout

## Purpose
Defines the monorepo layout and where everything lives (ADR-0006).

## Layout
```
pm4/                               # git root. Remote: a new GitHub repo (OQ-033)
├── AGENTS.md  CLAUDE.md  .gitignore
├── .agents/skills/   .claude/
├── .github/workflows/
│   ├── web-deploy.yml             # push to master touching web/** or api/openapi.json, + workflow_dispatch
│   ├── api-deploy.yml             # push to master touching api/**, + workflow_dispatch
│   └── ci.yml                     # pull_request: runs web and/or api checks based on changed paths
├── specs/   tasks/
├── web/                           # independent npm project
│   ├── AGENTS.md  CLAUDE.md  package.json  package-lock.json  .nvmrc  .env.example
│   └── …
├── api/                           # independent npm project
│   ├── AGENTS.md  CLAUDE.md  package.json  package-lock.json  .nvmrc  .env.example
│   ├── openapi.json               # committed contract (ADR-0010)
│   ├── drizzle/                   # committed migrations
│   └── docker-compose.yml         # local Postgres + Redis
├── frontend_old/  backend_old/    # legacy, git-ignored, read-only
└── next-shadcn-dashboard-main.zip # template, git-ignored
```

## Rules
- No root `package.json`. No npm workspaces. No imports across `web/` ↔ `api/`.
- Each app's `AGENTS.md` holds app-specific commands and structure, and links to `../specs`. It must not contradict the root docs.
- Legacy folders keep their own `.git`, and are ignored by the monorepo.

## Branching and PRs (proposed)
- Default branch `master`. Short-lived `feat/T-####-slug` branches, with PRs into `master`.
- `ci.yml` must pass before merge. A merge deploys only the app(s) whose paths changed. Either app can be redeployed manually.

## Legacy reference: what's useful
| Legacy path | Worth looking at for |
| --- | --- |
| `backend_old/.github/workflows/azure-webapps-node.yml` | A working Azure Web App deploy (publish profile, zip of `dist` + `node_modules`) |
| `backend_old/src/events`, `src/days` | Time capture behavior (see req-time-logs §Legacy behavior) |
| `frontend_old/.github/workflows/workflow.yml` | GitHub Pages deploy |
| `frontend_old/src/components/pm/events/*`, `pm/time/TimeDisplay.tsx` | Time-capture UX |
| `frontend_old/src/components/pm/tasks/*` | Task form and fields, status select, due-date indicator |

## Open questions
—

## Changelog
- 2026-09-26: Initial scaffold.
- 2026-09-26: Updated with owner answers to OQ-001–018.
- 2026-09-26: OQ-033 resolved: a new GitHub repo.
- 2026-09-27: Removed trash-purge.yml (ADR-0011).
- 2026-09-27: Default branch is `master`.
- 2026-09-27: Approved by the owner.
