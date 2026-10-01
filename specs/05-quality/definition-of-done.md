---
id: qa-dod
title: Definition of Done
status: review
owner: Marko Angelovski
last_updated: 2026-10-01
related: [qa-testing, qa-code-style, qa-task-routing]
---

# Definition of Done

A task is **done** only when every item applies. `pm4 check` verifies the items marked ⚙ (scope,
hashes, nothing staged, gates, the spec's *Checks*). The implementer runs it before `review`. The
reviewer runs `pm4 check --feature` and checks the rest by reading.

## All tasks
- [ ] ⚙ The task's acceptance tests pass, and their sha256 hashes match the task file.
- [ ] ⚙ Lint, typecheck, tests and build pass. The `pm4 check` summary is pasted in *Implementation notes*.
- [ ] ⚙ Only files listed for the task (the feature spec's *Files*, or the quick task's `files:`) changed.
- [ ] ⚙ Nothing is staged, committed or pushed (AGENTS.md §3).
- [ ] The implementation matches the spec. Any deviation was raised and resolved, not silently made.
- [ ] Tests were added or updated as `testing.md` requires.
- [ ] No secrets, debug leftovers or commented-out code.
- [ ] New env vars are documented in `specs/02-architecture/environments.md` and `.env.example`.
- [ ] The app's `AGENTS.md` is updated if commands, structure or conventions changed (main session; implementers can't edit it).
- [ ] The task status is current (`pm4 status`).

## API tasks (additional)
- [ ] OpenAPI annotations are complete and match `03-api/endpoints.md`. ⚙ `openapi.json` is current.
- [ ] Ownership and authorization are enforced and covered by a cross-user test.
- [ ] Migrations (if any) are generated, expand/contract-safe, and follow the storage rules in `03-api/data-model.md`.

## Web tasks (additional)
- [ ] ⚙ `npm run build` produces `out/`. The feature works when `out/` is served statically from the root.
- [ ] Dates and ranges use `lib/time` with the user's time zone (no UTC-date shortcuts).
- [ ] Loading, empty and error states are implemented.
- [ ] Works at 360 px and at desktop width. Keyboard accessible.
- [ ] Works in both light and dark theme.
- [ ] ⚙ Generated API types are current (`npm run api:types` produces no diff).

## Open questions
—

## Changelog
- 2026-09-26: Initial scaffold.
- 2026-09-27: Agents never commit; the owner reviews the diff and commits.
- 2026-09-28: Acceptance-test hash check; only the spec's listed files change; commits happen after the owner's review, on request.
- 2026-10-01: Mechanical items are verified by `pm4 check`.
