---
id: T-0079
title: Types switch (D1), features/integrations/api.ts, sync.ts with pmspaProblemText, the Settings → Integrations tab, routes and the Connectors sidebar section
milestone: M6
app: web
status: done
size: M
tier: haiku
depends_on: []
feature_spec: specs/06-features/int-web.md
spec_row: T1
ac_files:
  - { path: web/features/integrations/api.ac.test.tsx, sha256: 135b92657bbe829b82232c4eb06fea6a0380b90b84a82b9705adb288ee0a6b7a }
  - { path: web/features/integrations/sync.ac.test.ts, sha256: 67a58bfc920a320f12c1ba358014233736f58b19c14c1229fd8f30b51e7bc575 }
  - { path: web/app/(dashboard-layout)/layout/vertical/sidebar/connectors-nav.ac.test.tsx, sha256: bb84905fb446dd8099a06acf833a0d837ace364c94d41e50ead855121cbdd7b2 }
---

# T-0079: Types switch (D1), features/integrations/api.ts, sync.ts with pmspaProblemText, the Settings → Integrations tab, routes and the Connectors sidebar section

**Tier reason:** Promote + twins (D2); the helper and the sidebar component are spelled out

Work from the brief: `node scripts/pm4.mjs brief T-0079`. Verify with `node scripts/pm4.mjs check T-0079`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- D1: `proto/features/integrations/types.ts` (aliases of the generated schema, plus `PmspaAccountSwitchProblem`); `proposed-types.ts` removed; imports switched in the 15 proto files; `PmspaPaths` dropped from `mock/client.ts`; the five looser-schema fixes; `dates ?? []` in `mock/pmspa.ts`. `api:types` already up to date (no diff).
- D2: production twins of `types.ts`, `api.ts`, `schemas.ts`, `sync.ts`, the five connector components and `settings-view.tsx` (sed + Prettier). The proto `sync-preview-dialog.tsx` and the rest of the connector page are T2.
- D3 (T1 part): `pmspaProblemText` in proto and production `sync.ts`; `pmspa-connection-card.tsx` toasts use it (proto and twin).
- D4: `connectors-nav.tsx` (`ConnectorsNav`), `connectorItems` in `sidebaritems.ts`, `<ConnectorsNav />` in `app-sidebar.tsx`; `routes.app.connectors.pmspa` in `lib/routes.ts`.
- Not done (T2): the connector page route `app/(dashboard-layout)/app/connectors/pmspa/page.tsx`, and the production twin of `sync-preview-dialog.tsx` (still the typed stub). That stub is why `twins` FAILs and why AC-7/AC-8 (`sync-preview-dialog.ac.test.tsx`) fail. Expected for T1.

Check summary (`node scripts/pm4.mjs check T-0079`):
```
ac hashes: ok (3) · scope: ok · pending ACs (later tasks, excluded): AC-7, AC-8, AC-9, AC-10
web lint: ok · web format:check: ok · web typecheck: ok · web test: ok · web build: ok · web api:types: ok
check AC-9: skipped (later task)
twins: FAIL (1): web/features/integrations/components/sync-preview-dialog.tsx (T2 stub, not yet promoted)
FAIL T-0079
```
AC-1…AC-6 pass (`api.ac.test.tsx`, `sync.ac.test.ts`, `connectors-nav.ac.test.tsx`).

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | done (check FAIL on T2 stub twin) | Types switch, D2 twins, D3 helper and toasts, D4 sidebar; AC-1…AC-6 pass; format fixed with `npm run format` |

## Review
**Verdict: approve** (Opus, 2026-10-17). Feature check passes (`pm4 check --feature int-web`: all gates ok, twins 83 equal, AC-10 manual). D1 types, D3 `pmspaProblemText`, D4 sidebar and routes match the spec; the recorded FAIL was T-0080's dialog stub, gone after promotion. No findings. Tier: haiku right.
