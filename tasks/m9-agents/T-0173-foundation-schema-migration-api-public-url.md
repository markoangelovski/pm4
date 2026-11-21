---
id: T-0173
title: Foundation: schema + migration, API_PUBLIC_URL, rate-limit scopes and windows, prefix exclusions, urlencoded parser, discovery documents
milestone: M9
app: api
status: done
size: S
tier: haiku
implementer: claude-code/claude-haiku-5-5
depends_on: []
feature_spec: specs/06-features/mcp-oauth-api.md
spec_row: T1
ac_files:
  - { path: api/test/mcp-oauth.ac.e2e-spec.ts, sha256: 9046cb2d0932242f8031415442b41bdbc4153e56f40ee74e8554bb46dceee738 }
  - { path: api/src/rate-limit/rate-limits.ac.spec.ts, sha256: 7afae94a23266e4199a8552257ec0d8793a2994765196a56dacfd15169b05940 }
  - { path: api/src/config/api-public-url.ac.spec.ts, sha256: 94e20eed54759d24858b2df57cbc7982d1f93d8d5be7fa8e5edf5b2da33017fe }
---

# T-0173: Foundation: schema + migration, API_PUBLIC_URL, rate-limit scopes and windows, prefix exclusions, urlencoded parser, discovery documents

**Tier reason:** Spelled-out edits that copy existing patterns; no auth logic

Work from the brief: `node scripts/pm4.mjs brief T-0173`. Verify with `node scripts/pm4.mjs check T-0173`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- Schema `oauth.ts` (oauth_scope, oauth_clients, oauth_grants + `oauth_grants_user_client_uq`), exported; migration `0012_oauth.sql` + snapshot generated offline (drizzle-kit generate).
- `API_PUBLIC_URL`: optional string in the zod object, validated and defaulted in `envSchema` (superRefine + transform); `AppConfigService.apiPublicUrl`; `.env.example`, `test/setup-env.ts`.
- Rate limits: `DEFAULT_RATE_LIMITS.windowsMs = { oauthRegister: 3_600_000 }`; guard uses `windowsMs[scope] ?? windowMs`.
- `app.setup.ts`: prefix exclusions for the root OAuth paths; urlencoded body parser (10kb).
- Review fix 6: `isPublicOrigin` also rejects userinfo (`url.username`/`url.password` must be empty); unit test added in `env.schema.spec.ts`.
- `OAuthMetadataController` (API-MCP-001 two handlers, API-MCP-002) and `oauth-urls.ts` (`oauthUrls`, `parseScope`, `scopeList`, `SCOPES_SUPPORTED`).
- Not done (T3): 410 `gone` in the Problem Details filter.
- Check: `api/src/config/app-config.service.spec.ts` and `api/src/config/env.schema.spec.ts` got one line each for `API_PUBLIC_URL` (typed `Env` fixture; exact-object expectation). Main session added both to T1's row of the spec's Files table (Changelog 2026-11-21).

Check summary (pm4 check T-0173, main session rerun): ac hashes ok (3); scope FAIL only for `specs/06-features/mcp-oauth-api.md` (the main session's Files-table fix, not T1 code); api lint, format:check, typecheck, test, test:e2e, build, openapi:export all ok; AC-5 ok; AC-34 skipped (later task).

### Attempts
| # | Agent | Result | Summary |
| --- | --- | --- | --- |
| 1 | claude-code/claude-haiku-5-5 | BLOCKED: spec | T1 done, all gates and AC-1…5 pass; stopped because the two config unit-test fixtures weren't in the Files table |
| 2 | claude-code/claude-opus-5-5 | DONE | Added the two fixtures to T1's Files row and the Changelog; reran pm4 check: all gates ok |
| 3 | claude-code/claude-sonnet-5-5 | DONE | Review finding 6: `isPublicOrigin` rejects userinfo, plus a unit test; full feature check ok |

## Review
**Verdict: approve** (reviewer `claude-code/claude-opus-5-5`, 2026-11-21)

- Finding 6 (minor): `isPublicOrigin` (`env.schema.ts:104`) accepts userinfo (`https://u:p@host`), which would reach the issuer; require empty `username`/`password`. **Owner: fix before merge.**

**Implementer assessment**

| Agent | Attempts | ACs first try | Rules kept | Blocks right | Code | Grade | Fit |
| --- | --- | --- | --- | --- | --- | --- | --- |
| claude-code/claude-haiku-5-5 | 2 (Haiku, then an Opus Files-table fix) | yes | yes | yes: the two config test files weren't in *Files*, a real gap | clean; custom origin check (finding 6) | B | right: spelled-out edits, stopped at a real scope gap |
