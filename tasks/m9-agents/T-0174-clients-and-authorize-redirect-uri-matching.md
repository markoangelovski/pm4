---
id: T-0174
title: Clients and authorize: redirect-URI matching, the SSRF-safe CIMD fetcher, DCR registration, ClientRegistry, GET /oauth/authorize
milestone: M9
app: api
status: done
size: M
tier: sonnet
implementer: claude-code/claude-sonnet-5-5
depends_on: [T-0173]
feature_spec: specs/06-features/mcp-oauth-api.md
spec_row: T2
ac_files:
  - { path: api/src/oauth/redirect-uri.ac.spec.ts, sha256: f7c120419c6ab529c9f3e4b8bfbc7a617ef570c531ae96a4b627913e58fb45c1 }
  - { path: api/src/oauth/cimd-fetcher.ac.spec.ts, sha256: 6e586758a1d547d01c0041cdb3351c155a8f3345b1c68e0715ee23e7171c1f16 }
  - { path: api/test/mcp-oauth.ac.e2e-spec.ts, sha256: 9046cb2d0932242f8031415442b41bdbc4153e56f40ee74e8554bb46dceee738 }
---

# T-0174: Clients and authorize: redirect-URI matching, the SSRF-safe CIMD fetcher, DCR registration, ClientRegistry, GET /oauth/authorize

**Tier reason:** Security logic (SSRF, open redirects) and an external fetch (task-routing sonnet triggers)

Work from the brief: `node scripts/pm4.mjs brief T-0174`. Verify with `node scripts/pm4.mjs check T-0174`.

## Implementation notes
Added redirect-uri, cimd-fetcher (SSRF-safe, address-checked lookup, IP literals checked, mapped IPv6 unwrapped), oauth-error (+filter), grants.repository (findClient, registerClient), oauth.store (request, CIMD cache), client-registry, oauth.service (authorize), oauth.controller (GET authorize, POST register); OAuthModule wired.

pm4 check T-0174: all gates ok (lint, format, typecheck, test, e2e, build, openapi); AC-5 ok. Only `scope: FAIL` for specs/06-features/mcp-oauth-api.md (main session's edit, ignored per instructions).

Review fix 1: cimd-fetcher now has an overall 5 s timer (`setTimeout` → `req.destroy`, cleared on end/error/close) besides the socket idle timeout, and rejects responses whose Content-Type media type isn't application/json. Lint, typecheck and unit tests pass (463).

### Attempts
| # | Agent | Result | Summary |
| --- | --- | --- | --- |
| 1 | claude-code/claude-sonnet-5-5 | DONE | Clients (CIMD + DCR), /authorize, redirect-URI matching, SSRF-safe CIMD fetch; all gates ok (scope flag only the main session's spec edit) |
| 2 | claude-code/claude-sonnet-5-5 | DONE | Review finding 1: overall 5 s timer on the CIMD fetch and a JSON-only Content-Type check; full feature check ok |

## Review
**Verdict: approve** (reviewer `claude-code/claude-opus-5-5`, 2026-11-21)

- Finding 1 (minor): the CIMD fetch's 5 s limit is only an idle-socket timeout (`cimd-fetcher.ts:92/142`); add an overall timer that destroys the request. No Content-Type check either (spec: "JSON only"). **Owner: fix before merge.**
- Finding 5 (tidy-up): stale comments `oauth.controller.ts:21`, `oauth.module.ts:19`.

**Implementer assessment**

| Agent | Attempts | ACs first try | Rules kept | Blocks right | Code | Grade | Fit |
| --- | --- | --- | --- | --- | --- | --- | --- |
| claude-code/claude-sonnet-5-5 | 1 | yes | yes | n/a | good SSRF handling; timeout gap (finding 1) | A | right: security logic needed Sonnet |
