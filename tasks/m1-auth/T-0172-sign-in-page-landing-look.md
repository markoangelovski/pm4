---
id: T-0172
title: "Sign-in page in the landing page's look: promote SignInPage and GoogleButton, rewire the page and SocialButtons"
milestone: M1
app: web
status: done
size: S
tier: haiku
written_by: claude-code/claude-opus-5-5
implementer: claude-code/claude-opus-5-5
depends_on: []
feature_spec: —
files:
  - web/features/auth/components/sign-in-page.tsx
  - web/features/auth/components/google-button.tsx
  - web/app/auth/sign-in/page.tsx
  - web/app/auth/authforms/social-buttons.tsx
  - web/proto/features/auth/components/sign-in-page.tsx
  - specs/04-web/screens.md
  - specs/04-web/prototype.md
  - web/app/links.ac.test.tsx
specs: [specs/04-web/screens.md#scr-001]
ac_files:
  - { path: web/app/links.ac.test.tsx, sha256: a4388678b52033eb521eebf3884f60c228af40c8c4e9bd4722579eea44e27a8b }
---

# T-0172: Sign-in page in the landing page's look

**Lane:** quick, by the owner's decision (2026-11-21), although it touches 4 web files: the look changes, not
the behavior. SCR-001's behavior is unchanged, and two of the files are copies of confirmed prototype twins
(prototype `39be2bd`).
**Tier reason:** two file copies with a fixed import rewrite, and two small rewires whose code is written out below.

The main session already made the spec and prototype edits in `files:` (`screens.md` SCR-001, `prototype.md`, and
the prototype logo's `aria-label="PM4"`, which the existing AC-10 in `app/links.ac.test.tsx` needs). Don't touch them.

## Goal
`/auth/sign-in` looks like the prototype at `/proto/auth/sign-in`: the landing page's header and footer, the hero
backdrop and heading, one card with the error alert, the Google button and the legal note (SCR-001).

## Change
Run from `web/`.

1. Copy the two prototype components to production and rewrite their `@/proto/` imports (neither file imports
   `@/proto/mock/`):

   ```bash
   for f in sign-in-page google-button; do
     sed 's#@/proto/#@/#g' proto/features/auth/components/$f.tsx > features/auth/components/$f.tsx
   done
   grep -n "@/proto" features/auth/components/sign-in-page.tsx features/auth/components/google-button.tsx
   ```

   The `grep` must print nothing. `sign-in-page.tsx` then imports `@/features/landing/components/landing-theme-toggle`
   and `@/lib/routes`, which exist. Change nothing else in the two copies.

2. Replace `web/app/auth/authforms/social-buttons.tsx` with exactly this (same click behavior, the new button):

   ```tsx
   "use client";

   import { GoogleButton } from "@/features/auth/components/google-button";
   import { RETURN_TO_PARAM } from "@/lib/auth/return-to";
   import { googleSignInUrl } from "@/lib/auth/session";

   /**
    * Google-only sign-in (template-adaptation.md: no password/2FA forms): starts API-AUTH-001 with the page's
    * `returnTo`.
    */
   const SocialButtons = () => (
     <GoogleButton
       onClick={() => {
         window.location.assign(
           googleSignInUrl(
             new URLSearchParams(window.location.search).get(RETURN_TO_PARAM)
           )
         );
       }}
     />
   );

   export default SocialButtons;
   ```

3. Replace `web/app/auth/sign-in/page.tsx` with exactly this:

   ```tsx
   import { Suspense } from "react";
   import type { Metadata } from "next";
   import { SignInPage } from "@/features/auth/components/sign-in-page";
   import { SignInState } from "@/features/auth/components/sign-in-state";
   import SocialButtons from "../authforms/social-buttons";

   export const metadata: Metadata = {
     title: "Sign in"
   };

   /** The sign-in page (SCR-001), outside the app shell. */
   export default function SignInRoute() {
     return (
       <SignInPage
         state={
           <Suspense fallback={null}>
             <SignInState />
           </Suspense>
         }
         button={<SocialButtons />}
       />
     );
   }
   ```

4. Format the four files with Prettier (`npx prettier --write <files>`).

Change nothing else. In particular, leave `sign-in-state.tsx`, the prototype files and every `*.ac.test.tsx` alone.

## Acceptance criteria
- [ ] The existing acceptance tests pass unchanged: `app/links.ac.test.tsx` (AC-10: the sign-in logo link "PM4" →
      `/`; AC-4: the legal note and its Terms and Privacy policy links), `app/auth/authforms/social-buttons.ac.test.tsx`
      (AC-20: Continue with Google starts the API flow with the page's `returnTo`), and
      `features/auth/components/sign-in-state.ac.test.tsx`.
- [ ] `pm4 twins` reports `sign-in-page.tsx` and `google-button.tsx` as equal to their prototype twins.
- [ ] `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` pass.

## Checks
```bash
cd web && grep -q "@/proto" features/auth/components/sign-in-page.tsx features/auth/components/google-button.tsx && { echo "promoted file imports @/proto"; exit 1; } || true
```

---

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- Copied `sign-in-page.tsx` and `google-button.tsx` from the prototype with `@/proto/` → `@/` (grep clean). Rewired `social-buttons.tsx` and `sign-in/page.tsx` exactly as written in the brief. Prettier applied.
- `app/links.ac.test.tsx` AC-4 fails: `getByRole("link", { name: "Terms" })` finds two links, because the promoted landing footer (SCR-001's header and footer) also has a "Terms" link (`/terms`) besides the legal note's "Terms". Both are required by the spec, so the test can't pass unchanged. Not worked around. `pm4 check` not run because the task is blocked.
- Main session, owner's decision (2026-11-21): AC-4 now looks up the Terms and Privacy policy links inside the note paragraph (`within(note)`), since the footer links them too. Same assertions, no other test changed. T-0161's recorded hash of this file is now historical.
- `pm4 check T-0172`: PASS — ac hashes ok (1), scope ok, web lint / format:check / typecheck / test / build ok, checks ok, twins ok (160 equal).

### Attempts
| # | Agent | Result | Summary |
| --- | --- | --- | --- |
| 1 | claude-code/claude-haiku-5-5 | BLOCKED: test | Promoted and rewired all four files; AC-4 found two "Terms" links (note + footer) |
| 2 | claude-code/claude-opus-5-5 | DONE | AC-4 scoped to the legal note (owner's choice); no change to the implementation |

## Review
_The owner's review (quick lane), or `review-feature`'s verdict._
