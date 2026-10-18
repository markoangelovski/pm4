---
id: T-0082
title: Browse reads: inParallel and the remote methods, dayItems, API-INT-006/007/017/018
milestone: M6
app: api
status: done
size: M
tier: sonnet
depends_on: [T-0081]
feature_spec: specs/06-features/int-budget.md
spec_row: T2
ac_files:
  - { path: api/test/pmspa-budget.ac.e2e-spec.ts, sha256: d1890826087557d0bbe9417f3aa7d4684acf210998ad61eb6ca2cb1eaf05ed7b }
---

# T-0082: Browse reads: inParallel and the remote methods, dayItems, API-INT-006/007/017/018

**Tier reason:** Concurrency (bounded parallel calls) and the day mapping moved out of the controller

Work from the brief: `node scripts/pm4.mjs brief T-0082`. Verify with `node scripts/pm4.mjs check T-0082`.

## Implementation notes
Review fix: unit tests for `inParallel` (order, at most N at a time, first rejection, empty) in `pmspa-remote.spec.ts`.
AC-3..AC-7 pass. pm4 check: all gates ok except api test:e2e, which fails only on T3/T4 tests (pmspa-budget AC-8..10, 18..22; pmspa-sync AC-13; pmspa-time AC-2, AC-8).
_Implementer: what changed, and anything the reviewer should look at._

- Orchestrator (2026-10-18): re-ran `pm4 check T-0082`. The only e2e failures left belong to T-0083 and T-0084 (`pmspa-budget` AC-8…AC-10, AC-18…AC-22; `pmspa-sync` AC-13; `pmspa-time` AC-2, AC-8).

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | sonnet | done | inParallel, remote reads, dayItems, browse routes; ACs 3-7 pass |

## Review
**Verdict: approve** (Opus review, 2026-10-18). `pm4 check --feature int-budget`: PASS, with every gate in one run (web test and api e2e included). AC-17 is manual, for the owner.
- Finding 6 (minor): `inParallel` has no unit test for order or first rejection; AC-7 covers it.
- Tier: sonnet was right.
- Review round 2 (2026-10-18, owner asked to fix the findings): findings fixed: unit tests for `inParallel` (order, bound, first rejection, empty). `pm4 check --feature`: every gate ok except the scope flag on the spec (orchestrator's edit) and one flaky `web test` run; the web suite then passed 200/200 twice.
