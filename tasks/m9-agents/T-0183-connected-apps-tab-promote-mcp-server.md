---
id: T-0183
title: Connected apps tab: promote mcp-server-url and connected-apps-settings, settings view twin
milestone: M9
app: web
status: done
size: S
tier: haiku
implementer: claude-code/claude-opus-5-5
depends_on: [T-0181]
feature_spec: specs/06-features/mcp-web.md
spec_row: T3
ac_files:
  - { path: web/features/agents/components/connected-apps-settings.ac.test.tsx, sha256: 1dc0358e0a3508bf9d8212c31b3e8fefdc2a31e5596062b353903a4dec2feaa5 }
  - { path: web/features/settings/components/settings-view.ac.test.tsx, sha256: d0d2bcaa7122dd3e9f45db8d7cf665a6d2ced7ee2327dbe173d27252941bb47c }
---

# T-0183: Connected apps tab: promote mcp-server-url and connected-apps-settings, settings view twin

**Tier reason:** Promotion and twin copies only

Work from the brief: `node scripts/pm4.mjs brief T-0183`. Verify with `node scripts/pm4.mjs check T-0183`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- Changed: `features/agents/components/connected-apps-settings.tsx` (twin of the prototype, the two `@/proto/*` imports
  pointed at `@/features/system/rate-limit` and `@/features/users/api`); `features/settings/components/settings-view.tsx`
  (twin: adds the `connected-apps` tab after `integrations`, `Bot` icon). `mcp-server-url.tsx` was already promoted and is identical to the prototype.
- AC-16, AC-18, AC-19, AC-20 pass. **AC-17 fails because the test is unsatisfiable as written**: `listCalls()` counts
  every `GET /api/v1/connected-apps` since `beforeEach`, and the two earlier renders in the same test each make one call, so it reads 3 where the test expects 1 (and 2 after Retry, where it would be 4). The implementation makes exactly one list call per mount. → `BLOCKED: test`.
- `pm4 check T-0183`: `FAIL T-0183`. Failing: `web test` (AC-17 above, plus `consent-page.ac.test.tsx`, which belongs to T2) and
  `AC-21` (the consent page is in the export, not T3's scope). Lint, typecheck and build sections of the check were not isolated from this run.

Main-session `pm4 check` (after T-0181…T-0183): ac hashes ok, lint ok, format ok, typecheck ok, test ok, build ok, AC-21 ok, twins ok (167 equal). T-0183: PASS; T-0182's scope lists only T-0183's files.

### Attempts
| # | Agent | Result | Summary |
| --- | --- | --- | --- |
| 1 | claude-code/claude-haiku-5-5 | BLOCKED: test | connected-apps-settings + settings-view twins; AC-17 counted list calls from all three renders |
| 2 | claude-code/claude-opus-5-5 | done | main session fixed AC-17 (count relative to a baseline before the error render), re-ran pm4 hash; PASS T-0183 |

## Review
**Verdict: approve** (reviewer `claude-code/claude-opus-5-5`, 2026-11-21). `pm4 check --feature`: PASS (7 hashes, scope, lint, format, typecheck, test, build, AC-21, 167 twins).

Findings:
- AC-17 test edit (`connected-apps-settings.ac.test.tsx:164-173`) is correct and doesn't weaken the test; new hash recorded.
- Bookkeeping: `implementer:` now names the finishing attempt (`claude-code/claude-opus-5-5`); the spec's *Agents* row and *Changelog* now record the AC-17 fix.

**Implementer assessment**

| Agent | Attempts | ACs first try | Rules kept | Blocks right | Code | Grade | Fit |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `claude-code/claude-haiku-5-5` | 2 (haiku BLOCKED: test, then the main-session test fix) | AC-16, AC-18…AC-20 yes; AC-17 failed because the test was wrong | yes: didn't touch the test | yes: exact diagnosis of the call counter | exact twins | C (rubric: main-session fix; the block was valid) | right: twin copies only |
