---
name: write-spec
description: Create or update a PM4 specification in specs/ — including feature specs in specs/06-features/ — using the standard structure, frontmatter, requirement IDs and open-question tracking. Use whenever adding or changing product, requirement, architecture, API, web or feature specs.
---

# Write / update a PM4 spec

1. Read `specs/README.md` (structure, frontmatter, ID scheme, status lifecycle).
2. Find the right file. Prefer extending an existing spec. A new file goes in the matching numbered
   folder and is added to the index in `specs/README.md` (and `specs/06-features/README.md` for features).

## Layer specs (requirements, architecture, api, web, quality)
Use this skeleton:

```markdown
---
id: <folder-prefix>-<slug>
title: <Title>
status: draft                     # draft | review | approved | deprecated
owner: <human owner>
last_updated: YYYY-MM-DD
related: [<other spec ids>, ADR-000X]
---
# <Title>
## Purpose
## Scope            (in / out)
## Content          (requirements, models, rules)
## Acceptance criteria   (for requirement specs)
## Open questions
## Changelog
```

Requirements: one ID each (`FR-<AREA>-###`, `NFR-###`), atomic and testable, with no implementation detail unless it's a real constraint.

## Feature specs (`specs/06-features/`)
1. Copy `specs/06-features/_TEMPLATE.md`.
2. **Read the code before writing.** Use the built-in `Explore` agent with `model: haiku` for searches.
   Find the closest existing pattern for every file you plan. Every path in *Read first*, *Files* and
   *Reuse* must exist, or be created by a task in this spec.
3. Update the layer specs the feature depends on first (endpoint details in `03-api/endpoints.md`,
   tables in `03-api/data-model.md`, screens in `04-web/screens.md`). Then link their anchors.
4. Fill *Interfaces* until no design decision is left: class and file names, signatures, validation, query keys.
5. Write every edge case with its exact expected result, and map each one to an `AC-#`.
6. Split *Tasks* per `specs/05-quality/task-routing.md`. Give each task a tier with a one-line reason,
   and a *Done when* column that names its ACs.
7. **Don't finish with open questions.** Put each unknown into `specs/open-questions.md` and ask the
   owner. The spec stays `draft` until *Open questions* is empty. Only then set `review`.

## Always
- Unknowns go in `specs/open-questions.md` as a new `OQ-###`. Never guess.
- Bump `last_updated`, add a changelog line, and keep the status tables current.
- Never set `status: approved` yourself. Only the human owner approves.
