---
id: T-0086
title: Preview warnings (D1) and pmspaCreatedAt on the link list (D2)
milestone: M6
app: api
status: done
size: S
tier: haiku
depends_on: []
feature_spec: specs/06-features/int-followups.md
spec_row: T1
ac_files:
  - { path: api/test/pmspa-followups.ac.e2e-spec.ts, sha256: cd2d453fd71f482c31b0ba03a0ac3861163f9bd844c918fa37c8cd9302ffd291 }
---

# T-0086: Preview warnings (D1) and pmspaCreatedAt on the link list (D2)

**Tier reason:** Both spelled out as code under *Preview warnings and created dates*

Work from the brief: `node scripts/pm4.mjs brief T-0086`. Verify with `node scripts/pm4.mjs check T-0086`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- D1: `importTimeRows` in `pmspa-time-preview.ts` adds the two out-of-range/over-1000-character warnings after the `offStep` warning, as the brief's code.
- D2: `pmspaCreatedAt` in `pmspa-links.service.ts` replaces the stub; `list()` already maps it.
- `pmspa-links.service.spec.ts`: the `list` fixture used `pmspaId: "x"` (not an ObjectId) and no `pmspaCreatedAt`; it now uses `651fffb0` + zeros and expects the created date. Ordinary spec, not an AC file.
- Formatting: `npm run format` reflowed one line in `pmspa-time-preview.ts`.
- Still red, for T-0087 (excluded): `pmspa-client.ac.spec.ts` AC-4/AC-5 and `pmspa-followups.ac.e2e-spec.ts` AC-3.

`pm4 check T-0086`: PASS. ac hashes ok; scope ok; api lint, format:check, typecheck, test, test:e2e, build, openapi:export all ok; AC-3..AC-11 pending (later tasks, excluded).

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | PASS | D1 warnings and D2 `pmspaCreatedAt`; fixed the stale `list` unit fixture; `npm run format` for one line. |

## Review
**Verdict: approve** (Opus, 2026-10-18). `pm4 check --feature` PASS (all api/web gates, 5 ac hashes, twins 88 equal); AC-11 verified by the owner.
- D1 warnings in `pmspa-time-preview.ts` match the spec (order, one per log, no warning for empty text); `logFailure` untouched.
- D2 `pmspaCreatedAt` matches; the `list` fixture change to a real ObjectId is a legitimate ordinary-spec fix (`pmspa_id` is 12-byte `bytea`, data-model.md).
- Tier feedback: haiku was right.
