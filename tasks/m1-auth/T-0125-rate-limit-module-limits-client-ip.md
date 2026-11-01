---
id: T-0125
title: Rate-limit module: limits, client IP, Redis storage, guard after AccessTokenGuard, redirect, decorators, trust proxy
milestone: M1
app: api
status: done
size: M
tier: sonnet
depends_on: []
feature_spec: specs/06-features/api-rate-limit.md
spec_row: T1
ac_files:
  - { path: api/test/rate-limit.ac.e2e-spec.ts, sha256: 2445a49e07c4b0863d2fe7e44f1ec22b722c4f842cd7400fc346fe94bc06c0e2 }
  - { path: api/test/rate-limit-redis-down.ac.e2e-spec.ts, sha256: 5a82d0f45eeeb5f8913fbe401e0f245983e0a603ec13f4b2743c56a00e2c7ac4 }
  - { path: api/src/rate-limit/rate-limits.ac.spec.ts, sha256: 1146f4f0e6f65754873a91863ed8b3d3195c0c4dceea8e14e6f65ae1f565d478 }
  - { path: api/src/rate-limit/redis-throttler.storage.ac.spec.ts, sha256: fa13dbe7f87c90653ce4fbb5a86ec0584e6f250a5d8957ef185611d0e7e9bacd }
---

# T-0125: Rate-limit module: limits, client IP, Redis storage, guard after AccessTokenGuard, redirect, decorators, trust proxy

**Tier reason:** First instance of the pattern; auth/security logic and guard ordering that passing tests don't fully prove

Work from the brief: `node scripts/pm4.mjs brief T-0125`. Verify with `node scripts/pm4.mjs check T-0125`.

## Implementation notes
Rate-limit module, Redis storage, guard (after AccessTokenGuard), RedirectException, decorators, trust proxy.
`pm4 check T-0125`: PASS (lint, format, typecheck, test, e2e, build ok; AC-17 skipped, later task).
Reviewer: guard.ts imports types with `import type` (isolatedModules + decorator metadata).

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | sonnet | PASS | Implemented T1; check passed first full run after import-type fix |

## Review
_Filled in by `review-feature`._

**Verdict: approve** (Opus, 2026-11-01). Client IP, Lua storage with 500 ms fail-open, guard scopes/trackers/redirects, guard order after `AccessTokenGuard`, path-only redirect logging and `trust proxy` before helmet all match the spec.
- Finding (minor, spec): no `rate-limit.guard.spec.ts`; conventions keep the `nest g guard` spec file, but *Files* didn't list it. E2E ACs cover the guard. Owner to decide: list it in the spec or record the exception.
- Feature finding (minor, tooling): the AC-24/AC-25 *Checks* blocks don't run under `pm4 check` (only the first bash block is read); both are covered by the `api:types` and twins gates.
- Tier: sonnet was right (one attempt).
- Feature check (`pm4 check --feature`): PASS (api + web gates, AC-17, twins 122 equal, no proto imports in production).
