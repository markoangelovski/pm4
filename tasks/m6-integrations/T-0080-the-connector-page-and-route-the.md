---
id: T-0080
title: The connector page and route, the dialog, Sync / Push buttons, sync flags, the error lines, and the project/task/day twins
milestone: M6
app: web
status: done
size: M
tier: haiku
depends_on: [T-0079]
feature_spec: specs/06-features/int-web.md
spec_row: T2
ac_files:
  - { path: web/features/integrations/components/sync-preview-dialog.ac.test.tsx, sha256: decd4ade8fb6eecaab10d05b6723dab77f1e7407356765aa09f18ace029fe70f }
---

# T-0080: The connector page and route, the dialog, Sync / Push buttons, sync flags, the error lines, and the project/task/day twins

**Tier reason:** Promote + twins (D2); every change is listed under *Error lines*

Work from the brief: `node scripts/pm4.mjs brief T-0080`. Verify with `node scripts/pm4.mjs check T-0080`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | pass | Dialog D3 in the prototype and its twin, error props on the five callers, the connector page; `npm run format` on the dialog; check passes |

Changes: the prototype dialog gained `error: unknown` (preview line via `pmspaProblemText`; commit failure kept as
`useState<{ error }>`, line = problem text or "Couldn't <verb>." plus the "Some records may have been written" sentence).
Callers pass `error` (`push-button.tsx`, `pmspa-connector.tsx`). Projects/time tabs and the record note use
`pmspaProblemText` for their error lines. Production twins regenerated from the prototype (`@/proto/` → `@/`,
Prettier): the connector page components, `expand-all-button.tsx`, `sync-flag.tsx`, `push-button.tsx`,
`pmspa-record-note.tsx`, the dialog, and the project/task/day twins (sync flags, Push buttons, `formatWorkDate` in the
day view). `app/(dashboard-layout)/app/connectors/pmspa/page.tsx` added (from the prototype page, `@/features/…`).
The sidebar section, `lib/routes.ts` and `connectors-nav.tsx` were already done in T-0079 and are untouched here.

Check summary (`node scripts/pm4.mjs check T-0080`, after `npm run format`): ac hashes ok (1); scope ok; web lint ok;
format:check ok; typecheck ok; test ok (AC-7, AC-8 pass); build ok; api:types ok; AC-9 ok; twins ok (83 equal);
AC-10 manual (owner verifies).

Review points: the dialog's commit-failure line now always names "Some records may have been written" (per the spec);
the old "Nothing was changed" wording is gone. The day view's Push button is disabled when the day has no logs.

## Review
**Verdict: approve** (Opus, 2026-10-17). Finding 1 (minor, spec gap): the per-project task list error in `pmspa-projects-tab.tsx:377` ("Couldn't read the tasks.") isn't in D3's *Where it applies*, so it shows the generic line; optional follow-up, prototype first, then twin and spec. Finding 2 (minor, accepted deviation): commit failure is `useState<{ error: unknown } | null>` instead of `useState<unknown>`, the better shape; note in the spec changelog. Finding 3 (product note): the "Some records may have been written" sentence also shows for 409 `pmspa-sync-running`, as AC-8 requires; owner may drop it there. AC-10 manual pass pending (owner, local PMSPA). Tier: haiku right.
