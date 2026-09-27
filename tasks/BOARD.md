# Task Board

**Next free ID:** T-0006

| ID | Title | Milestone | App | Size | Status | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| [T-0005](m0-foundation/T-0005-init-monorepo.md) | Initialize the pm4 monorepo | M0 | infra | S | done | — |
| [T-0001](m0-foundation/T-0001-bootstrap-api.md) | Bootstrap `api/` NestJS app | M0 | api | L | review | T-0005 |
| [T-0002](m0-foundation/T-0002-bootstrap-web-from-template.md) | Bootstrap `web/` from the dashboard template as a static export | M0 | web | L | review | T-0005 |
| [T-0003](m0-foundation/T-0003-web-github-pages-pipeline.md) | GitHub Pages workflow for `web/` | M0 | infra | M | blocked | T-0002 |
| [T-0004](m0-foundation/T-0004-api-azure-pipeline.md) | Azure Web App workflow for `api/` | M0 | infra | M | blocked | T-0001 |

Milestones M1–M6 have no tasks yet. They're created with the `write-task` skill once their specs are approved.
