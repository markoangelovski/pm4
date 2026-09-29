---
id: T-0009
title: Implement LandingCta and use it on the landing page
milestone: M1
app: web
status: blocked
size: S
tier: haiku
depends_on: [T-0007, T-0008]
feature_spec: specs/06-features/land-app-route-split.md#tasks   # row "T3" of its Tasks table
requirements: [FR-LAND-002]
ac_files: []
---

# T-0009: Implement LandingCta and use it on the landing page

## Goal
Implement `LandingCta` / `LandingCtaFallback` and use them in `app/page.tsx`.

## Task
**Feature spec row:** T3. **Tier reason:** 2 files, fully specified in *Interfaces*; copies `view-id-guard.tsx`'s `useSearchParams` + `<Suspense>` pattern. Validation lives in T1's helper.

Read: this file → the feature spec (whole) → the files under its *Read first* → the app's `AGENTS.md`.
Change only the files that the spec's *Files* table assigns to T3.

## Acceptance criteria
- [ ] The acceptance tests listed in `ac_files` pass, and are unchanged (hashes match).
- [ ] `AC-6`–`AC-8` pass, and `AC-11`/`AC-12` still pass; lint/typecheck/test/build green.
- [ ] Definition of Done satisfied (`specs/05-quality/definition-of-done.md`).

## Blocked by (if status is blocked)
- T-0007 (spec T1)
- T-0008 (spec T2)

---

## Implementation notes
_Filled in by the implementer: changes, commands run and their real results, follow-ups._

### Attempts
| # | Tier | Result (`done` / `BLOCKED` / `FAILED`) | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by `review-task`: verdict and findings._
