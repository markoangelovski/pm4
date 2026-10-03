---
id: arch-env
title: Environments and Configuration
status: approved
owner: Marko Angelovski
last_updated: 2026-10-03
related: [arch-deployment, sec]
---

# Environments and Configuration

## Purpose
Lists every environment and configuration variable. **No secret values appear in this repo.**

## Environments (production only, OQ-017)
| Env | Web | API | Data |
| --- | --- | --- | --- |
| local | `http://localhost:3000` | `http://localhost:3001` | docker-compose `postgres:18` + Redis |
| production | `https://pm4.angelovski.top` | `https://pm4-api-heagfvepgbcje5c3.westeurope-01.azurewebsites.net` (Web App `pm4-api`). App Service **Free (F1)**, Linux, runtime `NODE|24-lts`: no custom domain, no Always On (OQ-024, OQ-042) | Neon free tier, Postgres 18 (0.5 GB, main branch), Redis Cloud free tier (30 MB) (OQ-032) |

There is no staging. Mitigations: CI runs e2e tests against disposable Postgres and Redis, and
migrations are reviewed. Neon branches aren't used.

## Web configuration (build time only)
A static export inlines `NEXT_PUBLIC_*` at build time. **Nothing secret.** Values come from GitHub Actions variables.

| Variable | Example | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | `https://pm4-api-heagfvepgbcje5c3.westeurope-01.azurewebsites.net` | API origin |
| `NEXT_PUBLIC_APP_URL` | `https://pm4.angelovski.top` | Own origin (canonical links, CSP) |
| `NEXT_PUBLIC_APP_VERSION` | `0.1.0` | **Not configured:** set by `web/next.config.ts` from `web/package.json` `version` on every build (OQ-051), which `web-deploy` stamps with the release version ([release versions](deployment.md#release-versions-oq-098)); `0.0.0` locally |

## API configuration (runtime, Azure App Settings)
Validated at startup. The app refuses to boot if something is missing or invalid.

| Variable | Secret | Purpose |
| --- | --- | --- |
| `PORT` | no | Set by Azure. The app listens on it. |
| `NODE_ENV` | no | `development` / `test` / `production` |
| `DATABASE_URL` | **yes** | Neon **pooled** connection string (runtime) |
| `DATABASE_URL_DIRECT` | **yes** | Neon **direct** connection string (migrations only, CI secret) |
| `REDIS_URL` | **yes** | Redis Cloud URL, **plain `redis://`**: the Redis Cloud free tier has TLS off (owner, 2026-09-27; accepted risk in security.md). Used for auth state, rate limits and BullMQ queues (ADR-0011) |
| `CORS_ORIGINS` | no | `https://pm4.angelovski.top` (comma-separated) |
| `WEB_APP_URL` | no | Where the OAuth callback redirects back to (`https://pm4.angelovski.top`) |
| `GOOGLE_CLIENT_ID` | no | Google OAuth client |
| `GOOGLE_CLIENT_SECRET` | **yes** | Google OAuth client secret |
| `GOOGLE_CALLBACK_URL` | no | `https://pm4-api-heagfvepgbcje5c3.westeurope-01.azurewebsites.net/api/v1/auth/google/callback` |
| `JWT_ACCESS_SECRET` | **yes** | Signs access tokens (≥ 32 random bytes) |
| `ACCESS_TOKEN_TTL` / `REFRESH_TOKEN_TTL` | no | `15m` / `30d` (sliding; OQ-023, OQ-024) |
| `AUTH_ALLOWED_EMAILS` | no | Comma-separated sign-up allow-list. Empty = open sign-up (OQ-022, security.md §Sign-up policy) |
| `TRASH_RETENTION_DAYS` | no | `31` |

Each app commits a `.env.example` with every variable and dummy values.

## GitHub Actions configuration
| Name | Kind | Used by |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_APP_URL` | variables | web-deploy |
| `AZURE_WEBAPP_PUBLISH_PROFILE` | secret | api-deploy |
| `AZURE_WEBAPP_NAME` | variable (`pm4-api`) | api-deploy |
| `DATABASE_URL_DIRECT` | secret | api-deploy (migration step) |

## Open questions
—

## Changelog
- 2026-09-26: Initial scaffold.
- 2026-09-26: Updated with owner answers to OQ-001–018.
- 2026-09-26: OQ-022, OQ-023, OQ-032 resolved. Recorded the F1 tier and free-tier quotas.
- 2026-09-27: OQ-024 resolved: REFRESH_TOKEN_TTL 30d.
- 2026-09-27: Removed the purge workflow config and INTERNAL_JOB_TOKEN (ADR-0011). Publish profile chosen. No Neon branches.
- 2026-09-27: OQ-042: Node 24 LTS runtime, Postgres 18.
- 2026-09-27: Approved by the owner.
- 2026-09-27: Filled in the real web domain and API host. REDIS_URL is plain `redis://` (Redis Cloud free tier, TLS off).
- 2026-10-02: `NEXT_PUBLIC_APP_VERSION`, derived from `web/package.json` at build time (OQ-051).
- 2026-10-03: `NEXT_PUBLIC_APP_VERSION` is the release version stamped by `web-deploy` (OQ-098).
