---
id: T-0152
title: Timeline view on the Logs page: the three prototype twins
milestone: M4
app: web
status: done
size: S
tier: haiku
depends_on: []
feature_spec: specs/06-features/tlog-timeline.md
spec_row: T1
ac_files:
  - { path: web/features/time/day-timeline.ac.test.ts, sha256: 77aa6c805fb1178d86ac05e197f1b43bd6f0c2a8461d960a32fd598e12830348 }
  - { path: web/features/time/components/log-timeline.ac.test.tsx, sha256: e8b7b78d286fb0ec55398c2dba13ee2903cdac32b6005852c85b55794a9f05ae }
  - { path: web/features/time/components/day-view.ac.test.tsx, sha256: c72f4a82fd77532aba19c79a3ee6d7101558aa563757c51acaf44297ebad3af9 }
---

# T-0152: Timeline view on the Logs page: the three prototype twins

**Tier reason:** Twin copy, the commands under *Interfaces → Web*

Work from the brief: `node scripts/pm4.mjs brief T-0152`. Verify with `node scripts/pm4.mjs check T-0152`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- Twin copy applied with the Interfaces → Web sed + Prettier commands: `web/features/time/day.ts`, `web/features/time/components/day-view.tsx`, `web/features/time/components/log-timeline.tsx` (new). No other change. No `@/proto` import left in the three files.
- `pm4 check T-0152` output (real):
  - ac hashes: ok (3); scope: ok; web lint: ok; web typecheck: ok; web test: ok; web build: ok
  - check AC-12: twins equal: ok; twins: ok (135 equal)
  - **web format:check: FAIL**: `[warn] features/time/components/day-view.ac.test.tsx` and `[warn] features/time/components/log-timeline.ac.test.tsx`. The three task files pass `prettier --check`.
  - Not run: `npm run format` (it would rewrite the two acceptance test files, which implementers must not edit, and change their hashes). Owner/main session should format those two test files and re-run `pm4 hash`, then re-check.
- Overall: FAIL (format:check, acceptance test files only).
- Main session (test fix): ran `npx prettier --write` on the two acceptance tests (one `waitFor(...)` line each, joined onto one line; no behaviour change) and re-hashed with `pm4 hash specs/06-features/tlog-timeline.md`. Re-check: ac hashes ok (3), scope ok, web lint/format:check/typecheck/test/build ok, AC-12 twins equal ok, twins ok (135 equal), **PASS T-0152**. Five twins warnings are for `features/dashboard/**` (feat-rpt-web, outside this task).

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | BLOCKED: test | Twin copy done; check fails only on Prettier formatting of `day-view.ac.test.tsx` and `log-timeline.ac.test.tsx` (acceptance tests, not edited) |

## Review
_Filled in by `review-feature`._

**Verdict: approve** (Opus reviewer, 2026-11-09). `pm4 check --feature` PASS. The three twins are byte-equal to the prototype after the `@/proto/` → `@/` sed, and no production `@/proto` import remains. `timeline()` matches the Interfaces contract and D4 (AC-2 and AC-4 worked through by hand). D1–D3 and the Non-goals hold.

Findings:
1. Minor, no change needed in this task: a day whose logs run past midnight, viewed after midnight, hides the now line. `useNowMinute` gives minutes since midnight, while the axis uses minutes past 1440 (`log-timeline.tsx:42-43`). This matches the prototype, and the spec doesn't cover it. A possible follow-up: add 1440 to `now` when it is earlier than the day's start, prototype first, then the twins.
2. Minor, process: the test step should run Prettier on `.ac` files before `pm4 hash`. Here that was fixed in the main session and the files were re-hashed.

Tier feedback: haiku was right. The mechanical twin copy was correct on the first try.
