---
id: T-0118
title: Prototype off proposed-types for projects, useServiceNames + mock route; project dialog and detail twins, promote services-field.tsx
milestone: M2
app: web
status: done
size: S
tier: haiku
depends_on: [T-0116]
feature_spec: specs/06-features/prj-services.md
spec_row: T3
ac_files:
  - { path: web/features/projects/components/project-services.ac.test.tsx, sha256: b22015b2ac86344308d31313f836182331f7554b247e92b3a81aae53267809d7 }
---

# T-0118: Prototype off proposed-types for projects, useServiceNames + mock route; project dialog and detail twins, promote services-field.tsx

**Tier reason:** Copy-and-sed twins (D10) with the delta listed in *Web (T3)*

Work from the brief: `node scripts/pm4.mjs brief T-0118`. Verify with `node scripts/pm4.mjs check T-0118`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- Prototype: `proto/features/projects/api.ts` drops `proposed-types` (schema types, `ProjectService`, `ProjectInput.services`,
  `projectKeys.serviceNames`, `useServiceNames`, invalidations); `schemas.ts` owns `SERVICE_NAME_MAX`/`SERVICES_MAX`;
  `services-field.tsx` uses `useServiceNames`; `mock/client.ts` answers `GET projects/service-names`.
- Production twins generated from the prototype (`features/projects/api.ts`, `schemas.ts`, `project-form-dialog.tsx`,
  `project-detail.tsx`, `components/services-field.tsx`); `pm4 twins`: 113 equal.
- AC-13…AC-17: `npx vitest run features/projects` passes (7 files, 28 tests).
- `pm4 check T-0118` (after the OQ-248 amendment, 2a9d9fd): PASS: ac hashes ok, scope ok, web lint, format:check, typecheck, test, build, api:types ok; twins ok (114 equal; warnings are T4 files).
- Attempt 2: `features/tasks/schemas.ts` is now the twin of `proto/features/tasks/schemas.ts` (copy + `@/proto/` → `@/`),
  moved from T4 to T3 per OQ-248. That fixed the TS2741 typecheck and build failures.
- The attempt-2 scope FAIL was only the OQ-248 spec amendment, since committed as 2a9d9fd.

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | BLOCKED: spec | Prototype and project twins done; ACs pass; typecheck/build fail only in T4's `features/tasks/schemas.ts` (sequencing). |
| 2 | haiku | pass (scope: spec amendment) | OQ-248 twin moved to T3: typecheck, build and all ACs pass; `pm4 check` scope lists only the orchestrator's OQ-248 edits to `specs/06-features/prj-services.md` and `specs/open-questions.md`. |

## Review
Feature review (Opus, 2026-10-26): `pm4 check --feature prj-services` PASS, no warnings; all four tasks approved.

- Verdict: **approve**. OQ-248 (the schemas.ts twin moved to T3) is applied consistently; `ProjectInput.services` is required.
- Tier (haiku): right; its one failure was a spec sequencing gap, not a tier problem.
