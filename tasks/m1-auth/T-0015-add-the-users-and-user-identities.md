---
id: T-0015
title: Add the users and user_identities tables and their migration
milestone: M1
app: api
status: done
size: S
tier: haiku
depends_on: []
feature_spec: specs/06-features/auth-api-session.md
spec_row: T1
ac_files: []
---

# T-0015: Add the users and user_identities tables and their migration

**Tier reason:** Schema given in full; the migration is generated; no logic

Work from the brief: `node scripts/pm4.mjs brief T-0015`. Verify with `node scripts/pm4.mjs check T-0015`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

Created the `users` and `user_identities` tables with the schema specified in the brief. The migration was generated automatically using Drizzle's migration tool.

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | PASS | `api lint: ok · api typecheck: ok · api test: ok · api test:e2e: ok · api build: ok` |

## Review
**Verdict: approve.**

Opus review, 2026-10-03, feature `auth-api-session`. `pm4 check --feature`: all gates ok (e2e with
Postgres/Redis up); the only scope flag is the coordinator's authorized spec edit (*Config (T2)*). AC-25 manual (owner).

- Schema matches *Interfaces* column for column (order, `uuidv7()`, `lower(email)` unique index, composite PK,
  cascade FK, `user_id` index); `0001_users.sql` is generated and passes AC-24. No findings.
- Tier feedback: haiku was right (schema given in full, migration generated).
