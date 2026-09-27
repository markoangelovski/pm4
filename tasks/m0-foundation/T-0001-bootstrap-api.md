---
id: T-0001
title: Bootstrap api/ NestJS app
milestone: M0
app: api
status: blocked
size: L
depends_on: [T-0005]
specs:
  - specs/02-architecture/tech-stack.md
  - specs/02-architecture/repositories.md
  - specs/02-architecture/environments.md
  - specs/03-api/conventions.md
  - specs/03-api/data-model.md
  - specs/02-architecture/security.md
  - specs/05-quality/testing.md
  - specs/decisions/ADR-0008-data-stores.md
  - specs/decisions/ADR-0010-openapi-contract.md
requirements: [NFR-003, NFR-004]
---

# T-0001: Bootstrap api/ NestJS app

## Goal
Create a production-ready NestJS skeleton in `api/` that later feature tasks can build on.

## Scope
**In:**
- A new NestJS project (latest stable) in `api/`, created with the Nest CLI (`npx @nestjs/cli@latest new api --package-manager npm --strict`), with **npm**, strict TypeScript, ESLint + Prettier, and `.nvmrc` (Node LTS).
- Config module with env schema validation (fail fast). `.env.example` with every variable from environments.md.
- Global ValidationPipe, Problem Details error filter, helmet, CORS from `CORS_ORIGINS`, JSON body limit. Logging uses the NestJS default logger (no log library, NFR-009).
- Drizzle + `pg` against `DATABASE_URL`, and a drizzle-kit config (migrations in `api/drizzle/`, run via an explicit script). An empty initial migration.
- A Redis module (`ioredis`, `REDIS_URL`).
- `/health` checks Postgres and Redis (200 / 503). Swagger at `/docs` (non-prod). `npm run openapi:export` → `api/openapi.json`.
- `docker-compose.yml` with Postgres (same major as Neon) and Redis for local dev and tests.
- Test setup: Jest unit + e2e against the compose services. One e2e test for `/health`.
- `api/AGENTS.md` + `api/CLAUDE.md` (commands, structure, link to `../specs`, and the rule to generate building blocks with `npx nest g`).

**Out:** auth and feature modules and tables; CI/CD (T-0004).

## Acceptance criteria
- [ ] `lint`, `test`, `test:e2e` and `build` scripts pass on a clean clone.
- [ ] The app boots with only `.env.example` values (plus the local DB), and fails fast on missing/invalid env.
- [ ] `GET /health` returns 200 with Postgres and Redis up, and 503 if either is down.
- [ ] `npm run openapi:export` produces a deterministic `openapi.json` (no diff when run twice).
- [ ] Migrations run only via an explicit script (no `postinstall`).
- [ ] Errors follow `03-api/conventions.md#errors`.
- [ ] CORS only allows the configured origins.
- [ ] `api/AGENTS.md` documents the commands. The tech-stack spec is updated with the actual versions.
- [ ] Definition of Done satisfied.

## Blocked by
- T-0005 (monorepo). Specs approved 2026-09-27.

---

## Implementation notes

## Review
