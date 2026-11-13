---
id: T-0162
title: Account deletion and the lead picker: api:types, D3 type switch, D1 sign-out target, the four twins
milestone: M1
app: web
status: done
size: S
tier: haiku
depends_on: [T-0161, T-0160]
feature_spec: specs/06-features/acct-web.md
spec_row: T2
ac_files:
  - { path: web/features/auth/use-sign-out.ac.test.tsx, sha256: 6c4ca366acc56c72af1dabf94f1fa34712700c399d26ed0b3975e67a59d3356b }
  - { path: web/features/users/api.ac.test.tsx, sha256: b2baf56bd1a0eeb95093ce15540f8c996ba813674255b2fc58cad79176235d91 }
  - { path: web/features/users/components/delete-account-card.ac.test.tsx, sha256: 597300d553192c2394ace1a7d2e22589f4e8ae7b368f66d6147badc605764296 }
  - { path: web/features/users/components/user-profile.ac.test.tsx, sha256: 4d7074f59fbfa701f3973f4f67151400815f7fdebba5ebae5bac64030dd541bb }
  - { path: web/features/users/components/project-lead-field.ac.test.tsx, sha256: 01a3ca6c473e8e8376d5c3ad67b99d4e1e62a5bc54d3264647e9b6b45b923f85 }
---

# T-0162: Account deletion and the lead picker: api:types, D3 type switch, D1 sign-out target, the four twins

**Tier reason:** Every edit is listed under *Types, hooks and sign-out target*; the rest is the twin copy

Work from the brief: `node scripts/pm4.mjs brief T-0162`. Verify with `node scripts/pm4.mjs check T-0162`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- `web/lib/api/schema.d.ts` regenerated (`npm run api:types`): `UserSummaryDto` has no `email`, `DELETE /api/v1/me` is typed.
- D3: `proto/features/users/proposed-types.ts` removed; `proto/mock/client.ts` uses `createClient<paths>` (no `MockPaths`); `proto/features/users/api.ts` imports `UserSummary` from the schema.
- D1: `useSignOut(to = routes.signIn)` in `features/auth/use-sign-out.ts`; the prototype twin defaults to `routes.landing`, `useDeleteAccount` calls `useSignOut(routes.landing)`.
- Twins (D4) copied with the twin rule (prototype text, `@/proto/` → `@/`, Prettier): `features/users/api.ts`, `components/delete-account-card.tsx` (stub replaced), `components/user-profile.tsx` (card below Sessions), `components/project-lead-field.tsx` (no emails).
- Reviewer: the prototype mock already answers `DELETE /me` with 204 (`proto/mock/client.ts`), so the prototype delete flow works unchanged.

`node scripts/pm4.mjs check T-0162` (2026-11-13):
```
pm4 check T-0162
  ac hashes: ok (5)
  scope: ok
  web lint: ok (17s)
  web format:check: ok (5s)
  web typecheck: ok (3s)
  web test: ok (39s)
  web build: ok (7s)
  web api:types: ok (1s)
  check AC-14: both legal pages are in the export, without a prototype trace (postbuild): ok
  twins: ok (145 equal)

PASS T-0162
```

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | pass | api:types, D3 type switch, D1 sign-out target, four twins; 29 AC tests pass; pm4 check PASS |

## Review
**Verdict: approve** (Opus reviewer, 2026-11-13, feature review of `acct-web` with T-0161; `pm4 check --feature` PASS).

- D1, D3, `useDeleteAccount`, the delete dialog (AC-9 to AC-11), the profile card placement and the lead picker without emails all match the spec. No production import of `@/proto/*`; nothing in production reads `UserSummary.email`.
- Noted, harmless: the sign-out after the delete posts `/auth/logout` with a refresh token that is no longer valid; `lib/auth/session.ts` signs out locally whatever the API answers.
- Minor finding: the `pm4 check` output was paraphrased instead of pasted. Fixed: the real output is now under *Implementation notes*.
- Tier feedback: haiku was right (every edit listed in the spec, first-attempt pass).
