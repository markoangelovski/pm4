# Task Board

**Next free ID:** T-0010

| ID | Title | Milestone | App | Size | Status | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| [T-0005](m0-foundation/T-0005-init-monorepo.md) | Initialize the pm4 monorepo | M0 | infra | S | done | — |
| [T-0001](m0-foundation/T-0001-bootstrap-api.md) | Bootstrap `api/` NestJS app | M0 | api | L | done | T-0005 |
| [T-0002](m0-foundation/T-0002-bootstrap-web-from-template.md) | Bootstrap `web/` from the dashboard template as a static export | M0 | web | L | done | T-0005 |
| [T-0003](m0-foundation/T-0003-web-github-pages-pipeline.md) | GitHub Pages workflow for `web/` | M0 | infra | M | done | T-0002 |
| [T-0004](m0-foundation/T-0004-api-azure-pipeline.md) | Azure Web App workflow for `api/` | M0 | infra | M | done | T-0001 |
| [T-0006](m0-foundation/T-0006-shared-prettier-config.md) | Same Prettier rules in `web/` and `api/` | M0 | infra | S | ready | — |
| [T-0007](m1-auth/T-0007-return-to-helpers.md) | Implement the returnTo helpers in `web/lib/auth/return-to.ts` | M1 | web | S | review | — |
| [T-0008](m1-auth/T-0008-move-app-routes-under-app.md) | Slash-free URLs, app pages under `/app`, landing page at the root | M1 | web | M | review | T-0007 |
| [T-0009](m1-auth/T-0009-landing-cta-login-returnto.md) | Implement `LandingCta` and use it on the landing page | M1 | web | S | review | T-0007, T-0008 |

Milestones M2–M6 have no tasks yet, and M1 has only the landing route split so far. They're created with the `write-task` skill once their specs are approved.
