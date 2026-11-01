---
id: T-0126
title: 429 in the OpenAPI contract: ApiProblemResponses + ApiProblemResponsesNotLimited, export openapi.json
milestone: M1
app: api
status: done
size: S
tier: haiku
depends_on: [T-0125]
feature_spec: specs/06-features/api-rate-limit.md
spec_row: T2
ac_files: []
---

# T-0126: 429 in the OpenAPI contract: ApiProblemResponses + ApiProblemResponsesNotLimited, export openapi.json

**Tier reason:** Decorator extension spelled out above

Work from the brief: `node scripts/pm4.mjs brief T-0126`. Verify with `node scripts/pm4.mjs check T-0126`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

Changed `api-problem-responses.decorator.ts`: one private `problemResponses(statuses, limited)` builder;
`ApiProblemResponses(...)` adds `429` (`ApiTooManyRequestsResponse`, "Rate limited: `retryAfterSeconds` and `Retry-After`.");
new `ApiProblemResponsesNotLimited(...)` is the same without `429`. `ProblemStatus` unchanged.
`VersionController.get` and `AuthController.start` switched to `ApiProblemResponsesNotLimited()`.
`api/openapi.json` re-exported (insertions only, 429 on every operation with problem responses).

`pm4 check T-0126` summary:
```
  scope: ok
  api lint: ok (14s)
  api format:check: ok (3s)
  api typecheck: ok (6s)
  api test: ok (9s)
  api test:e2e: ok (65s)
  api build: ok (6s)
  api openapi:export: ok (8s)
  check AC-17: 429 on every rate-limited operation, none on the three exceptions: ok
PASS T-0126
```

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | PASS | Decorator split into shared builder + NotLimited export; two controllers switched; openapi exported; check PASS |

## Review
_Filled in by `review-feature`._

**Verdict: approve** (Opus, 2026-11-01). One shared builder plus `ApiProblemResponsesNotLimited`; `start` and `version` switched; `openapi.json` only gains 429s.
- Tier: haiku was right (one attempt).
- Feature check (`pm4 check --feature`): PASS (api + web gates, AC-17, twins 122 equal, no proto imports in production).
