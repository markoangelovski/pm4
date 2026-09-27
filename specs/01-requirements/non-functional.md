---
id: req-nfr
title: Non-Functional Requirements
status: draft
owner: Marko Angelovski
last_updated: 2026-09-27
related: [sec, arch-deployment, qa-testing, api-data-model]
---

# Non-Functional Requirements

## Purpose
Cross-cutting quality attributes. Every NFR must be measurable.

## Requirements

### NFR-001: Performance (web)
Lighthouse performance **≥ 90** on the dashboard (desktop profile, production build). First-load JS **≤ 300 kB gzipped** per route (OQ-040; checked against the template at T-0002).

### NFR-002: Performance (API)
**p95 < 300 ms** (warm) for list and report endpoints, with 5 years of heavy usage (~20k logs per user) seeded. Cold starts are excluded (OQ-040).

### NFR-003: Availability and cold starts
Neon (scale-to-zero) and App Service **Free (F1)** (no Always On) both cold start. After ~20 min idle
the API is unloaded, and the next request can take 10–30 s. The web app shows a loading state and
retries idempotent requests once (OQ-040):
- If a request hasn't finished after **3 s**, the web app shows a "Waking up the server…" message.
- The first request after load gets a **60 s** timeout (the rest get 30 s). After a timeout the app shows an error with **Retry**.
- `/health` allows **10 s** for the DB check (a Neon wake-up).

### NFR-004: Security
HTTPS everywhere. OWASP ASVS L1 baseline. Details in `02-architecture/security.md`.

### NFR-005: Data isolation
A user can never read or modify another user's data. Every query is scoped to the authenticated user,
and cross-user tests cover every endpoint.

### NFR-006: Accessibility
The level provided by the template's components (OQ-018). New components use the template's shadcn/Base
UI primitives, so they keep keyboard and ARIA support. No additional formal target.

### NFR-007: Responsiveness
All screens usable from 360 px width. The primary target is desktop (≥ 1280 px).

### NFR-008: Browser support
The last 2 versions of Chrome, Edge, Firefox and Safari.

### NFR-009: Observability
**Standard App Service logging only**, enabled by the owner in Azure. There's no app-level logging work:
the API keeps NestJS's default logger, which writes to stdout, and App Service collects that. The only
rule is what must never be logged (tokens, codes, secrets, auth request bodies, security.md). No Application
Insights, no log library, no frontend error tracking.

### NFR-010: Backups
Neon's built-in point-in-time restore only. The free tier's window is short (hours). No separate
backups for now (OQ-041). Revisit when the data becomes valuable enough.

### NFR-011: Storage efficiency
The schema follows `03-api/data-model.md` §Storage rules. The Postgres quota is **0.5 GB** (Neon free
tier, OQ-032). DB size (`pg_database_size`) is checked against it (a size query in the health/admin
output), and an alert fires at **80% (400 MB)**.

### NFR-012: Language and theming
English only (no i18n framework). Light and dark themes as provided by the template.

### NFR-013: Redis memory budget
Redis Cloud free tier: **30 MB** (OQ-032). Redis holds only short-lived keys, and **every key has a
TTL**: OAuth state (10 min), login codes (60 s), refresh tokens (the refresh lifetime), per-user family
sets (the refresh lifetime), rate-limit counters (their window). BullMQ queue keys are the exception, and are kept small by removing finished jobs (ADR-0011). This needs the
`noeviction` policy on the Redis Cloud DB. Keys use short prefixes and small values
(hashes, not JSON blobs of profiles). Estimated use: well under 1 MB for tens of users. Memory use
(`INFO memory`) is checked alongside DB size, with an alert at 80% (24 MB). If Redis is lost, users only
have to sign in again; no data is lost.

## Changelog
- 2026-09-26: Initial scaffold.
- 2026-09-26: Updated with owner answers to OQ-001–018.
- 2026-09-26: OQ-032 resolved: 0.5 GB Postgres and 30 MB Redis budgets; added NFR-013.
- 2026-09-27: OQ-031/logging decided (F1, App Service logs, no App Insights). Performance, cold-start and backup targets moved to OQ-040/041. Redis budget covers BullMQ.
- 2026-09-27: OQ-040, OQ-041 resolved. Logging reduced to standard App Service logging with no app-level work.
