---
id: T-0068
title: DTOs, service, controller, OpenAPI export (API-INT-001…004)
milestone: M6
app: api
status: done
size: M
tier: sonnet
depends_on: [T-0067]
feature_spec: specs/06-features/int-conn-api.md
spec_row: T5
ac_files:
  - { path: api/test/pmspa-connection.ac.e2e-spec.ts, sha256: 3bc610db31b24760418da969fa81a197ddc5e6be816a4afaaac3e5c822944eb5 }
---

# T-0068: DTOs, service, controller, OpenAPI export (API-INT-001…004)

**Tier reason:** Copy `projects/` (controller, service, DTOs, `@ApiProblemResponses`); the save/test/disconnect rules are in *Interfaces*

Work from the brief: `node scripts/pm4.mjs brief T-0068`. Verify with `node scripts/pm4.mjs check T-0068`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- New: `dto/save-pmspa-connection.dto.ts`, `pmspa-connection.service.ts` (get, save, test, disconnect), `pmspa-connection.controller.ts` (`/integrations/pmspa`, four operations with `@ApiProblemResponses`), specs for controller and service.
- `pmspa.module.ts` (T3/T4 file) now registers the controller and service; the Nest CLI had written a broken draft of it, rewritten by hand. Providers and exports unchanged.
- Account switch needs no extra query: with no row's `pmspa_user_id`, a switch is any link of another account, so the gate is `countOtherAccountLinks(userId, newId) > 0` (the 409 `accountSwitch` uses the new account's email).
- `api/openapi.json` regenerated; AC-17 check passes.
- `pm4 check T-0068` (final run):
  ```
  ac hashes: ok (1) | scope: FAIL (3 file(s): the orchestrator's 3 files only) | api lint: ok | api format:check: ok
  api typecheck: ok | api test: ok | api test:e2e: FAIL (AC-14 only, 19/20) | api build: ok | api openapi:export: ok
  check AC-17: ok
  ```
- **AC-14 test fix (orchestrator, pending owner approval).** AC-14 built the four anonymous supertest requests eagerly, so all but the first got `ECONNREFUSED`. The orchestrator changed them to lazy `() => request(server)...` thunks (same pattern as projects AC-15, same assertions) and re-ran `pm4 hash specs/06-features/int-conn-api.md`.
- `pm4 check T-0068` after the test fix (orchestrator run):
  ```
  ac hashes: ok (1) | scope: FAIL (3 file(s): the orchestrator's 3 files only) | api lint: ok | api format:check: ok
  api typecheck: ok | api test: ok | api test:e2e: ok (AC-1…AC-14, 20/20) | api build: ok | api openapi:export: ok
  check AC-17: ok
  ```
  AC-15 and AC-16 pass in `api test`. All of AC-1…AC-17 pass.
- `pm4 check` scope: only the orchestrator's `scripts/pm4.mjs`, `specs/06-features/int-conn-api.md`, `specs/open-questions.md`; no other file out of scope.

- Review fixes (attempt 3): `save` calls `store.clear` when it wrote the row but did not end connected; `test` clears on every non-connected result and on D8; a refused 409 touches nothing (OQ-186, AC-18). A `password_enc` that no longer decrypts (private `stored()` helper): `save` without a password answers 400 "Enter the password.", `test` writes `invalid-credentials`, clears and skips PMSPA; `save` with a password never decrypts (OQ-187, AC-19). Unit tests added; `openapi.json` unchanged by the export.
- `pm4 check T-0068` (attempt 3): all gates ok (lint, format, typecheck, test, e2e incl. AC-1..AC-19, build, openapi, AC-17); only scope FAIL for orchestrator files `scripts/pm4.mjs`, `specs/06-features/int-conn-api.md`, `specs/open-questions.md`.

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | BLOCKED: test | All ACs except AC-14 pass (e2e 19/20). AC-14 fails from its eager supertest requests (ECONNREFUSED), not from the code; see Implementation notes. Lint and format fixed in my spec. |
| 2 | — (orchestrator) | ok | AC-14 test made lazy; no code change. Every gate passes except scope (orchestrator files only). |
| 3 | sonnet | ok | OQ-186 (clear cache on non-connected save/test/D8) and OQ-187 (undecryptable password) in the service; AC-18/19 pass. |

## Review
_Filled in by `review-feature`._

**Verdict: changes-requested** (Opus review, feat-int-conn-api).
- **Major:** a cached PMSPA token outlives a credential or URL change. `pmspa-connection.service.ts:102-105` (`save`) only touches the store when connected, and `test` (`:119-127`) never clears it on a non-connected result or on D8. Example: connect to host A, then save URL B with wrong credentials. The client (`pmspa-client.ts:139-142`) then sends A's token to B. The same happens with a new email or D8: calls go through as the old account and `setStatus(connected)` undoes invalid-credentials. Fix: `store.clear(userId)` in `save` before the upsert, then set the token and account only when connected. In `test`, `store.clear` on every non-connected result and on D8. The spec's *Service* line needs the rule (owner).
- **Minor, spec gap (needs an OQ):** an undecryptable `password_enc` (key rotation, `environments.md:50`) gives a generic 500 at `service.ts:66`, `:117` and `pmspa-client.ts:123`. Suggested: `request`/`test` treat it as invalid credentials; `save` without a password → `400 password "Enter the password."`.
- The AC-14 test change (lazy supertest thunks) doesn't weaken the test. It needs the owner's explicit approval and a record.
- Tier: haiku was borderline. It followed *Interfaces* literally but didn't reason about credential state. Use sonnet for the fix.

**Review fixes (2026-10-17, owner approved the suggestions):** `save`/`test` clear the store when not connected and on D8 (OQ-186, AC-18); a stored password that doesn't decrypt → 400 on save, invalid-credentials on Test (OQ-187, AC-19). Attempt 3 on sonnet. AC-14 test change approved (OQ-188). Verified by the orchestrator's `pm4 check` (gates ok; scope lists only the orchestrator's spec and script files). No second Opus review yet.

**Re-review (Opus, 2026-10-17): approve. The orchestrator tightened AC-18 (keys back after each reconnect) and AC-19 (token and account keys cleared after `request` and Test), then re-hashed.** Tier: right.
