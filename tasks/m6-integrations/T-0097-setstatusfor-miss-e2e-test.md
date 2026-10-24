---
id: T-0097
title: An e2e test that setStatusFor misses once the connection's URL or email changed
milestone: M6
app: api
status: done
size: S
tier: haiku
depends_on: []
feature_spec: —
files: [api/test/pmspa-connection-repository.e2e-spec.ts]
specs: [specs/06-features/int-followups.md]
ac_files: []
---

# T-0097: An e2e test that setStatusFor misses once the connection's URL or email changed

## Goal
Test `PmspaConnectionRepository.setStatusFor`'s miss against real Postgres (feat-int-followups D4). AC-3 covers
only the matching row and AC-5 fakes the miss. Opus review of T-0087, proposal 1.

## Change
New ordinary (not `*.ac.*`) e2e file `api/test/pmspa-connection-repository.e2e-spec.ts`. No production code changes.
- Copy the app setup (`beforeAll`/`afterAll` with `createTestApp`, the fake PMSPA providers, `deleteTestUsers`,
  `closeTestClients`), the `connect(user, email)` helper and `findConnection(userId)` from
  `api/test/pmspa-connection.ac.e2e-spec.ts`. Take only what these tests need.
- Get the repository with `app.get(PmspaConnectionRepository)` (`api/src/integrations/pmspa/pmspa-connection.repository.ts`).
- `describe("PmspaConnectionRepository.setStatusFor")` with three tests. Each one connects a new user (status
  `connected`) and reads the row's `url`, `email` and `last_checked_at` first:
  1. **Match:** `setStatusFor(id, { url, email }, "unreachable")` returns `true`. The row's status is `unreachable`
     and `last_checked_at` is later than before.
  2. **Email changed:** change the row's `email` with an SQL `UPDATE` through `testDb()`. Then
     `setStatusFor(id, { url, email: <old> }, "unreachable")` returns `false`, and `status` and `last_checked_at`
     are unchanged.
  3. **URL changed:** the same as 2, with the row's `url` changed instead.

## Acceptance criteria
- [ ] The three tests pass in `npm run test:e2e` in `api/`.
- [ ] No other file changes.

---

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- Added `api/test/pmspa-connection-repository.e2e-spec.ts`: three tests for `setStatusFor` (match, email changed,
  URL changed). Setup mirrors the AC file (fake PMSPA providers, `createTestApp`, `deleteTestUsers`,
  `closeTestClients`); `connect` saves through the PUT endpoint, and the row is read with a direct SQL query.
- No production code changed. Used `wait(20)` so `last_checked_at` can advance in the match test.
- `pm4 check T-0097`: PASS (scope ok; api lint, format:check, typecheck, test, test:e2e, build all ok).

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | PASS | New e2e file with 3 tests; file run 3/3 green; `pm4 check` PASS |

## Review
_The owner's review (quick lane), or `review-feature`'s verdict._
