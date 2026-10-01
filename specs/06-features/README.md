# Feature specs

A feature spec is the **implementation plan** for one feature: exact files, patterns to copy,
signatures, edge cases, acceptance tests and a tiered task list. It's written so that a cheaper model
can implement each task without making a design decision.

The layer specs remain the source of the contract and behavior:
- `01-requirements/`: what the user can do (FR-*)
- `03-api/`: endpoints and data model
- `04-web/`: routes and screens

A feature spec links to those. It doesn't copy them.

- Template: [_TEMPLATE.md](_TEMPLATE.md). File name: `<area>-<slug>.md` (e.g. `prj-crud.md`), `id: feat-<area>-<slug>`.
- A feature spec can be `approved` only when the requirements, endpoints and data-model sections it
  links are approved too. Approval can be per item: the owner may approve individual `FR-…`/`API-…`
  entries of a spec that stays `draft` for other reasons. Record that in that spec's changelog
  ("The owner approved FR-AUTH-001, … for feat-…"), which counts as approval for those items.
- Small changes don't need a feature spec: see the quick lane in `05-quality/task-routing.md#lanes`.
- Implementers never read the whole spec. They read `node scripts/pm4.mjs brief <T-####>`, so keep
  what they need in the sections the brief includes (see the template's comment).
- Tasks: every row in its *Tasks* table becomes a `T-####` file (`write-task`). The task file points back to the row.

## Index

| Feature | File | Milestone | Status |
| --- | --- | --- | --- |
| Landing page at the root, app under `/app/` | [land-app-route-split.md](land-app-route-split.md) | M1 | approved |
