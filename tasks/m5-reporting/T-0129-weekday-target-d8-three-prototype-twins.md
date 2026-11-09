---
id: T-0129
title: Weekday target (D8): three prototype twins
milestone: M5
app: web
status: done
size: S
tier: haiku
depends_on: [T-0123]
feature_spec: specs/06-features/rpt-web.md
spec_row: T4
ac_files:
  - { path: web/features/dashboard/stats.ac.test.ts, sha256: 3888d242a774aa1d13e34c11a268f2e8ea30285513f63cb3c567a0b619bafeac }
  - { path: web/features/dashboard/components/dashboard-view.ac.test.tsx, sha256: 34f3abcdc7a25ee8e6dabdf38d2569a340a992f7b922e0ce16ea9299d18661b0 }
---

# T-0129: Weekday target (D8): three prototype twins

**Tier reason:** Twin copy, the commands under *Web (T4)*

Work from the brief: `node scripts/pm4.mjs brief T-0129`. Verify with `node scripts/pm4.mjs check T-0129`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- Copied `web/proto/features/dashboard/{stats.ts,components/hours-summary.tsx,components/workday-chart.tsx}` to the same paths under `web/features/dashboard/` with `@/proto/` replaced by `@/` (the brief's sed command), then ran prettier on the three files (no changes needed).
- No `@/proto` imports remain in `web/features/dashboard/`.
- Reviewer: the diff is the D8 change (`git diff bf93b65~1 bf93b65 -- web/proto/features/dashboard/`), i.e. `weekdays` on `Totals`/`Bucket` and the weekday-based targets.

`pm4 check T-0129` summary:
```
pm4 check T-0129
  ac hashes: ok (2)
  scope: ok
  web lint: ok (15s)
  web format:check: ok (5s)
  web typecheck: ok (11s)
  web test: ok (28s)
  web build: ok (25s)
  web api:types: ok (1s)
  check AC-17: twins equal: ok
  twins: ok (122 equal)
  manual (owner verifies): AC-16, AC-18, AC-13

PASS T-0129
```

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | PASS | Copied the three prototype twins (D8) with the brief's sed; `pm4 check` PASS, twins equal, AC-18 left to the owner's browser check. |

## Review
_Filled in by `review-feature`._

**2026-11-01, Opus reviewer: approve.** `pm4 check T-0129` PASS (gates ok, AC-17 / twins ok, 122 equal). Diff matches D8 and the T4 interfaces: Target = weekdays × daily target, weekend days 0h in the bucket, tooltip and Table, running target adds on every weekday, "N days × Xh" label, empty copy "No weekdays in this range". No spec drift, no non-goals touched.
- Minor (test coverage): no AC covers the "No weekdays in this range" empty state (weekend-only range). Low risk (byte-identical twins); a later test step may add a weekend-only case to `dashboard-view.ac.test.tsx`.
- AC-18: checked in the prototype (`/proto/app`, November 2026): Target 147h "21 days × 7h" from 1 Nov; Sun 1 Nov Table and tooltip Target 0h; running target 7h → 35h → 84h → 147h at 30 Nov. Owner skipped the `/app` check (twins byte-identical).
- Tier feedback: haiku was right; mechanical twin copy, first attempt.
