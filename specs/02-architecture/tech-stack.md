---
id: arch-stack
title: Tech Stack
status: approved
owner: Marko Angelovski
last_updated: 2026-09-27
related: [arch-overview, web-template, ADR-0001, ADR-0002, ADR-0005, ADR-0006, ADR-0007, ADR-0008, ADR-0009, ADR-0010, ADR-0011]
---

# Tech Stack

## Purpose
The authoritative list of technologies. Agents must not add a runtime dependency that isn't listed
here without flagging it. Dev tooling in the same category is fine.

**Version policy:** use the **latest stable** release of each item when bootstrapping, and pin it via
`package-lock.json`. The versions below are the latest stable releases on npm as of 2026-09-27 (targets). Bootstrap
(T-0001, T-0002) installs the then-latest patch/minor of the same major and records any difference here.
A newer **major** needs a spec update.

## Shared
| Concern | Choice |
| --- | --- |
| Repo | Monorepo, independent npm projects (ADR-0006) |
| Package manager | **npm** (`npm ci` in CI) |
| Language | TypeScript, `strict`. **7.0.x** (the native compiler; the template already uses it). If the Nest CLI or its Swagger plugin doesn't work with 7.x at T-0001, `api/` pins **6.0.x** and records why. |
| Node | **Node 24 LTS** ("Krypton", 24.21.x), the same major for local, CI and Azure (`NODE|24-lts`), recorded in `.nvmrc` per app. Node 26 isn't LTS yet (OQ-042). |
| Dates | date-fns + `@date-fns/tz` (time-zone-aware calculations). 4.4.x / 1.5.x |

## Frontend: `web/`
| Concern | Choice | Version | Notes |
| --- | --- | --- | --- |
| Framework | Next.js (App Router) | 16.3.x (latest 16.3.6; template 16.3.0) | `output: "export"` (ADR-0001) |
| UI library | React | 19.3.x | |
| Base | `next-shadcn-dashboard` template | — | ADR-0005 |
| Components | shadcn/ui (`base-nova` style, Base UI `@base-ui/react`) | shadcn CLI 4.x, `@base-ui/react` 1.8.x | |
| Styling | Tailwind CSS v4 | 4.3.x | |
| Theming | next-themes (template) | 0.4.x | Light and dark, as in the template |
| Icons | lucide-react | 1.x | Remove `@iconify/react` |
| Server state | TanStack Query v5 | 5.104.x | ADR-0009 |
| HTTP client | openapi-fetch + openapi-typescript | 0.17.x / 7.13.x | ADR-0010 |
| URL state | nuqs | 2.10.x | ADR-0009 |
| Forms | react-hook-form + zod + @hookform/resolvers | 7.89.x / 4.6.x / 5.9.x | ADR-0009 |
| Tables | TanStack Table (template wrappers) | 8.21.x (keep the template's major; 9.x is out but breaking) | |
| Charts | Recharts (template) | 3.10.x | Line chart for FR-RPT-004 |
| Unit/component tests | Vitest + Testing Library + MSW | 5.0.x / 16.3.x / 2.15.x | |
| E2E tests | Playwright against the static `out/` build | 1.63.x | |

## Backend: `api/`
| Concern | Choice | Version | Notes |
| --- | --- | --- | --- |
| Framework | NestJS (Express adapter) | 12.1.x | ADR-0002 |
| Validation | class-validator + class-transformer, global `ValidationPipe` | 0.15.x / 0.5.x | Works with the Swagger CLI plugin |
| API docs | @nestjs/swagger (+ CLI plugin) | 12.0.x | ADR-0010 |
| Config | @nestjs/config + env schema validation (zod) | 12.0.x / zod 4.6.x | Fail fast at boot |
| Database | PostgreSQL on **Neon** | **18** (Neon's default for new projects; local/CI containers `postgres:18`) | ADR-0008 |
| DB driver | `pg` (node-postgres) with Neon's **pooled** URL | 8.23.x | A long-running server, not edge |
| ORM / migrations | **Drizzle ORM + drizzle-kit** | 0.45.x / 0.31.x | ADR-0008 |
| Cache / ephemeral | **Redis Cloud** via `ioredis` | ioredis 6.0.x (check BullMQ's supported ioredis range at bootstrap) | ADR-0008 |
| Auth | Google OAuth (Authorization Code + PKCE) via `openid-client`; JWT via `@nestjs/jwt` | 6.8.x / 12.0.x | ADR-0007. A generic, OpenID-certified OIDC client: PKCE, state, discovery and ID-token validation for Google and any future OIDC provider (Authentik, Keycloak…). No Passport; `openid-client` ships its own Passport strategy if that's ever wanted. |
| Background jobs | **BullMQ** via `@nestjs/bullmq`, worker in the API process | 6.3.x / 12.0.x | ADR-0011. Uses the Redis Cloud DB (`noeviction`) |
| Rate limiting | `@nestjs/throttler` with Redis storage | 6.7.x | |
| Security headers | helmet | 8.3.x | |
| Logging | NestJS default logger → stdout → App Service logs | — | NFR-009. No log library. |
| Tests | Jest + Supertest. Postgres and Redis via docker-compose (local) / service containers (CI). | 30.5.x / 7.3.x | |

## Available, not used (yet)
- Cloudflare R2 (S3-compatible object storage). Any use needs a spec + ADR update.

## Changelog
- 2026-09-26: Initial scaffold.
- 2026-09-26: Updated with owner answers to OQ-001–018.
- 2026-09-27: ADR-0009/0010 accepted. Added BullMQ (ADR-0011).
- 2026-09-27: OQ-042 resolved (Node 24 LTS, Postgres 18). Filled in target versions. Logging is the NestJS default logger. Auth library: openid-client.
- 2026-09-27: Auth library note: generic OIDC, SSO-ready.
- 2026-09-27: Approved by the owner.
