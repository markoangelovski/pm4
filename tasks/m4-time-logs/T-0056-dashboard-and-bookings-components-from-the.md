---
id: T-0056
title: Dashboard and Bookings components from the prototype; format / format:check cover features and proto
milestone: M4
app: web
status: done
size: M
tier: haiku
depends_on: [T-0055]
feature_spec: specs/06-features/proto-sync-web.md
spec_row: T3
ac_files:
  - { path: web/features/bookings/components/bookings-view.ac.test.tsx, sha256: 777dbdee048b62137d6181e2353053b3ce9be35f2a05cb3467fb9c26248e3037 }
---

# T-0056: Dashboard and Bookings components from the prototype; format / format:check cover features and proto

**Tier reason:** Copy commands and scripts spelled out; no logic

Work from the brief: `node scripts/pm4.mjs brief T-0056`. Verify with `node scripts/pm4.mjs check T-0056`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- Replaced the 7 Dashboard components and the 4 Bookings components (`booking-cell`, `bookings-view`, `day-section`, `range-field`) with their prototype twins (`@/proto/` → `@/`), then Prettier.
- `web/package.json`: `format` and `format:check` now cover `features` and `proto`. `npm run format` reformatted only `features/tasks/schemas.ts`, `features/time/duration.ts`, `features/users/lead.ts` (whitespace) and the Prettier-dirty twin copies above.
- Reviewer: the component diffs are large (`day-section.tsx`, `workday-chart.tsx`, `hours-summary.tsx`) because the twins are copied whole; AC-22 confirms they equal the twins.

`pm4 check T-0056`:
```
  ac hashes: ok (1)
  scope: ok
  web lint: ok (10s)
  web format:check: ok (3s)
  web typecheck: ok (5s)
  web test: ok (20s)
  web build: ok (11s)
  web api:types: ok (1s)
  check AC-18: T2's components equal their prototype twins: ok
  check AC-22: T3's components equal their prototype twins: ok
  check AC-19: prototype api.ts twins equal production apart from the client import: ok
  check AC-20: format:check covers features and proto: ok
  manual (owner verifies): AC-21

PASS T-0056
```

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | PASS | Copied the twins, updated format scripts, ran format; check passed. |

## Review
**Verdict: approve** (Opus reviewer, 2026-10-11). `pm4 check --feature specs/06-features/proto-sync-web.md`: PASS (8 AC hashes, scope, all api and web gates, AC-18, AC-19, AC-20, AC-22; AC-21 manual).

- No findings.
- Tier feedback: haiku was right; twin copies and script changes needed no judgment.
