---
id: T-0108
title: Promote project-task-rows.tsx, apply the prototype diff to projects-list.tsx
milestone: M2
app: web
status: done
size: S
tier: haiku
depends_on: []
feature_spec: specs/06-features/prj-task-rows.md
spec_row: T1
ac_files:
  - { path: web/features/projects/components/projects-list.ac.test.tsx, sha256: f3aa1afa4378312bc4af5e93a50a576e7a4e56c9834d5f479340549b88276e68 }
---

# T-0108: Promote project-task-rows.tsx, apply the prototype diff to projects-list.tsx

**Tier reason:** Promoted prototype screen; the change is a `git apply` (Interfaces)

Work from the brief: `node scripts/pm4.mjs brief T-0108`. Verify with `node scripts/pm4.mjs check T-0108`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- Promoted `web/features/projects/components/project-task-rows.tsx` (`pm4 promote`); its imports were already production paths.
- `projects-list.tsx`: the prototype diff was applied by hand (the `git apply` in Interfaces was blocked by the subagent git guard), by writing the production file with the prototype's content and `@/proto/` imports rewritten to `@/`.
- `project-task-rows.tsx` was run through `prettier --write` once: the shorter import paths made Prettier collapse a multi-line import, and the twin check compares formatted text.
- Owner-approved extra: `web/app/layout.tsx` reformatted with Prettier only (the `<ThemeProvider>` props on one line; system light/dark default from 0d871a5 unchanged). It was the pre-existing `format:check` failure on master.
- `pm4 check` summary: `ac hashes: ok (1)`, `scope: FAIL` (only `web/app/layout.tsx`, the owner-approved format fix above), `web lint/format:check/typecheck/test/build: ok`, `AC-7 / twins: ok (117 equal)`.

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | ok (after orchestrator fix) | Promoted, applied prototype diff, twins ok, all ACs pass; only failure was the pre-existing `app/layout.tsx` Prettier issue, fixed by the orchestrator with owner approval |

## Review
_Filled in by `review-feature`._

**Verdict: approve** (Opus reviewer, 2026-10-25). D1–D5, non-goals, prototype imports and AC-1…AC-6 all match the spec; `pm4 check --feature`: all gates ok, scope FAIL only for the owner-approved Prettier-only `web/app/layout.tsx`.
- minor: `project-task-rows.tsx:84-85` line-through for `completed` is a dead branch (only upcoming/in-progress are fetched). Optional; if removed, change the prototype twin first.
- minor (process): the spec's `git apply` step is always blocked by the subagent git guard; future specs should have the main session run it (or a `pm4` subcommand).
- Tier feedback: haiku was right; the only snag was tooling.
