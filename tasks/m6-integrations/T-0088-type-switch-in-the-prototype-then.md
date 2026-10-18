---
id: T-0088
title: Type switch in the prototype, then the twins: Expand all, task list error line, commit failure line, created-in-PMSPA stamp, column and popover
milestone: M6
app: web
status: done
size: S
tier: haiku
depends_on: [T-0087]
feature_spec: specs/06-features/int-followups.md
spec_row: T3
ac_files:
  - { path: web/features/integrations/followups.ac.test.tsx, sha256: 4321786bf7c35e8395f69d90c62fcd454feb00e5b8fe6f8a1b9a16a5e1f94648 }
  - { path: web/features/integrations/components/sync-preview-dialog.ac.test.tsx, sha256: 38a611260a54e6269877e0c0766020c41b4caad98c75b1651fabaeca511937e3 }
---

# T-0088: Type switch in the prototype, then the twins: Expand all, task list error line, commit failure line, created-in-PMSPA stamp, column and popover

**Tier reason:** Twin copy (D9); the switch is listed line by line

Work from the brief: `node scripts/pm4.mjs brief T-0088`. Verify with `node scripts/pm4.mjs check T-0088`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- Type switch: `web/proto/features/integrations/types.ts` now aliases `PmspaLinkDto = S["PmspaLinkDto"]` (the
  `pmspaCreatedAt` field comes from the regenerated `schema.d.ts`); `proposed-types.ts` removed; nothing imports it.
- Twins (D9): `sed` copy plus Prettier of the nine files listed in the brief (`features/integrations/types.ts`, `api.ts`,
  `components/pmspa-created-stamp.tsx`, `pmspa-projects-tab.tsx`, `pmspa-record-note.tsx`, `sync-preview-dialog.tsx`,
  `features/projects/components/project-detail.tsx`, `features/tasks/components/task-detail.tsx`, `tasks-list.tsx`).
  Stubs replaced whole. `pm4 twins`: 88 equal, 1 intended (`features/auth/use-sign-out.ts`, pre-existing), 0 failures.
- Reviewer: the only non-copy edit is the type switch above. AC-6 to AC-9 pass with the twins unchanged from the prototype
  apart from the import rewrite; AC-11 is manual.
- Focused run: `followups.ac.test.tsx`, `sync-preview-dialog.ac.test.tsx`, `budget.ac.test.tsx`: 13/13 pass.

`node scripts/pm4.mjs check T-0088`:
```
pm4 check T-0088
  ac hashes: ok (2)
  scope: ok
  web lint: ok (13s)
  web format:check: ok (4s)
  web typecheck: ok (5s)
  web test: ok (22s)
  web build: ok (26s)
  web api:types: ok (1s)
  check AC-10: types switched, twins equal: ok
  twins: ok (88 equal)
  manual (owner verifies): AC-11

PASS T-0088
```

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | pass | Type switch, proposed-types.ts removed, nine twins copied (sed + Prettier); check PASS; AC-11 manual |

## Review
**Verdict: approve** (Opus, 2026-10-18). `pm4 check --feature` PASS, twins 88 equal; no production import of `@/proto/*`; AC-11 verified by the owner.
- Type switch done, `proposed-types.ts` deleted; Expand all cost rule (D6), task list problem line (D7), commit failure line (D8) and created-in-PMSPA stamp/column/popover (D3) match the spec; Time tab untouched.
- No findings. 360 px, keyboard and light/dark not verifiable by reading; straight prototype copy.
- Tier feedback: haiku was right.
