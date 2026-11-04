---
id: T-0141
title: Prototype off proposed-types; twins of the 10 list files
milestone: M2
app: web
status: done
size: S
tier: haiku
depends_on: []
feature_spec: specs/06-features/prj-lists.md
spec_row: T2
ac_files:
  - { path: web/features/projects/components/projects-list.ac.test.tsx, sha256: 5f278df939a7aee2a5960aa5464e017f29c8b4793efa9f021c27b09a55203685 }
  - { path: web/features/tasks/components/tasks-list.ac.test.tsx, sha256: ab06f6534de0caffe2d2558a0b211efd9a3d24fb5bb6a6a97e51ffa5fa3cf8e3 }
  - { path: web/features/notes/components/notes-view.ac.test.tsx, sha256: e9616ef412edaab5a80dab3b987eba943634c8df7d9535ae160b2375627e6fb3 }
  - { path: web/features/notes/group.ac.test.ts, sha256: bde2f6434aad1896823043789adff3e3360753e129025440f1022bd92724880e }
  - { path: web/features/notes/components/notes-section.ac.test.tsx, sha256: ba409db42cd0c59e3be4c6f68d5984e16f40ccbf905db91d356f0237422c4f59 }
---

# T-0141: Prototype off proposed-types; twins of the 10 list files

**Tier reason:** Copy-and-sed twins (D6), the command under *Web (T2)*

Work from the brief: `node scripts/pm4.mjs brief T-0141`. Verify with `node scripts/pm4.mjs check T-0141`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- Prototype: `web/proto/features/notes/api.ts` drops the `proposed-types` import; `NoteListOptions` is `Pick<NoteListQuery, "q" | "sort" | "from" | "to">`; the `as NoteListQuery` cast is gone. `web/proto/features/notes/types.ts` comment updated. `web/proto/features/notes/proposed-types.ts` deleted.
- Twins: the 10 files regenerated from the prototype with the brief's sed command, then prettier. `web/features/notes/api.ts` and `group.ts` are the test step's stub files, now replaced by the twins.
- `node scripts/pm4.mjs check T-0141`:
  - ac hashes: ok (5), scope: ok
  - web lint, format:check, typecheck, test (41 AC tests in the 7 feature files pass), build, api:types: ok
  - check AC-14: ok; twins: ok (128 equal, 1 intended, 0 failures)
  - PASS T-0141

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | PASS | Prototype off `proposed-types`, 10 twins regenerated with the brief's sed; `pm4 check` PASS |

## Review
**Verdict: approve** (Opus review, 2026-11-04). `pm4 check --feature` PASS; twins 128 equal; AC-14 ok. Prototype off `proposed-types.ts` as specified; URL state, grouping, list defaults, empty states and icons match the spec.
Minor (not blocking): (1) the `TodoListOptions` comment in `features/notes/api.ts` is correct, so it stays as it is; (2) `notes-section.tsx:203` shows "Hide done" with Show done on and no done to-dos left. This comes from the prototype and no AC covers it. If fixed, fix it in the prototype first, then copy it to the twin.
Tier feedback: haiku was right (first attempt).
