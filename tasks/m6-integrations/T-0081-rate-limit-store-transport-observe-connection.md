---
id: T-0081
title: Rate limit: store, transport observe, connection service; openapi:export
milestone: M6
app: api
status: done
size: S
tier: haiku
depends_on: []
feature_spec: specs/06-features/int-budget.md
spec_row: T1
ac_files:
  - { path: api/test/pmspa-budget.ac.e2e-spec.ts, sha256: d1890826087557d0bbe9417f3aa7d4684acf210998ad61eb6ca2cb1eaf05ed7b }
---

# T-0081: Rate limit: store, transport observe, connection service; openapi:export

**Tier reason:** Every step is spelled out under *Rate limit*; copies the store's key pattern

Work from the brief: `node scripts/pm4.mjs brief T-0081`. Verify with `node scripts/pm4.mjs check T-0081`.

## Implementation notes
Review fix: unit tests for the transport's `observe` (keeps headers, 429 branch, Redis failure only warns) in `pmspa-transport.spec.ts`.
_Implementer: what changed, and anything the reviewer should look at._

- `pmspa-store.ts`: `keys.rate`, `getRateLimit`, `setRateLimit` (PX = `resetAt` − now; nothing when ≤ 0).
- `pmspa-transport.ts`: `observe(host, res)` after the redirect check, before the 429 branch; a failure is logged as a warning only.
- `pmspa-connection.service.ts`: `notConfigured()` and `toDto` carry `rateLimit`; `rateLimitOf(url)`.
- `pmspa-connection.service.spec.ts`: the store fake gains `getRateLimit` (ordinary test fix).
- `openapi.json`: regenerated (`rateLimit` on the connection response).
- AC-1 and AC-2 pass. Unit tests (395) and typecheck pass.
- `pm4 check` summary (after `npm run format` reformatted `pmspa-store.ts`):

```
api lint: ok, api format:check: ok, api typecheck: ok, api test: ok, api test:e2e: FAIL, api build: ok, api openapi:export: ok
```

  The e2e FAIL is outside T1: the full e2e suite runs later tasks' ACs that `74ddea6` changed or added (`pmspa-budget` AC-3…AC-22, `pmspa-sync` AC-2 and AC-13, `pmspa-time` AC-1, AC-2, AC-3, AC-8). None of them reference rate limits. Reviewer: the `pm4 check` e2e gate runs the whole suite, so it can't pass until those tasks land.
- Orchestrator (2026-10-18): re-ran `pm4 check T-0081`. Every e2e failure is an AC of T-0082…T-0084 (`pmspa-budget` AC-3…AC-10, AC-18…AC-22; `pmspa-sync` AC-2, AC-13; `pmspa-time` AC-1, AC-2, AC-3, AC-8). The e2e gate runs the whole suite, so it passes once T-0084 lands.

- Orchestrator, AC-17 fix (2026-10-18): the owner saw "All available" on the requests line while the projects list said "PMSPA is busy. Try again in 4 minutes." Cause: PMSPA's 429 always sends `Retry-After: 900` (its whole window), and a parallel answer stored after the 429 overwrote the key with PMSPA's earlier `X-RateLimit-Reset`. The key then expired while the pause was still running. Fix (spec D1 amended): `PmspaStore.withPause` stores and reads the rate limit as `remaining: 0` until the pause ends, and `send` pauses before `observe` on a 429. New tests are in `pmspa-store.spec.ts` (4) and `pmspa-transport.spec.ts` (1). The PMSPA unit tests (203), `pmspa-budget.ac.e2e-spec.ts` (15), lint and typecheck pass.

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | done (ACs pass; check e2e FAIL on later tasks' ACs) | Store, transport observe, connection service, openapi export; AC-1 and AC-2 pass |

## Review
**Verdict: approve** (Opus review, 2026-10-18). `pm4 check --feature int-budget`: PASS, with every gate in one run (web test and api e2e included). AC-17 is manual, for the owner.
- Finding 6 (minor): `observe` (the 429 branch, a Redis failure) has no unit test; the e2e AC-1 and AC-2 cover it.
- Tier: haiku was right; done in one attempt.
- Review round 2 (2026-10-18, owner asked to fix the findings): findings fixed: unit tests for `observe` (429, Redis failure). `pm4 check --feature`: every gate ok except the scope flag on the spec (orchestrator's edit) and one flaky `web test` run; the web suite then passed 200/200 twice.
