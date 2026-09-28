---
name: write-task
description: Create PM4 implementation task files in tasks/ from the Tasks table of an approved feature spec, with tier, dependencies and acceptance tests. Use when planning or grooming the backlog.
---

# Write PM4 tasks

1. Read `tasks/README.md` and `tasks/_TEMPLATE.md`.
2. The source is a feature spec in `specs/06-features/` with `status: approved`. If it isn't approved, stop.
   (Tooling and infra tasks without a feature spec may use the template's self-contained sections.)
3. For each row of the spec's *Tasks* table, in order:
   - Take the next free ID from `tasks/BOARD.md` (`T-####`, never reused).
   - Save it as `tasks/m<N>-<milestone>/T-####-<kebab-slug>.md`.
   - Copy `app`, `tier`, the tier reason, and `depends_on` (spec row IDs → real IDs).
   - Set `feature_spec` to the spec's `#tasks` anchor and name the row. Leave `ac_files: []`;
     `write-acceptance-tests` fills it.
   - Status: `ready` if every dependency is `done`, otherwise `blocked`.
4. Don't re-plan. If a row is too big (> M), has the wrong tier, or misses a dependency, stop and report it.
5. Add a row to `tasks/BOARD.md` for each task, and update the next free ID.
