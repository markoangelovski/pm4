---
id: T-0033
title: Problem Details schema, the ApiProblemResponses decorator and error responses on the existing controllers
milestone: M1
app: api
status: done
size: S
tier: sonnet
depends_on: []
feature_spec: specs/06-features/api-error-docs.md
spec_row: T1
ac_files: []
---

# T-0033: Problem Details schema, the ApiProblemResponses decorator and error responses on the existing controllers

**Tier reason:** 7 files, but every one is fully specified (DTO and decorator code, operation matrix); more than 3 files rules out haiku

Work from the brief: `node scripts/pm4.mjs brief T-0033`. Verify with `node scripts/pm4.mjs check T-0033`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._
Added ProblemDetailsDto/FieldErrorDto, ApiProblemResponses decorator, typed the filter body, applied the matrix, re-exported openapi.json. `pm4 check T-0033`: PASS (lint, typecheck, test, e2e, build, openapi:export, contract check all ok). web/lib/api/schema.d.ts not regenerated (not in T1's Files).

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | sonnet | pass | Implemented per spec; check PASS |

## Review
_Filled in by `review-feature`._

**Verdict: approve** (Opus review, 2026-10-03). `pm4 check --feature`: PASS. The DTO matches the spec exactly. The decorator sorts and de-duplicates statuses, appends 500, and uses `application/problem+json` with a `$ref`. All 8 handlers match the matrix, and the callback is left undecorated. `openapi.json` only adds content, with no success responses removed. `/health` is untouched. The Non-goals hold. No findings for this task.
Tier feedback: sonnet was right (seven fully specified files).
