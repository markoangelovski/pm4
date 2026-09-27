# ADR-0006: Monorepo with independent web and api packages

- **Status:** accepted
- **Date:** 2026-09-26
- **Deciders:** Marko Angelovski
- **Supersedes:** ADR-0003
- **Related:** arch-repos, arch-deployment, OQ-001, OQ-010, OQ-033

## Context
The owner wants one repository for specs and both apps, while still building and deploying the
frontend and backend independently.

## Decision
- `pm4/` is a single git repository containing `specs/`, `tasks/`, `web/` and `api/`.
- `web/` and `api/` are **independent npm projects**, each with its own `package.json` and
  `package-lock.json`. There are no npm workspaces and no root `package.json`. Nothing is imported across folders.
- Two GitHub Actions workflows: `web-deploy.yml` and `api-deploy.yml`. Each is triggered by pushes to
  the default branch that touch its folder (`paths:` filter), and each can be run manually
  (`workflow_dispatch`). A PR workflow runs checks for whichever app changed.
- The package manager is **npm** for both apps.

## Alternatives considered
- npm workspaces with a shared package: easy type sharing, but it complicates the self-contained Azure
  deploy artifact and couples installs. Not needed, given OpenAPI-generated types (ADR-0010).
- Separate repos (ADR-0003): specs and code drift apart, and cross-app changes need several PRs.

## Consequences
- The API contract crosses the folder boundary only through the committed `api/openapi.json` (ADR-0010).
- Legacy repos stay in `frontend_old/` and `backend_old/`, and are git-ignored.
- Agent instructions: each app gets its own `AGENTS.md`/`CLAUDE.md` inside its folder.
