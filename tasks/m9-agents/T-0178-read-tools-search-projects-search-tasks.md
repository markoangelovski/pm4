---
id: T-0178
title: Read tools: search_projects, search_tasks, get_day, list_time_logs (+ listRange), report_summary (+ report-summary.ts)
milestone: M9
app: api
status: blocked
size: M
tier: haiku
implementer: —
depends_on: [T-0177]
feature_spec: specs/06-features/mcp-tools-api.md
spec_row: T2
ac_files:
  - { path: api/test/mcp-tools.ac.e2e-spec.ts, sha256: f5f4b1b4a286483c07fb9f4523114917ca55a6640eb5846935a779fcb97564a0 }
  - { path: api/src/mcp/report-summary.ac.spec.ts, sha256: 66636b2c8f7bf54084747b171398f9de6ee5277b97377885c4a2bdb2ea72d99c }
---

# T-0178: Read tools: search_projects, search_tasks, get_day, list_time_logs (+ listRange), report_summary (+ report-summary.ts)

**Tier reason:** Each tool is a spelled-out mapping onto an existing service, copying T1's registration pattern; one query copies `listDay`

Work from the brief: `node scripts/pm4.mjs brief T-0178`. Verify with `node scripts/pm4.mjs check T-0178`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Agent | Result | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by `review-feature`._
