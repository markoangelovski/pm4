---
id: T-0103
title: notes and todos tables, migration 0010, the notes service and repository, ItemLinkService, retained names and task moves for both tables
milestone: M8
app: api
status: ready
size: M
tier: sonnet
depends_on: []
feature_spec: specs/06-features/note-todos.md
spec_row: T1
ac_files:
  - { path: api/test/notes.ac.e2e-spec.ts, sha256: 219254471f89d700808c6d04712adf857ac155333d263c93b85889b79f42921c }
---

# T-0103: notes and todos tables, migration 0010, the notes service and repository, ItemLinkService, retained names and task moves for both tables

**Tier reason:** Writes in the project/task delete and move transactions (several tables under row locks); the first time-zone date filter

Work from the brief: `node scripts/pm4.mjs brief T-0103`. Verify with `node scripts/pm4.mjs check T-0103`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by `review-feature`._
