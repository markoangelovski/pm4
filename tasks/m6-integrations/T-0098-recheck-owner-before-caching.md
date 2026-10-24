---
id: T-0098
title: A re-login caches the token and account only while the connection still has the request's URL and email
milestone: M6
app: api
status: ready
size: S
tier: sonnet
depends_on: []
feature_spec: —
files: [api/src/integrations/pmspa/pmspa-client.ts, api/src/integrations/pmspa/pmspa-client.spec.ts]
specs: [specs/06-features/int-followups.md]
ac_files: []
---

# T-0098: A re-login caches the token and account only while the connection still has the request's URL and email

**Tier reason:** token caching and a race between overlapping requests (task-routing: auth, tokens, concurrency).

## Goal
A `PmspaClient.request` that started before a Save no longer overwrites the new connection's cached token and account
(feat-int-followups D4 as amended by OQ-221). Opus review of T-0087, proposal 2.

## Change
`api/src/integrations/pmspa/pmspa-client.ts`, `request` → `login()`, in the `check.status === "connected"` branch,
after the D5 account check (unchanged):
- Read the row again: `const now = await this.repo.find(userId)`.
- Only when `now` is not null and `now.url === owner.url && now.email === owner.email`: call
  `this.store.setToken(userId, check.token, owner)` and `this.store.setAccount(userId, check.account, owner)` as now.
  Otherwise call neither.
- `return check.token` in both cases. The call goes on with that token. Nothing else in `request` changes: no
  status write, no `store.clear`, and no change to `stale`.

`api/src/integrations/pmspa/pmspa-client.spec.ts`: add two ordinary unit tests next to the `request:` tests. Use
the file's `setup()` and its `repo.find` fake, with `mockResolvedValueOnce(row)` and then a changed row:
1. The second `find` returns the row with another `email` → the request succeeds, and `getToken(USER, OWNER)` /
   `getAccount(USER, OWNER)` on the store return null (nothing was cached).
2. The second `find` returns null (disconnected meanwhile) → the same: success, nothing cached.

Don't touch `*.ac.*` files. `pmspa-client.ac.spec.ts`'s `find` fake returns the same row each time, so its AC-5
expectations still hold.

## Acceptance criteria
- [ ] The two new unit tests pass, and so do `pmspa-client.ac.spec.ts` and the e2e suite (`npm run test:e2e`).
- [ ] With an unchanged row, a re-login still caches the token and account (the existing tests and AC-5).

---

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |

## Review
_The owner's review (quick lane), or `review-feature`'s verdict._
