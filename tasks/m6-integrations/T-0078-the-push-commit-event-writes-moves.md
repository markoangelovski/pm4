---
id: T-0078
title: The push commit: event writes, moves, D3 linking, empty-event deletes, the push endpoint (API-INT-011)
milestone: M6
app: api
status: review
size: L
tier: sonnet
depends_on: [T-0077]
feature_spec: specs/06-features/int-time-api.md
spec_row: T5
ac_files:
  - { path: api/test/pmspa-time.ac.e2e-spec.ts, sha256: 2617d310b17d43e19fbcf9f0da5c72167c7309fc9ed73c91d6484a877464d762 }
---

# T-0078: The push commit: event writes, moves, D3 linking, empty-event deletes, the push endpoint (API-INT-011)

**Tier reason:** Owner ceiling (OQ-189) instead of opus: writes on two systems with partial failure and ordering, spelled out in *Push commit*

Work from the brief: `node scripts/pm4.mjs brief T-0078`. Verify with `node scripts/pm4.mjs check T-0078`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._
Push commit: `pushDayRow` and `pushEventRow` in `pmspa-time-sync.service.ts`, `pushRun` + `POST /push` (`commit` takes a `pushDate`; a future date is 400, lock first). `Run.day` carries the re-read day between event rows. Deviations: (1) the group key used for hashes comes from the run's task links (`taskId ?? title:`), not the stale snapshot, so a task pushed in the same run doesn't make the next preview report a change; (2) for a new event with more than one log, `createEvent` returns nothing, so one extra `getDay` finds its id for the other `createLog`s, before the D3 re-read; (3) a new booked event gets `updateEvent` after the re-read (its id is unknown before). Unit tests added for push and the days write methods of `PmspaRemote`.
check T-0078: scope FAIL only for the expected coordinator edits (specs/06-features/int-time-api.md, specs/open-questions.md); lint, format, typecheck, test, e2e (18 AC), build, openapi export, AC-18 all ok.

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | sonnet | done | Push commit, endpoint, tests; check green apart from the expected spec-file scope flags |

## Review
**Verdict: approve** (Opus, 2026-10-17). Finding 3 (minor): deviations 1–3 are correct (1 fixes a spec bug: the snapshot's group is stale for tasks linked earlier in the run) but must go into the spec: *Push commit* steps 4, 5, 7 and *Import commit* step 4's group wording. Finding 4 shared with T-0077. Tier: sonnet right.
