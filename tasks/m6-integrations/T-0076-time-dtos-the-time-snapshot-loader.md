---
id: T-0076
title: Time DTOs, the time snapshot loader, the import preview with dates, the push preview (API-INT-008 dates, API-INT-010)
milestone: M6
app: api
status: review
size: M
tier: haiku
depends_on: [T-0075]
feature_spec: specs/06-features/int-time-api.md
spec_row: T3
ac_files:
  - { path: api/test/pmspa-time.ac.e2e-spec.ts, sha256: 8c72474d45b16bfbc0bf7a14f1fe803bd876b7a4257e83cb78f335517c6fa594 }
---

# T-0076: Time DTOs, the time snapshot loader, the import preview with dates, the push preview (API-INT-008 dates, API-INT-010)

**Tier reason:** DTOs copy `dto/sync.dto.ts`; queries copy `TimeRepository.listDay` and `PmspaLinksRepository.active`; `loadTime` and the endpoint are spelled out

Work from the brief: `node scripts/pm4.mjs brief T-0076`. Verify with `node scripts/pm4.mjs check T-0076`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- `sync.dto.ts`: `PmspaImportSelectionDto.dates` (≤7, unique, `YYYY-MM-DD`, strict ISO); `PmspaPushTargetDto`, `PmspaPushDto`.
- `pmspa-sync.repository.ts`: `pm4Logs` (listDay's select, OR of dates and ids, empty → `[]`), `pm4Starts`.
- `pmspa-links.repository.ts`: `logLinks` (time-log links; empty lists → `[]`).
- `pmspa-time-sync.service.ts` (new, `PmspaTimeSyncService`): `loadTime` as specified. Not generated with a spec file (`--no-spec`); no spec added.
- `pmspa-sync.service.ts`: `load` returns a `TimeSnapshot` when `sel.dates` is non-empty (reads all PMSPA tasks); `importPreview` dispatches to `importTimeRows`; `pushPreview` (400 for a future date, then `pushDayRows`). `RowFailure`, `RunLinks`, `Run` exported; no behavior change there.
- `pmspa-sync.controller.ts`: `POST push/preview`.
- `pmspa.module.ts` imports `TimeModule`; `time.module.ts` exports `TimeLogsService`, `WorkdaysService`.
- `pmspa-sync.service.spec.ts`: provides a `PmspaTimeSyncService` stub (new constructor dependency).
- `pmspa-time-preview.ts`: `importTimeRows` takes `PmspaImportSelectionDto` (the `dates?` intersection removed).
- `api/openapi.json` re-exported.

`node scripts/pm4.mjs check T-0076`:
```
  ac hashes: ok (1)
  scope: FAIL (2 file(s))   -- specs/06-features/int-time-api.md, specs/open-questions.md (expected coordinator edits, OQ-193)
  pending ACs (later tasks, excluded): AC-3, AC-4, AC-5, AC-6, AC-9, AC-10, AC-11, AC-12, AC-13, AC-14, AC-18, AC-19, AC-20
  api lint: ok, api format:check: ok, api typecheck: ok, api test: ok, api test:e2e: ok, api build: ok, api openapi:export: ok
FAIL T-0076 (scope only)
```
AC-2, AC-7, AC-8, AC-16 pass in `api/test/pmspa-time.ac.e2e-spec.ts` (`-t "AC-(2|7|8|16) "`).

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | done | DTOs, pm4Logs/pm4Starts/logLinks, loadTime, import dates, push preview and endpoint; AC-2/7/8/16 pass; check fails only on scope (OQ-193 spec edits) |

## Review
**Verdict: approve** (Opus, 2026-10-17). Finding 6 (minor, process): service generated with `--no-spec`, overriding the CLI default; T-0077 added the spec file, so the end state matches *Files*. Tier: haiku right.
