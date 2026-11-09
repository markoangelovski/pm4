---
id: T-0131
title: Non-prod out of worked, shown as a Workdays segment (D9): four prototype twins, the proposed types removed
milestone: M5
app: web
status: done
size: S
tier: haiku
depends_on: [T-0129, T-0130]
feature_spec: specs/06-features/rpt-web.md
spec_row: T5
ac_files:
  - { path: web/features/dashboard/stats.ac.test.ts, sha256: 982ae0c88cf38c34b55ea4fbeae12d3e4509627723c21e01e52db236037e6f8a }
  - { path: web/features/dashboard/components/dashboard-view.ac.test.tsx, sha256: 34f3abcdc7a25ee8e6dabdf38d2569a340a992f7b922e0ce16ea9299d18661b0 }
---

# T-0131: Non-prod out of worked, shown as a Workdays segment (D9): four prototype twins, the proposed types removed

**Tier reason:** Twin copy, the commands under *Web (T5)*

Work from the brief: `node scripts/pm4.mjs brief T-0131`. Verify with `node scripts/pm4.mjs check T-0131`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- `web/proto/features/dashboard/stats.ts`: types taken from the schema again (`components["schemas"]["DashboardReportResponseDto"]`, `components["schemas"]["ReportDayDto"]`); the `./proposed-types` import removed. Prettier reformatted this file.
- `web/proto/features/dashboard/proposed-types.ts`: removed.
- Twins copied with the brief's sed commands and prettier: `web/features/dashboard/stats.ts`, `web/features/dashboard/components/dashboard-view.tsx`, `web/features/dashboard/components/workday-chart.tsx`, `web/features/time/components/logged-time-chart.tsx`.
- Reviewer: AC-21 (browser, light and dark) is manual and not verified by the check.

`pm4 check T-0131` summary: PASS. ac hashes ok (2); scope ok; web lint ok; format:check ok; typecheck ok; test ok; build ok; api:types ok; AC-17 and AC-20 twins equal; twins: 112 equal; manual: AC-16, AC-18, AC-21, AC-13.

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | PASS | Proto types restored to schema, proposed-types removed, four twins copied, check passed. |

## Review
**Verdict: approve** (Opus reviewer, 2026-11-02). `pm4 check T-0131` PASS. Scope clean, no `@/proto/*`
imports in production, no spec drift; D9 data, chart segment/tooltip/legend/y-axis/table column and colours match the spec.

Findings:
1. Minor: `radius={[4, 4, 0, 0]}` moved from `unbooked` to the new top `nonprod` bar
   (`workday-chart.tsx:365`), so days without Non-prod (most days) now have a square bar top. Comes from
   the confirmed prototype (twins equal); owner to confirm in the browser. If unwanted, round only the
   highest non-zero segment, in the prototype twin first.
2. Note only: `Totals.nonprod` is computed but has no UI reader (only AC-2 reads it), as the spec intends.

Owner checks by hand: AC-21 (light and dark), re-check AC-13/AC-16/AC-18, the Workdays table at 360 px.

Tier feedback: haiku was right (mechanical twin copy, passed on attempt 1).
