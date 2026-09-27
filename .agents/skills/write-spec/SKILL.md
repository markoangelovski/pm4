---
name: write-spec
description: Create or update a PM4 specification file in specs/ using the standard structure, frontmatter, requirement IDs and open-question tracking. Use whenever adding or changing product, requirement, architecture, API or web specs.
---

# Write / update a PM4 spec

1. Read `specs/README.md` (structure, frontmatter, ID scheme, status lifecycle).
2. Find the right file. Prefer extending an existing spec over creating a new one. If you do need
   a new file, place it in the matching numbered folder and add it to the index in `specs/README.md`.
3. Use this skeleton:

   ```markdown
   ---
   id: <folder-prefix>-<slug>        # e.g. req-projects, api-endpoints
   title: <Title>
   status: draft                     # draft | review | approved | deprecated
   owner: <human owner>
   last_updated: YYYY-MM-DD
   related: [<other spec ids>, ADR-000X]
   ---

   # <Title>

   ## Purpose
   ## Scope            (in / out)
   ## Content          (requirements, models, rules: whatever the spec is about)
   ## Acceptance criteria   (for requirement specs)
   ## Open questions   (links to OQ-### in specs/open-questions.md)
   ## Changelog
   ```

4. Requirements: one ID per requirement (`FR-<AREA>-###`, `NFR-###`). Each must be atomic, testable
   and free of implementation detail, unless the detail is a real constraint.
5. Unknowns go in `specs/open-questions.md` as a new `OQ-###`. Never guess.
6. Bump `last_updated`, add a changelog line, and keep the status table in `specs/README.md` current.
7. Never set `status: approved` yourself. Only the human owner approves.
