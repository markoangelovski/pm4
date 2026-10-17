---
id: T-0072
title: Sync DTOs, the snapshot loader, the two preview endpoints (API-INT-008, API-INT-015)
milestone: M6
app: api
status: done
size: M
tier: haiku
depends_on: [T-0071]
feature_spec: specs/06-features/int-sync-api.md
spec_row: T4
ac_files:
  - { path: api/test/pmspa-sync.ac.e2e-spec.ts, sha256: f25186d8786045ddcab6ae6086a1f5d4dcfb010e8953cf22f0a91f551db4054c }
---

# T-0072: Sync DTOs, the snapshot loader, the two preview endpoints (API-INT-008, API-INT-015)

**Tier reason:** DTOs copy `proposed-types.ts` and `save-pmspa-connection.dto.ts`; controller copies `pmspa-connection.controller.ts`; `load` is spelled out

Work from the brief: `node scripts/pm4.mjs brief T-0072`. Verify with `node scripts/pm4.mjs check T-0072`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- `dto/sync.dto.ts` (new): the Shared PMSPA shapes as classes (`SyncFieldDiffDto`, `SyncCandidateDto`,
  `SyncPreviewItemDto`, `SyncPreviewDto`, `SyncResultItemDto`, `SyncResultDto`), `SyncChoiceDto`, the request bodies
  `PmspaImportSelectionDto` (+ `PmspaImportProjectDto`), `PmspaImportDto`, `PmspaSyncTargetDto`, `PmspaSyncDto`.
  Validation as the brief says. `taskIds` has no array-size bound (the spec sets none); reviewer may want one.
  `dates` is not in the selection (feat-int-time-api), so `forbidNonWhitelisted` rejects it.
- `pmspa-sync.service.ts` (new): `load` (PMSPA projects first, user's time zone via `UsersRepository.findById`,
  active project and task links, PM4 lists, selected tasks or all), `importPreview`, `syncPreview` (404 when the
  record isn't the caller's).
- `pmspa-sync.controller.ts` (new): `POST integrations/pmspa/import/preview` and `sync/preview`.
- `pmspa.module.ts`: controller and service; imports `ProjectsModule`, `TasksModule` as the brief says, and
  `UsersModule` as well, because `load` needs `UsersRepository` for the time zone (not named in the brief).
- `pmspa-preview.ts` is not in this task's Files and is unchanged. The DTO classes are structurally compatible with
  its local types (typecheck passes), so the duplication remains until a task owns that file.
- Specs: `pmspa-sync.service.spec.ts`, `pmspa-sync.controller.spec.ts` (generated stubs replaced).
- `api/openapi.json` regenerated.

`node scripts/pm4.mjs check T-0072`: PASS (lint, format, typecheck, unit, e2e incl. AC-6, build, openapi export).

#- Review fixes (attempt 3): `@IsDefined()` added to `PmspaImportDto.selection` and `PmspaSyncDto.target` (F1); tests in
  `pmspa-sync.controller.spec.ts` (missing selection / target → error). 409, 502, 503 added to the browse (API-INT-005/006)
  and links (API-INT-014) controllers' error lists (F4); `openapi.json` regenerated. `PmspaImportProjectDto.taskIds` untouched.
- `node scripts/pm4.mjs check T-0072` (attempt 3): ac hashes ok; api lint, format:check, typecheck, test, test:e2e (AC-6 green),
  build, openapi:export all ok. `scope: FAIL (4 file(s))`: `pmspa-connection.repository(.spec).ts` and `pmspa-store(.spec).ts`
  are T5 files already modified in the tree before this run; not touched here.

## Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | FAIL | Check: openapi.json stale; regenerated. |
| 2 | haiku | PASS | Check re-run: all gates pass, AC-6 green. |
| 3 | haiku | PASS | Review fixes F1 (IsDefined on selection/target, specs in pmspa-sync.controller.spec.ts) and F4 (409/502/503 on browse and links controllers); openapi regenerated. All gates pass. Per-task scope flagged T5's files (a fix to an earlier task after T5 ran); `pm4 check --feature` PASS. |
| 4 | haiku | PASS | Review fix F6 (OQ-190): `@ArrayMaxSize(500)` on `PmspaImportProjectDto.taskIds`; unit test in `pmspa-sync.controller.spec.ts` (501 → error on taskIds, 500 → ok); openapi regenerated (`maxItems: 500`). Feature check: all gates ok; scope flags only the OQ-190 spec edits made by the orchestrator. |

## Review
_Filled in by `review-feature`._

**Verdict: changes-requested** (Opus review, feat-int-sync-api).
- **Major (F1):** `PmspaImportDto.selection` (`dto/sync.dto.ts:167-169`) and `PmspaSyncDto.target` (`:191-193`) have `@ValidateNested()` but no `@IsDefined()`, so `{choices: []}` validates. `POST /sync` then takes the lock, calls PMSPA and crashes in `syncRows` (`pmspa-preview.ts:442`) with a 500; `POST /import` crashes on `sel.projects` (`:329`). Fix: `@IsDefined()` (or `@IsObject()`) on both, with a unit test each.
- **Minor (F6, needs the owner):** `PmspaImportProjectDto.taskIds` (`:145-152`) has no `@ArrayMaxSize`; only the body limit caps the work. Suggested `@ArrayMaxSize(500)` like the choices, with a spec/endpoints.md line.
- Judgment call accepted: importing `UsersModule` for the time zone (as `time-logs.service.ts`).
- Tier: haiku adequate. Missing `@IsDefined` on a nested body is the kind of detail the spec should name for haiku.
