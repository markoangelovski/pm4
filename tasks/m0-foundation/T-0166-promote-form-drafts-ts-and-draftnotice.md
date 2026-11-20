---
id: T-0166
title: Promote form-drafts.ts and DraftNotice, replace the five dialogs and three api.ts with their twins, clearFormDrafts() in sign-out and session end
milestone: M0
app: web
status: ready
size: S
tier: haiku
implementer: —
depends_on: []
feature_spec: specs/06-features/shell-form-drafts.md
spec_row: T1
ac_files:
  - { path: web/features/system/form-drafts.ac.test.tsx, sha256: b586f95db49dba5d67432a1eae05c52fe7f061f4a90ab48c5a264ea3bfa09c02 }
  - { path: web/features/projects/components/project-form-dialog.ac.test.tsx, sha256: 7aac67dff3e5bc51781a678bc751aea5eae06a698547d34f54b178f00a21bf55 }
  - { path: web/features/auth/use-sign-out.ac.test.tsx, sha256: 36d8f226b04c87399147946b07f8233f1a4ec37cdff46d38ddfe1a90757be69f }
  - { path: web/features/auth/components/auth-guard.ac.test.tsx, sha256: d2861894da839205155e674e4934526ade9bc35b949d4a2daad3f4118670e7ef }
---

# T-0166: Promote form-drafts.ts and DraftNotice, replace the five dialogs and three api.ts with their twins, clearFormDrafts() in sign-out and session end

**Tier reason:** Copy commands spelled out; two one-line edits

Work from the brief: `node scripts/pm4.mjs brief T-0166`. Verify with `node scripts/pm4.mjs check T-0166`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Agent | Result | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by `review-feature`._
