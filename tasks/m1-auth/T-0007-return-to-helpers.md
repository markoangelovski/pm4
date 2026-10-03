---
id: T-0007
title: Implement the returnTo helpers in web/lib/auth/return-to.ts
milestone: M1
app: web
status: done
size: S
tier: opus
depends_on: []
feature_spec: specs/06-features/land-app-route-split.md#tasks   # row "T1" of its Tasks table
requirements: [FR-LAND-002, FR-AUTH-001, FR-AUTH-005]
ac_files:
  - { path: web/lib/auth/return-to.ac.test.ts, sha256: a11844a19c22d7cf77444cd4106c95043606a1f57e81cf14a3b315c7b2c66a51 }
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
- Implemented `sanitizeReturnTo` (spec steps 1–7 in order, parse origin `https://pm4.invalid`, `/app` check after URL normalization), `landingHref`, `signInHref`, `postSignInPath` in `web/lib/auth/return-to.ts`. Imports `routes`/`APP_PREFIX` from `@/lib/routes` (stub unchanged).
- `npx vitest run lib/auth/return-to.ac.test.ts`: 5/5 passed.
- `node scripts/pm4.mjs check T-0007`:
  ```
  ac hashes: ok (1)
  scope: ok
  pending ACs (later tasks, excluded): AC-6 … AC-15
  web lint: ok · web typecheck: ok · web test: ok · web build: ok
  check AC-11, AC-12, AC-13: skipped (later task)
  PASS T-0007
  ```

### Attempts
| # | Tier | Result (`done` / `BLOCKED` / `FAILED`) | Summary |
| --- | --- | --- | --- |
| 1 | opus | done | Helpers implemented per *Interfaces*; AC-1–AC-5 pass; pm4 check PASS |

## Review
**Verdict: approve** (Opus review, 2026-10-02). `sanitizeReturnTo` follows steps 1–7 in order; the control-character check runs before parsing (the URL parser would strip tab/newline); open-redirect inputs all give `null`. The three wrappers match *Interfaces* exactly. No findings. Tier: opus right (security logic, first `lib/auth/` file); sonnet would likely have managed given the exact spec.

Re-review (Opus, 2026-10-03): **approve** again; hashes re-recorded after the T-0006 reformat match, and the `*.ac.*` changes are formatting only. No findings.
