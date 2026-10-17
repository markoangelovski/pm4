---
id: T-0074
title: Time mapping (pmspa-time-fields.ts), the PMSPA days client, API-INT-007 and the time-log link detail
milestone: M6
app: api
status: review
size: M
tier: haiku
depends_on: []
feature_spec: specs/06-features/int-time-api.md
spec_row: T1
ac_files:
  - { path: api/test/pmspa-time.ac.e2e-spec.ts, sha256: 8c72474d45b16bfbc0bf7a14f1fe803bd876b7a4257e83cb78f335517c6fa594 }
  - { path: api/src/integrations/pmspa/pmspa-time-fields.ac.spec.ts, sha256: 5bcad17be11f583507cb218f4e3041da120fcbc7a208056a897028d46dbc70b1 }
---

# T-0074: Time mapping (pmspa-time-fields.ts), the PMSPA days client, API-INT-007 and the time-log link detail

**Tier reason:** Pure functions copied from the prototype; each PMSPA call is one documented request; the browse controller exists

Work from the brief: `node scripts/pm4.mjs brief T-0074`. Verify with `node scripts/pm4.mjs check T-0074`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- `pmspa-time-fields.ts`: all functions implemented as the prototype (`eventTitle`, `groupDay`, `isNonprod`, the
  minute/start helpers, `formatDuration`, `formatWorkDate` via `formatDate` from `pmspa-fields.ts`, `plural`, the D1 tuples).
  AC-17 spec: 8/8 pass.
- `pmspa-fields.ts`: `fingerprint` takes `(string | number | boolean | null)[]`.
- `pmspa-remote.ts`: `listDays` (range form, then one-day form per id, 404 → []), `getDay` (404 → null), and
  `createEvent`, `updateEvent`, `deleteEvent`, `createLog`, `updateLog`, `deleteLog` (404 → resolves) per `days.yaml`.
  `write` accepts DELETE. No unit tests added for the days client; covered by AC-1 e2e.
- `pmspa-browse.controller.ts` + `dto/pmspa-browse.dto.ts`: API-INT-007 `GET /integrations/pmspa/days`
  (strict ISO dates, `from` ≤ `to`, at most 7 days → 400; days without events dropped; `linkState` from active `time-log` links).
  AC-1 e2e passes.
- `openapi.json` regenerated.
- API-INT-014 `time-log` (AC-15), after OQ-193 (owner): `PmspaSyncRepository.pm4LogWorkDate(userId, id)` (userId-scoped
  read of `time_logs.work_date`, null when not the caller's) in `pmspa-sync.repository.ts`, injected into
  `PmspaLinksService`. The detail reads `getDay(workDate)`, finds the event holding the link's `pmspa_id`, and returns
  `{type: "time-log", title, eventTitle}`; no day, event or log → `pmspa: null`. `time/*` untouched.
- Unit tests added: `pmspa-links.service.spec.ts` (time-log branch: found, gone from day, no day, not the caller's log) and
  `pmspa-sync.repository.spec.ts` (`pm4LogWorkDate`).
- Contract gap closed (owner added `pmspa-links.dto.ts` to T1's Files): `eventTitle?: string` on `PmspaRecordDetailDto`
  ("Time log: its PMSPA event's title."), and `openapi.json` regenerated with it.
- Remaining scope-check flags: `specs/06-features/int-time-api.md` and `specs/open-questions.md` (the coordinator's OQ-193 edits).
- Lint, typecheck, format, the PMSPA unit tests (143/143), the OpenAPI export and the e2e run (AC-1 and AC-15 pass) are green.

### Check summary (`node scripts/pm4.mjs check T-0074`, run 3)
```
ac hashes: ok (2)
scope: FAIL (2 file(s): specs/06-features/int-time-api.md, specs/open-questions.md; expected, the owner's OQ-193 edits)
pending ACs (later tasks, excluded): AC-2 … AC-20 except AC-1, AC-15, AC-17
api lint ok, format:check ok, typecheck ok, test ok, test:e2e ok, build ok, openapi:export ok
```

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | BLOCKED: spec | Pure mapping, days client, API-INT-007 done (AC-1, AC-17 pass). API-INT-014 `time-log` (AC-15) has no allowed way to read a PM4 log's work date. |
| 2 | haiku | done | OQ-193 unblocked AC-15: `pm4LogWorkDate` + time-log detail, unit tests, check run. AC-1, AC-15, AC-17 and all api gates pass. Scope flags only the two spec files (expected). Run 3 adds `eventTitle` to `pmspa-links.dto.ts` (now in T1's Files). |

## Review
**Verdict: approve** (Opus, 2026-10-17). No findings of its own. Feature-wide: no e2e cross-user case for `GET /links/time-log` (finding 5). Tier: haiku right; the one BLOCKED was a spec gap (OQ-193).
