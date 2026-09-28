# Tasks

The implementation backlog. Each task is a markdown file that one agent can pick up, implement in one
app repo, and verify against objective acceptance criteria.

## Layout
```
tasks/
├── BOARD.md                         # index of every task and its status (keep in sync!)
├── _TEMPLATE.md
└── m<N>-<milestone>/
    ├── README.md                    # milestone goal and exit criteria (from specs/00-product/scope.md)
    └── T-####-<slug>.md
```

## Status lifecycle
```
blocked ──▶ ready ──▶ in-progress ──▶ review ──▶ done
   ▲                       │             │
   └────── (spec changed) ─┴─────────────┘ changes-requested → in-progress
```
| Status | Meaning | Set by |
| --- | --- | --- |
| `blocked` | Waiting on a spec approval, an open question or a dependency | planner / anyone |
| `ready` | Specs approved, dependencies done, can start | owner / planner |
| `in-progress` | An agent is working on it | implementer |
| `review` | Implementation complete, awaiting review | implementer |
| `done` | Reviewed and accepted | reviewer / owner |

Rules:
- IDs (`T-####`) are global, sequential and never reused. The next free ID is shown in BOARD.md.
- A task targets **one** of: `web` (changes only `web/`), `api` (only `api/`), `infra` (workflows, repo setup), `spec`.
- Size: `S` (< 2h), `M` (≤ 1 day). Anything bigger must be split. `L` is allowed only for bootstrap tasks.
- Every task has a `tier` (`haiku` / `sonnet` / `opus`), taken from its feature spec's *Tasks* table.
  Routing and escalation rules: `specs/05-quality/task-routing.md`.
- Tasks created from a feature spec (`specs/06-features/`) are thin. They point at a row of the spec's
  *Tasks* table, and all the details stay in the spec. Tasks before M1 (M0) use the older, self-contained format.
- `ac_files` lists the acceptance tests a task must make pass, with sha256 hashes. It's filled in by
  `write-acceptance-tests`, and the reviewer checks the hashes.
- Status changes are made in **both** the task frontmatter and BOARD.md.
- Only the owner or reviewer sets `done`.
