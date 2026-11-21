---
id: T-0181
title: returnTo accepts the consent page, AuthGuard's signedOutHref, D1 for api.ts / scopes.ts and their twins, promote app-mark
milestone: M9
app: web
status: done
size: S
tier: sonnet
implementer: claude-code/claude-sonnet-5-5
depends_on: []
feature_spec: specs/06-features/mcp-web.md
spec_row: T1
ac_files:
  - { path: web/lib/auth/return-to-consent.ac.test.ts, sha256: fa22dea8b0f5fac471aa075d19590a74a87b4e50691740b07914685f9017e8ca }
  - { path: web/features/auth/components/auth-guard-consent.ac.test.tsx, sha256: c36e239de1ffb5ea170cee79aeb708c839bac78dc1b3efb66c1f2c969fa3d734 }
  - { path: web/features/agents/api.ac.test.tsx, sha256: 87e008afda7d6374cb2e46e1c80b4c6d13698a57520666ed763ad471c20a2057 }
---

# T-0181: returnTo accepts the consent page, AuthGuard's signedOutHref, D1 for api.ts / scopes.ts and their twins, promote app-mark

**Tier reason:** Auth redirect rule and the guard's signed-out target (auth trigger); the rest is spelled out

Work from the brief: `node scripts/pm4.mjs brief T-0181`. Verify with `node scripts/pm4.mjs check T-0181`.

## Implementation notes
D3 (`return-to.ts`), D4 (`AuthGuard` `signedOutHref`), D1 (proto `api.ts`/`scopes.ts`), D2 twins (`features/agents/api.ts`, `scopes.ts`), `app-mark` promoted.
Last `pm4 check`: lint, format, typecheck, twins (0 failures) and T1's tests (return-to, auth-guard, agents/api: 38 passed) are green.
Main-session `pm4 check T-0181` (FAIL, build only): ac hashes ok (3), scope ok, lint ok, format ok, typecheck ok, test ok, twins ok (161 equal); `next build` fails only on `app/auth/consent/page.tsx`, the T2 "not implemented" stub (prerender throws). The consent-page and connected-apps ACs fail for the same reason (T2/T3). Neither is T1's.

### Attempts
| # | Agent | Result | Summary |
| --- | --- | --- | --- |
| 1 | claude-code/claude-sonnet-5-5 | done | D3 return-to, D4 AuthGuard signedOutHref, D1 proto api/scopes, D2 twins; pm4 check: lint, format, typecheck, test (T1 ACs), twins ok; build FAIL only on the T2 consent-page stub |

## Review
**Verdict: approve** (reviewer `claude-code/claude-opus-5-5`, 2026-11-21). `pm4 check --feature`: PASS (7 hashes, scope, lint, format, typecheck, test, build, AC-21, 167 twins).

Findings: none. D3 (`return-to.ts:37-47`) normalizes first, then allows only `routes.consent`; D4 default prop is used in both redirects and both dependency arrays; hooks match Interfaces.

**Implementer assessment**

| Agent | Attempts | ACs first try | Rules kept | Blocks right | Code | Grade | Fit |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `claude-code/claude-sonnet-5-5` | 1 | yes (T1's 3 test files) | yes | n/a | matches Interfaces exactly; dependency arrays right; no leftovers | A | right: auth-redirect change justifies the stronger model, done in one pass |
