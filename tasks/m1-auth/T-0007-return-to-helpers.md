---
id: T-0007
title: Implement the returnTo helpers in web/lib/auth/return-to.ts
milestone: M1
app: web
status: ready
size: S
tier: opus
depends_on: []
feature_spec: specs/06-features/land-app-route-split.md#tasks   # row "T1" of its Tasks table
requirements: [FR-LAND-002, FR-AUTH-001, FR-AUTH-005]
ac_files: []
---

# T-0007: Implement the returnTo helpers in web/lib/auth/return-to.ts

## Goal
Implement `sanitizeReturnTo`, `landingHref`, `signInHref` and `postSignInPath` (`routes.ts` is final from the stub).

## Task
**Feature spec row:** T1. **Tier reason:** Open-redirect validation is security logic, and it's the first instance of `lib/auth/`.

Read: this file → the feature spec (whole) → the files under its *Read first* → the app's `AGENTS.md`.
Change only the files that the spec's *Files* table assigns to T1.

## Acceptance criteria
- [ ] The acceptance tests listed in `ac_files` pass, and are unchanged (hashes match).
- [ ] `AC-1`–`AC-5` pass; lint/typecheck green.
- [ ] Definition of Done satisfied (`specs/05-quality/definition-of-done.md`).

## Blocked by (if status is blocked)
- —

---

## Implementation notes
_Filled in by the implementer: changes, commands run and their real results, follow-ups._

### Attempts
| # | Tier | Result (`done` / `BLOCKED` / `FAILED`) | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by `review-task`: verdict and findings._
