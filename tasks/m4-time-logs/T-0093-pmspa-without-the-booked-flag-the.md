---
id: T-0093
title: PMSPA without the booked flag; the import's booked-time failure and its preview warning
milestone: M4
app: api
status: done
size: M
tier: haiku
depends_on: [T-0092]
feature_spec: specs/06-features/book-partial.md
spec_row: T2
ac_files:
  - { path: api/test/pmspa-time.ac.e2e-spec.ts, sha256: 5e724b64d19ec0398caaac9973225db49d1e9c00c06ee6e0c3594ad6934d3725 }
  - { path: api/src/integrations/pmspa/pmspa-time-fields.ac.spec.ts, sha256: f9ea29b2831a5eaf2de2a760d7c52045288cbf7577e435ee237daa6e9df3a5c0 }
---

# T-0093: PMSPA without the booked flag; the import's booked-time failure and its preview warning

**Tier reason:** Deletions, one `try` and one warning spelled out in *PMSPA*

Work from the brief: `node scripts/pm4.mjs brief T-0093`. Verify with `node scripts/pm4.mjs check T-0093`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- `pmspa-sync.repository.ts` `pm4Logs`: `bookedMinutes` (correlated sum over `bookings`) replaces `bookingDate`/`booked`.
- `pmspa-time-fields.ts`, `pmspa-remote.ts`: `booked` gone from `Pm4LogForPush`, both tuples, `RemoteEvent`; `updateEvent` deleted.
- `pmspa-time-sync.service.ts`: push's `booked` computation and both `updateEvent` blocks removed; `importEventRow` wraps `timeLogs.update` in `try`, `BookedTimeException` becomes the row's failure (AC-16).
- `pmspa-time-preview.ts`: the "Booked in PMSPA" warning replaced by the over-booked warning; the event row's action is computed before the warnings. Condition uses the preview's `t` (the event's PMSPA task found in `remoteTasks`).
- Ordinary specs updated (no `booked`; `updateEvent` test removed; the old warning expectation now `[]`).
- Reviewer: `pmspa-time-fields.ac.spec.ts:26` (`as Pm4LogForPush`) is now flagged by lint as an unnecessary assertion. Only an acceptance-test edit can clear it, so the task is blocked on the test (see Attempts).

**pm4 check T-0093 (last run):** ac hashes ok (2); scope FAIL (3 files: `pmspa-remote.ts`, `pmspa-sync.repository.ts`, `pmspa-time-preview.ts` reported "not in the Files table", though the brief's T2 row lists them, apparently only the first path of a row is parsed); api lint FAIL (1 error: `pmspa-time-fields.ac.spec.ts:26:3` no-unnecessary-type-assertion); api format:check ok; typecheck ok; test ok; test:e2e ok (incl. `pmspa-time.ac.e2e-spec.ts` 24/24); build ok; openapi:export ok; AC-17 check ok.

Orchestrator (BLOCKED: test resolved): removed the now-redundant `as Pm4LogForPush` cast (and its comment) from `pmspa-time-fields.ac.spec.ts`'s `log()` helper; test behavior unchanged; `pm4 hash` re-run. Spec Files row for the T2 PMSPA files rewritten with full paths (bare names didn't match the scope check); no content change. Final `pm4 check T-0093`: ac hashes ok (2), lint/format/typecheck/test/test:e2e/build/openapi:export ok, AC-17 check ok; scope flags only `specs/06-features/book-partial.md` (the orchestrator's row fix). AC-13 manual.

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | BLOCKED: test | All T2 code and ordinary specs done; all ACs (AC-14…17) pass. `check` fails on lint in the acceptance test `pmspa-time-fields.ac.spec.ts:26` (`as Pm4LogForPush` now unnecessary) and on the scope parser (3 files). Needs owner to edit the test (drop the cast) and/or the spec's Files row. |

## Review
**Verdict: approve** (Opus, 2026-10-23). `booked` gone from tuples, remote, push; `bookedMinutes` subquery; preview warning and import `try` per spec. Orchestrator's AC-test cast removal and spec Files-row path fix judged acceptable (the owner takes the spec diff knowingly).

Tier: haiku was right.
