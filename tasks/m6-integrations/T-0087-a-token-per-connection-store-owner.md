---
id: T-0087
title: A token per connection: store owner, setStatusFor, request's stale and account checks, the connection service callers
milestone: M6
app: api
status: done
size: S
tier: sonnet
depends_on: [T-0086]
feature_spec: specs/06-features/int-followups.md
spec_row: T2
ac_files:
  - { path: api/test/pmspa-followups.ac.e2e-spec.ts, sha256: cd2d453fd71f482c31b0ba03a0ac3861163f9bd844c918fa37c8cd9302ffd291 }
  - { path: api/src/integrations/pmspa/pmspa-client.ac.spec.ts, sha256: aa0678941d9c1fe6a7d371c9e54a75a8456f8a13423b158a038786c058fde959 }
---

# T-0087: A token per connection: store owner, setStatusFor, request's stale and account checks, the connection service callers

**Tier reason:** Tokens and a race between overlapping requests (task-routing: auth, tokens, concurrency)

Work from the brief: `node scripts/pm4.mjs brief T-0087`. Verify with `node scripts/pm4.mjs check T-0087`.

## Notes
Proposals from the review (2026-10-18), out of scope here; each needs its own task:
1. **`setStatusFor` miss against real Postgres.** Add an ordinary e2e or repository test: change the
   connection's url or email, then `setStatusFor` with the old owner returns `false` and leaves
   `status` and `lastCheckedAt` unchanged. AC-3 covers only the matching row; AC-5 fakes the miss.
2. **No cache writes from a stale request.** A request that started before Save can log in again and
   call `setToken`/`setAccount` with its old owner (`pmspa-client.ts:138-139`), overwriting the new
   connection's entries (one extra login; Settings shows `account: null` until then). D4 accepts this
   ("no locking"); to close it, skip those writes once `stale` is true.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- D4 `PmspaStore`: the token is encrypted as `{url,email,token}` JSON and the account stored as `{url,email,account}`.
  A read returns null on an owner mismatch or the old (bare) form and deletes nothing; the only delete stays the
  undecryptable-token case.
- D4 `PmspaConnectionRepository.setStatusFor`: one `UPDATE … WHERE user_id AND url AND email … RETURNING`; true
  when a row matched.
- `PmspaClient.request`: status writes go through `setStatusFor`; when it matched no row (`stale`), `invalid()`
  skips `store.clear`. D5: after a connected re-login, a `pmspaUserId` other than the stored one goes to
  `invalid()` with nothing cached; a null stored `pmspaUserId` skips the check.
- Ordinary specs updated to the new signatures (`pmspa-client.spec.ts`, `pmspa-store.spec.ts`).
  `pmspa-connection.service.ts` unchanged (its callers already pass `owner`).
- `pm4 check T-0087`: PASS (ac hashes ok (2), scope ok, api lint, format:check, typecheck, test, test:e2e, build,
  openapi:export ok; AC-6…AC-11 pending for T-0088).

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | sonnet | done | D4 owner-tagged token/account + `setStatusFor`; D5 account check on re-login. Check PASS |

## Review
**Verdict: approve** (Opus, 2026-10-18). `pm4 check --feature` PASS; AC-11 verified by the owner.
- Store owner check, `setStatusFor` (one user-scoped conditional UPDATE), the stale clear skip and D5's account check all match the spec; no `repo.setStatus` left in the client.
- Minor (test coverage, follow-up): no test of `setStatusFor` returning false against real Postgres (AC-3 covers the match, AC-5 fakes the miss). Proposal: an ordinary e2e/repository test that changes url/email and checks false + status untouched.
- Minor (within D4's "no locking"): a stale request that logs in again still calls `setToken`/`setAccount` with its old owner (`pmspa-client.ts:138-139`) and can overwrite the new connection's cache; effect is one extra login and `account: null` until then. Not a bug per spec; optional proposal: skip the cache writes once `stale`.
- Tier feedback: sonnet was right.
