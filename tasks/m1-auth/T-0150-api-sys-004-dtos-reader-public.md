---
id: T-0150
title: API-SYS-004: DTOs, reader, public controller, contract
milestone: M1
app: api
status: done
size: S
tier: haiku
depends_on: []
feature_spec: specs/06-features/shell-documentation.md
spec_row: T2
ac_files:
  - { path: api/src/changelog/read-changelog.ac.spec.ts, sha256: cc6b7f8c438f6f474dc5a2d435bf138fd32e7e438635515c957f34304b10b27a }
  - { path: api/test/changelog.ac.e2e-spec.ts, sha256: c41f59ba85b2cdb48c861d1577e1fa2e85fe8ba59c71a8938cae30eee99fa557 }
---

# T-0150: API-SYS-004: DTOs, reader, public controller, contract

**Tier reason:** Copies `version/`; reader and DTOs spelled out

Work from the brief: `node scripts/pm4.mjs brief T-0150`. Verify with `node scripts/pm4.mjs check T-0150`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- Added `api/src/changelog/`: `read-changelog.ts` (real reader: no file → `{ items: [] }`, otherwise parsed JSON),
  `changelog.controller.ts` (public, unlimited, `readChangelog()` once at construction), `changelog.module.ts`,
  `changelog.controller.spec.ts` (Nest CLI). `api/src/app.module.ts` imports `ChangelogModule`.
  `api/openapi.json` regenerated (+127 lines: `/api/v1/changelog`, the three DTO schemas, `ChangelogApp` enum).
- The DTO file (`dto/changelog-response.dto.ts`) was already in the tree as the test step and is unchanged.
- `pm4 check T-0150` summary:
  - ac hashes: ok (2); scope: ok
  - api lint, format:check, typecheck, test, test:e2e (incl. changelog and version e2e), build, openapi:export: ok
  - AC-6 and AC-7 pass (unit and e2e); AC-8 first half (contract has the endpoint and schemas): ok
  - **check AC-8: FAIL.** Second half: `(cd web && npm run -s api:types)` regenerates `web/lib/api/schema.d.ts`,
    which the committed file does not yet contain (the diff adds the changelog path, the schemas and the
    operation, 76 lines). That file is in the feature spec's Files table under **T3**, not T2, and `web/node_modules`
    is not installed in this worktree (`openapi-typescript: not found`). The regenerated output is at
    `/tmp/claude-1000/-home-angelovski-Documents-Projects-Project-Manager-pm4/fc29cef0-8467-455c-bae3-6fe531368a33/scratchpad/schema.d.ts`.
    I did not touch `web/` (out of scope). Owner decision needed: the AC-8 contract check can only pass once T3 lands
    (or the file moves to T2).

- **Resolved (OQ-273, owner 2026-11-07):** AC-8 split; the `schema.d.ts` half is now AC-16 (T3). Re-run `pm4 check T-0150`: ac hashes ok (2); api lint, format:check, typecheck, test, test:e2e, build, openapi:export ok; AC-1…AC-5 ok; AC-8 ok; AC-14, AC-16 skipped (later task). Scope lists only `specs/06-features/shell-documentation.md` and `specs/open-questions.md`, the main session's OQ-273 edits, not the implementation.

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | BLOCKED: spec | Implemented T2; all checks pass except AC-8 second half, which needs `web/lib/api/schema.d.ts` (T3's file) regenerated. |
| 2 | main session | pass | Spec fixed (OQ-273), no code change; check green but for the spec edits in scope |

## Review
**Opus review (2026-11-07): approve.** Controller `@Public() @NoRateLimit()`, reads once at bootstrap (a malformed file stops startup, D9); `readChangelog` follows AC-6. Minor (spec layer, main session): `specs/02-architecture/security.md` lines 73 and 104 do not list API-SYS-004 among the public and unlimited endpoints. Tier: right (haiku); its block was the AC-8 spec defect (OQ-273), not the tier.
