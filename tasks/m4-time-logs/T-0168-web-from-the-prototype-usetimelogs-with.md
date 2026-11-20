---
id: T-0168
title: Web from the prototype: useTimeLogs with the range, the Logged time section's range control and chart; drop proposed-types.ts
milestone: M4
app: web
status: done
size: S
tier: haiku
implementer: opencode/opencode/hy4-flash-free
depends_on: [T-0167, T-0166]
feature_spec: specs/06-features/tlog-logged-range.md
spec_row: T2
ac_files:
  - { path: web/features/time/logged-time.ac.test.tsx, sha256: 95b1520ff18aee7a9e0804ed57129110cbd07f818c3cbd64629c28646b41dfd0 }
  - { path: web/features/time/components/logged-time-section.ac.test.tsx, sha256: 7343750b4ddc615184f4e799ea016aae325a971490982450d5b1151c6506acf5 }
---

# T-0168: Web from the prototype: useTimeLogs with the range, the Logged time section's range control and chart; drop proposed-types.ts

**Tier reason:** Copy commands spelled out; one inline edit

Work from the brief: `node scripts/pm4.mjs brief T-0168`. Verify with `node scripts/pm4.mjs check T-0168`.

## Implementation notes
Removed the `TimeLogListQuery` import from `web/proto/features/time/api.ts` and inlined the query
(`{ ...filter, from, to, page, pageSize }`) in `useTimeLogs`. Deleted
`web/proto/features/time/proposed-types.ts`. Promoted the three proto twins to production with the
prescribed sed (`@/proto/mock/client` → `@/lib/api/client`, `@/proto/` → `@/`), then ran prettier:
`web/features/time/api.ts` (range-aware `timeKeys.logList(filter, range, page)` / `useTimeLogs(filter, range, page)`,
imports `form-drafts` and `dashboard/range`), `logged-time-section.tsx` (URL-backed range control via
`RangePicker`/`parseRange`/`presetRange`, "So far" default, "No time logged in this range." empty state,
passes `range` to the hook and chart, resets `logsPage` on range change) and `logged-time-chart.tsx`
(`loggedBuckets(days, range)` buckets over the whole range rather than just logged dates).

`node scripts/pm4.mjs twins`: 151 equal, 2 intended, 1 not promoted (the deleted `proposed-types.ts`), 0 failures.

`node scripts/pm4.mjs check T-0168`:
```
pm4 check T-0168
  ac hashes: ok (2)
  scope: FAIL (14 file(s))
  web lint: ok (19s)
  web format:check: ok (6s)
  web typecheck: ok (3s)
  web test: ok (42s)
  web build: ok (30s)
  web api:types: ok (1s)
  twins: ok (151 equal)
  manual (owner verifies): AC-10

FAIL T-0168
- changed files outside scope:
    web/app/(dashboard-layout)/layout.tsx (not in the Files table)
    web/features/auth/components/auth-guard.tsx (not in the Files table)
    web/features/auth/use-sign-out.ts (not in the Files table)
    web/features/notes/api.ts (not in the Files table)
    web/features/notes/components/note-form-dialog.tsx (not in the Files table)
    web/features/notes/components/todo-form-dialog.tsx (not in the Files table)
    web/features/projects/api.ts (not in the Files table)
    web/features/projects/components/project-form-dialog.tsx (not in the Files table)
    web/features/tasks/api.ts (not in the Files table)
    web/features/tasks/components/task-form-dialog.tsx (not in the Files table)
    web/features/time/components/log-form-dialog.tsx (not in the Files table)
    web/features/system/components/api-progress-bar.tsx (not in the Files table)
    web/features/system/components/draft-notice.tsx (not in the Files table)
    web/features/system/form-drafts.ts (not in the Files table)
```
The scope FAIL is expected per the brief: all 14 files are the uncommitted T-0165/T-0166 work carried on
this branch and were not touched. Every other gate passes. AC-10 is a manual owner check.

### Attempts
| # | Agent | Result | Summary |
| --- | --- | --- | --- |
| 1 | opencode/opencode/hy4-flash-free | done | useTimeLogs with the range, Logged time section and chart from their twins, proposed-types.ts dropped; all web gates ok (444 tests), scope flags only T-0165/T-0166 files |

## Review
**Verdict: approve** (reviewer `claude-code/claude-opus-5-5`, 2026-11-21)

The three production files equal their twins after the spec's sed (twins 151 equal). The prototype `api.ts` matches the spec's inline query, and `proposed-types.ts` is deleted. The range control defaults to So far with `today` from `me.timeZone`. It writes `from`/`to` to the URL with `history: "replace"`, drops them for So far, and resets `logsPage`. The chart buckets over the whole range. `timeKeys.logList` stays under `timeKeys.all` (AC-5). `useDeleteLog` calls `forgetDraftsOf` (D6). Production imports nothing from `@/proto`, and the non-goals are untouched.

Observation, no change requested: until `/me` loads, `today` falls back to UTC (`logged-time-section.tsx:87`). A user far from UTC may trigger one extra request before the real range. `dashboard-view.tsx` does the same, and the code equals its twin. If this should change, fix the prototype twin first.

AC-10 (This year and a custom range update totals, chart, table and URL; So far drops `from`/`to`; Projects list "Logged" unchanged; task page, 360 px, dark theme) is left for the owner to check by hand.

| Agent | Attempts | ACs first try | Rules kept | Blocks right | Code | Grade | Fit |
| --- | --- | --- | --- | --- | --- | --- | --- |
| opencode/opencode/hy4-flash-free | 1 | yes | yes | n/a (no BLOCKED) | Exact twin promotion; the inline edit matches the spec verbatim | A | right: a mechanical copy-and-sed task, done cleanly by a free model |
