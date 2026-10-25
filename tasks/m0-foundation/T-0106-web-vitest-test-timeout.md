---
id: T-0106
title: Raise the web Vitest test timeout so the full suite stops timing out under load
milestone: M0
app: web
status: done
size: S
tier: haiku
depends_on: []
feature_spec: —
files:
  - web/vitest.config.ts
specs: [specs/02-architecture/tech-stack.md]
ac_files: []
---

# T-0106: Raise the web Vitest test timeout so the full suite stops timing out under load

## Goal
`npm test` in `web/` passes reliably: no test fails on Vitest's default 5 s `testTimeout` only because the
full suite runs many files in parallel.

## Background
During feat-note-todos (T-0103…T-0105) the full web suite failed with one or three `Test timed out in 5000ms`
errors, each run on a different test: `dashboard-view.ac.test.tsx` AC-8, `bookings-view.ac.test.tsx` AC-11,
`log-form-dialog.ac.test.tsx` AC-9. Each file passes alone (the slowest test, dashboard AC-12, takes about
2.2 s; AC-8 about 1.3 s), and master (56e9d22) fails the same way, so it is suite load, not a regression. The
fix is suite-wide, not per test.

## Change
- `web/vitest.config.ts`: in `test`, add `testTimeout: 15_000` after `setupFiles`, with a one-line comment:
  `// The full suite runs many jsdom files in parallel; 5 s (the default) times out under load.`
  Change nothing else (no `maxWorkers`, no per-test timeouts, no test files).

## Acceptance criteria
- [ ] `web/vitest.config.ts` sets `test.testTimeout` to `15_000`, and nothing else in the file changes
- [ ] `npm test` in `web/` passes twice in a row with no timeout (report both runs' `Tests` lines)

---

## Implementation notes
Done inline by the main session (one line, file already in context; task-routing.md#lanes).
- `web/vitest.config.ts`: `testTimeout: 15_000` with the comment from *Change*; nothing else.
- 8 full `npm test` runs (7 by hand + the check's): **no timeout in any**. Runs 4 and 5 passed in a row (253/253), and so did the check's run.
- Separate, pre-existing flake (not a timeout, not this task): `features/integrations/budget.ac.test.tsx` AC-14 line 363,
  `waitFor(() => expect(connectionReads()).toHaveLength(2))` sometimes sees 1. It fails with the file alone too
  (2/10, 1/20 at 15 s; 3/20 with `--testTimeout=5000`, so the new timeout doesn't cause it). The main checkout's install
  passed 32/32 (same vitest, react-query, testing-library, jsdom, react versions). Proposal: a quick-lane task to find
  the race (owner decision; the AC file is hashed, so a test fix goes through the test writer).
- `pm4 check T-0106`: PASS (scope ok; lint, format, typecheck, test, build ok; twins 116 equal).

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | opus (main session) | PASS | Inline: suite-wide `testTimeout` |

## Review
Owner approved (quick lane), 2026-10-25.
