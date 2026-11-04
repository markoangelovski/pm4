---
id: T-0140
title: Notes title:asc order and range; to-dos on TodoSort
milestone: M2
app: api
status: done
size: S
tier: haiku
depends_on: []
feature_spec: specs/06-features/prj-lists.md
spec_row: T1
ac_files:
  - { path: api/test/note-title-sort.ac.e2e-spec.ts, sha256: b684cbf43475d14aec0dedf31ca092644b1c319f113e93f0214711e7251cdeef }
---

# T-0140: Notes title:asc order and range; to-dos on TodoSort

**Tier reason:** Two repository edits spelled out in *API (T1)*; copies `tasks.repository.ts`' `lower(title)`

Work from the brief: `node scripts/pm4.mjs brief T-0140`. Verify with `node scripts/pm4.mjs check T-0140`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- `api/src/notes/notes.repository.ts`: `SORT_COLUMN.title` = `notes.updatedAt` (the range column, commented); `orderBy` gives `title:asc` `lower(title) asc nulls last`, `updatedAt desc`, `id desc`.
- `api/src/notes/todos.repository.ts`: `orderBy` and `list` take `TodoSort` (from `list-todos-query.dto.ts`) instead of `NoteSort`.
- Contract DTOs, `openapi.json` and the AC test were already in the tree from the test step; no edits to them.

`pm4 check T-0140` (PASS):
```
  ac hashes: ok (1)
  scope: ok
  api lint: ok (13s)
  api format:check: ok (3s)
  api typecheck: ok (2s)
  api test: ok (9s)
  api test:e2e: ok (62s)
  api build: ok (6s)
  api openapi:export: ok (7s)
PASS T-0140
```

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | PASS | Repository edits for `title:asc` and `TodoSort`; AC-1..AC-4 pass; `pm4 check` PASS |

## Review
**Verdict: approve** (Opus review, 2026-11-04). `pm4 check --feature` PASS. `notes.repository.ts` matches *API (T1)*: `title:asc` → `lower(title) asc nulls last, updatedAt desc, id desc`; range on `updatedAt`; user scoping unchanged. `todos.repository.ts` only switches to `TodoSort`. No findings.
Tier feedback: haiku was right (first attempt).
