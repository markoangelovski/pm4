---
id: arch-overview
title: System Overview
status: approved
owner: Marko Angelovski
last_updated: 2026-09-27
related: [arch-stack, arch-deployment, sec, ADR-0001, ADR-0002, ADR-0007, ADR-0008, ADR-0011]
---

# System Overview

## Purpose
The high-level architecture: components, and how they communicate.

## Components

```
                         Google OAuth 2.0 / OIDC
                          ▲                │
                 (2) auth │                │ (3) callback
                          │                ▼
 ┌──────────────────────────────┐  HTTPS JSON + Bearer   ┌──────────────────────────────┐
 │ Browser                      │ ─────────────────────▶ │ api/  NestJS                 │
 │ web/: static Next.js export  │ ◀───────────────────── │ Azure Web App (Linux, Node)  │
 │ https://pm4.angelovski.top   │   CORS: web origin     │ pm4-api-….azurewebsites.net 
 └──────────────▲───────────────┘                        └───────┬──────────────┬───────┘
                │ static files                                   │ TLS          │ no TLS (free)
 ┌──────────────┴───────────────┐                        ┌───────▼──────┐ ┌─────▼────────┐
 │ GitHub Pages (custom domain) │                        │ Neon Postgres│ │ Redis Cloud  │
 │ deployed by web-deploy.yml   │                        │ (Drizzle)    │ │ sessions,    │
 └──────────────────────────────┘                        └──────────────┘ │ OAuth state, │
                                                                          │ rate limits, │
                                                                          │ BullMQ jobs  │
                                                                          └──────────────┘
```

| Component | Responsibility | Must NOT |
| --- | --- | --- |
| `web/` | UI, client routing, UX validation, calling the API, holding tokens, time-zone-aware range calculation | Hold secrets, be the only enforcer of rules, render per request |
| `api/` | OAuth, token issuing, authorization, validation, business rules, aggregation (reports), OpenAPI, background jobs (in-process BullMQ worker, e.g. trash purge) | Serve the frontend. Store secrets in code. |
| Neon Postgres | The durable data store | Be the source of truth for sessions |
| Redis Cloud | Ephemeral state: OAuth state/PKCE, one-time codes, refresh tokens, rate limits, BullMQ job queues | Hold the only copy of any user data |
| Cloudflare R2 | Unused (reserved for future file features) | — |

## Key flows
1. **Page load:** static HTML/JS from Pages. The client restores the session with its refresh token
   (security.md), then fetches data.
2. **Sign-in:** see security.md §Authentication flow.
3. **Mutation:** client validation → API (validate, authorize by owner, persist) → response → targeted cache invalidation.
4. **Reports:** the client sends a work-date range computed in the user's time zone. The API
   aggregates in SQL (group by work date / project) and returns ready-to-chart series.

## Architectural rules
- The OpenAPI document is the only interface between `web/` and `api/` (ADR-0010).
- The frontend never computes authoritative aggregates. The API provides totals.
- Every row is owned by one user. Every access is scoped to the owner (NFR-005).

## Open questions
—

## Changelog
- 2026-09-26: Initial scaffold.
- 2026-09-26: Updated with owner answers to OQ-001–018.
- 2026-09-27: OQ-024 resolved: API stays on *.azurewebsites.net; refresh token in localStorage.
- 2026-09-27: OQ-031 resolved: the purge runs as a BullMQ job in the API (ADR-0011). Removed the GitHub Actions purge.
- 2026-09-27: Approved by the owner.
- 2026-09-27: Real hosts in the diagram. Redis link has no TLS (free tier).
