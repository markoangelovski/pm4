---
id: T-0067
title: PmspaTransport, the connection repository, PmspaClient, the module's providers
milestone: M6
app: api
status: done
size: M
tier: sonnet
depends_on: [T-0065, T-0066]
feature_spec: specs/06-features/int-conn-api.md
spec_row: T4
ac_files: []
---

# T-0067: PmspaTransport, the connection repository, PmspaClient, the module's providers

**Tier reason:** First outbound HTTP client, tokens and re-login, a transaction over four tables (owner: sonnet, as it is specified line by line)

Work from the brief: `node scripts/pm4.mjs brief T-0067`. Verify with `node scripts/pm4.mjs check T-0067`.

## Implementation notes
Implemented PmspaTransport (pause, guard, timeout, manual redirect, 429 pause, log of method/path/status/duration only), PmspaConnectionRepository (upsert keeps last_sync_at; switchAccount in one transaction), PmspaClient (check, request with cached token and one re-login, status updates, unsplash-only avatar) and the module providers. Unit specs added for transport, client (with FakePmspa) and repository (mocked db; SQL is covered by e2e).
Follow-up (OQ-187): the module provides `DNS_LOOKUP` with `defaultDnsLookup`; `PmspaClient.request` treats an undecryptable `password_enc` as a failed login without calling PMSPA (status invalid-credentials, store cleared, 409), on first login and re-login; two specs added.
Check: all gates ok; scope FAIL only for later tasks' files (T5) and the orchestrator's spec/script files.

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | sonnet | done | lint, format, typecheck, test, e2e, build all ok; scope FAIL only for the 3 orchestrator files (scripts/pm4.mjs, int-conn-api.md, open-questions.md) |
| 2 | sonnet | done | review follow-up (DNS_LOOKUP, undecryptable password); lint, format, typecheck, test, e2e, build, openapi ok; scope FAIL only for T5 files and orchestrator files |

## Review
_Filled in by `review-feature`._

**Verdict: approve** (Opus review, feat-int-conn-api).
- `pmspa.module.ts` (rewritten by hand) is correct and idiomatic. Minor: `:27-30` inlines `dns.lookup(h, { all: true })`. Use `{ provide: DNS_LOOKUP, useValue: defaultDnsLookup }` from `pmspa-host-guard.ts` and drop the `node:dns` import.
- The token-lifecycle gap (T-0068 finding 1) shows up in `pmspa-client.ts:139-142`, but the fix belongs in the service.
- The repository spec that mocks the db stays (same precedent as projects/tasks/time).
- Tier: sonnet was right.

**Review fixes (2026-10-17, owner approved the suggestions):** The module uses `defaultDnsLookup`; `request` treats a password that doesn't decrypt as invalid credentials (OQ-187). Verified by the orchestrator's `pm4 check` (gates ok; scope lists only the orchestrator's spec and script files). No second Opus review yet.

**Re-review (Opus, 2026-10-17): approve. Open as OQ-189 (not a blocker): an in-flight `request` can write the old URL's token back after a Save/Test changed or cleared it (`pmspa-client.ts:110`, `:131-135`). Open as OQ-190: `request`'s re-login doesn't enforce D8 (`:132-135`).** Tier: right.
