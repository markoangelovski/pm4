---
name: write-spec
description: Create or update a PM4 specification in specs/ — including feature specs in specs/06-features/ — using the standard structure, frontmatter, requirement IDs and open-question tracking. Use whenever adding or changing product, requirement, architecture, API, web or feature specs.
---

# Write / update a PM4 spec

Run this inline in the main (Opus) session, so open questions go straight to the owner.

## 0. Pick the lane (`specs/05-quality/task-routing.md#lanes`)
A change that fits the **quick lane** gets no feature spec. Write a quick-lane task file from
`tasks/_TEMPLATE.md` instead (next ID from `tasks/BOARD.md`, add a BOARD row), and show it to the owner.

## Layer specs (requirements, architecture, api, web, quality)
Read `specs/README.md` once (frontmatter, ID scheme, status lifecycle). Prefer extending an existing
spec. Sections: Purpose · Scope (in/out) · content · Acceptance criteria (requirement specs) · Open
questions · Changelog. Requirements get one ID each (`FR-<AREA>-###`, `NFR-###`), and must be atomic and testable.

## Feature specs (`specs/06-features/`)
1. Copy `specs/06-features/_TEMPLATE.md` and follow its comment, including the size budget.
2. **Ground it in the code, cheaply.** Open the files you already know directly. Use `Explore`
   (`model: haiku`) only for wide searches. Every path in *Read first* and *Files* must exist, or be
   created by a row in *Files*.
3. Update the layer specs it depends on first (`03-api/endpoints.md`, `03-api/data-model.md`,
   `04-web/screens.md`), then link their anchors. Don't copy them into the feature spec.
4. Fill *Interfaces* until no design decision is left, and tag each subsection with its tasks.
5. Write each edge case as an *Acceptance criteria* row with its exact expected result, test file and task.
6. Split *Tasks* per `task-routing.md`: a tier and a one-line reason for each, and no task smaller than a subagent context is worth.
7. Ask the owner about every unknown as you go (`AskUserQuestion`, batched), and record each one as
   `OQ-###` in `specs/open-questions.md` with its answer. The spec stays `draft` until *Open questions*
   is empty. Then set `review`, and tell the owner what to look at.

## Always
- Never guess product behavior. Unknowns become `OQ-###` entries.
- Bump `last_updated`, add a changelog line, and keep the index tables current (`specs/README.md`, `specs/06-features/README.md`).
- Never set `status: approved` yourself. Only the owner approves.
- After the owner approves a feature spec, offer the next step: `write-task`, then `write-acceptance-tests`.
