---
id: T-0075
title: Time preview rows (pmspa-time-preview.ts), pure, and the exported row builders of pmspa-preview.ts
milestone: M6
app: api
status: done
size: M
tier: sonnet
depends_on: [T-0074]
feature_spec: specs/06-features/int-time-api.md
spec_row: T2
ac_files: []
---

# T-0075: Time preview rows (pmspa-time-preview.ts), pure, and the exported row builders of pmspa-preview.ts

**Tier reason:** A large port of the prototype's day previews onto the snapshot, plus a refactor of existing row builders that must keep their output

Work from the brief: `node scripts/pm4.mjs brief T-0075`. Verify with `node scripts/pm4.mjs check T-0075`.

## Implementation notes
Added `pmspa-time-preview.ts` (`TimeSnapshot`, `Pm4DayLog`, `usableLogLinks`, `mappedGroup`, `importTimeRows`, `pushDayRows`) with unit tests.
`pmspa-preview.ts`: `importBuilder`/`selectProjects`/`syncBuilder` exported (`importRows`/`syncRows` output unchanged, existing spec passes); `row` is now exported too.
Notes: `PmspaImportSelectionDto` has no `dates` yet (T3), so `importTimeRows` takes `PmspaImportSelectionDto & { dates?: string[] }`. An empty day/event
never gets reason "Already imported" (the prototype's vacuous case). A push with no PM4 start compares against 0 (as the commit's `?? 0`).

check T-0075: lint, format:check, typecheck, test, test:e2e, build, openapi:export all ok; only `scope: FAIL` for the expected coordinator edits
(specs/06-features/int-time-api.md, specs/open-questions.md).

Review fix (OQ-195): `importTimeRows` makes a day row and an event row with no logs `skip` "No logs" (was `create` "0 logs · 0m"); other rows unchanged.
Unit test added in pmspa-time-preview.spec.ts. Commit side checked, no change needed: `pmspa-sync.service.ts` `commit` turns every `action: "skip"`
row into a `skipped` result before `applyRow`, so `importDayRow`/`importEventRow` never run for it (nothing written, never `created`).
check --feature int-time-api: all gates ok (lint, format, typecheck, test, e2e, build, openapi, AC-18, twins); only `scope: FAIL` for the expected
coordinator edits (specs/06-features/int-time-api.md, specs/open-questions.md).

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | sonnet | done | Preview rows ported, builders exported, unit tests added |
| 2 | sonnet | done | Review fix (OQ-195): empty day/event rows are `skip` "No logs" |

## Review
**Verdict: approve** (Opus, 2026-10-17). Finding 2 (minor): a zero-log event or day (D10 leaves empty events on the old day; dates without a PMSPA day) previews as `create` "0 logs · 0m". Owner decision pending; amend *importTimeRows* step 3 and the prototype twin `web/proto/mock/pmspa.ts`. Tier: sonnet right.

**Fix (2026-10-17, sonnet):** OQ-195 applied: an empty day or event is `skip` "No logs"; prototype twin `web/proto/mock/pmspa.ts` changed by the main session.
