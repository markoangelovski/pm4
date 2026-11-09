---
id: T-0153
title: Card widths, "Worked · Target · Booked", Running totals on the Workdays dates with a shared hover (D10): five prototype twins
milestone: M5
app: web
status: done
size: S
tier: haiku
depends_on: [T-0131]
feature_spec: specs/06-features/rpt-web.md
spec_row: T6
ac_files:
  - { path: web/features/dashboard/stats.ac.test.ts, sha256: 982ae0c88cf38c34b55ea4fbeae12d3e4509627723c21e01e52db236037e6f8a }
---

# T-0153: Card widths, "Worked · Target · Booked", Running totals on the Workdays dates with a shared hover (D10): five prototype twins

**Tier reason:** Twin copy, the commands under *Web (T6)*

Work from the brief: `node scripts/pm4.mjs brief T-0153`. Verify with `node scripts/pm4.mjs check T-0153`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- Copied the five files from `web/proto/features/dashboard/` with `@/proto/` → `@/` and ran prettier. Before the copy, the production files matched the pre-43d0868 prototype twins exactly.
- `pm4 twins`: 137 equal, 2 intended, 2 not promoted, 0 failures (AC-22 ok).
- `npx vitest run features/dashboard`: 3 files, 14 tests pass. Typecheck and build ok.
- `pm4 check T-0153` summary: `scope: FAIL (6 file(s))` (the other session's files: specs/01-requirements/time-logs.md, specs/04-web/screens.md, web/features/time/components/{log-form-dialog,task-picker}.tsx, web/proto/features/time/components/{log-form-dialog,task-picker}.tsx); `web format:check: FAIL` (`features/dashboard/stats.ac.test.ts`, plus two `features/time/components/*.ac.test.tsx`; acceptance tests, not edited); `web test: FAIL` (11 tests, all in feat-tlog-timeline: `day-timeline.ac.test.ts`, `log-timeline.ac.test.tsx`, `day-view.ac.test.tsx` AC-16; the other session's unimplemented task).
- Twins warnings (`features/time/day-view.tsx`, `features/time/day.ts`) are outside this task.
- Not run: `npm run format` (it would rewrite the acceptance test `stats.ac.test.ts`, which must not change).
- Orchestrator re-run (after the test writer ran prettier on `stats.ac.test.ts` and re-ran `pm4 hash`; the other session committed its files as fc51579 + 49ed698): `ac hashes: ok (1)`, `scope: ok`, lint, typecheck, build, api:types ok, AC-17, AC-20, AC-22 twins equal ok, `twins: ok (137 equal)`. `web format:check: FAIL` only on `features/time/components/{day-view,log-timeline}.ac.test.tsx`; `web test: FAIL` only on the 11 feat-tlog-timeline acceptance tests (T-0152, ready, not implemented). Both belong to T-0152, not this task.
- AC-23 (manual, agent-browser at 1440 px on `/proto/app`; the API isn't running locally, and AC-22 shows the production files equal these twins): Running totals 757 px = Workdays 757 px, Hours by project 371 px = "Worked · Target · Booked" 371 px. By day (Nov 2026): hovering the 7 Nov bar puts the line at x 499 in the start panel, the bars and Running totals, with both tooltips; hovering Running totals at 6 Nov (past, no logs) puts the line at x 470 in all three, the Workdays tooltip shows "No work logged" and Running totals shows none. By week (1 Sep–30 Nov; 1 Jan–30 Jun has no mock logs, so Running totals is empty there): hovering Workdays moves only its own two cursors, and hovering Running totals only its own. Pass.

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | done (check: FAIL for out-of-scope files, format on acceptance test, and feat-tlog-timeline tests) | Copied five twins, twins AC-22 ok, dashboard tests 14/14 pass, typecheck ok |

## Review
_Filled in by `review-feature`._

**Verdict: approve** (Opus reviewer, 2026-11-09). The five production files are byte-equal to their twins after the T6 `sed`, and the diff equals 43d0868's prototype diff. D10 is as specified: 8/4 cards and skeletons, "Worked · Target · Booked", the shared `onDayAxis` with null points, `syncId` only by day, `syncMethod="value"`, band axis, `Y_WIDTH`, `connectNulls`, and no tooltip on a null point. The interfaces match *Web (T6)*, no non-goals were touched, and the `stats.ac.test.ts` change is whitespace only. `pm4 check` fails only on T-0152's feat-tlog-timeline tests and their formatting.

Findings (all minor, none block):
1. No automated test that `RunningTotals` gets `syncId` by day and not by week. That is covered only by AC-22 and the manual AC-23. Optional test-writer follow-up.
2. Some spec lines are out of date (spec only): `rpt-web.md:210` `RunningTotals` props, `:173` "all three `null` after `today`", and `:88` plus AC-9/AC-19 "Worked · target · booked". Fix with `write-spec`.
3. Twins warnings on `features/time/{components/day-view.tsx,day.ts}` belong to T-0152 and should go away once it is promoted.
4. Process: the work is on `master`, not a `task/T-0153` worktree branch. The owner decides.

Tier feedback: haiku was right (a pure twin copy).
