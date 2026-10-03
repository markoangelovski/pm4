---
id: T-0023
title: Projects module (API-PRJ-001…006) with task counts, the project lead and the in-trash Problem type
milestone: M2
app: api
status: done
size: M
tier: opus
depends_on: [T-0022, T-0017]
feature_spec: specs/06-features/prj-api.md
spec_row: T2
ac_files:
  - { path: api/test/projects.ac.e2e-spec.ts, sha256: 4dbe0f7169acb6eb285bbfe224ceb20dcb53009c0b05f221bcb90c33484cc8e4 }
  - { path: api/test/users-search.ac.e2e-spec.ts, sha256: 5141150c3058c5a9ea2023f6c1cc5b22f673c05d51a18ec22a29685522a4797d }
  - { path: api/src/common/sql/escape-like.ac.spec.ts, sha256: 9e28c127f1c9c42ca28a21978b97ef9ef5a1326b97299186f06232e87d728601 }
---

# T-0023: Projects module (API-PRJ-001…006) with task counts, the project lead and the in-trash Problem type

**Tier reason:** First feature module and repository; first lead and in-trash patterns, reused by tasks

Work from the brief: `node scripts/pm4.mjs brief T-0023`. Verify with `node scripts/pm4.mjs check T-0023`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

**What changed**
- Shared helpers: `escapeLike`, `InTrashException`, `Trim`/`TrimToNull`, `PageQueryDto` (page/pageSize are
  `@ApiPropertyOptional({ type: "integer" })` so the contract doesn't mark them required).
- `ProblemDetailsFilter` (D10): a string `problemType` becomes the slug; object `extensions` are added after the
  standard members and never replace `type`/`title`/`status`/`detail`/`errors`. A `500` ignores both.
- `ProjectLeadService` + `ProjectLeadDto`/`LeadUserDto`; `UsersRepository.findLeadUser`; `UsersModule` exports the service.
- `projects` module (controller, service, repository, DTOs). The counts subquery is scoped by `user_id`, `deleted_at IS NULL`,
  and also by `project_id` for `findById`. Title sort uses `lower(title)`. Every sort breaks ties on `id DESC`.
- `openapi.json` re-exported (projects paths, bearer-protected). Unit specs added for the new and changed files.

**`pm4 check` summary (FAIL)**
```
api lint: ok · format:check: ok · typecheck: ok · test: ok · test:e2e: FAIL · build: ok · openapi:export: ok
check AC-19: ok · pending ACs (later tasks, excluded): AC-17, AC-18, AC-20
- changed files outside scope: the 7 *.spec.ts files (problem-details.filter, users.repository, in-trash.exception,
  projects.controller/repository/service, project-lead.service): listed in the Files table as `…spec.ts` shorthand
- test:e2e: 2 failed | 65 passed | 5 skipped
  projects.ac.e2e-spec.ts AC-15 → ECONNREFUSED (test bug, see below)
  users-search.ac.e2e-spec.ts AC-15 → 404, expected 401 (GET /users is T3 / T-0024)
```

**BLOCKED: test (AC-15, `api/test/projects.ac.e2e-spec.ts`)**: the test builds all six `request(server)…` calls in an
array before awaiting any. With supertest 7.3.0, each `request(server)` on a server that isn't listening shares one
temporary `listen(0)` and closes it as soon as the first awaited request settles. So calls 2–6 go to a closed port
(ECONNREFUSED). It fails the same way with a bare `http.createServer` that always returns 401, so the implementation
isn't the cause. Fix: build each request lazily inside the loop, e.g. an array of `() => request(server).get(…)` factories.

**Resolution (orchestrator, 2026-10-04):** the AC-15 test now builds each request lazily (assertions unchanged,
re-hashed); the spec's Files table spells the unit-test paths out. Feature check after T-0024: ac hashes ok (4), lint,
format:check, typecheck, test, test:e2e (72 passed), build, openapi:export, AC-19 ok, AC-20 ok (manual); scope
flags only the orchestrator's `specs/06-features/prj-api.md` edit.

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | opus | BLOCKED: test | All T2 ACs pass except projects AC-15 (test bug: requests built up front, supertest closes its server after the first). Users AC-15 waits on T3. |
| — | (orchestrator) | test fixed | AC-15 requests built lazily; re-hashed. All T2 ACs pass. |

## Review
**Verdict: approve** (Opus reviewer, 2026-10-04). No spec drift, no non-goals touched; every query scoped by `userId`.
Minor findings, applied by the orchestrator after the review:
- `update` and `setDeletedAt` now also filter on the trash state, so a PATCH or DELETE racing a DELETE can't write a trashed row.
- `api/AGENTS.md` *Patterns to copy* lists the first feature module and its helpers.
- These notes record the final check summary.

Left as is: a `400` carrying field `errors` ignores `problemType`/`extensions` (no caller needs it; validation bodies
always use `validation`). `projects.repository.spec.ts` covers only `findById`; counts, order and search are covered by e2e AC-5…8.
**Tier:** opus was right (first module; sets the in-trash, lead and repository patterns).
