---
id: qa-dod
title: Definition of Done
status: draft
owner: Marko Angelovski
last_updated: 2026-09-27
related: [qa-testing, qa-code-style]
---

# Definition of Done

A task is **done** only when every item applies. The implementer checks these before `review`, and
the reviewer checks them again before `done`.

## All tasks
- [ ] Every acceptance criterion in the task is met, with evidence recorded in *Implementation notes*.
- [ ] The implementation matches the referenced specs. Any deviation was raised and resolved, not silently made.
- [ ] Lint, type-check, tests and build pass locally (the commands and results are recorded).
- [ ] Tests were added or updated as `testing.md` requires.
- [ ] No secrets, debug leftovers, commented-out code, or unrelated changes.
- [ ] New env vars are documented in `specs/02-architecture/environments.md` and `.env.example`.
- [ ] The app repo's `AGENTS.md` is updated if commands, structure or conventions changed.
- [ ] The task status is updated in the task file and in `tasks/BOARD.md`.
- [ ] Nothing is staged, committed or pushed. The owner reviews the diff and commits (AGENTS.md §3).

## API tasks (additional)
- [ ] OpenAPI annotations are complete and match `03-api/endpoints.md`.
- [ ] Ownership and authorization are enforced and covered by a cross-user test.
- [ ] Migrations (if any) are generated (left uncommitted for the owner), expand/contract-safe, and follow the storage rules in `03-api/data-model.md`.
- [ ] `openapi.json` regenerated (left uncommitted for the owner).

## Web tasks (additional)
- [ ] `npm run build` produces a working `out/`. The feature works when `out/` is served statically from the root.
- [ ] Dates and ranges use `lib/time` with the user's time zone (no UTC-date shortcuts).
- [ ] Loading, empty and error states are implemented.
- [ ] Works at 360 px and at desktop width. Keyboard accessible.
- [ ] Works in both light and dark theme.
- [ ] Generated API types are current (`npm run api:types` produces no diff).

## Open questions
—

## Changelog
- 2026-09-26: Initial scaffold.
- 2026-09-27: Agents never commit; the owner reviews the diff and commits.
