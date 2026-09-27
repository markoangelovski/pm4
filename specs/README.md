# PM4 Specifications

This folder is the **single source of truth** for what PM4 does and how it is built. Agents
implement from here, and code that disagrees with an approved spec is a bug in the code or in the spec.
Either way, fix the disagreement. Never ignore it.

## How to read the specs

| If you are… | Read, in order |
| --- | --- |
| New to the project | `00-product/vision.md` → `00-product/scope.md` → `00-product/glossary.md` → `02-architecture/system-overview.md` |
| Implementing an API task | Task file → `03-api/*` → relevant `01-requirements/*` → `02-architecture/security.md` |
| Implementing a web task | Task file → `04-web/static-export.md` → `04-web/*` → relevant `01-requirements/*` → `03-api/endpoints.md` |
| Writing specs | This file → `open-questions.md` → the spec you are changing |

## Index and status

`draft` = being written, not implementable · `review` = complete, awaiting owner sign-off ·
`approved` = implementable · `deprecated` = kept for history only.

| Spec | File | Status |
| --- | --- | --- |
| Product vision | [00-product/vision.md](00-product/vision.md) | draft |
| Scope and milestones | [00-product/scope.md](00-product/scope.md) | draft |
| Glossary | [00-product/glossary.md](00-product/glossary.md) | draft |
| Requirements overview | [01-requirements/README.md](01-requirements/README.md) | draft |
| Auth and accounts | [01-requirements/auth.md](01-requirements/auth.md) | draft |
| Public landing page | [01-requirements/landing.md](01-requirements/landing.md) | draft |
| Projects | [01-requirements/projects.md](01-requirements/projects.md) | draft |
| Tasks | [01-requirements/tasks.md](01-requirements/tasks.md) | draft |
| Time capture | [01-requirements/time-logs.md](01-requirements/time-logs.md) | draft |
| Dashboard and reporting | [01-requirements/reporting.md](01-requirements/reporting.md) | draft |
| Trash and soft delete | [01-requirements/trash.md](01-requirements/trash.md) | draft |
| Non-functional requirements | [01-requirements/non-functional.md](01-requirements/non-functional.md) | draft |
| System overview | [02-architecture/system-overview.md](02-architecture/system-overview.md) | approved |
| Tech stack | [02-architecture/tech-stack.md](02-architecture/tech-stack.md) | approved |
| Repository layout | [02-architecture/repositories.md](02-architecture/repositories.md) | approved |
| Environments and config | [02-architecture/environments.md](02-architecture/environments.md) | approved |
| Deployment and CI/CD | [02-architecture/deployment.md](02-architecture/deployment.md) | approved |
| Security | [02-architecture/security.md](02-architecture/security.md) | approved |
| API conventions | [03-api/conventions.md](03-api/conventions.md) | approved |
| Data model | [03-api/data-model.md](03-api/data-model.md) | draft |
| API endpoints | [03-api/endpoints.md](03-api/endpoints.md) | draft |
| Static export constraints | [04-web/static-export.md](04-web/static-export.md) | approved |
| Template adaptation | [04-web/template-adaptation.md](04-web/template-adaptation.md) | approved |
| Web conventions | [04-web/conventions.md](04-web/conventions.md) | approved |
| Routing and navigation | [04-web/routing.md](04-web/routing.md) | approved |
| Screens | [04-web/screens.md](04-web/screens.md) | approved |
| Testing strategy | [05-quality/testing.md](05-quality/testing.md) | draft |
| Code style | [05-quality/code-style.md](05-quality/code-style.md) | draft |
| Definition of Done | [05-quality/definition-of-done.md](05-quality/definition-of-done.md) | draft |
| Decisions (ADRs) | [decisions/README.md](decisions/README.md) | — |
| Open questions | [open-questions.md](open-questions.md) | — |

## Conventions

### Frontmatter
Every spec starts with:

```yaml
---
id: req-projects            # unique, stable
title: Projects
status: draft               # draft | review | approved | deprecated
owner: Marko Angelovski
last_updated: 2026-09-26
related: [api-endpoints, ADR-0001]
---
```

### Standard sections
`Purpose` · `Scope` (in/out) · content sections · `Acceptance criteria` (requirement specs) ·
`Open questions` · `Changelog`.

### ID schemes
| Kind | Format | Example | Lives in |
| --- | --- | --- | --- |
| Functional requirement | `FR-<AREA>-###` | `FR-PRJ-003` | `01-requirements/<area>.md` |
| Non-functional requirement | `NFR-###` | `NFR-004` | `01-requirements/non-functional.md` |
| API endpoint | `API-<AREA>-###` | `API-TLOG-002` | `03-api/endpoints.md` |
| Screen | `SCR-###` | `SCR-005` | `04-web/screens.md` |
| Decision | `ADR-####` | `ADR-0002` | `decisions/` |
| Open question | `OQ-###` | `OQ-004` | `open-questions.md` |
| Task | `T-####` | `T-0012` | `../tasks/` |

Area codes: `AUTH` auth/accounts · `LAND` public landing page · `PRJ` projects · `TSK` tasks · `TLOG` time capture (workdays, time logs) · `RPT` reporting · `TRASH` trash/soft delete · `SYS` system.
IDs are never reused or renumbered. Removed items are marked `(removed)`.

### Placeholders
- `TODO:` marks content that still needs to be written.
- `TBD (OQ-###)` marks content that is blocked on an open question.
- A spec can't move to `review` while it still contains `TODO:`.

## Changing specs
1. Edit the spec, bump `last_updated`, and add a changelog line.
2. If the spec was `approved`, set it back to `review`, and set the tasks that depend on it to
   `blocked` until the owner re-approves.
3. Architectural changes need a new ADR, which supersedes the old one. Never edit an accepted ADR's decision.
4. Only the human owner moves a spec to `approved`.
