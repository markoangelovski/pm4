---
id: T-0160
title: API-USR-004: deleteAccount in the repository, AccountService, store exports
milestone: M1
app: api
status: done
size: S
tier: sonnet
depends_on: [T-0159]
feature_spec: specs/06-features/acct-api.md
spec_row: T2
ac_files:
  - { path: api/test/account-delete.ac.e2e-spec.ts, sha256: 2a9e678c5fb3a9eb04c1a6cfed293fed8ad9d32a41ba6e0ac1d4d2276294fc52 }
---

# T-0160: API-USR-004: deleteAccount in the repository, AccountService, store exports

**Tier reason:** Writes over several tables and two systems, with a lock and partial failure (task-routing sonnet trigger); the algorithm is spelled out above

Work from the brief: `node scripts/pm4.mjs brief T-0160`. Verify with `node scripts/pm4.mjs check T-0160`.

## Implementation notes
Added `UsersRepository.deleteAccount` (locked transaction), `AccountService` (Redis cleanup is best-effort), exported `SessionStore` / `PmspaStore`, wired `AccountModule`.

pm4 check T-0160: PASS (ac hashes, scope, lint, format, typecheck, test, e2e, build, openapi, AC-10 all ok).

Review fixes (attempt 2): each Redis cleanup has its own try/catch via private `cleanUp`; added `api/src/account/account.service.spec.ts` (4 unit tests). pm4 check T-0160: only the scope check fails, on `specs/06-features/acct-api.md` (the orchestrator's own spec edit, ignored as instructed). Lint, format, typecheck, test, e2e, build, openapi and AC-10 all ok.

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | sonnet | pass | Implemented per brief; check PASS |
| 2 | sonnet | pass | Review fixes: per-cleanup try/catch, account.service.spec.ts; only the known spec-file scope flag |

## Review
_Filled in by `review-feature`._

**Verdict: approve** (Opus review, 2026-11-13). `pm4 check --feature` passed (AC-1…AC-10). The code matches *Interfaces*. The FOR UPDATE lock (D2) is in place, leads are cleared only on items other users own, `updated_at` doesn't change, Redis is cleaned up after the commit with a warning on failure (D3), and a missing user gets 401.
Findings (all minor, optional):
1. There is no test for the D3 partial-failure path. The optional `account.service.spec.ts` was not created, so the 204-on-Redis-failure branch in `account.service.ts` is never exercised.
2. One try wraps both cleanups. If `sessions.revokeAll` throws, `pmspaStore.clear` is skipped and the PMSPA token stays until its TTL expires. This matches the spec verbatim and is not drift. Separate try/catch blocks would need a spec changelog line.
3. Info only: nothing tests the D2 row lock directly.
**Fixes (2026-11-13):** findings 1 and 2 are fixed in attempt #2, together with the spec changelog line. `pm4 check` passes all gates. Its only flag is the scope check on `specs/06-features/acct-api.md`, which is the review's own spec edit.
**Tier feedback:** sonnet was right. The writes span several tables and two systems, with a lock and a partial-failure path. It passed on the first attempt.
