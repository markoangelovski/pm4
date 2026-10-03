---
id: T-0026
title: ProjectLeadField, ProjectLeadLabel and the project create/edit dialog
milestone: M2
app: web
status: blocked
size: M
tier: opus
depends_on: [T-0025]
feature_spec: specs/06-features/prj-web.md
spec_row: T2
ac_files:
  - { path: web/features/users/components/project-lead-field.ac.test.tsx, sha256: 2bbbad327603885b1aca8bd0a4529d915fa1a99f4e19b153f2d95008fe64a570 }
  - { path: web/features/projects/components/project-form-dialog.ac.test.tsx, sha256: 2d21d63503689e99232bfea5028b312ea85e49a5f6525e6f8cef021391e22bad }
---

# T-0026: ProjectLeadField, ProjectLeadLabel and the project create/edit dialog

**Tier reason:** First form (rhf + zod + API field errors) and a non-trivial combobox, both reused by tasks

Work from the brief: `node scripts/pm4.mjs brief T-0026`. Verify with `node scripts/pm4.mjs check T-0026`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by `review-feature`._
