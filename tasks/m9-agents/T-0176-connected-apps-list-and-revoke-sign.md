---
id: T-0176
title: Connected apps list and revoke, Sign out of all devices and account deletion ending grants, openapi.json
milestone: M9
app: api
status: done
size: S
tier: sonnet
implementer: claude-code/claude-sonnet-5-5
depends_on: [T-0175]
feature_spec: specs/06-features/mcp-oauth-api.md
spec_row: T4
ac_files:
  - { path: api/test/connected-apps.ac.e2e-spec.ts, sha256: 6c3abd1012d3c20d8f05cda1d322a8e53286f707c5f58f15898e0b13522c8865 }
---

# T-0176: Connected apps list and revoke, Sign out of all devices and account deletion ending grants, openapi.json

**Tier reason:** Revocation across Postgres and Redis in two existing auth flows (auth logic trigger)

Work from the brief: `node scripts/pm4.mjs brief T-0176`. Verify with `node scripts/pm4.mjs check T-0176`.

## Implementation notes
Connected apps list and revoke are implemented. Sign out of all devices and account deletion now end MCP grants.
- `GrantsRepository` gained `listGrants`, `deleteAllGrants`, `grantIds` and `findClients`.
- `GrantsService` gained `list`, `revokeAll` and `markAllRevoked`. `list` takes `lastUsedAt` and `expired` from the Redis family.
- `ConnectedAppsController` serves `GET` and `DELETE :id`. An unowned or unknown id is `404`.
- `AuthService.logoutAll` revokes sessions, then grants. `AccountService.deleteAccount` calls `markAllRevoked` in its own `cleanUp`, before the delete.
- `AuthModule` and `AccountModule` import `OAuthModule`. The constructors in `auth.service.spec.ts` and `account.service.spec.ts` were updated for the new dependency.
- `api/openapi.json` was regenerated.
- Review finding 5 (comments only, no behaviour change): `OAuthController` and `OAuthModule` comments that still mentioned T3/T4 were rewritten to describe the current code. The stacked JSDoc on `AuthService.logoutAll` was merged into one block.

`pm4 check T-0176` summary: lint, format:check, typecheck, test, test:e2e, build and openapi:export all ok; checks AC-5 and AC-34 ok. The only FAIL is `scope`, which flags `specs/06-features/mcp-oauth-api.md`. That is the main session's edit.

### Attempts
| # | Agent | Result | Summary |
| --- | --- | --- | --- |
| 1 | claude-code/claude-sonnet-5-5 | DONE | Connected apps list/revoke, sign-out-all and account delete end grants; all gates ok, AC-34 ok (scope flag only the main session's spec edit) |
| 2 | claude-code/claude-opus-5-5 | DONE | Ran `npm run api:types` in web/: openapi.json changed only in path order (module import order), so schema.d.ts re-sorted to keep CI's contract check green |
| 3 | claude-code/claude-haiku-5-5 | DONE | Review finding 5: stale comments in `oauth.controller.ts`/`oauth.module.ts` rewritten, `logoutAll` JSDoc merged; full feature check ok |

## Review
**Verdict: approve** (reviewer `claude-code/claude-opus-5-5`, 2026-11-21)

- Finding 5 (tidy-up): two stacked JSDoc blocks on `logoutAll` (`auth.service.ts:168-169`).
- Finding 8 (info): `openapi.json`/`schema.d.ts` diffs are a path reorder only; say so in the PR.

**Implementer assessment**

| Agent | Attempts | ACs first try | Rules kept | Blocks right | Code | Grade | Fit |
| --- | --- | --- | --- | --- | --- | --- | --- |
| claude-code/claude-sonnet-5-5 | 2 (Sonnet, then Opus regenerating `schema.d.ts`) | yes | yes | n/a | clean; cleanup best-effort as specified | A | right |
