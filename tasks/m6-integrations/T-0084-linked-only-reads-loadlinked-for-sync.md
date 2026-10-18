---
id: T-0084
title: Linked-only reads: loadLinked for sync and push previews and commits, the pick check, candidates: null, API-INT-019
milestone: M6
app: api
status: done
size: M
tier: sonnet
depends_on: [T-0083]
feature_spec: specs/06-features/int-budget.md
spec_row: T4
ac_files:
  - { path: api/test/pmspa-budget.ac.e2e-spec.ts, sha256: d1890826087557d0bbe9417f3aa7d4684acf210998ad61eb6ca2cb1eaf05ed7b }
  - { path: api/test/pmspa-sync.ac.e2e-spec.ts, sha256: 2ca914189f8bb12000f213a84ab66d11cb570845a13c4e7784771fd2f0e937cb }
---

# T-0084: Linked-only reads: loadLinked for sync and push previews and commits, the pick check, candidates: null, API-INT-019

**Tier reason:** A new snapshot loader for three targets and the commit's link check inside the lock

Work from the brief: `node scripts/pm4.mjs brief T-0084`. Verify with `node scripts/pm4.mjs check T-0084`.

## Implementation notes
Added `loadLinked` (sync/push previews and commits), `candidates` (API-INT-019), `pmspaCandidateList`, `syncBuilder(s, listed)` with `candidates: null`, the commit's pick check in `syncPair` (D9), and `load` now always takes a selection. Specs adjusted for the new reads.
pm4 check T-0084: PASS (lint, format, typecheck, test, e2e, build, openapi); e2e also run twice more: 301/301 each.

- Orchestrator (2026-10-18): re-ran `pm4 check T-0084`: PASS, and the full e2e suite passes. Spec nit for the reviewer: int-budget line 289 still shows the 3-argument `loadTime(userId, base, [date])`. Line 210 defines the 4-argument form, which the code follows.

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | sonnet | PASS | linked-only reads implemented; check passes |

## Review
**Verdict: approve** (Opus review, 2026-10-18). `pm4 check --feature int-budget`: PASS, with every gate in one run (web test and api e2e included). AC-17 is manual, for the owner.
- Finding 2 (minor): a day push reads only the projects of the groups' tasks; spec line 290 says the groups' project ids. The behaviour is fine; the recommended fix is in the spec.
- Finding 4 (spec nit): line 289 shows a 3-argument `loadTime`.
- Finding 6 (minor): `loadLinked`, `candidates()` and the pick check have no unit tests; AC-18…AC-22 cover them.
- Tier: sonnet was right.
- Review round 2 (2026-10-18, owner asked to fix the findings): findings fixed: spec lines 289–290 now match the code (4-argument `loadTime`; the projects of the groups' tasks). `pm4 check --feature`: every gate ok except the scope flag on the spec (orchestrator's edit) and one flaky `web test` run; the web suite then passed 200/200 twice.
