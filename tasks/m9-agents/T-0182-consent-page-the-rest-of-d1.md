---
id: T-0182
title: Consent page: the rest of D1, promote auth-frame and consent-page (D6 in both), sign-in page twin, ConsentRoute, app/auth/consent/page.tsx
milestone: M9
app: web
status: done
size: S
tier: haiku
implementer: claude-code/claude-opus-5-5
depends_on: [T-0181]
feature_spec: specs/06-features/mcp-web.md
spec_row: T2
ac_files:
  - { path: web/features/agents/components/consent-page.ac.test.tsx, sha256: ced5f0ba81784dd0f3bccd19c98fe7d40b65f98b5af4fb748667527a98755a7d }
  - { path: web/features/agents/components/consent-route.ac.test.tsx, sha256: 238be456fac13a3b8b1a27d9c2d6335ccbfdcdbd5879571fb6e681b07cf5df7b }
---

# T-0182: Consent page: the rest of D1, promote auth-frame and consent-page (D6 in both), sign-in page twin, ConsentRoute, app/auth/consent/page.tsx

**Tier reason:** Promotion plus spelled-out code (*Consent page and route*)

Work from the brief: `node scripts/pm4.mjs brief T-0182`. Verify with `node scripts/pm4.mjs check T-0182`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- D1 (rest): `proto/mock/seed.ts` and `proto/mock/client.ts` use the schema's types (`createClient<paths>`); `ConsentErrorCode` is local to the prototype consent page.
- **Not done: `rm proto/features/agents/proposed-types.ts`** was denied by the permission system. The file is still there, unreferenced. AC-21 fails only on it. The owner needs to run the `rm`, then re-run `pm4 check T-0182`.
- D6 applied in the prototype, then promoted (import rewrite only) to `features/agents/components/consent-page.tsx`. `features/auth/components/sign-in-page.tsx` is the prototype twin (uses `AuthFrame`). `auth-frame.tsx` was already in place, identical apart from its imports.
- `consent-route.tsx` and `app/auth/consent/page.tsx` written as in the brief.
- Consent tests: `consent-page.ac.test.tsx` and `consent-route.ac.test.tsx`, 9/9 pass. Typecheck, lint, format, unit tests, build and twins are OK.
- `pm4 check T-0182`: scope FAIL for `settings-view.tsx` and `mcp-server-url.tsx` (T-0183's files, in this worktree). AC-21 FAIL only because `proposed-types.ts` is still present.

Main-session `pm4 check` (after T-0181…T-0183): ac hashes ok, lint ok, format ok, typecheck ok, test ok, build ok, AC-21 ok, twins ok (167 equal). T-0183: PASS; T-0182's scope lists only T-0183's files.

### Attempts
| # | Agent | Result | Summary |
| --- | --- | --- | --- |
| 1 | claude-code/claude-haiku-5-5 | FAILED | D1 rest, D6 consent page + route, auth-frame promoted; only blocker: rm of proto proposed-types.ts denied (AC-21) |
| 2 | claude-code/claude-opus-5-5 | done | main session ran the spec's `rm web/proto/features/agents/proposed-types.ts` (D1); pm4 check: all gates + AC-21 ok, scope lists only T-0183 files |
| 3 | claude-code/claude-opus-5-5 | done | review finding 1: `?error=` lookup via `Object.hasOwn` in both consent-page twins |

## Review
**Verdict: approve** (reviewer `claude-code/claude-opus-5-5`, 2026-11-21). `pm4 check --feature`: PASS (7 hashes, scope, lint, format, typecheck, test, build, AC-21, 167 twins).

Findings:
- Minor: `(code && ERRORS[code]) ?? ERRORS.unknown` resolved `?error=toString`/`constructor` to an inherited property and rendered an empty page. **Fixed** in both twins (prototype first) with `Object.hasOwn(ERRORS, code)`.
- Bookkeeping: `implementer:` now names the attempt that finished the task (`claude-code/claude-opus-5-5`).

**Implementer assessment**

| Agent | Attempts | ACs first try | Rules kept | Blocks right | Code | Grade | Fit |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `claude-code/claude-haiku-5-5` | 2 (haiku FAILED, then a main-session `rm`) | yes for AC-7…AC-15; AC-21 failed only on the denied `rm` | yes: reported the denied `rm` instead of working around it | yes | exact twins plus the spec's code; the finding came from the prototype | C (rubric: main-session fix; cause was the permission system, not the agent) | right: promotion and spelled-out code within Haiku's reach |
