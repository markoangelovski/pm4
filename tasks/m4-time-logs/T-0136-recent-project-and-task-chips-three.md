---
id: T-0136
title: Recent project and task chips: three Log time twins
milestone: M4
app: web
status: review
size: S
tier: haiku
depends_on: []
feature_spec: specs/06-features/tlog-recent-links.md
spec_row: T1
ac_files:
  - { path: web/features/time/recent-links.ac.test.ts, sha256: 56a16087d5ef276c1fb86f40b2174422998e063ab99fbbbb1e52e2f3d331c6a4 }
  - { path: web/features/time/components/log-form-recent.ac.test.tsx, sha256: 6c7a5862637ac09c4f5aee53d1c5a967a10ecb903db25c4d381cd5713398f97a }
---

# T-0136: Recent project and task chips: three Log time twins

**Tier reason:** Twin copy, the command under *Twins (T1)*

Work from the brief: `node scripts/pm4.mjs brief T-0136`. Verify with `node scripts/pm4.mjs check T-0136`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- Copied the three prototype twins over the typed stubs/prod files with the brief's sed + Prettier command: `web/features/time/recent-links.ts` (replaces the stub), `web/features/time/components/recent-chips.tsx` (new), `web/features/time/components/log-form-dialog.tsx` (delta from `c9c3343`). No `@/proto/*` imports remain.
- `node scripts/pm4.mjs twins`: 128 equal, 1 intended (`features/auth/use-sign-out.ts`, outside this task), 0 failures.
- Acceptance tests `recent-links.ac.test.ts`, `log-form-recent.ac.test.tsx` and `log-form-dialog.ac.test.tsx` pass (18 tests).
- `node scripts/pm4.mjs check T-0136`:
  ```
  pm4 check T-0136
    ac hashes: ok (2)
    scope: ok
    web lint: ok (16s)
    web format:check: ok (5s)
    web typecheck: ok (13s)
    web test: ok (32s)
    web build: ok (27s)
    check AC-7: twins equal: ok
    twins: ok (128 equal)

  PASS T-0136
  ```

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | PASS | Copied the three twins (sed + prettier), all AC tests green, `pm4 check` PASS. |

## Review
**Verdict (Opus, 2026-11-04): approve.** `pm4 check --feature` PASS; the three twins equal their prototype files (128 equal); D1–D4 met, no spec drift, no non-goal touched.
- Minor (test gap): AC-3…AC-6 cover only a new log; Edit log (incl. a deleted task → chip relinks) has no test. Follow-up: an ordinary test, if wanted.
- Minor (UX, as prototyped): a task error after a 404 stays when a project chip is clicked (same as the project picker). Optional; change the prototype first.
- Tier: haiku was right (mechanical twin copy, first attempt).
