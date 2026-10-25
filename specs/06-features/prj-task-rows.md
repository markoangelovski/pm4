---
id: feat-prj-task-rows
title: "Projects list: expandable task rows"
status: approved
owner: Marko Angelovski
last_updated: 2026-10-25
milestone: M2
requirements: [FR-PRJ-002, SCR-020, API-TSK-002]
related: [web-prototype, ADR-0012, web-screens, feat-prj-web, feat-tsk-web, OQ-236]
prototype: 281fd37
---

# Projects list: expandable task rows

## Goal
On the projects list ([SCR-020](../04-web/screens.md#screens), FR-PRJ-002), a project row opens to list the project's open tasks
below it, like the PMSPA connector's Projects & tasks tab. Web only: the tasks come from the existing API-TSK-002.

## Decisions
| # | Decision | Source |
| --- | --- | --- |
| D1 | A row click or the chevron button (`aria-expanded`, rotates when open) toggles the row; the title link still opens SCR-021. The old row-click-to-detail is removed on purpose. | OQ-236 (owner, 2026-10-25), prototype `281fd37` |
| D2 | The tasks are read only on the first expand (`ProjectTaskRows` mounts while open). Loading → one skeleton row; error → "Couldn't load the tasks." with **Retry**. | OQ-236, prototype `281fd37` |
| D3 | Up to 25 Upcoming + In progress tasks, `updatedAt:desc`; more → "Show all N open tasks" linking to SCR-021 with `status=upcoming,in-progress`. A project with no open tasks has no chevron and doesn't expand. | OQ-236, prototype `281fd37` |
| D4 | Task row cells: title link (+ sync flag), lead, status badge (not a select), blank Completed, Logged, Created, Updated; the task icon lines up with the project title. No **Expand all**. The table is `table-fixed min-w-5xl` with fixed column widths, so expanding never moves the columns. | OQ-236, prototype `281fd37` |
| D5 | Which rows are open is component state, not in the URL. | Agent, prototype `281fd37` |

## Scope
**In:** the prototype's `projects-list.tsx` change applied to production, and `project-task-rows.tsx` promoted.

**Test step (main session, before T1):** in `web/features/projects/components/projects-list.ac.test.tsx`, AC-11 drops its row-click
assertion (the click now expands, D1) and becomes "rows, empty, no match and error states"; the GET router answers
`/api/v1/tasks`; the new ACs below go in a new `describe("ProjectsList task rows (feat-prj-task-rows)")`. Then `pm4 hash`.

**Non-goals** (implementers must not touch these):
- `web/proto/**` (the prototype is already done; `web/proto/mock/seed.ts` is never promoted), `web/components/ui/*`, `web/lib/*`.
- `web/features/tasks/*` (`useTasks` is used as it is), `web/features/projects/api.ts`, the project detail page.
- The API and the contract (no endpoint, DTO or `openapi.json` change).
- Any acceptance test (`*.ac.*`).

## Read first
| Path | Why / copy this |
| --- | --- |
| `specs/03-api/endpoints.md#api-tsk-002-list-tasks` | The tasks query (T1) |
| `web/features/tasks/api.ts` → `useTasks`, `TaskListParams` | The production hook `project-task-rows.tsx` calls, same name and shape as the mock (T1) |
| `specs/04-web/prototype.md#twin-check` | What "equals its twin" means (T1) |

## Files
| App | File | C/M | Task | Notes |
| --- | --- | --- | --- | --- |
| web | `web/features/projects/components/projects-list.ac.test.tsx` | M | tests | AC-11 change, new ACs (Scope) |
| web | `web/proto/features/projects/components/project-task-rows.tsx` → `web/features/projects/components/project-task-rows.tsx` | P | T1 | No change after promotion |
| web | `web/features/projects/components/projects-list.tsx` | M | T1 | Apply the prototype diff (Interfaces) |

## Interfaces

### Web (T1)
`pm4 promote` copies `project-task-rows.tsx` with its `@/proto/` imports rewritten to `@/`. Every import then has a production twin
(`@/features/tasks/api` `useTasks`, `@/features/users/api` `useMe`, `@/features/integrations/components/sync-flag`,
`@/features/projects/components/task-status-badges` `TASK_STATUS_BADGE`, `@/features/tasks/status`,
`@/features/users/components/project-lead-label`, `@/features/time/components/logged-total`, `@/lib/routes`). No mock import is left;
there's nothing to wire.

`projects-list.tsx` already equals the prototype's previous version, so apply the prototype change to it, from the repo root:
```bash
git diff 281fd37~1 281fd37 -- web/proto/features/projects/components/projects-list.tsx \
  | sed 's#@/proto/#@/#g; s#web/proto/features/#web/features/#g' | git apply
node scripts/pm4.mjs twins
```
`twins` must report `projects-list.tsx` and `project-task-rows.tsx` equal. `useRouter` is no longer imported (the diff removes it).

## Acceptance criteria
| AC | Case → expected | Test | Task |
| --- | --- | --- | --- |
| AC-1 | D1, D2: a project with open tasks renders without a `/api/v1/tasks` request; its chevron button "Show the tasks of Website" has `aria-expanded="false"`. Clicking it → one `GET /api/v1/tasks` with query `{ projectId: "p1", status: ["upcoming", "in-progress"], sort: "updatedAt:desc", page: 1, pageSize: 25 }`, the button becomes "Hide the tasks of Website" with `aria-expanded="true"`, and the task rows appear; clicking it again removes them | `web/features/projects/components/projects-list.ac.test.tsx` | T1 |
| AC-2 | D1: clicking elsewhere on the row (the lead's name) opens and closes it the same way; `router.push` is never called; the title link keeps `href="/app/project?id=p1"` | `web/features/projects/components/projects-list.ac.test.tsx` | T1 |
| AC-3 | D4: a task row shows its title as a link to `/app/task?id=<id>`, its lead's name and its status label ("Upcoming" / "In progress") as text, not a combobox | `web/features/projects/components/projects-list.ac.test.tsx` | T1 |
| AC-4 | D3: `total` 30 with 25 items → a link "Show all 30 open tasks" to `/app/project?id=p1&status=upcoming,in-progress`; `total` equal to the items → no such link | `web/features/projects/components/projects-list.ac.test.tsx` | T1 |
| AC-5 | D3: a project with `taskCounts` upcoming 0 and in progress 0 (completed 3) → its chevron button is disabled; clicking the row sends no `/api/v1/tasks` request and shows no task rows | `web/features/projects/components/projects-list.ac.test.tsx` | T1 |
| AC-6 | D2: the tasks request fails (`500`) → "Couldn't load the tasks." with **Retry**; **Retry** repeats the request and, when it succeeds, shows the task rows | `web/features/projects/components/projects-list.ac.test.tsx` | T1 |
| AC-7 | The production files equal their prototype twins | `check` | T1 |

## Checks
```bash
# AC-7: production equals the prototype twins
node scripts/pm4.mjs twins
```

## Tasks
| # | Task | App | Size | Tier | Why this tier | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | Promote `project-task-rows.tsx`, apply the prototype diff to `projects-list.tsx` | web | S | haiku | Promoted prototype screen; the change is a `git apply` (Interfaces) | — |

## Open questions
None.

## Changelog
- 2026-10-25: Initial draft from prototype `281fd37` (OQ-236). Moved to `review`.
- 2026-10-25: Approved by the owner.
