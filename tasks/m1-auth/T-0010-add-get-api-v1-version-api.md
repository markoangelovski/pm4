---
id: T-0010
title: Add GET /api/v1/version (API-SYS-003) and export the OpenAPI document
milestone: M1
app: api
status: done
size: S
tier: haiku
depends_on: []
feature_spec: specs/06-features/shell-sidebar-branding.md
spec_row: T1
ac_files:
  - { path: api/test/version.ac.e2e-spec.ts, sha256: 86f2e47b850161e647332363d541af3233508789ad770b2087d92363d8819f02 }
---

# T-0010: Add GET /api/v1/version (API-SYS-003) and export the OpenAPI document

**Tier reason:** 4 small files, all code given in *Interfaces*; Nest CLI + `openapi:export`; no DB, auth or decisions

Work from the brief: `node scripts/pm4.mjs brief T-0010`. Verify with `node scripts/pm4.mjs check T-0010`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

BLOCKED: spec (haiku, 2026-10-03). `api/scripts/export-openapi.ts` never called `configureApp()`, so the exported
document ignored the global `api/v1` prefix (the endpoint came out as `/version`, AC-3 failed). The fix, calling
`configureApp(app)` before `buildOpenApiDocument` (as `main.ts` and the e2e tests do), works: all T1 gates and AC-1..AC-3 pass.
The file isn't in the spec's *Files* table. Owner (2026-10-03): accepted; the spec now lists the file under T1.

`pm4 check T-0010` (main session): lint, typecheck, test, test:e2e, build, openapi:export and AC-3 ok; scope flags only the spec amendment.

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | BLOCKED: spec | Implementation done; `export-openapi.ts` needed `configureApp` but wasn't in *Files*. Spec amended, no re-run needed |

## Review
**Verdict: approve** (Opus review, 2026-10-03, feat-shell-sidebar-branding). Controller, module, DTO and generated spec match *Interfaces* word for word; no DB/Redis; `/health` untouched; `openapi.json` has `/api/v1/version` (200, required `version`); the amended `export-openapi.ts` (`configureApp`, still `app.close()`) is harmless and keeps `/health` out of the document. Optional finding (not done): requirement status columns (`endpoints.md` API-SYS-003, `screens.md` SCR-004) not advanced; the tables are maintained inconsistently. Tier: haiku right; the stop was a spec omission, flagged correctly.
