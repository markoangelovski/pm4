---
id: T-0105
title: The web: twins of the notes domain, range picker, project and task detail; the page, route, sidebar item and header menu
milestone: M8
app: web
status: done
size: M
tier: haiku
depends_on: []
feature_spec: specs/06-features/note-todos.md
spec_row: T3
ac_files:
  - { path: web/features/notes/api.ac.test.tsx, sha256: 01a4df63aa086fe23bea5f82901c34497d59daeb374956ef81baaabef8112e1e }
  - { path: web/features/notes/group.ac.test.ts, sha256: 30f572db281a78a1ade78c22d334eea0dc6aea08c02e205aa4932ccfc4fb718c }
  - { path: web/features/notes/components/notes-view.ac.test.tsx, sha256: a7f7ac88e8e38998e01d45ff211fa08785b6233aa4495b7071e012152f9b28d3 }
  - { path: web/app/(dashboard-layout)/layout/vertical/sidebar/sidebaritems.ac.test.ts, sha256: c58d756d8908f5dd42615ce23207419dcd34180734a863a772bd3117e6b85356 }
---

# T-0105: The web: twins of the notes domain, range picker, project and task detail; the page, route, sidebar item and header menu

**Tier reason:** Copy commands and four shell edits spelled out

Work from the brief: `node scripts/pm4.mjs brief T-0105`. Verify with `node scripts/pm4.mjs check T-0105`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- D7 applied in `web/proto/features/notes/components/notes-section.tsx` (`NOTES_MAX = 100`, Show more capped), before the twin copy.
- Twins copied from `web/proto` (the `features/notes` domain, `range-picker.tsx`, `project-detail.tsx`, `task-detail.tsx`) with `@/proto/` rewritten; `pm4 twins`: 116 equal, 0 failures.
- Shell: `NotebookPen` import and the Notes sidebar item in `sidebaritems.ts`; `notes: "/app/notes"` in `routes.ts`; `NewItemButton` in a `Suspense` before `LogTimeButton` in the header; `app/(dashboard-layout)/app/notes/page.tsx`.
- AC-13..16 (`features/notes`, `notes-view`, `sidebaritems`): 17 tests pass in isolation; `npm run typecheck` ok.
- `pm4 check T-0105`: lint, format, typecheck, build, api:types, AC-17 and twins ok. `web test` FAILED with 3 timeouts (5 s) in `bookings-view.ac.test.tsx` AC-11, `dashboard-view.ac.test.tsx` AC-8 and `log-form-dialog.ac.test.tsx` AC-9. Each file passes when run alone (26 tests), and the full suite fails the same way on a rerun, so the timeouts look like load from 74 parallel workers while T-0103 runs in `api/`. Reviewer: please confirm on a quiet machine.
- AC-18 is manual (owner).

Check summary: `FAIL T-0105 - web test failed (3 timeouts, see above; the files pass in isolation)`.

Orchestrator re-run (quiet machine): `pm4 check T-0105` → only `dashboard-view.ac.test.tsx` AC-8 timed out (5 s). Not caused by this task: alone it takes 1271 ms here vs 1349 ms on master, and the full `npm test` on master (56e9d22) times out on the same test. Pre-existing flake under full-suite load; propose a quick-lane task to raise that test's timeout or the suite's `testTimeout`. Accepted.

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | FAILED (test timeouts under load) | D7 + twins + shell edits; ACs 13-17 pass in isolation; `pm4 check` web test: 3 timeouts in unrelated files, pass alone |

## Review
**Verdict: approve** (Opus review, 2026-10-24). D7, shell edits, twins and static-export constraints all correct; no `@/proto` imports in production code. Full-suite `web test` timeouts are a pre-existing flake (hit `log-form-dialog` AC-9 this run). AC-18 is manual (owner).
- Tier: haiku was right.
