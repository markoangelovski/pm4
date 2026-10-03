---
id: T-0019
title: Auth guard, sign-in, callback, landing "Go to app" and sign-out
milestone: M1
app: web
status: done
size: M
tier: sonnet
depends_on: [T-0018]
feature_spec: specs/06-features/auth-web-session.md
spec_row: T2
ac_files:
  - { path: web/app/components/shared/landing-cta.ac.test.tsx, sha256: 58e13c5091dce9f5e5d151e709ba75515e48fa20b9b3c3aa7eb32aad9bb79304 }
  - { path: web/features/auth/components/auth-guard.ac.test.tsx, sha256: 340d08270f3852acfd14e6a395d20769e64ae470d81a09bd661b690e218fd3fc }
  - { path: web/features/auth/components/auth-callback.ac.test.tsx, sha256: 49e10db264fcc28792568fbd780e5d34cfbf36cd845ec92f765407155f3f1589 }
  - { path: web/features/auth/components/sign-in-state.ac.test.tsx, sha256: 42de0f2e10f7ac166725fce83e22c617f262df0f1f56906ca9c6162a7442250b }
  - { path: web/app/auth/authforms/social-buttons.ac.test.tsx, sha256: 73598ade52f806e7a70be8aef1dd2992ace08d2cd8021b9f3eb1850d2c408065 }
  - { path: web/features/auth/use-sign-out.ac.test.tsx, sha256: 3dbf4acef1b37f56adc84da99d831edf742459dd2f66721f7cc8fc375f050eb2 }
---

# T-0019: Auth guard, sign-in, callback, landing "Go to app" and sign-out

**Tier reason:** Composes T1's functions into components over ~8 files; every behavior and string is given

Work from the brief: `node scripts/pm4.mjs brief T-0019`. Verify with `node scripts/pm4.mjs check T-0019`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- `features/auth/components/`: `AuthGuard`, `AuthCallback`, `SignInState`; `features/auth/use-sign-out.ts`.
  Wired into `app/(dashboard-layout)/layout.tsx`, `app/auth/callback/page.tsx`, `app/auth/sign-in/page.tsx`,
  `app/auth/authforms/social-buttons.tsx`, `app/components/shared/landing-cta.tsx` and the header
  `layout/shared/header/profile.tsx` (sign-out).
- `AuthCallback` relies on `exchangeLoginCode`'s per-code map (T-0018) for the Strict Mode dedupe, plus a
  `cancelled` flag in the effect. A failed exchange stores nothing and clears nothing.
- `AuthGuard` re-runs its check when `state` goes back to `checking` on Retry. Errors other than
  `SessionUnavailableError` are rethrown inside the promise rejection handler, so they surface as an
  unhandled rejection, not via an error boundary. Reviewer: confirm this is acceptable.
- AC-17 test fix (by the test writer, owner-approved): scenario 4 now clears localStorage and calls
  `resetSessionForTests()` first. Before, scenario 1's stored `R1` leaked into it, so the `toBeNull`
  assertion required the callback to delete a stored token on failure, which the spec doesn't ask for.
  Re-hashed with `pm4 hash`.

`pm4 check T-0019`:
```
  ac hashes: ok (6)
  scope: ok
  web lint: ok (4s)
  web typecheck: ok (2s)
  web test: ok (4s)
  web build: ok (7s)
  web api:types: ok (1s)
  manual (owner verifies): AC-23

PASS T-0019
```

Review fix (attempt 2): `pm4 check T-0019`: lint, typecheck, test, build, api:types all ok; scope FAIL only for the added ordinary test `web/features/auth/components/auth-guard.test.tsx` plus `specs/06-features/auth-web-session.md` and `web/AGENTS.md` (edited by the main session, not by me).

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | sonnet | BLOCKED: test | Implementation complete; AC-17 failed only because the test leaked scenario 1's token into scenario 4. Test fixed by the test writer; the unchanged implementation then passed `pm4 check` |
| 2 | sonnet | done | Review fix (finding 4): `AuthGuard` keeps unexpected errors in state and throws them during render, so the error boundary shows them; added ordinary test `auth-guard.test.tsx`. SessionUnavailableError path unchanged |

## Review
_Filled in by `review-feature`._

**Verdict: approve** (Opus reviewer, feat-auth-web-session; `pm4 check --feature` PASS). Minor findings:

4. `AuthGuard` rethrows unexpected errors inside a promise handler (`auth-guard.tsx:44-51`): unhandled
   rejection, spinner forever, no error boundary. Nearly unreachable today (only a throwing
   `navigator.locks.request`). Cheap fix: keep the error in state and `throw` it during render. Nit: a
   rejected refresh during `checking` clears the cache and redirects twice (harmless, idempotent).
5. `web/AGENTS.md` is stale: the `TODO(M1): auth guard` line and the structure list lack
   `lib/auth/token-store.ts`, `lib/auth/session.ts`, `features/auth/`. Main session updates it.

The AC-17 test change was judged legitimate: it isolates scenario 4 and makes the assertion stronger.

Tier feedback: sonnet was right; its one stop was a test defect, not a tier problem.

After the review fixes (findings 2 and 4 fixed, 1, 3 and 5 in the docs): `pm4 check --feature` PASS (scope ok).
AC-23 (manual): verified by the owner on localhost, 2026-10-03.
