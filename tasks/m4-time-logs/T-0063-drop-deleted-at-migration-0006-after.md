---
id: T-0063
title: Drop deleted_at (migration 0006), after the release with T1–T3 is live (D2)
milestone: M4
app: api
status: done
size: S
tier: haiku
depends_on: [T-0062]
feature_spec: specs/06-features/hard-delete.md
spec_row: T4
ac_files: []
---

# T-0063: Drop deleted_at (migration 0006), after the release with T1–T3 is live (D2)

**Tier reason:** Generated migration plus the data step from *Interfaces*

Work from the brief: `node scripts/pm4.mjs brief T-0063`. Verify with `node scripts/pm4.mjs check T-0063`.

## Notes
**Deploy order (owner, 2026-10-15): code first, then `0006`.** Drizzle inserts name every column, and
`api-deploy.yml` migrates before the app swap, so a release that ships the schema change and `0006` together
returns `500` on `POST /projects` and `POST /tasks` until the swap. This release therefore ships in two pushes:
1. The schema change (`api/src/database/schema/projects.ts` without `deletedAt`) alone. `api-deploy` deploys
   the code; the columns still exist, nullable and unwritten.
2. After that deploy has finished, `0006` (`api/drizzle/0006_drop_deleted_at.sql`, its snapshot, `_journal.json`).
   `api-deploy` runs it; the running code no longer names the columns.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- `api/src/database/schema/projects.ts`: `deletedAt` removed from `projects` and `tasks`. `timestamp` stays (used by `createdAt`/`updatedAt`).
- `api/drizzle/0006_drop_deleted_at.sql`: the data step from *Interfaces* (run before the drops), then `DROP COLUMN "deleted_at"` for `projects` and `tasks`. Generated with `npm run db:generate -- --name drop_deleted_at`.
- `api/drizzle/meta/0006_snapshot.json` and `_journal.json`: generated.
- `0006` goes in its own push, after the schema change has deployed (see *Notes*).

`pm4 check T-0063` summary:
```
PASS T-0063
  scope: ok
  api lint: ok, api format:check: ok, api typecheck: ok, api test: ok, api test:e2e: ok
  api build: ok, api openapi:export: ok
  check AC-16, AC-17, AC-19: ok
  manual (owner verifies): AC-7, AC-18
```

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | PASS | Removed `deletedAt`, generated `0006_drop_deleted_at`, prepended the data step; `pm4 check` passed. |

## Review
**Verdict: approve** (Opus reviewer, 2026-10-15). Schema and `0006` match *Interfaces*; the data step matches the spec word for word; snapshot chains to 0005 and differs only by the two columns; nothing on Neon blocks the drop. Each push is safe on its own (reads name explicit columns; the e2e setup migrates to 0005 on push 1). `pm4 check`: PASS.

Findings (minor):
- Spec D2 said T4 is pushed alone; updated to the two-push order.
- Implementation notes had a stale state sentence; rephrased.
- The push-1 tree isn't gated on its own (`pm4 check` would fail AC-19 there, as expected; the local e2e DB is already at 0006). Optional: open a PR for push 1 so `ci.yml` runs on a fresh Postgres.

Owner checks after push 2: `\d projects` / `\d tasks` show no `deleted_at`; creating a project and a task in production succeeds.

Tier feedback: haiku was right.
