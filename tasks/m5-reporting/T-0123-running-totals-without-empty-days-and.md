---
id: T-0123
title: Running totals without empty days and the aligned Workdays hover (D6, D7): four prototype twins
milestone: M5
app: web
status: done
size: S
tier: haiku
depends_on: [T-0050]
feature_spec: specs/06-features/rpt-web.md
spec_row: T3
ac_files:
  - { path: web/features/dashboard/stats.ac.test.ts, sha256: 982ae0c88cf38c34b55ea4fbeae12d3e4509627723c21e01e52db236037e6f8a }
  - { path: web/features/dashboard/components/dashboard-view.ac.test.tsx, sha256: 34f3abcdc7a25ee8e6dabdf38d2569a340a992f7b922e0ce16ea9299d18661b0 }
---

# T-0123: Running totals without empty days and the aligned Workdays hover (D6, D7): four prototype twins

**Tier reason:** Twin copy, the commands under *Web (T3)*

Work from the brief: `node scripts/pm4.mjs brief T-0123`. Verify with `node scripts/pm4.mjs check T-0123`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

Main session (twin copy, no subagent): the four files became their prototype twins with the commands under *Web (T3)* (`@/proto/` → `@/`, Prettier left them unchanged). No `proto` traces remain.

`pm4 check T-0123`: ac hashes ok (2), scope ok, lint/format/typecheck/test/build/api:types ok, twins ok (120 equal) → PASS. Manual (owner): AC-16, AC-13.

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | main session | PASS | Twin copy per *Web (T3)*; `pm4 check` PASS |

## Review
_Filled in by `review-feature`._
