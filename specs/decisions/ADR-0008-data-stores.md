# ADR-0008: Neon Postgres + Drizzle for data, Redis Cloud for ephemeral state

- **Status:** accepted
- **Date:** 2026-09-26
- **Deciders:** Marko Angelovski
- **Related:** api-data-model, arch-stack, OQ-005, OQ-032

## Decision
- **Primary database:** PostgreSQL hosted on **Neon.tech**, accessed with **Drizzle ORM**. Migrations
  are created with drizzle-kit, committed, and run explicitly in CI (never on `npm install`).
  - The runtime uses Neon's **pooled** connection string. Migrations use the **direct** (unpooled) one.
- **Redis (Redis Cloud)** holds ephemeral and security state: OAuth state/PKCE verifiers, one-time
  auth codes, refresh-token records, and rate-limit counters. Nothing in Redis is the only copy of user data.
- **Cloudflare R2** is available, but PM4 doesn't use it yet. Reserve it for future file features
  (exports, attachments). Any use needs a spec change.

## Consequences
- The storage quota is fixed, so the schema must be storage-efficient (data-model.md §Storage rules).
- Neon scales to zero, so the first query after idle may be slow (cold start). The health check and
  timeouts must allow for that (NFR-003).
- Local development uses a Postgres container on the same major version as Neon, plus a Redis container.
