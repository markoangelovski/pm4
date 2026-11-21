---
id: T-0179
title: Write tools: log_time, update_time_log, create_task, set_task_status, set_workday_start
milestone: M9
app: api
status: blocked
size: S
tier: haiku
implementer: —
depends_on: [T-0178]
feature_spec: specs/06-features/mcp-tools-api.md
spec_row: T3
ac_files:
  - { path: api/test/mcp-tools.ac.e2e-spec.ts, sha256: f5f4b1b4a286483c07fb9f4523114917ca55a6640eb5846935a779fcb97564a0 }
---

# T-0179: Write tools: log_time, update_time_log, create_task, set_task_status, set_workday_start

**Tier reason:** Same pattern as T2 onto existing services; no new logic

Work from the brief: `node scripts/pm4.mjs brief T-0179`. Verify with `node scripts/pm4.mjs check T-0179`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Agent | Result | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by `review-feature`._
