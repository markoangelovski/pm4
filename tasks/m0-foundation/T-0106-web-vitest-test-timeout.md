---
id: T-0106
title: Raise the web Vitest test timeout so the full suite stops timing out under load
milestone: M0
app: web
status: ready
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
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |

## Review
_The owner's review (quick lane), or `review-feature`'s verdict._
