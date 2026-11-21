---
id: T-0175
title: Consent, tokens, revoke: the Redis store with the rotation script, McpTokenService, the consent endpoints, POST /oauth/token and /oauth/revoke
milestone: M9
app: api
status: done
size: M
tier: sonnet
implementer: claude-code/claude-sonnet-5-5
depends_on: [T-0174]
feature_spec: specs/06-features/mcp-oauth-api.md
spec_row: T3
ac_files:
  - { path: api/test/mcp-oauth.ac.e2e-spec.ts, sha256: 9046cb2d0932242f8031415442b41bdbc4153e56f40ee74e8554bb46dceee738 }
---

# T-0175: Consent, tokens, revoke: the Redis store with the rotation script, McpTokenService, the consent endpoints, POST /oauth/token and /oauth/revoke

**Tier reason:** Auth and token logic with an atomic Lua script (sonnet triggers)

Work from the brief: `node scripts/pm4.mjs brief T-0175`. Verify with `node scripts/pm4.mjs check T-0175`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

Added the Redis store (rotation Lua script, families, codes, revocation), `McpTokenService`, `GrantsService.deleteGrant`, the consent endpoints, `POST /oauth/token` and `/oauth/revoke`, and `410` → `gone` in the Problem Details filter. Wired `OAuthModule` (JwtModule, UsersModule, RateLimitModule; exports).
Review: a reused (rotated) token revokes its family whatever `client_id` is sent; only a live token is client-checked (D6).
Review finding 4 fixed: the refresh failure path (`oauth.service.ts`) calls `store.revokeGrant` only when `grantsService.deleteGrant` returns false (row already gone), since `deleteGrant` already revokes the Redis family when the row existed.
Review fixes 2 and 3: a repeated `client_id` on `/oauth/token` is `400 invalid_request`; `issueFirstRefresh` is one Lua script (family must exist), so a concurrent revoke is not undone. Lint, typecheck and unit tests pass; full check left to the main session.

pm4 check T-0175: lint, format, typecheck, test, e2e (23/23 in mcp-oauth), build and openapi all ok. Scope FAIL only for `specs/06-features/mcp-oauth-api.md` (main session's edit).

### Attempts
| # | Agent | Result | Summary |
| --- | --- | --- | --- |
| 1 | claude-code/claude-sonnet-5-5 | DONE | Consent, token exchange/refresh rotation, revoke, Redis store, 410; all gates ok (scope flag only the main session's spec edit) |
| 2 | claude-code/claude-sonnet-5-5 | DONE | Review findings 2–3: repeated `client_id` → 400 `invalid_request`; first refresh issued atomically by a Lua script; full feature check ok |
| 3 | claude-code/claude-haiku-5-5 | DONE | Review finding 4: refresh failure calls `store.revokeGrant` only when `deleteGrant` found no row; full feature check ok |

## Review
**Verdict: approve** (reviewer `claude-code/claude-opus-5-5`, 2026-11-21)

- Finding 2 (minor): `/oauth/token` answers a repeated `client_id` with 401 `invalid_client` (`oauth.service.ts:212`); API-MCP-008 says 400 `invalid_request`. **Owner: fix before merge.**
- Finding 3 (minor, concurrency): `issueFirstRefresh` (`oauth.store.ts:220`) does GET then MULTI, not atomic against `revokeGrant`; use a Lua script checking the family's EXISTS, or WATCH. **Owner: fix before merge.**
- Finding 4 (tidy-up): the refresh failure path revokes twice (`oauth.service.ts:270-271`); call `store.revokeGrant` only when `deleteGrant` returns false.

**Implementer assessment**

| Agent | Attempts | ACs first try | Rules kept | Blocks right | Code | Grade | Fit |
| --- | --- | --- | --- | --- | --- | --- | --- |
| claude-code/claude-sonnet-5-5 | 1 | yes | yes | n/a | correct Lua rotation with the D6 client check; findings 2–4 | A | right: atomic token logic |
