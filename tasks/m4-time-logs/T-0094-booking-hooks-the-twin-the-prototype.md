---
id: T-0094
title: Booking hooks (the twin), the prototype on the generated types, the mock import's booked-time warning and failure
milestone: M4
app: web
status: done
size: S
tier: haiku
depends_on: [T-0093]
feature_spec: specs/06-features/book-partial.md
spec_row: T3
ac_files:
  - { path: web/features/bookings/api.ac.test.tsx, sha256: ade143985aaf8d8cf5aa08c3097dbf3289e0d3c0bac91723e054cb1fb229e0ea }
  - { path: web/features/bookings/components/bookings-view.ac.test.tsx, sha256: d45f1f0cf48eeb39b1731c0572416641561158acd75f7441ff57ae715e3b7262 }
---

# T-0094: Booking hooks (the twin), the prototype on the generated types, the mock import's booked-time warning and failure

**Tier reason:** A twin, import swaps (D9) and one mock rule spelled out in *Web*

Work from the brief: `node scripts/pm4.mjs brief T-0094`. Verify with `node scripts/pm4.mjs check T-0094`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- Changed: `web/features/bookings/api.ts` (twin of the prototype, real `apiClient`), `web/proto/features/bookings/{api,days}.ts`, `web/proto/features/time/api.ts`, `web/proto/mock/{client,store,pmspa}.ts`; deleted `web/proto/features/bookings/proposed-types.ts`.
- `pm4 twins`: 90 equal, 1 intended, 0 not promoted, 0 warnings, 0 failures.
- Mock import: `bookedOf`/`overBooked` in `pmspa.ts` (client.ts can't be imported from pmspa.ts without a cycle, so `bookedOf` is re-stated there); the event row's `action` is now a const so the warning runs only when it isn't `skip`.
- Vitest: `features/bookings` 12/12, `features/time` + `features/integrations` 68/68.
- `pm4 check T-0094` summary: scope FAIL (only `specs/06-features/book-partial.md`, orchestrator edit); lint, format:check, typecheck, build, api:types, AC-17 and twins ok; web test FAIL on dashboard AC-8 and log-dialog AC-9 timeouts under full load, both pass when run alone. AC-13, AC-26 manual.
- Reviewer: `proto/features/time/api.ts` doc comment changed to "booking dates" to match the real twin.

Orchestrator: re-ran `pm4 check T-0094`: ac hashes ok (2), lint/format/typecheck/build/api:types ok, AC-17 check ok, twins ok (90 equal). `web test` FAIL only on 5 s timeouts under full-suite load (bookings-view AC-11, dashboard AC-8, log-dialog AC-9); the three files run alone: 3 files, 19/19 pass. Scope flags only `specs/06-features/book-partial.md` (orchestrator's T-0093 Files-row fix). AC-13, AC-26 manual.

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | done | Real `features/bookings/api.ts` (hooks over `apiClient`, no casts); prototype on generated types (`proposed-types.ts` removed); mock import booked-time warning and failure. `pm4 check`: scope flag on `book-partial.md` only (orchestrator edit); AC-8/AC-9 timeouts under full load, both pass alone |

## Review
**Verdict: approve** (Opus, 2026-10-23). Real `api.ts` is the twin, prototype on generated types, mock `bookedOf`/`overBooked` per spec, no `@/proto` imports in production.
- Minor: `web/proto/features/time/api.ts:33` doc comment regressed to "booking dates" to match the stale production twin; fix both to "with their bookings and the totals" (`web/features/time/api.ts:33` isn't in T3's Files).

Tier: haiku was right.
