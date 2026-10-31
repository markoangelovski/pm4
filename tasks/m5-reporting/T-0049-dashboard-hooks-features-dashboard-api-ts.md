---
id: T-0049
title: Dashboard hooks (features/dashboard/api.ts): the report and the counts
milestone: M5
app: web
status: done
size: S
tier: haiku
depends_on: []
feature_spec: specs/06-features/rpt-web.md
spec_row: T1
ac_files:
  - { path: web/features/dashboard/api.ac.test.tsx, sha256: 1fd54e696a962470dc0c3deeabaff5f9362769ef85834cfb708f786466617bb1 }
---

# T-0049: Dashboard hooks (features/dashboard/api.ts): the report and the counts

**Tier reason:** Copies `features/bookings/api.ts`; the keys, URLs and params are stated

Work from the brief: `node scripts/pm4.mjs brief T-0049`. Verify with `node scripts/pm4.mjs check T-0049`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- `web/features/dashboard/api.ts`: real `useDashboardReport` (GET `/api/v1/reports/dashboard`, `{from,to}`, staleTime 0, keepPreviousData), `useProjectCount` (useProjects pageSize 1, `total`), `useTaskCounts` (three useTasks calls, one per status, pageSize 1; counts once all three have data). `reportKeys` unchanged.
- AC-6 `web/features/dashboard/api.ac.test.tsx`: passes.
- `pm4 check T-0049` summary:

```
  ac hashes: ok (1)
  scope: ok
  pending ACs (later tasks, excluded): AC-7, AC-8, AC-9, AC-10, AC-11, AC-12, AC-13
  web lint: ok (7s)
  web format:check: ok (1s)
  web typecheck: ok (2s)
  web test: ok (16s)
  web build: ok (6s)
  web api:types: ok (1s)
PASS T-0049
```

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | PASS | AC-6 passes; lint first failed on an untracked local file outside the task (removed by the owner's decision), then all gates passed |

## Review
**Verdict: approve** (Opus, feature review of `specs/06-features/rpt-web.md`; `pm4 check --feature`: PASS). The hooks match *Interfaces → Data*: key, URL, params, `staleTime: 0`, `keepPreviousData`, `pageSize` 1, one request per status, `isError` if any request fails. No findings.

Tier feedback: haiku was right (small copy of an existing pattern, first attempt).
