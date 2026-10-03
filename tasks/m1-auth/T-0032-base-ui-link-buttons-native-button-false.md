---
id: T-0032
title: Render links styled as buttons as a plain Link with buttonVariants
milestone: M1
app: web
status: done
size: S
tier: haiku
depends_on: []
feature_spec: —     # quick lane
files:
  - "web/app/components/shared/landing-cta.tsx"
  - "web/app/not-found.tsx"
  - "web/app/native-button.test.tsx"
specs: [specs/04-web/conventions.md#components-shadcn, specs/06-features/land-app-route-split.md#interfaces]
ac_files: []
---

# T-0032: Render links styled as buttons as a plain Link with buttonVariants

**Tier reason:** haiku. Two small edits and one small test; every line is given below. No decisions.

## Goal
The landing page and the not-found page log no Base UI `nativeButton` warning in the browser console, and their
CTAs stay real links (`role="link"`).

## Change
Base UI's `Button` defaults to `nativeButton: true`. When its `render` prop swaps in a Next.js `<Link>`, it
logs "A component that acts as a button expected a native <button> because the `nativeButton` prop is true…"
(seen in `npm run dev` on `/`, from `LandingCta`). Passing `nativeButton={false}` silences it but adds
`role="button"` to the `<a>` (breaks `landing-cta.ac.test.tsx`). Rule: `specs/04-web/conventions.md`,
*Links styled as buttons*: a plain `<Link>` with `buttonVariants(...)`.

1. `web/app/components/shared/landing-cta.tsx` (`LandingCta`): replace the `Button` with
   `<Link href={href} className={buttonVariants({ variant, size })}>Login</Link>`; `Button` becomes a type-only import.
2. `web/app/not-found.tsx`: `<Link href={routes.landing} className={buttonVariants()}>Go back home</Link>`;
   import `buttonVariants` instead of `Button`.
3. `web/app/native-button.test.tsx` (new, ordinary Vitest + Testing Library test). Mock `next/link` with a plain anchor and
   `next/navigation` exactly like `web/app/links.ac.test.tsx` does. Before each test, spy on `console.error` and
   `console.warn`; restore them after each test. Two tests:
   - render `<LandingCta />`, then expect a `link` named `Login`, and expect neither spy to have been called with an
     argument containing `nativeButton`;
   - the same for `<NotFound />` and the link `Go back home`.

Don't change `components/ui/button.tsx`, the acceptance tests, or any other file. No dependencies.

## Acceptance criteria
- [x] `native-button.test.tsx` passes.
- [x] `landing-cta.ac.test.tsx` and `links.ac.test.tsx` still pass, unchanged.
- [x] Manual (`npm run dev`): open `/` and a missing route such as `/nope`. The browser console shows no `nativeButton` warning.

## Checks
```bash
# No Base UI Button renders a Link
! grep -rn --include=*.tsx 'Button[^>]*render={<Link' web/app web/features web/components 2>/dev/null
```

---

## Implementation notes
Main session (attempt 2): `LandingCta` and `NotFound` render a `<Link>` with `buttonVariants(...)` (same classes as
before, minus Base UI's button props). The test asserts `role="link"` and no `nativeButton` warning.

`pm4 check T-0032`: lint, typecheck, test (31/31), build and checks ok; scope FAIL only for the four spec files below (same change, uncommitted).

Spec correction (main session, same day): the first version of this task and of the web-conventions rule said to pass
`nativeButton={false}`. That was wrong: Base UI then sets `role="button"` on the anchor. The rule and the three feature
specs (`land-app-route-split`, `auth-web-session`, `shell-user-menu`) now say plain `<Link>` + `buttonVariants`; the
user-menu drawer closes a controlled `Sheet` from the link's `onClick` instead of `SheetClose render`.

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | FAILED | Added `nativeButton={false}` as the task said; the links got `role="button"`, `landing-cta.ac.test.tsx` (AC-6/AC-7) failed, and the new test was changed to expect `button`. Root cause: the task/spec, not the tier |
| 2 | main session | DONE | Task and specs corrected; plain `<Link>` + `buttonVariants`; all web tests pass |

## Review
_The owner's review (quick lane), or `review-feature`'s verdict._

Owner (2026-10-03): manual check on `localhost:3000` looks fine.
