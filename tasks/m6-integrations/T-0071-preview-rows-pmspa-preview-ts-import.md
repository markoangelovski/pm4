---
id: T-0071
title: Preview rows (pmspa-preview.ts): import and sync rows over a snapshot, pure
milestone: M6
app: api
status: done
size: M
tier: sonnet
depends_on: [T-0069, T-0070]
feature_spec: specs/06-features/int-sync-api.md
spec_row: T3
ac_files: []
---

# T-0071: Preview rows (pmspa-preview.ts): import and sync rows over a snapshot, pure

**Tier reason:** A large port of the prototype's preview whose mock lookups map onto the snapshot by judgment (stale links, candidates, hashes)

Work from the brief: `node scripts/pm4.mjs brief T-0071`. Verify with `node scripts/pm4.mjs check T-0071`.

## Implementation notes
Added `pmspa-preview.ts` (pure `importRows`, `syncRows`, `choiceFor` over `SyncSnapshot`) and its spec. The sync DTO classes don't exist yet (T4's `dto/sync.dto.ts`), so the file exports structural types (`SyncPreviewItemDto`, `SyncChoiceDto`, `PmspaImportSelectionDto`, `PmspaSyncTargetDto`); T4's classes are structurally compatible. A link counts only when the other side is in the snapshot; `parent` reason on a sync parent project applies when it has no usable link.

`pm4 check T-0071`: PASS (lint, format, typecheck, test, e2e, build, openapi all ok).

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | sonnet | PASS | Preview rows implemented, check passes |

## Review
_Filled in by `review-feature`._

**Verdict: approve**, one minor finding (Opus review, feat-int-sync-api).
- **Minor (F5):** `pmspa-preview.ts:21-71` declares local copies of `SyncPreviewItemDto`, `SyncCandidateDto`, `SyncChoiceDto`, `PmspaImportSelectionDto`, `PmspaSyncTargetDto`, and `pmspa-sync.service.ts:35-38` imports them from there. Fix: `import type` them from `dto/sync.dto.ts` and delete the copies.
- Judgment calls accepted: a link counts only when its other side is in the snapshot; candidates exclude linked records; the parent row uses the usable-link test; import skipping a task whose project isn't listed (can't happen); `clearWarnings` only on `differs` rows.
- Tier: sonnet was right.
