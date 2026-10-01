---
id: T-0008
title: Slash-free URLs, app pages under /app, landing page at the root
milestone: M1
app: web
status: blocked
size: M
tier: sonnet
depends_on: [T-0007]
feature_spec: specs/06-features/land-app-route-split.md#tasks   # row "T2" of its Tasks table
requirements: [FR-LAND-001, FR-AUTH-001, FR-AUTH-004, FR-AUTH-005]
ac_files:
  - { path: web/app/(dashboard-layout)/layout/vertical/sidebar/sidebaritems.ac.test.ts, sha256: 2c5f1ef179d2f59458f8a2d44775fee426e7b28ac621caf5c08cb7a5233cb85a }
  - { path: web/app/links.ac.test.tsx, sha256: 51e82b2352ef462fac3b9a87a5667e40ea6f78496d9426bf619613b6b0e57caf }
---

# T-0008: Slash-free URLs, app pages under /app, landing page at the root

## Goal
Set `trailingSlash: false`; move the app pages under `app/(dashboard-layout)/app/` (detail pages to `app/project/` and `app/task/`) and the landing page to `app/page.tsx` (plain `mv`, delete `app/home/` and the empty old folders), switch every link in *Link targets* to `routes.*`, and update the three TODO comments.

## Task
**Feature spec row:** T2. **Tier reason:** One app, ~19 files, mechanical but spread over the route tree and the shell. More than 3 files rules out haiku.

Read: this file → the feature spec (whole) → the files under its *Read first* → the app's `AGENTS.md`.
Change only the files that the spec's *Files* table assigns to T2.

## Acceptance criteria
- [ ] The acceptance tests listed in `ac_files` pass, and are unchanged (hashes match).
- [ ] `AC-9`, `AC-10`, `AC-11`, `AC-12`, `AC-13`, `AC-14` pass; lint/typecheck/test/build green.
- [ ] Definition of Done satisfied (`specs/05-quality/definition-of-done.md`).

## Blocked by (if status is blocked)
- T-0007 (spec T1)

---

## Implementation notes
_Filled in by the implementer: changes, commands run and their real results, follow-ups._

### Attempts
| # | Tier | Result (`done` / `BLOCKED` / `FAILED`) | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by `review-task`: verdict and findings._
