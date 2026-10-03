---
id: T-0026
title: ProjectLeadField, ProjectLeadLabel and the project create/edit dialog
milestone: M2
app: web
status: done
size: M
tier: opus
depends_on: [T-0025]
feature_spec: specs/06-features/prj-web.md
spec_row: T2
ac_files:
  - { path: web/features/users/components/project-lead-field.ac.test.tsx, sha256: a5433abfad58114695be151101b14f985aae0533b52cf07d3c893d8fcf5a694e }
  - { path: web/features/projects/components/project-form-dialog.ac.test.tsx, sha256: 2d21d63503689e99232bfea5028b312ea85e49a5f6525e6f8cef021391e22bad }
---

# T-0026: ProjectLeadField, ProjectLeadLabel and the project create/edit dialog

**Tier reason:** First form (rhf + zod + API field errors) and a non-trivial combobox, both reused by tasks

Work from the brief: `node scripts/pm4.mjs brief T-0026`. Verify with `node scripts/pm4.mjs check T-0026`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

Attempt 1: BLOCKED: test (`/users` mock was a bare array). The test author fixed it to `{ items }` and re-hashed.

Attempt 2:
- `ProjectLeadField`: the prototype with `searchUsers` replaced by `useUserSearch(debounced trimmed text)`. "Searching…"
  shows while the debounce is pending or the query is fetching. Added `disabled` and `aria-describedby`; the lead
  types now come from `features/users/lead.ts`.
- `ProjectLeadLabel` takes the API's `ProjectLeadDto | null`. A user lead shows avatar + name, anything else shows `name`.
- `schemas.ts`: `projectFormSchema`, `projectFormDefaults`, `toProjectInput`, `PROJECT_FIELD_MAP` as the brief specifies.
  `toProjectInput` keeps the prototype's rule that a whitespace-only description becomes `null`.
- `ProjectFormDialog`: react-hook-form + `zodResolver`, `Controller` for the lead, `FieldError errors=[...]`,
  `useCreateProject`/`useUpdateProject`. On failure it calls `applyFieldErrors`, else `toast.error`.

**Expected break (owner decision):** `ProjectFormDialog` now takes the API `Project` and `ProjectLeadLabel`
takes `ProjectLeadDto`, so the T-0027 files (`projects-list.tsx`, `project-detail.tsx`), still on the
mock store, fail typecheck. `build` fails for the same reason because `next build` runs tsc. T-0027 fixes both.
Remaining tsc errors, all in T-0027 files:
- `features/projects/components/project-detail.tsx(147,13)` TS2741 (mock `Project` lacks `projectLead`)
- `features/projects/components/project-detail.tsx(237,33)` TS2322 (`LeadValue` → `ProjectLeadDto`)
- `features/projects/components/projects-list.tsx(298,47)` TS2322 (`LeadValue` → `ProjectLeadDto`)

pm4 check T-0026:
```
  ac hashes: ok (2)
  scope: ok
  pending ACs (later tasks, excluded): AC-11, AC-12, AC-13, AC-14, AC-15, AC-16, AC-17, AC-18
  web lint: ok
  web format:check: ok
  web typecheck: FAIL   (only the 3 T-0027 errors above)
  web test: ok
  web build: FAIL       (same 3 tsc errors)
  web api:types: ok
  check AC-16, AC-18: skipped (later task)
FAIL T-0026
```

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | opus | BLOCKED: test | AC test mocks /users as a bare array; the contract is `{ items }` |
| 2 | opus | done | AC-7..10 pass; typecheck/build fail only in T-0027 files (expected, owner decision) |

## Review
**Verdict: approve** (Opus review of feat prj-web, 2026-10-04; `pm4 check --feature` PASS).
- The test author's fix to `project-lead-field.ac.test.tsx:53` (`{ items }` for API-USR-003) is correct.
- Accepted as is: a whitespace-only description → `null` (the API trims to `null` anyway); `ProjectLeadLabel` without `"use client"`.
- No findings.
- Tier: opus was right (first form and combobox; the one block was a genuine `BLOCKED: test`).
