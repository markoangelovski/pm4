---
id: T-0083
title: Import: the snapshot for dates, the time preview's order, reasons and taskPath, push taskPath, days on preview and import
milestone: M6
app: api
status: done
size: M
tier: sonnet
depends_on: [T-0082]
feature_spec: specs/06-features/int-budget.md
spec_row: T3
ac_files:
  - { path: api/test/pmspa-budget.ac.e2e-spec.ts, sha256: d1890826087557d0bbe9417f3aa7d4684acf210998ad61eb6ca2cb1eaf05ed7b }
  - { path: api/test/pmspa-sync.ac.e2e-spec.ts, sha256: 2ca914189f8bb12000f213a84ab66d11cb570845a13c4e7784771fd2f0e937cb }
  - { path: api/test/pmspa-time.ac.e2e-spec.ts, sha256: 5311576439371a596205ca4a6a69ce41b390d15f2e684bf14b31a01960a6365c }
---

# T-0083: Import: the snapshot for dates, the time preview's order, reasons and taskPath, push taskPath, days on preview and import

**Tier reason:** A reordered snapshot load and row order across three files, plus a commit hook inside the lock

Work from the brief: `node scripts/pm4.mjs brief T-0083`. Verify with `node scripts/pm4.mjs check T-0083`.

## Implementation notes
Review fix: one task-key rule for time-log hashes (`hashGroup` in `pmspa-time-sync.service.ts`: links made in the run, else `mappedGroup` over all snapshot links) used by push hashes and `saveTimeLink`; `mappedGroup` doc updated; `load` doc comment in `pmspa-sync.service.ts` corrected; unit test in `pmspa-time-sync.service.spec.ts`.
Load narrowed for `dates` (days, selected projects, tasks of selected projects, event tasks, their projects); `readDays`/`loadTime(…, remoteDays)`; `taskPath` on import and push event rows; parent rows ahead of day rows with dated reasons; `days` on import preview and result via `commit(…, after)`; the import's saveLink reuses the snapshot's remote record (no extra read). `mappedGroup` now uses `s.links` directly, because a linked task no longer read by the narrowed snapshot made a moved event's log look changed in PM4 (pmspa-time AC-6).
Check: lint, format, typecheck, unit, build, openapi ok. e2e FAIL: only T-0084's (pmspa-budget AC-18..22, pmspa-sync AC-13).

- Orchestrator (2026-10-18): re-ran `pm4 check T-0083` and the e2e suite twice. The only failures left are T-0084's (`pmspa-budget` AC-18…AC-22, `pmspa-sync` AC-13). Reviewer: check `mappedGroup` (`pmspa-time-preview.ts`), which now keys on `s.links` instead of `usableLinks(s)`. A task linked to a PMSPA task that no longer exists now groups by the PMSPA id, not the title. Also check `createPair`, which passes the remote record to `saveLink`.

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | sonnet | done (own ACs pass; e2e fails only T-0084's) | T3 implemented |

## Review
**Verdict: approve** (Opus review, 2026-10-18). `pm4 check --feature int-budget`: PASS, with every gate in one run (web test and api e2e included). AC-17 is manual, for the owner.
- Finding 1 (minor): two rules for the task key in time-log hashes. `mappedGroup` uses `s.links`, while `saveTimeLink` and the push use `run.links.pmspaOf` (usable links only). A log whose linked PMSPA task wasn't read keeps showing "changed in PM4". Fix: `saveTimeLink` looks the task up in `run.snapshot.links`; update the doc comment at `pmspa-time-preview.ts:73`; note the decision in the spec's changelog.
- Finding 3 (minor): the doc comment on `load` (`pmspa-sync.service.ts:102-106`) is stale.
- Tier: sonnet was right.
- Review round 2 (2026-10-18, owner asked to fix the findings): findings fixed: `hashGroup` in `pmspa-time-sync.service.ts` (`run.links`, then `mappedGroup` over all snapshot links) for `saveTimeLink` and the push hash, plus a unit test; doc comments on `load` and `mappedGroup`. `pm4 check --feature`: every gate ok except the scope flag on the spec (orchestrator's edit) and one flaky `web test` run; the web suite then passed 200/200 twice.
