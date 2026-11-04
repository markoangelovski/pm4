---
id: feat-tlog-recent-links
title: "Log time: Recent project and task chips"
status: approved
owner: Marko Angelovski
last_updated: 2026-11-04
milestone: M4
requirements: [FR-TLOG-004, SCR-041]
related: [req-time-logs, web-screens, feat-tlog-reminder]
prototype: c9c3343
---

# Log time: Recent project and task chips

## Goal
In the Log time / Edit log dialog (SCR-041, FR-TLOG-004), a **Recent:** row under **Project** and under **Task** suggests the
projects and tasks of the chosen date's logs, so picking a different project and task takes two clicks. The last log's project
and task are still prefilled. Web only, built from the day the form already loads: no API change and no extra request.

## Decisions
| # | Decision | Source |
| --- | --- | --- |
| D1 | Source: the logs of the dialog's chosen date (`useDay(date)`, already used for *Day started at*); latest logged first (reverse position order), distinct, at most 5 (`RECENT_LIMIT`); logs of a deleted project or task (`id` null) are skipped. Nothing is stored. | Owner, prototype `c9c3343` |
| D2 | Task chips: only the picked project's tasks (the task's project when a task is picked); with no project, every project's tasks, each "Task · Project". A project with no task logged that day shows no task row. | Owner, prototype `c9c3343` |
| D3 | A project chip sets the project and clears a task of another project; a task chip sets the task and its project and clears the task field's error. Both drop a deleted name kept in the box (OQ-150), like the pickers. | Owner, prototype `c9c3343` |
| D4 | Shown when adding and when editing. Chips are `Button size="xs"`, `outline` (`secondary` + `aria-pressed` when picked), `rounded-md!`, with the project's `ProjectIcon` (`size-3 rounded-sm`); the row is a `role="group"` labelled "Recent projects" / "Recent tasks". | Owner, prototype `c9c3343` |
| D5 | All three files are twins of the prototype's: copy + import rewrite + Prettier, so `pm4 twins` reports them equal. | Agent: as feat-tlog-reminder T1 |

## Scope
**In:** the twins of `web/proto/features/time/recent-links.ts`, `components/recent-chips.tsx` and `components/log-form-dialog.tsx`.

**Test step (main session):** writes the new tests and the stub below, then `pm4 hash`.

**Non-goals** (implementers must not touch these):
- `api/`, `web/lib/**`, `web/components/ui/*`, `web/proto/**`, `web/app/**`.
- `features/time/api.ts`, `last-log-link.ts`, `log-project-picker.tsx`, `task-picker.tsx`, `projects/components/project-icon.tsx`.
- The existing `*.ac.test.*` files.

## Read first
| Path | Why / copy this |
| --- | --- |
| `specs/04-web/screens.md` (SCR-041) | Behavior and copy |
| `web/proto/features/time/recent-links.ts`, `web/proto/features/time/components/recent-chips.tsx` | The new logic and chip row, copied as twins |

## Files
| App | File | C/M | Task | Notes |
| --- | --- | --- | --- | --- |
| web | `web/features/time/recent-links.ac.test.ts` | C | tests | AC-1, AC-2 |
| web | `web/features/time/components/log-form-recent.ac.test.tsx` | C | tests | AC-3…AC-6 |
| web | `web/features/time/recent-links.ts` | C | T1 | Stub in the test step; T1 copies the twin over it |
| web | `web/features/time/components/recent-chips.tsx` | C | T1 | Twin |
| web | `web/features/time/components/log-form-dialog.tsx` | M | T1 | Twin (diff: `git show c9c3343 -- web/proto/features/time/components/log-form-dialog.tsx`) |

## Interfaces

### Twins (T1)
From the repo root:
```bash
for f in recent-links.ts components/recent-chips.tsx components/log-form-dialog.tsx; do
  sed -e 's#@/proto/mock/client#@/lib/api/client#' -e 's#@/proto/#@/#g' web/proto/features/time/$f > web/features/time/$f
done
cd web && npx prettier --write features/time/recent-links.ts features/time/components/recent-chips.tsx features/time/components/log-form-dialog.tsx
```
```ts
// web/features/time/recent-links.ts
export const RECENT_LIMIT = 5;
export function recentProjects(logs: readonly TimeLog[]): ProjectRef[];
export function recentTasks(logs: readonly TimeLog[], projectId: string | null): TaskRef[];   // TaskRef.project = the log's project
// web/features/time/components/recent-chips.tsx
export function RecentChips<T extends { id: string; title: string }>(props: {
  label: string; items: readonly T[]; selectedId: string | null;
  hint?: (item: T) => string | null; icon?: (item: T) => ReactNode; onPick: (item: T) => void;
}): React.JSX.Element | null;
```

## Acceptance criteria
Tests mock `@/lib/api/client`, `next/navigation`, `sonner` and the user (Zagreb) as `log-form-dialog.ac.test.tsx` does, and reset
`setLastLogLink(NO_LOG_LINK)` before each test.

| AC | Case → expected | Test | Task |
| --- | --- | --- | --- |
| AC-1 | `recentProjects` of logs (in position order) Manhatan, Website, unsorted, deleted project (`id` null), Manhatan → `[Manhatan, Website]` (latest first, distinct, unsorted and deleted skipped); 7 distinct projects → the 5 latest; `[]` → `[]` | `web/features/time/recent-links.ac.test.ts` | T1 |
| AC-2 | `recentTasks`: latest first, distinct, the log's project as `task.project`; `projectId` p1 → only p1's tasks; `null` → all; a log with a deleted task or project, or no task, is skipped; at most 5 | `web/features/time/recent-links.ac.test.ts` | T1 |
| AC-3 | New log for a day with logs Manhatan · Specifications 01, then Website · Landing page: groups "Recent projects" = Website, Manhatan; "Recent tasks" = "Landing page · Website", "Specifications 01 · Manhatan" with no project picked; with the last link Website · Landing page, "Recent tasks" = Landing page only, and Website and Landing page are `aria-pressed` | `web/features/time/components/log-form-recent.ac.test.tsx` | T1 |
| AC-4 | Two clicks: chip Manhatan → the Project box is Manhatan, the Task box empty, "Recent tasks" = Specifications 01 only; chip Specifications 01 → saving sends `projectId` p1, `taskId` t1 | `web/features/time/components/log-form-recent.ac.test.tsx` | T1 |
| AC-5 | With no project picked, the task chip Specifications 01 → saving sends `projectId` p1, `taskId` t1; a day with no logs → no Recent group; only unsorted / deleted links → none of them suggested (no "Recent tasks" group) | `web/features/time/components/log-form-recent.ac.test.tsx` | T1 |
| AC-6 | No request of their own: opening the dialog and clicking chips calls `GET` only for paths the dialog already used (`/api/v1/me`, `/api/v1/workdays/{date}`, projects, tasks); `/api/v1/workdays/{date}` only for the dialog's date | `web/features/time/components/log-form-recent.ac.test.tsx` | T1 |
| AC-7 | The three twins equal their prototype files | check | T1 |

Typed stubs (created with the tests, so lint and typecheck pass while the tests fail):
- `web/features/time/recent-links.ts`: the exports above; `RECENT_LIMIT` real, each function body `throw new Error("not implemented (feat-tlog-recent-links)")`.

## Checks
```bash
# AC-7: twins equal
node scripts/pm4.mjs twins
```

## Tasks
| # | Task | App | Size | Tier | Why this tier | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | Recent project and task chips: three Log time twins | web | S | haiku | Twin copy, the command under *Twins (T1)* | — |

## Open questions
None.

## Changelog
- 2026-11-04: Initial draft from prototype `c9c3343` (owner request 2026-11-04). Ready for review.
- 2026-11-04: Approved by the owner ("proceed with the implementation", with commits authorized for this run).
