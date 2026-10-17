---
id: T-0064
title: ProblemException and the filter, 502/503 in @ApiProblemResponses, pmspaProblems, PMSPA_ENCRYPTION_KEY
milestone: M6
app: api
status: done
size: S
tier: haiku
depends_on: []
feature_spec: specs/06-features/int-conn-api.md
spec_row: T1
ac_files: []
---

# T-0064: ProblemException and the filter, 502/503 in @ApiProblemResponses, pmspaProblems, PMSPA_ENCRYPTION_KEY

**Tier reason:** Copy the filter's status slugs and an existing env var + getter; the code is in *Interfaces*

Work from the brief: `node scripts/pm4.mjs brief T-0064`. Verify with `node scripts/pm4.mjs check T-0064`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- Added `problem-exception.ts`, `integrations/pmspa/pmspa-problems.ts`; the filter maps `ProblemException` (slug, title, detail for 5xx, extensions); `ProblemStatus` gains 502/503.
- Added `PMSPA_ENCRYPTION_KEY` (required, base64 of 32 bytes) to the schema, `AppConfigService.pmspaEncryptionKey`, `.env.example`, `test/setup-env.ts`, plus env and filter spec tests.
- Attempt 2 (OQ-184, owner decision): the key stays required in `validateEnv`. The auth fixture `env.schema.ac.spec.ts` already has a dummy key (not touched). `app-config.service.spec.ts` (now in T1's *Files*) gets the dummy key `Buffer.alloc(32, 7).toString("base64")` in its env fixture, plus a test that `pmspaEncryptionKey` returns a 32-byte Buffer equal to that key.
- Standalone runs: `npx vitest run src/config/env.schema.ac.spec.ts` passes (10/10); `npm run typecheck` passes; `npx vitest run src/config src/common` passes (40/40).
- Orchestrator (main session) edits for OQ-184, outside T1's *Files* by design: `scripts/pm4.mjs` (pending-AC exclusion now also requires the feature id in the test name, so other features' same-numbered ACs keep running), `specs/06-features/int-conn-api.md` (Files rows), `specs/open-questions.md` (OQ-184), `api/src/config/env.schema.ac.spec.ts` (dummy key; re-hashed under feat-auth-api-session, T-0016).

`node scripts/pm4.mjs check T-0064` (orchestrator run): api lint ok, format:check ok, typecheck ok, test ok, test:e2e ok, build ok; pending ACs AC-1…AC-17 excluded (later tasks), check AC-17 skipped (later task). Scope lists only the three orchestrator files above (`scripts/pm4.mjs`, the spec, `open-questions.md`); no implementer file is out of scope. Auth AC-6 confirmed running and passing under the new exclusion.

Review follow-up (haiku, Opus review fixes): `ProblemExtensions` exported from `problem-exception.ts` with reserved keys typed `never`, used for the `extensions` parameter. The filter logs a `ProblemException` with `logger.warn` (method, URL, status, slug; no stack); other 5xx keep `logger.error`. `problem-details.filter.spec.ts` covers the warn (no stack, never error) and that other 5xx still log at error.

`node scripts/pm4.mjs check T-0064` (implementer run): FAIL on scope only (24 files: later tasks T2…T5, `scripts/pm4.mjs`, the feature spec, `open-questions.md`), expected and ignored. Gates: api lint ok, format:check ok, typecheck ok, test ok, test:e2e ok, build ok, openapi:export ok; pending ACs AC-1…AC-19 excluded (later tasks), AC-17 skipped.

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | BLOCKED: test | Implemented T1. Required PMSPA key breaks auth AC-6 env tests; typecheck fails in an out-of-scope spec fixture. |
| 2 | haiku | PASS (gates); scope lists only orchestrator files | Added dummy key and `pmspaEncryptionKey` test to `app-config.service.spec.ts` per OQ-184. Typecheck, lint, test, e2e and build pass. `pm4 check` scope gate flags the owner's `scripts/pm4.mjs`, `specs/06-features/int-conn-api.md`, `specs/open-questions.md`. |
| 3 | haiku | PASS (gates); scope FAIL lists later tasks and orchestrator files only | Review follow-up: `ProblemExtensions` with reserved keys `never`; `ProblemException` logged at warn without stack; filter spec covers warn and error. Gates pass. |

## Review
_Filled in by `review-feature`._

**Verdict: approve** (Opus review, feat-int-conn-api).
- Minor: `problem-details.filter.ts:75` spreads `ProblemException.extensions` after `type`/`title`/`status`/`detail`/`errors`, so an extension could overwrite them (RFC 9457 says it mustn't). No live bug: the only callers are the fixed factories in `pmspa-problems.ts`. Fix: type the reserved keys out as `never` in `problem-exception.ts`, or strip them in the filter.
- Minor: `problem-details.filter.ts:59-66` logs expected PMSPA 502/503 problems with `logger.error` and a full stack. Fix: log a `ProblemException` at `warn` with its slug and no stack.
- Tier: haiku was right.

**Review fixes (2026-10-17, owner approved the suggestions):** `ProblemExtensions` (reserved keys `never`) and `warn` logging for a `ProblemException`. Verified by the orchestrator's `pm4 check` (gates ok; scope lists only the orchestrator's spec and script files). No second Opus review yet.

**Re-review (Opus, 2026-10-17): approve** Tier: right.
