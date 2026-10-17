---
id: T-0077
title: The import commit of day and event rows (API-INT-009 dates)
milestone: M6
app: api
status: review
size: M
tier: haiku
depends_on: [T-0076]
feature_spec: specs/06-features/int-time-api.md
spec_row: T4
ac_files:
  - { path: api/test/pmspa-time.ac.e2e-spec.ts, sha256: 2617d310b17d43e19fbcf9f0da5c72167c7309fc9ed73c91d6484a877464d762 }
---

# T-0077: The import commit of day and event rows (API-INT-009 dates)

**Tier reason:** Each step is spelled out in *Import commit* and calls an existing service or helper; the commit loop and its failure handling exist

Work from the brief: `node scripts/pm4.mjs brief T-0077`. Verify with `node scripts/pm4.mjs check T-0077`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- `pmspa-time-sync.service.ts`: `importDayRow` (setStart when PM4 has none) and `importEventRow` (create/update via `TimeLogsService`, OQ-168/169 placement, off-step failure, `imported` time-log link with both fingerprints). The group of a saved log uses the run's task links, so a task linked earlier in the same run counts. `saveTimeLink` re-reads the log with `pm4Logs({dates: [], ids})`.
- `pmspa-sync.service.ts`: `Run.logLinks` (seeded from `usableLogLinks(…, "import")`), `applyRow` dispatches day and event rows to the time sync, `importRun` builds `importTimeRows` when the selection has dates. `CANT_LINK` and `result` are exported for reuse.
- `pmspa-time-sync.service.spec.ts`: 11 unit tests of the import commit (day start, create and update placement, nonprod, 100-char title cut, off-step failure, missing event).
- Review fix (OQ-194, 2026-10-17):
  - `importEventRow` validates each log before any write (`logFailure`): not a whole quarter hour → "isn't in 0.25 h steps"; outside 0.25…24 h → "isn't between 0.25 h and 24 h"; trimmed title over 1000 chars → "A log's text is over 1000 characters". A failed log counts as failed, the loop goes on, and the row's reason is the first failure plus "(the other N logs were imported).". No failed log reaches `TimeLogsService`.
  - `text` = the trimmed log title, or `cut(trimmed event title, 1000)` when empty. A new PM4 log's title is `cut(event.title.trim(), 100) || null`.
  - Every create and update sends `dayStartMinute` = `startToMinute(<remote day of the event>.start) ?? 0`. `UpdateTimeLogDto` accepts the field, and `TimeLogsService.update` reads it only when the log's date changes, so sending it on update is harmless.
  - `startToMinute` clamps to 1425 (AC-17 still passes).
  - `pmspa-run.ts` (hand-written) holds `CANT_LINK`, `PairType`, `RowFailure`, `RunLinks`, `Run` and `result()`. Both services import it, and `pmspa-time-sync.service.ts` no longer imports `pmspa-sync.service.ts`. No behavior change.
  - Unit tests added: empty log title, trimmed title, null title for a blank event title, 0 h, 25 h, over-long title (each fails alone), `dayStartMinute` when the day row didn't run, and 0 when PMSPA has no start.
  - Blank text (owner, OQ-194): when the log title and the event title are both blank after trimming, the log fails with "A log has no text" (last check in `logFailure`, after the 1000-character check) and never reaches `TimeLogsService`. Unit test added.
- Reviewer: `importEventRow` never sends an empty `text`. Every log that would is failed before any write.
`pm4 check --feature specs/06-features/int-time-api.md` (api, review fix 2 and blank text, 2026-10-17):
- ac hashes: ok (5); scope: FAIL (2 file(s)): `specs/06-features/int-time-api.md`, `specs/open-questions.md` (coordinator edits, not in the Files table)
- api lint ok, format:check ok, typecheck ok, test ok, test:e2e ok, build ok, openapi:export ok; AC-18 ok; twins ok (59 equal, warnings only)

- `npm run format` (prettier) also rewrote formatting in other uncommitted `api/src` files of this feature (T1 to T3); no logic changed.

`pm4 check T-0077` (api, 2026-10-17):
- ac hashes: ok (1)
- scope: FAIL (2 file(s)): `specs/06-features/int-time-api.md`, `specs/open-questions.md` (expected coordinator edits, OQ-193)
- pending ACs (later tasks, excluded): AC-9 to AC-14, AC-18 to AC-20
- api lint ok, format:check ok, typecheck ok, test ok, test:e2e ok (the pending ACs are excluded from the e2e gate), build ok, openapi:export ok

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | done | Import commit for AC-3 to AC-6. Lint and format fixed (spec types). `pm4 check`: only the expected scope flag fails. |
| 2 | haiku | done | Review fix (OQ-194): per-log validation, text and title rules, `dayStartMinute` on create and update, `startToMinute` clamp to 1425, `pmspa-run.ts` extracted (no import cycle), unit tests. `pm4 check --feature`: only the expected scope flags fail. |
| 3 | haiku | done | OQ-194 blank text: a log with no text in its title or the event's fails "A log has no text" (last check), unit test added. `pm4 check --feature`: only the expected scope flags fail. |

## Review
**Verdict: changes-requested** (Opus, 2026-10-17).
- Finding 1 (major): `importEventRow` calls `TimeLogsService` directly, bypassing DTO validation. An empty PMSPA title inserts `text: ""`; a title over 1000 chars, a 0 h or >24 h log, or a date without a workday start (`dayStartFor` 400) throws a non-`RowFailure` error that aborts the whole run after earlier writes. `startToMinute` can return 1440 (CHECK violation). Needs an owner decision (open question), then amend *Import commit* steps 2–3.
- Finding 4 (minor): import cycle with `pmspa-sync.service.ts` (`RowFailure`, `result`, `CANT_LINK`); works by import order only. Move shared run types into `pmspa-run.ts`.
- Finding 7 (minor): `title: cut(event.title, 100)` bypasses `TrimToNull`; trim, null when empty.
Tier: haiku borderline; the spec missed the error paths of direct service calls.

**Fixes (2026-10-17, haiku):** all three findings fixed after OQ-194 (owner, plus a log with no text at all fails as "A log has no text"); `pmspa-run.ts` removes the cycle; `startToMinute` clamps to 1425. Coordinator verified: `pm4 check --feature` all gates ok, scope only on the spec edits. Back to review.
