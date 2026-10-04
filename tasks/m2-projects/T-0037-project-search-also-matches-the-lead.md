---
id: T-0037
title: Project search also matches the lead's name, title matches first (API-PRJ-002 q)
milestone: M2
app: api
status: done
size: S
tier: sonnet
depends_on: []
feature_spec: specs/06-features/prj-dates-lead-search.md
spec_row: T1
ac_files:
  - { path: api/test/projects-lead-search.ac.e2e-spec.ts, sha256: 896348fef396d3d0533c01cca776e4ec21a121f6f2e9bdc2a72e5afea987448b }
---

# T-0037: Project search also matches the lead's name, title matches first (API-PRJ-002 q)

**Tier reason:** One query change, but a join in the count and a ranked order across pages

Work from the brief: `node scripts/pm4.mjs brief T-0037`. Verify with `node scripts/pm4.mjs check T-0037`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._
list() now matches title or coalesce(lead.displayName, projects.projectLead); title matches first; count query joins lead. DTO declares own q (`declare q`). openapi.json regenerated.
pm4 check: lint, format, typecheck, test, e2e, build, openapi all ok. Only the AC-11 grep failed, because web/lib/api/schema.d.ts is regenerated in T2 (expected).
After T2: `pm4 check --feature` passes, AC-11 included.

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | sonnet | pass | All gates ok except AC-11 web half (T2) |

## Review
**Verdict: approve** (Opus review, 2026-10-04; `pm4 check --feature` PASS).
- `list()` matches title or `coalesce(lead.displayName, projects.projectLead)`, title matches first with `id` tie-break, and the count joins `lead`. Scoping and `escapeLike` are intact. The DTO `declare q` has the same decorators as `PageQueryDto` and the spec's doc comment.
- Findings: the stale AC-11 note and the Attempts wording (fixed in this review).
- Tier: sonnet was right (first attempt).
