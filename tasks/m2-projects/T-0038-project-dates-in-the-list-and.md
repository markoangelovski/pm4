---
id: T-0038
title: Project dates in the list and detail, the lead-search placeholder, regenerated API types
milestone: M2
app: web
status: done
size: S
tier: sonnet
depends_on: [T-0037]
feature_spec: specs/06-features/prj-dates-lead-search.md
spec_row: T2
ac_files:
  - { path: web/lib/time/format-date-time.ac.test.ts, sha256: 49c2c7b4687fe776d557a0c430fe2a3d1e9f429621a50cf5c6e18dca7eae9c69 }
  - { path: web/features/projects/components/project-dates.ac.test.tsx, sha256: ea21fe4785540c60c23a994abd5a90c01466b792e0daffeb763a9a7a3c56994e }
---

# T-0038: Project dates in the list and detail, the lead-search placeholder, regenerated API types

**Tier reason:** Two formatters plus small edits to two components, following given patterns

Work from the brief: `node scripts/pm4.mjs brief T-0038`. Verify with `node scripts/pm4.mjs check T-0038`.

## Implementation notes
Added formatShortDate/formatDateTime, Created/Updated list columns, new placeholder, detail Created/Last modified rows, regenerated schema.d.ts.
pm4 check: PASS T-0038 (lint, format, typecheck, test, build, api:types, AC-11 all ok).

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | sonnet | pass | Implemented; check PASS |

## Review
**Verdict: approve** (Opus review, 2026-10-04; `pm4 check --feature` PASS).
- Formatters follow the `TZDate` + `format` pattern. The list columns, skeleton cells, `—` fallback, placeholder and detail rows match the spec. The table scrolls sideways at narrow widths.
- Observation, no change: if `GET /me` fails, the dates stay `—` (as the spec says).
- Tier: sonnet was fine; haiku would have done.
