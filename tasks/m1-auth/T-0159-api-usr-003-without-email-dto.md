---
id: T-0159
title: API-USR-003 without email: DTO, query, order, ordinary tests, openapi.json
milestone: M1
app: api
status: review
size: S
tier: haiku
depends_on: []
feature_spec: specs/06-features/acct-api.md
spec_row: T1
ac_files:
  - { path: api/test/users-search.ac.e2e-spec.ts, sha256: 049ddbd2ef1d06f814c0618b556e61725b8b12a3fc986c2cf1022a0ce5f71974 }
---

# T-0159: API-USR-003 without email: DTO, query, order, ordinary tests, openapi.json

**Tier reason:** Three spelled-out edits to existing code

Work from the brief: `node scripts/pm4.mjs brief T-0159`. Verify with `node scripts/pm4.mjs check T-0159`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- `users.repository.ts` `search`: matches `displayName` only, selects `{id, displayName, avatarUrl}`, orders by caller first, `lower(displayName)`, `users.id`. Removed the unused `or` import. Doc comments updated in the repository and `users.service.ts`.
- `user-search.dto.ts` already had the final `UserSummaryDto` (no email) from the test step, so `openapi.json` needed no diff.
- Ordinary unit tests in `users.repository.spec.ts` and `users.service.spec.ts` needed no change (they never asserted the email).
- `pm4 check` summary: PASS T-0159 (ac hashes ok; api lint, format:check, typecheck, test, test:e2e, build, openapi:export all ok; AC-10 ok). AC-1, AC-2, AC-15 pass against the local Postgres/Redis.

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | done | Repository search without email; check PASS |

## Review
_Filled in by `review-feature`._
