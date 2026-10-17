---
id: T-0069
title: Field mapping and fingerprints (pmspa-fields.ts), the PMSPA projects/tasks client (pmspa-remote.ts), the write mappers (pmspa-writes.ts)
milestone: M6
app: api
status: done
size: M
tier: haiku
depends_on: []
feature_spec: specs/06-features/int-sync-api.md
spec_row: T1
ac_files:
  - { path: api/src/integrations/pmspa/pmspa-fields.ac.spec.ts, sha256: 014fe40368ed56802e6ec2cd1b90d5c993e85e2e4be7df13abb871d8dcb2882d }
---

# T-0069: Field mapping and fingerprints (pmspa-fields.ts), the PMSPA projects/tasks client (pmspa-remote.ts), the write mappers (pmspa-writes.ts)

**Tier reason:** Pure functions copied from the prototype's `projectDiff`/`taskDiff`/`*Fields`; each call is one `PmspaClient.request` with the documented body and response fields

Work from the brief: `node scripts/pm4.mjs brief T-0069`. Verify with `node scripts/pm4.mjs check T-0069`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- `pmspa-fields.ts`: pure port of the prototype's `projectDiff`/`taskDiff` (same fields and order), `*Fields` tuples,
  `fingerprint` (D1), `clearWarnings` (D11), `linkVal` (D8), D7 dates via `Intl` (`dueDateOf`) and UTC noon (`dueAtOf`).
  `formatDate` uses fixed English month abbreviations (no locale dependence).
- `pmspa-writes.ts`: `toPmspaProject`/`toPmspaTask`/`toPm4Project`/`toPm4Task`. `PmspaProjectWrite`/`PmspaTaskWrite` live in
  `pmspa-remote.ts` (per the spec) and are imported here.
- `pmspa-remote.ts`: `PmspaRemote` over `PmspaClient.request`. Reads: 404 → null / [], other non-2xx → `pmspaProblems.error()`.
  Lists page with `skip`/`limit=50` while `stats.remaining > 0`. Writes: non-2xx → `PmspaWriteError` with D10's reason
  (`PMSPA rejected it: <message> (<error>)`, matching the e2e expectation; `(<error>)` only when `error` is a string;
  without a message: `PMSPA rejected it: HTTP <status>`). Writes send strings only; null and empty values are left out;
  PATCH bodies are `[{propName, propValue}]`.
- `PmspaRemote` is not registered in `pmspa.module.ts`: that file is not in T1's Files. A later task has to add it to the providers.
- Hand-written (not `nest g`), as the Files table says `Hand-written`. Reviewer: confirm that is acceptable for an `@Injectable` service.
- Extra unit specs: `pmspa-remote.spec.ts`, `pmspa-writes.spec.ts`.

**pm4 check: PASS T-0069**
```
ac hashes: ok (1)
scope: ok
api lint: ok (11s)
api format:check: ok (2s)
api typecheck: ok (2s)
api test: ok (8s)
api test:e2e: ok (37s)
api build: ok (6s)
```
(AC-20 passes: 13 of 13 in `pmspa-fields.ac.spec.ts`. The check excludes later tasks' ACs.)

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | done | Field mapping, PMSPA remote client and write mappers. AC-20 green; pm4 check PASS |

## Review
_Filled in by `review-feature`._

**Verdict: approve** (Opus review, feat-int-sync-api).
- Judgment calls accepted: `getTask`/`getProject` return null on a 200 with no record; the D10 reason format (`(<error>)` only for a string error, else `HTTP <status>`); `PmspaRemote` hand-written as *Files* says.
- Tier: haiku was right. A clean, faithful port.
