---
id: T-0062
title: Promote the prototype: the marker, delete dialogs, relink, Delete day; Settings-only sidebar footer
milestone: M4
app: web
status: done
size: M
tier: haiku
depends_on: [T-0061]
feature_spec: specs/06-features/hard-delete.md
spec_row: T3
ac_files:
  - { path: web/features/projects/api.ac.test.tsx, sha256: f49d1c6d2c832397c592830268a32fe5e13cd4c466ccf03cd42614ac01c0dc5c }
  - { path: web/features/tasks/api.ac.test.tsx, sha256: 0c1a2758ca9ed1af4867994e35c2db77db6b9bb1149cee49945a63ef0a101abb }
  - { path: web/features/time/api.ac.test.tsx, sha256: 729cc50b3144e3ddc2c4fd15e21d0e9be2a1d047648243fe789874612ee41b8e }
  - { path: web/features/projects/components/project-detail.ac.test.tsx, sha256: 70f3721da8b3084ba07dd01c77f0df609c7e1e0d7383599cc3b9c96db1fb5eba }
  - { path: web/features/tasks/components/task-detail.ac.test.tsx, sha256: 3e13ff6410a66682e27c0b9b25d4f89e43c5fa602e636118ff8e6f463ef6a41a }
  - { path: web/features/time/components/day-view.ac.test.tsx, sha256: 794c7d7f508e390ff0ed7e293a05f6e557d55fa644ef1cc3b08f2d148ab15258 }
  - { path: web/features/dashboard/components/dashboard-view.ac.test.tsx, sha256: 57d00209ba5a3f64c6cdb4188cb5b0fccfaf169aa1cca0fad879bd31b29d6ac8 }
  - { path: web/features/time/components/log-form-dialog.ac.test.tsx, sha256: 0b6de2ea032df0b782ea05a5282918a060acfb1661062cda9a729b8baf544983 }
  - { path: web/app/(dashboard-layout)/layout/vertical/sidebar/sidebaritems.ac.test.ts, sha256: f0ef56e5e0635d4d29edb13b0beb79988b63dab14867905cf140fb40e37bc61a }
  - { path: web/app/(dashboard-layout)/layout/vertical/sidebar/nav-collapse/nav-collapse.ac.test.tsx, sha256: 54b42fbccdd0cbd28938aa2e146434055412826c87308c1bd857966b32faecb1 }
---

# T-0062: Promote the prototype: the marker, delete dialogs, relink, Delete day; Settings-only sidebar footer

**Tier reason:** Promote + twins (D5); hooks spelled out

Work from the brief: `node scripts/pm4.mjs brief T-0062`. Verify with `node scripts/pm4.mjs check T-0062`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- Regenerated `web/lib/api/schema.d.ts` (`npm run api:types`): the workdays path has `delete` (API-WD-004), no restore paths.
- Promoted the three P rows (deleted-marker, day-menu, delete-day-dialog): already identical to the prototype, nothing changed.
- Twins (D5): the 15 "Replaced by the twin" files copied from `proto/` with the `@/proto/` import rewrite, then prettier. `pm4 twins`: 64 equal.
- `features/time/api.ts` and `proto/features/time/api.ts`: `useDeleteDay` calls `apiClient.DELETE("/api/v1/workdays/{date}")` without a cast; `proto/features/time/` has no `proposed-types.ts`.
- `routes.ts` and the sidebar match the prototype: the sidebar footer is Settings only; `sidebaritems.test.ts` footer expects `["Settings"]`.
- `lib/api/problem.ts`: `slug` comment examples are `("not-found", "validation", …)`.
- Reviewer: `web/features/time/components/day-view.tsx` and `log-form-dialog.tsx` came from the twins, so their diffs are the prototype's; a jsdom "Not implemented: navigation" message appears in the vitest output of the related suites (source not traced); all suites pass.
- `node scripts/pm4.mjs check T-0062` (PASS T-0062): ac hashes ok (10); scope ok; pending AC-19 (later task, excluded); web lint ok; web format:check ok; web typecheck ok; web test ok; web build ok; web api:types ok; check AC-16 ok; check AC-17 ok; check AC-19 skipped (later task); twins ok (64 equal); manual (owner verifies): AC-7, AC-18.

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | PASS | Promoted twins, real `useDeleteDay`, Settings-only footer, schema regenerated; `pm4 check` PASS |

## Review
**Verdict: approve** (Opus reviewer, 2026-10-15). Twins equal (64), `useDeleteDay` without the cast, no `@/proto/*` import in production code, AC-17 clean. No findings.

Owner still verifies AC-18 (and the Day actions menu and delete dialogs at 360 px, keyboard, dark theme).

Tier feedback: haiku was right.
