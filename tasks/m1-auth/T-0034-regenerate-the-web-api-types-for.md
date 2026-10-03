---
id: T-0034
title: Regenerate the web API types for the Problem Details responses
milestone: M1
app: web
status: done
size: S
tier: haiku
depends_on: [T-0033]
feature_spec: specs/06-features/api-error-docs.md
spec_row: T2
ac_files: []
---

# T-0034: Regenerate the web API types for the Problem Details responses

**Tier reason:** One generated file, `npm run api:types` and the gates

Work from the brief: `node scripts/pm4.mjs brief T-0034`. Verify with `node scripts/pm4.mjs check T-0034`.

## Implementation notes

Ran `npm run api:types` from the `web/` directory to regenerate `web/lib/api/schema.d.ts` from the updated `api/openapi.json`. The API side (T-0033) had already added the `ProblemDetailsDto` and `FieldErrorDto` schemas with proper `@ApiProblemResponses` decorators on all error endpoints. The web schema now properly types all error responses as `ProblemDetailsDto` across the API contract.

The regeneration also brought in the auth API contract (`/auth/*`, `/me` and their DTOs) from feat-auth-api-session (ccd26cf). `schema.d.ts` on master was never regenerated after that. CI didn't catch it because `ci.yml` runs only on `pull_request`, and that branch was merged locally.

`pm4 check T-0034`: PASS (scope ok; web lint, typecheck, test, build and api:types ok; check AC-1, AC-2, AC-3, AC-4 ok).

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | PASS | `npm run api:types` → regenerated schema includes `ProblemDetailsDto` and `FieldErrorDto` types. All gates pass. |

## Review
_Filled in by `review-feature`._

**Verdict: approve** (Opus review, 2026-10-03). Two minor findings, both handled in the notes above:
1. The regeneration also brought in the auth contract from feat-auth-api-session. `schema.d.ts` on master was stale.
2. The notes only paraphrased the `pm4 check` result. The real summary is now pasted.

Tier feedback: haiku was right (one generated file and the gates).
