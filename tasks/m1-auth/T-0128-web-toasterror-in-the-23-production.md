---
id: T-0128
title: Web: toastError in the 23 production twins
milestone: M1
app: web
status: done
size: S
tier: haiku
depends_on: [T-0127]
feature_spec: specs/06-features/api-rate-limit.md
spec_row: T4
ac_files: []
---

# T-0128: Web: toastError in the 23 production twins

**Tier reason:** Mechanical: apply each file's prototype diff; `pm4 twins` proves it

Work from the brief: `node scripts/pm4.mjs brief T-0128`. Verify with `node scripts/pm4.mjs check T-0128`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- Changed the 23 production twins in `web/features/**` to the prototype commit `078f795` state: each file is the
  prototype file with `@/proto/` rewritten to `@/` and Prettier applied (the `pm4 twins` transform). Each
  `toast.error(...)` became `toastError(error, ...)` from `@/features/system/rate-limit`; caught and `onError` errors
  are now named; `sonner` imports were dropped only where unused.
- The diff of the 23 files contains only those toast changes.
- `pm4 check T-0128`: PASS (scope ok; web lint, format:check, typecheck, test, build, api:types ok; check AC-17 ok;
  twins ok, 122 equal, 0 warnings, 0 failures).

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | PASS | Regenerated the 23 twins from the prototype; `pm4 twins` 0 warnings; `pm4 check` PASS |

## Review
_Filled in by `review-feature`._

**Verdict: approve** (Opus, 2026-11-01). All 23 production files equal their prototype twins; only `toastError` swaps, `sonner` import dropped only where unused.
- Finding (minor, task file): *Attempts* result said `done`, not `PASS`; fixed in review.
- Tier: haiku was right (one attempt).
- Feature check (`pm4 check --feature`): PASS (api + web gates, AC-17, twins 122 equal, no proto imports in production).
