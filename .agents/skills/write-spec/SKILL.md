---
name: write-spec
description: Create or update a PM4 specification in specs/ — including feature specs in specs/06-features/ — using the standard structure, frontmatter, requirement IDs and open-question tracking. Use whenever adding or changing product, requirement, architecture, API, web or feature specs.
---

# Write / update a PM4 spec

Run this inline in the main (Opus) session. Interactively, open questions go straight to the owner. In an
**autonomous run** (`build-feature`) nobody is asked: see the *Autonomous* notes in §2, §9 and *Always*.

## 0. Pick the lane (`specs/05-quality/task-routing.md#lanes`)
A change that fits the **quick lane** gets no feature spec. Write a quick-lane task file from
`tasks/_TEMPLATE.md` instead (next ID from `tasks/BOARD.md`, add a BOARD row), and show it to the owner
(autonomous: don't show it; `build-feature` goes on to implement it).

## Layer specs (requirements, architecture, api, web, quality)
Read `specs/README.md` once (frontmatter, ID scheme, status lifecycle). Prefer extending an existing
spec. Sections: Purpose · Scope (in/out) · content · Acceptance criteria (requirement specs) · Open
questions · Changelog. Requirements get one ID each (`FR-<AREA>-###`, `NFR-###`), and must be atomic and testable.

## Feature specs (`specs/06-features/`)
1. Copy `specs/06-features/_TEMPLATE.md` and follow its comment, including the size budget.
2. **Web UI: start from the confirmed prototype** (`specs/04-web/prototype.md`). If the feature adds or changes
   UI and the owner hasn't confirmed a prototype for it, committed on the feature branch, stop and offer `prototype`
   first (autonomous: stop the run and report it). Set `prototype:` to that commit's short SHA on the feature branch
   (`git log -1 --format=%h -- web/proto web/app/proto`). Take the UI from the prototype files and don't restate it: list each promoted
   file as a `P` row in *Files*, put its mock `api.ts` under *Read first*, and write in *Interfaces → Web* only the
   delta to production (the real hooks with the mock's names and shapes, each `@/proto/mock/` import to replace,
   auth, error mapping, URL state). The API shapes come from the prototype's `proposed-types.ts`.
3. **Ground it in the code, cheaply.** Open the files you already know directly. Use `Explore`
   (`model: haiku`) only for wide searches. Every path in *Read first* and *Files* must exist, or be
   created by a row in *Files*.
4. Update the layer specs it depends on first (`03-api/endpoints.md`, `03-api/data-model.md`,
   `04-web/screens.md`), then link their anchors. Don't copy them into the feature spec.
5. Fill *Interfaces* until no design decision is left, and tag each subsection with its tasks.
6. Write each edge case as an *Acceptance criteria* row with its exact expected result, test file and task.
7. Split *Tasks* per `task-routing.md`: haiku first, sonnet only on a named trigger (never opus), a one-line reason
   for each, and no task smaller than a subagent context is worth. Write *Read first* and *Interfaces* so a
   haiku task is typing: every file names the pattern it copies or has its signatures spelled out. A promoted
   prototype screen is one haiku task (promote + wire), unless a sonnet trigger applies.
8. Fill the *Agents* table (`specs/05-quality/task-routing.md#agent-signatures`): the **Spec** row with your own
   signature (e.g. `claude-code/claude-opus-5-5`) and today's date. For a web UI feature, the **Prototype** row
   from the prototype commit's `Co-Authored-By` trailer (`git log -1 --format=%B <sha>`), or `unknown`.
   API-only features write `—` for the prototype.
9. Ask the owner about every unknown as you go (`AskUserQuestion`, batched), and record each one as
   `OQ-###` in `specs/open-questions.md` with its answer. The spec stays `draft` until *Open questions*
   is empty. Then set `review`, and tell the owner what to look at.
   **Autonomous:** don't ask. Pick the answer you'd recommend (`specs/05-quality/task-routing.md#autonomous-runs`
   says in which order to look), and record it in *Resolved* as `**Assumed (YYYY-MM-DD):** …`. Add a *Decisions* row
   with Source `assumed, OQ-###`. Fill *Dependencies*. Once *Open questions* is empty, set `status: approved` and
   `approved_by:` your signature.

## Always
- Never guess product behavior. Unknowns become `OQ-###` entries.
- Bump `last_updated`, add a changelog line, and keep the index tables current (`specs/README.md`, `specs/06-features/README.md`).
- Never set `status: approved` yourself. Only the owner approves. The exception is a feature spec in an autonomous run
  (§9), which records `approved_by:` and is reviewed by the owner with the run report.
- After the owner approves a feature spec, offer the next step: `write-task`, then `write-acceptance-tests`
  (autonomous: `build-feature` goes on by itself).
