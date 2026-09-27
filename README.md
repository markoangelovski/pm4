# PM4: Project Manager v4

PM4 is a single-user-per-account project management application for creating projects, managing tasks, and logging time spent on work.

This is a **monorepo** (see [ADR-0006](specs/decisions/ADR-0006-monorepo.md)) containing the product specifications, the implementation backlog, and two independent npm applications:

- **`web/`** — Next.js static export frontend, deployed to GitHub Pages
- **`api/`** — NestJS backend, deployed to Azure Web App
- **`specs/`** — Product and technical specifications
- **`tasks/`** — Implementation backlog and task tracking

For developer instructions, read [AGENTS.md](AGENTS.md). For product details, see [specs/README.md](specs/README.md). For the task backlog, see [tasks/BOARD.md](tasks/BOARD.md).

Each app (`web/` and `api/`) is an independent npm project with its own `package.json` and `package-lock.json`. See the app-specific `AGENTS.md` for framework-specific details.
