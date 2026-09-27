# Architecture Decision Records

Short records of significant decisions: context, decision, consequences. An accepted ADR is never
edited in substance. To change a decision, write a new ADR that **supersedes** it.

| ADR | Title | Status |
| --- | --- | --- |
| [ADR-0001](ADR-0001-static-frontend-github-pages.md) | Frontend is a Next.js static export on GitHub Pages | accepted |
| [ADR-0002](ADR-0002-nestjs-backend-azure-webapp.md) | Backend is NestJS on an Azure Web App | accepted |
| [ADR-0003](ADR-0003-separate-repos-spec-workspace.md) | Separate app repos plus a spec workspace | superseded by ADR-0006 |
| [ADR-0004](ADR-0004-greenfield-rebuild.md) | Greenfield rebuild; legacy is reference only | accepted |
| [ADR-0005](ADR-0005-dashboard-template-as-web-base.md) | Dashboard template as the base of `web/` | accepted |
| [ADR-0006](ADR-0006-monorepo.md) | Monorepo with independent web and api packages | accepted |
| [ADR-0007](ADR-0007-google-oauth-bearer-tokens.md) | Google OAuth handled by the API, bearer tokens to the web | accepted |
| [ADR-0008](ADR-0008-data-stores.md) | Neon Postgres + Drizzle, Redis Cloud for ephemeral state | accepted |
| [ADR-0009](ADR-0009-web-data-layer-and-forms.md) | TanStack Query + react-hook-form + zod | accepted |
| [ADR-0010](ADR-0010-openapi-contract.md) | OpenAPI contract with generated web types | accepted |
| [ADR-0011](ADR-0011-background-jobs-bullmq.md) | Background jobs with BullMQ, run inside the API process | accepted |

New ADRs: copy [_TEMPLATE.md](_TEMPLATE.md) and use the next number.
