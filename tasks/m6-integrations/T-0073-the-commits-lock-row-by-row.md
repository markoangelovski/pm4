---
id: T-0073
title: The commits: lock, row-by-row writes on both sides, links and hashes, last_sync_at (API-INT-009, API-INT-016)
milestone: M6
app: api
status: done
size: L
tier: sonnet
depends_on: [T-0072]
feature_spec: specs/06-features/int-sync-api.md
spec_row: T5
ac_files:
  - { path: api/test/pmspa-sync.ac.e2e-spec.ts, sha256: f25186d8786045ddcab6ae6086a1f5d4dcfb010e8953cf22f0a91f551db4054c }
---

# T-0073: The commits: lock, row-by-row writes on both sides, links and hashes, last_sync_at (API-INT-009, API-INT-016)

**Tier reason:** Owner ceiling (OQ-189) instead of opus: writes on two systems with partial failure and a lock, spelled out step by step in *Commits*

Work from the brief: `node scripts/pm4.mjs brief T-0073`. Verify with `node scripts/pm4.mjs check T-0073`.

## Implementation notes
Added `importRun` / `syncRun` (lock, row-by-row `syncPair`, links with fingerprints, `last_sync_at`), POST `import` and `sync`, `PmspaStore.lock/unlock`, `setLastSyncAt`, OpenAPI export. A PMSPA record picked via a `link` choice is re-read before any link (D9). Created records reuse the create response for the PMSPA hash.

pm4 check T-0073: PASS (lint, format, typecheck, test, e2e, build, openapi, AC-21).

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | sonnet | PASS | Implemented the commits; pm4 check passes |
| 2 | sonnet | PASS | Review fixes: RunLinks seeded with usableLinks (preview helper), row-failure unit tests, DTO types imported from dto/sync.dto.ts |

## Review
_Filled in by `review-feature`._

**Verdict: changes-requested** (Opus review, feat-int-sync-api).
- **Major (F2), breaks D9:** `RunLinks` (`pmspa-sync.service.ts:65-82`, built at `:235`) takes every active link in `snapshot.links`, including links whose PMSPA side is gone, which the preview treats as no link. With the parent row skipped, `createPair` (`:382-387`) calls `createTask({ project: <deleted id> })` instead of failing "Its project isn't in PMSPA (it was left out)."; `overwrite` to-pmspa for a task (`:346-350`) can send a stale project id. Fix: seed `RunLinks` only with links whose two sides are in the snapshot (run-time links still added via `set`), with a unit test.
- **Minor (F3):** the row-failure branches have no tests: "The chosen record can't be linked." (`:272`, `:284`), "Its project wasn't imported." (`:353`, `:404`), "Its project isn't in PMSPA (it was left out)." (`:383`), and an unreachable/rate-limited error aborting the run while saved links stay. Fix: unit tests in `pmspa-sync.service.spec.ts` with a fake `PmspaRemote`.
- **Minor (F7, spec-level, owner decision):** `PmspaStore.unlock` (`pmspa-store.ts:106-108`) deletes unconditionally as D4 says; a run longer than the 5-minute lock can delete a later run's lock. Suggested: a random token with compare-and-delete (D4 change).
- Judgment calls accepted: re-reading a linked PMSPA record; PMSPA hash from the create response; missing `pmspaUserId` → notConnected; the `pmspa-store.ts`/`pmspa-connection.repository.ts` changes are in scope.
- Tier: sonnet right; F2 needs a sharper spec line ("the commit's links = the snapshot's usable links").
