# ADR-0003: Separate app repos plus a spec workspace

- **Status:** superseded by ADR-0006
- **Date:** 2026-09-26
- **Deciders:** Marko Angelovski
- **Related:** arch-repos, OQ-001

## Context
The frontend and backend deploy to different platforms with separate pipelines. Agents need one shared
place for specs and tasks.

## Decision
`pm4/` is a spec workspace (AGENTS.md, specs, tasks). `web/` and `api/` are independent git repos
checked out inside it and ignored by the workspace's `.gitignore`.

## Alternatives considered
- Monorepo (pnpm workspaces / Turborepo): makes type sharing easy, but mixes two deploy targets. Initially rejected; later adopted in ADR-0006.

## Consequences
- API types are shared through OpenAPI generation or an equivalent approach (OQ-012), not through direct imports.
- Each app repo has its own thin AGENTS.md that points back to the workspace.
