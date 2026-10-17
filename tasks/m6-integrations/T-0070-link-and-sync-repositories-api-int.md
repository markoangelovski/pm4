---
id: T-0070
title: Link and sync repositories, API-INT-005/006/012/013/014
milestone: M6
app: api
status: done
size: M
tier: haiku
depends_on: [T-0069]
feature_spec: specs/06-features/int-sync-api.md
spec_row: T2
ac_files:
  - { path: api/test/pmspa-sync.ac.e2e-spec.ts, sha256: f25186d8786045ddcab6ae6086a1f5d4dcfb010e8953cf22f0a91f551db4054c }
---

# T-0070: Link and sync repositories, API-INT-005/006/012/013/014

**Tier reason:** Repository and controllers copy `projects/`; the queries and rules are spelled out

Work from the brief: `node scripts/pm4.mjs brief T-0070`. Verify with `node scripts/pm4.mjs check T-0070`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- New: `pmspa-links.repository.ts` (three link tables behind one interface), `pmspa-sync.repository.ts` (PM4 projects and tasks with the lead name, titles), `pmspa-links.service.ts` (list, unlink, detail), `pmspa-browse.controller.ts` (API-INT-005/006), `pmspa-links.controller.ts` (API-INT-012…014), `dto/pmspa-browse.dto.ts`, `dto/pmspa-links.dto.ts`, and unit specs for each.
- `pmspa.module.ts`: registers the two controllers, `PmspaRemote`, the two repositories and `PmspaLinksService`. Does not import `ProjectsModule` / `TasksModule` (T4).
- Reviewer: the browse controller reads the PMSPA lists and the link map itself (no browse service), since the Files list for T2 has none. API-INT-013/014 treat a non-UUID `id` as 400 (validation), not 404. A task detail whose project is missing from PMSPA gets `projectTitle: ""`.
- `pm4 check T-0070` summary: PASS. Lint, format (after `npm run format` on the api sources), typecheck, unit tests, e2e (AC-1…AC-5 pass, AC-6+ pending), build and openapi export (regenerated `api/openapi.json`) all ok.

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | PASS | Wrote the repositories, service, controllers, DTOs, module wiring and unit specs. Lint and format failed on formatting only; fixed with `npm run format`. Rerun: PASS. |

## Review
_Filled in by `review-feature`._

**Verdict: approve**, one minor finding (Opus review, feat-int-sync-api).
- **Minor (F4):** the OpenAPI error lists leave out the PMSPA errors that endpoints.md lists (409, 502, 503): `pmspa-browse.controller.ts:37` (only 401), `:58` and `pmspa-links.controller.ts:54` (400, 401, 404). Fix: add `409, 502, 503` as `pmspa-sync.controller.ts` does, then `npm run openapi:export`.
- Judgment calls accepted: 400 for a non-UUID id on API-INT-013/014 (endpoints.md "400 validation"); `projectTitle: ""` for a task whose PMSPA project is missing; no browse service.
- Tier: haiku was right.
