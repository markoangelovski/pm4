---
id: T-0161
title: Legal pages: promote the three legal components, the two routes, routes.ts, the landing footer twin, the sign-in note
milestone: M1
app: web
status: done
size: S
tier: haiku
depends_on: []
feature_spec: specs/06-features/acct-web.md
spec_row: T1
ac_files:
  - { path: web/app/legal.ac.test.tsx, sha256: 4c00210809c9ee0f09772b23c7ae62610f78940e453e940d02078b568bf9017c }
  - { path: web/app/links.ac.test.tsx, sha256: 1df250960bac70a28e19d8a76802065ba799c6b04b0c4adaabeb87e07e970029 }
  - { path: web/features/landing/components/landing-page.ac.test.tsx, sha256: af1fcacf2c612c13aaff76d6409138d9cf0ea60e0f86e2fe59355b2cf3c0a5a5 }
---

# T-0161: Legal pages: promote the three legal components, the two routes, routes.ts, the landing footer twin, the sign-in note

**Tier reason:** Promotion plus one spelled-out paragraph

Work from the brief: `node scripts/pm4.mjs brief T-0161`. Verify with `node scripts/pm4.mjs check T-0161`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- `lib/routes.ts`: `privacy: "/privacy"`, `terms: "/terms"` after `authCallback`.
- `app/privacy/page.tsx`, `app/terms/page.tsx`: twins of the `page.dev.tsx` files, importing from `@/features/legal/components/…`, functions `PrivacyPage` / `TermsPage`. Outside `(dashboard-layout)`.
- `features/legal/components/{legal-page,privacy-policy,terms-of-service}.tsx`: promoted, no delta needed (already import `@/lib/routes`).
- `features/landing/components/landing-page.tsx`: D4 footer twin. Adds `Link` and `routes` imports and the Privacy / Terms list items. Import order matches the prototype so the twin check passes.
- `app/auth/sign-in/page.tsx`: D2 sign-in note after `<SocialButtons />`, copied from the brief.

Check summary (`node scripts/pm4.mjs check T-0161`):
```
pm4 check T-0161
  ac hashes: ok (3)
  scope: ok
  pending ACs (later tasks, excluded): AC-6, AC-7, AC-8, AC-9, AC-10, AC-11, AC-12, AC-13
  web lint: ok (20s)
  web format:check: ok (6s)
  web typecheck: ok (16s)
  web test: ok (44s)
  web build: ok (10s)
  check AC-14: both legal pages are in the export, without a prototype trace (postbuild): ok
  twins: ok (141 equal)
  twins warning: features/users/api.ts
  twins warning: features/users/components/delete-account-card.tsx
  twins warning: features/users/components/project-lead-field.tsx
  twins warning: features/users/components/user-profile.tsx

PASS T-0161
```
The four `features/users` twin warnings are T2+ files, not this change.

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | pass | Promoted legal pages, routes, footer twin, sign-in note. Twin check failed once on import order in landing-page.tsx; fixed. `pm4 check` PASS. |

## Review
**Verdict: approve** (Opus reviewer, 2026-11-13, feature review of `acct-web` with T-0162; `pm4 check --feature` PASS).

- The sign-in note (D2, AC-4) matches the spec word for word. `routes.ts` has `privacy` and `terms`. Both legal pages are static, outside `(dashboard-layout)`, with no AuthGuard, and they are in the export. The legal components and the landing footer are twin-equal.
- No findings for this task.
- Tier feedback: haiku was right (a promotion plus a paragraph the spec spelled out).
