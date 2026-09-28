---
id: T-XXXX
title: <Imperative title, e.g. "Implement create project endpoint">
milestone: M<N>
app: api            # web | api | infra | spec
status: blocked     # blocked | ready | in-progress | review | done
size: S             # S | M | L
tier: sonnet        # haiku | sonnet | opus (specs/05-quality/task-routing.md)
depends_on: []      # [T-0001, …]
feature_spec: specs/06-features/<file>.md#tasks   # row "T<n>" of its Tasks table
requirements: []    # [FR-PRJ-001, NFR-005]
ac_files: []        # acceptance tests this task must make pass, with sha256 (filled by write-acceptance-tests)
                    # - { path: api/test/prj-crud.ac.e2e-spec.ts, sha256: <hash> }
---

# T-XXXX: <Title>

## Goal
One sentence. The details live in the feature spec. Don't repeat them here.

## Task
**Feature spec row:** T<n>. **Tier reason:** <copied from the spec>.

Read: this file → the feature spec (whole) → the files under its *Read first* → the app's `AGENTS.md`.
Change only the files that the spec's *Files* table assigns to T<n>.

## Acceptance criteria
- [ ] The acceptance tests listed in `ac_files` pass, and are unchanged (hashes match).
- [ ] <anything the tests can't show, e.g. "`openapi.json` regenerated and matches endpoints.md">
- [ ] Definition of Done satisfied (`specs/05-quality/definition-of-done.md`).

## Blocked by (if status is blocked)
- …

---

## Implementation notes
_Filled in by the implementer: changes, commands run and their real results, follow-ups._

### Attempts
| # | Tier | Result (`done` / `BLOCKED` / `FAILED`) | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by `review-task`: verdict and findings._
