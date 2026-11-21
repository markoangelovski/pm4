---
id: T-0178
title: Read tools: search_projects, search_tasks, get_day, list_time_logs (+ listRange), report_summary (+ report-summary.ts)
milestone: M9
app: api
status: done
size: M
tier: haiku
implementer: claude-code/claude-haiku-5-5
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

- `report-summary.ts`: `weekdaysBetween` (UTC walk, Mon–Fri) and `summarizeReport` (sums of `days`, target = weekdays × daily target).
- `time.repository.ts`: `listRange` (workDate between, optional project/task, order workDate then id, as `listDay`).
- `time-logs.service.ts`: `listRange` (assertDate, 0..366 days rule, `totalMinutes`). `time.module.ts` exports `ReportsService`.
- `read-tools.service.ts`: the five read tools, registered with `runTool`/`validateDto`; absent optional inputs are dropped before validation; `title` = tool name.
- AC-8 to AC-13 pass in `test/mcp-tools.ac.e2e-spec.ts`. AC-7, AC-15 to AC-19 still fail, as expected: the write tools are T3.
- `pm4 check T-0178` (run once, after `npm run format` on `api/src`):
  - `ac hashes: ok (2)`, `api lint: ok`, `api format:check: ok`, `api typecheck: ok`, `api test: ok`, `api test:e2e: ok`, `api build: ok`, `check AC-20: ok`
  - `scope: FAIL`: `specs/06-features/mcp-tools-api.md` is modified in the working tree but is not in this task's Files table. It was already modified before T-0178 started (main-session change), so it's not from this implementation. Needs the main session to look at it.

### Attempts
| # | Agent | Result | Summary |
| --- | --- | --- | --- |
| 1 | `claude-code/claude-haiku-5-5` | done | Five read tools, `listRange`, `report-summary.ts`; all gates pass (scope flag = the main session's spec edit) |
| 2 | `claude-code/claude-opus-5-5` | done | Tool titles = FR-MCP-008's labels; `present()` moved to `mcp-tools.ts` for T3 |

## Review

**Verdict: approve** (reviewer `claude-code/claude-opus-5-5`, 2026-11-21).

Findings: (5) minor, optional: `listRange` copies the 366-day check a third time (as the spec said); left as is.

*Implementer assessment*

| Task | Agent | Attempts | ACs first try | Rules kept | Blocks right | Code | Grade | Fit |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T-0178 | `claude-code/claude-haiku-5-5` | 2 (attempt 2 by `claude-code/claude-opus-5-5`) | yes (AC-8…AC-14) | yes | n/a | good; titles were tool names, fixed by the main session | C | right |
