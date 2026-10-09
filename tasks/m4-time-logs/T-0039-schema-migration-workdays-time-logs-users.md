---
id: T-0039
title: Schema + migration (workdays, time_logs, users.daily_target_minutes) and PATCH /me
milestone: M4
app: api
status: ready
size: S
tier: haiku
depends_on: []
feature_spec: specs/06-features/tlog-api.md
spec_row: T1
ac_files:
  - { path: api/test/me-settings.ac.e2e-spec.ts, sha256: 8879ab2aab30ae10276a13c85918823e0e3d39c67ec5f89fcb7a94cfe5866a5c }
---

# T-0039: Schema + migration (workdays, time_logs, users.daily_target_minutes) and PATCH /me

**Tier reason:** Table definitions are spelled out above; `/me` follows the existing controller/service

Work from the brief: `node scripts/pm4.mjs brief T-0039`. Verify with `node scripts/pm4.mjs check T-0039`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by `review-feature`._
