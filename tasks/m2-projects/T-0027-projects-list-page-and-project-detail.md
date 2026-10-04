---
id: T-0027
title: Projects list page and project detail page (stats, delete, restore, not found)
milestone: M2
app: web
status: done
size: M
tier: sonnet
depends_on: [T-0026]
feature_spec: specs/06-features/prj-web.md
spec_row: T3
ac_files:
  - { path: web/features/projects/components/projects-list.ac.test.tsx, sha256: 26adef590b175493e42d97c8bb49e37202c923488c6bf71b0446a1ec17341a8e }
  - { path: web/features/projects/components/project-detail.ac.test.tsx, sha256: 8a811e529e33dd3856ce107a5d4cc10a57ef86a3e68ff2badbf1c442134b7706 }
---

# T-0027: Projects list page and project detail page (stats, delete, restore, not found)

**Tier reason:** Composes T1/T2 and installed primitives; behavior and copy fully stated

Work from the brief: `node scripts/pm4.mjs brief T-0027`. Verify with `node scripts/pm4.mjs check T-0027`.

## Implementation notes
Ported the list, detail, delete dialog, stats and badges to the API hooks (nuqs for URL state). Pagination links pass `role="link"` because Base UI's Button render adds role=button, which the AC-12 test does not accept.
pm4 check summary: all gates ok (lint, format, typecheck, test, build, api:types, AC-16); first run failed only on a staged file deletion (the implementer's `git rm --cached`). After the owner unstaged it, the orchestrator re-ran `pm4 check T-0027`: PASS (ac hashes, scope, lint, format:check, typecheck, test, build, api:types, AC-16 ok; AC-17 manual).

Review fixes (attempt 2): edge-page Previous/Next return early and `page` is clamped to >= 1 for `useProjects`; detail renders the project whenever data exists (error state only without data); search text resyncs from `q` (state adjusted during render, since lint forbids setState in an effect); `useDeleteProject` no longer returns its invalidations. `pm4 check T-0027`: PASS (all gates ok; AC-17 manual).

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | sonnet | done | All ACs pass. A file deletion was staged by mistake; the owner unstaged it, then `pm4 check T-0027` passed |
| 2 | sonnet | done | Review fixes (findings 1-3 and the delete-invalidation ordering); `pm4 check T-0027` PASS |

## Review
**Verdict: approve**, with minor non-blocking findings (Opus review of feat prj-web, 2026-10-04; `pm4 check --feature` PASS; AC-17 manual, owner).
- Accepted: `role="link"` on the pagination links (the shared `pagination.tsx` stays untouched).
- Finding 1 (minor): Previous/Next on the edge pages are only `aria-disabled` + `pointer-events-none`, so Enter on a focused link (or a hand-typed `?page=0`) requests `page=0` → 400 → error state. Fix: early return in both `onClick`s; optionally clamp `page` ≥ 1 (`projects-list.tsx:289-299`, `318-330`).
- Finding 2 (minor): a failed background refetch replaces a loaded project with the error page (`project-detail.tsx:103`). Fix: keep the 404 branches first, then render whenever `project` exists; show the error only without data.
- Finding 3 (minor, optional): the search box isn't resynced when `q` changes from outside (`projects-list.tsx:90`).
- Finding 4 (process): the implementer staged a deletion with `git rm --cached`; the owner unstaged it. The notes were corrected by the orchestrator.
- Finding 5: see T-0025.
- Tier: sonnet was right for the code; the staging slip is agent discipline, not tier.
- **Follow-up (2026-10-04):** findings 1, 2, 3 and 5 fixed at sonnet (Attempts row 2); orchestrator re-ran `pm4 check T-0027`: PASS and checked the finding-3 resync (render-time `prevQ` pattern, skips own URL updates). Nothing staged.
