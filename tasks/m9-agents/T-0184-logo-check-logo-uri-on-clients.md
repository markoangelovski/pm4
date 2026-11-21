---
id: T-0184
title: Logo check, logo_uri on clients and grants (migration 0013), register echo, ConnectedApp.logoUri, OpenAPI
milestone: M9
app: api
status: done
size: S
tier: haiku
implementer: claude-code/claude-haiku-5-5
depends_on: []
feature_spec: specs/06-features/mcp-logos.md
spec_row: T1
ac_files:
  - { path: api/src/oauth/client-logo.ac.spec.ts, sha256: 51ed361fa0ccee1fb755636f089db354b9dbc4cd22ea806bd8e05c81c4d21bf9 }
  - { path: api/src/oauth/client-registry.ac.spec.ts, sha256: 23ee76d951865bd61a7da54e3529445d6cbd0e82074f8c71a7988ebc1d6eb071 }
  - { path: api/test/mcp-logos.ac.e2e-spec.ts, sha256: c12c74da226caf95948346dbee2f86ad1eecf2f639b30899a1f7a82a98e1f167 }
---

# T-0184: Logo check, logo_uri on clients and grants (migration 0013), register echo, ConnectedApp.logoUri, OpenAPI

**Tier reason:** Every step is spelled out in *Interfaces*; copies the `client_name` path

Work from the brief: `node scripts/pm4.mjs brief T-0184`. Verify with `node scripts/pm4.mjs check T-0184`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- Added `api/src/oauth/client-logo.ts` (replaces the stub): `clientLogoUri` per endpoints.md *App logo*.
- `client-registry.ts`: `ResolvedClient.logoUri`; CIMD keeps `logo_uri` on the client_id host and fills `logoUri` for
  cached clients without the field; DCR `register` echoes `logo_uri` only when kept.
- Storage: `logo_uri` on `oauth_clients` and `oauth_grants` (migration `0013_oauth_logo_uri`, only the two
  `ADD COLUMN`s); repository, store (`PendingRequest.logoUri?`), `oauth.service` (authorize → allow) and
  `grants.service` list carry it; `ConnectedAppDto.logoUri`; `openapi.json` re-exported.
- Consent request unchanged (no logo).
- Checks: unit ACs (client-logo, client-registry) 19/19 pass. `pm4 check T-0184`:

```
PASS T-0184
  ac hashes: ok (3) · scope: ok · api lint: ok · api format:check: ok (after npm run format) · api typecheck: ok
  api test: ok · api test:e2e: ok (mcp-logos AC-6..AC-9 included) · api build: ok · api openapi:export: ok
```

### Attempts
| # | Agent | Result | Summary |
| --- | --- | --- | --- |
| 1 | claude-code/claude-haiku-5-5 | done | Logo check, logo_uri on clients and grants (0013), register echo, ConnectedApp.logoUri, OpenAPI; pm4 check PASS |

## Review
**Verdict: approve** (reviewer `claude-code/claude-opus-5-5`, 2026-11-21). `pm4 check --feature` PASS; no blockers or majors.

- Minor: `clientLogoUri` stores the value as sent (`client-logo.ts:24`), so `https://claude.ai:443/l.png` or a capitalised
  host passes and keeps its spelling. That is what the spec says ("Returns `value` unchanged"); no fix needed.
- Minor (feature-wide): `specs/03-api/endpoints.md` is still `status: review` (already so on `master`); the owner approves it.

*Implementer assessment*

| Agent | Attempts | ACs first try | Rules kept | Blocks right | Code | Grade | Fit |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `claude-code/claude-haiku-5-5` | 1 | yes (AC-1…AC-9) | yes | n/a | Clean: follows the `client_name` path, safe defaults for data saved before the release | A | right |
