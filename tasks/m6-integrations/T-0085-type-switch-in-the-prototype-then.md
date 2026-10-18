---
id: T-0085
title: Type switch in the prototype, then the twins: hooks, rate-limit line, account badge, connector header, both Expand alls, lazy Time days, dialog icons and lazy Link to existing, Profile → Integrations
milestone: M6
app: web
status: done
size: M
tier: haiku
depends_on: [T-0084]
feature_spec: specs/06-features/int-budget.md
spec_row: T5
ac_files:
  - { path: web/features/integrations/budget.ac.test.tsx, sha256: a299b71867da2b162457d6eca2a95f98e8d22083368a0a6c1ac1987f635417d6 }
---

# T-0085: Type switch in the prototype, then the twins: hooks, rate-limit line, account badge, connector header, both Expand alls, lazy Time days, dialog icons and lazy Link to existing, Profile → Integrations

**Tier reason:** Twin copy (D8); the switch is listed line by line

Work from the brief: `node scripts/pm4.mjs brief T-0085`. Verify with `node scripts/pm4.mjs check T-0085`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

Type switch (done): `proto/features/integrations/types.ts` gained `PmspaRateLimitDto`, `PmspaDaySummaryDto`, `PmspaCandidatesInputDto`,
`PmspaCandidatesDto` aliases; `proto/features/integrations/proposed-types.ts` removed; `proto/features/integrations/api.ts`,
`proto/mock/client.ts` (`createClient<paths>`), `proto/mock/pmspa.ts`, `proto/features/integrations/components/pmspa-time-tab.tsx`
and `sync-preview-dialog.tsx` use the generated names. Typecheck passed before the twin copy.

Twin copy: the eleven prod twins (`features/integrations/{types,api}.ts`, the eight `components/` files, `features/users/components/user-profile.tsx`)
are the prototype files with `@/proto/mock/client` → `@/lib/api/client` and `@/proto/` → `@/`, formatted with Prettier.
Proto `api.ts` and `sync-preview-dialog.tsx` were formatted first so the proto side passes `format:check`.

Verification: `npx vitest run features/integrations` 15/15 (budget.ac.test.tsx 7/7). `pm4 twins`: 86 equal, 0 failures.
Noted, not changed: the budget tests log a Base UI warning ("A component that acts as a button expected a native <button>…")
from `profile-integrations.tsx` (`PmspaIntegration`, the `Button` at line ~74); it comes from the promoted markup, which the brief says to keep.

`node scripts/pm4.mjs check T-0085`:
```
pm4 check T-0085
  ac hashes: ok (1)
  scope: ok
  web lint: ok (14s)
  web format:check: ok (4s)
  web typecheck: ok (11s)
  web test: ok (23s)
  web build: ok (10s)
  web api:types: ok (1s)
  check AC-16: types switched, twins equal, build: ok
  twins: ok (86 equal)
  manual (owner verifies): AC-17

PASS T-0085
```

AC-17 is manual (owner, against the API and PMSPA) and is not verified here.

- Orchestrator (2026-10-18): re-ran `pm4 check T-0085`. Every gate passes except `web test`, and AC-16 and twins pass. `web test` failed on timeouts (5 s) in suites this feature doesn't touch: `dashboard-view` AC-8 and `log-form-dialog` AC-9 and AC-10. The machine's load average was about 20 on 16 cores. Run on their own, those suites pass 20/20. budget.ac 7/7. AC-17 is manual, for the owner.

- Review fix (2026-10-18, Haiku): `<Button render={<Link/>}>` replaced by `<Link className={buttonVariants(…)}>` in the proto `profile-integrations.tsx` (`PmspaIntegration`) and `pmspa-connector.tsx` (`SettingsLink`), twins re-copied; no Base UI nativeButton warning in `features/integrations` tests. `pm4 check` now fails only on scope (the two proto files and `specs/06-features/int-budget.md` are not in the Files table; not changed here) and on `web test` timeouts, which pass when rerun alone.

- Orchestrator, AC-17 fix (2026-10-18), spec D13: the owner saw the lists' "PMSPA is busy. Try again in 11 minutes." stay put while the requests line counted down to 8. The line now uses `PmspaProblemLine` (new `components/pmspa-problem-line.tsx`, plus its prototype twin), which counts down on the shared clock `usePmspaNow` in `sync.ts` (`pmspa-rate-limit.tsx` uses it too, in place of its own `useNow`) to the connection's spent `resetAt`. The prototype twins were changed the same way (twins: 87 equal). New test: `pmspa-problem-line.test.tsx` (4). The integration tests, lint and typecheck pass.

- AC-17 (2026-10-18): **passed**, owner, locally against the API and PMSPA (the busy lines and the requests line count down together; the "PMSPA calls have resumed. Try again." copy is confirmed). Expand all cost: 18 PMSPA calls for 880 tasks on Projects & tasks (⌈n/50⌉ pages), 23 for a Time week (5 days + 12 distinct tasks + 6 distinct projects), as D3/D4 specify. Follow-ups raised in the run: OQ-206, OQ-207.

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | PASS | Type switch in the prototype, twin copy of 11 files, proto formatted; pm4 check PASS (AC-12…AC-16 automated; AC-17 manual) |

## Review
**Verdict: approve** (Opus review, 2026-10-18). `pm4 check --feature int-budget`: PASS, with every gate in one run (web test and api e2e included). AC-17 is manual, for the owner.
- Finding 5 (minor): `<Button render={<Link/>}>` in `profile-integrations.tsx` (and `SettingsLink` in `pmspa-connector.tsx`) triggers Base UI's nativeButton warning. The repo uses `<Link className={buttonVariants(…)}>`. Fix it in the proto first, then in the twin.
- Tier: haiku was right.
- Review round 2 (2026-10-18, owner asked to fix the findings): findings fixed: links styled as buttons use `buttonVariants` (proto, then twins); the proto files were added to the spec's *Files*. `pm4 check --feature`: every gate ok except the scope flag on the spec (orchestrator's edit) and one flaky `web test` run; the web suite then passed 200/200 twice.
