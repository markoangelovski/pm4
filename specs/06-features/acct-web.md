---
id: feat-acct-web
title: "Legal pages, account deletion and no emails in the lead picker (web)"
status: approved
owner: Marko Angelovski
last_updated: 2026-11-13
milestone: M1
requirements: [FR-LEGAL-001, FR-LEGAL-002, FR-LEGAL-003, FR-AUTH-008, FR-PRJ-006, SCR-001, SCR-003, SCR-051, SCR-080, SCR-081]
related: [req-legal, req-auth, web-screens, web-prototype, feat-acct-api, OQ-276, OQ-277, OQ-278]
prototype: 6347b90
---

# Legal pages, account deletion and no emails in the lead picker (web)

## Goal
Anyone can read the privacy policy at `/privacy` (SCR-080, FR-LEGAL-001) and the terms at `/terms` (SCR-081, FR-LEGAL-002),
linked from the landing footer and the sign-in screen (FR-LEGAL-003). A signed-in user can delete their account from the profile
(SCR-051, FR-AUTH-008) and lands on `/`. The lead picker shows names and pictures only (OQ-277). The UI is prototype `6347b90`;
this spec lists only the delta. The API half is feat-acct-api.

## Decisions
| # | Decision | Source |
| --- | --- | --- |
| D1 | Account deletion ends on the landing page `/`, not on sign-in as FR-AUTH-007's sign-out does. `useSignOut` takes the target: `useSignOut(to = routes.signIn)`; `useDeleteAccount` calls `useSignOut(routes.landing)`. No sibling hook: the cleanup (tokens, query cache, last log link) stays in one place. | Owner (delete → `/`) · Agent (the parameter) |
| D2 | The sign-in legal note (FR-LEGAL-003) isn't in the prototype; it is specified in words here (*Sign-in note*). | Owner, 2026-11-13 |
| D3 | `proto/features/users/proposed-types.ts` is deleted once `schema.d.ts` has API-USR-003/004 from feat-acct-api: both `users/api.ts` twins go back to `UserSummary = components["schemas"]["UserSummaryDto"]`, and the mock client drops `MockPaths` (`createClient<paths>`). | prototype.md (*Mock data layer*), as feat-int-web D1 |
| D4 | Existing production files take their prototype change by the twin copy: `sed -e 's#@/proto/mock/client#@/lib/api/client#' -e 's#@/proto/#@/#g' web/proto/<f> > web/<f>`, then Prettier. New files are `P` rows. | As feat-int-web D2 |
| D5 | The legal pages need no API (T1); the deletion and lead picker need feat-acct-api (T2). T1 goes first so its build never prerenders a T2 stub. | Agent |
| D6 | Layout, copy and the dialog's behaviour (list of what's deleted, the email check, toast on failure, dialog locked while pending) are as prototyped. | Owner, prototype `6347b90` |

## Scope
**In:** `/privacy`, `/terms`, their routes, the landing footer links, the sign-in note; Delete account on the profile; the lead
picker without emails; D1; D3; `npm run api:types`.

**Before T2:** feat-acct-api is done (`api/openapi.json` has `DELETE /api/v1/me` and `UserSummaryDto` without `email`).

**Non-goals** (implementers must not touch these):
- `api/`. The legal text, markup or layout of the promoted files (beyond D1 and D3).
- The access-token guard, `lib/auth/**`, `features/auth/components/auth-guard.tsx`.
- The prototype's `mock/` beyond D3. `*.ac.test.ts(x)` files.

## Read first
| Path | Why / copy this |
| --- | --- |
| `web/proto/features/users/api.ts` | The mock hooks; production `features/users/api.ts` is its twin (T2) |
| `web/proto/features/users/proposed-types.ts` | The shapes D3 replaces with the schema (T2) |
| `web/features/auth/use-sign-out.ts`, `web/proto/features/auth/use-sign-out.ts` | D1 (T2) |
| `web/app/proto/privacy/page.dev.tsx`, `web/app/proto/terms/page.dev.tsx` | The pages to copy as `app/privacy/page.tsx`, `app/terms/page.tsx` (T1) |
| `web/app/auth/sign-in/page.tsx` | Where the sign-in note goes (T1) |
| `web/lib/routes.ts`, `web/proto/lib/routes.ts` | `privacy`, `terms` (T1) |

## Files
| App | File | C/M | Task | Notes |
| --- | --- | --- | --- | --- |
| web | `web/app/legal.ac.test.tsx` | C | tests | AC-1…AC-3 |
| web | `web/app/links.ac.test.tsx` | M | tests | AC-4 (sign-in note) |
| web | `web/features/landing/components/landing-page.ac.test.tsx` | M | tests | AC-5 (footer links) |
| web | `web/features/users/api.ac.test.tsx` | M | tests | AC-7, AC-8 |
| web | `web/features/auth/use-sign-out.ac.test.tsx` | M | tests | AC-6 |
| web | `web/features/users/components/delete-account-card.ac.test.tsx` | C | tests | AC-9…AC-11 |
| web | `web/features/users/components/user-profile.ac.test.tsx` | M | tests | Mock `useDeleteAccount` (idle); AC-12 |
| web | `web/features/users/components/project-lead-field.ac.test.tsx` | M | tests | AC-13: fixtures without `email`, options without emails |
| web | `web/app/privacy/page.tsx`, `web/app/terms/page.tsx` | C | tests, T1 | Stubs in the test step; T1 = the `page.dev.tsx` twin with `@/features/…` imports and the function names `PrivacyPage`, `TermsPage` |
| web | `proto/features/legal/components/legal-page.tsx` → `features/legal/components/legal-page.tsx` | P | T1 | |
| web | `proto/features/legal/components/privacy-policy.tsx` → `features/legal/components/privacy-policy.tsx` | P | T1 | |
| web | `proto/features/legal/components/terms-of-service.tsx` → `features/legal/components/terms-of-service.tsx` | P | T1 | |
| web | `web/lib/routes.ts` | M | T1 | `privacy: "/privacy"`, `terms: "/terms"` after `authCallback` |
| web | `web/features/landing/components/landing-page.tsx` | M | T1 | Twin copy (D4) |
| web | `web/app/auth/sign-in/page.tsx` | M | T1 | *Sign-in note* |
| web | `web/lib/api/schema.d.ts` | M | T2 | `npm run api:types` |
| web | `web/proto/features/users/proposed-types.ts` | D | T2 | `rm` (D3) |
| web | `web/proto/features/users/api.ts`, `web/proto/features/auth/use-sign-out.ts`, `web/proto/mock/client.ts` | M | T2 | D1, D3 |
| web | `web/features/users/api.ts` | M | tests, T2 | Stub `useDeleteAccount` in the test step; T2 = the twin copy (D4) |
| web | `web/features/auth/use-sign-out.ts` | M | T2 | D1 |
| web | `proto/features/users/components/delete-account-card.tsx` → `features/users/components/delete-account-card.tsx` | P | tests, T2 | Stub in the test step (`pm4 promote` then skips it: T2 replaces the stub with the twin copy, D4) |
| web | `web/features/users/components/user-profile.tsx`, `web/features/users/components/project-lead-field.tsx` | M | T2 | Twin copy (D4) |

## Interfaces

### Legal pages and links (T1)
- `app/privacy/page.tsx` and `app/terms/page.tsx`: copy the `page.dev.tsx` twins; import from `@/features/legal/components/…`;
  `export default function PrivacyPage()` / `TermsPage()`. Static, outside `(dashboard-layout)` (no AuthGuard, no query).
- `lib/routes.ts` gets `privacy: "/privacy"` and `terms: "/terms"`; the promoted components already use `routes.privacy`, `routes.terms`.
- **Sign-in note** (D2): in `app/auth/sign-in/page.tsx`, directly after `<SocialButtons />`:
  ```tsx
  {/* FR-LEGAL-003, OQ-276 */}
  <p className="text-center text-xs text-muted-foreground">
    By continuing, you agree to the{" "}
    <Link href={routes.terms} className="underline underline-offset-4 hover:text-foreground">Terms</Link>{" "}
    and acknowledge the{" "}
    <Link href={routes.privacy} className="underline underline-offset-4 hover:text-foreground">Privacy policy</Link>.
  </p>
  ```

### Types, hooks and sign-out target (T2)
1. `npm run api:types` (in `web/`). `rm web/proto/features/users/proposed-types.ts`.
2. `proto/features/users/api.ts`: drop the `proposed-types` import; `export type UserSummary = components["schemas"]["UserSummaryDto"];`;
   `useUserSearch(q): UseQueryResult<UserSummary[]>`; in `useDeleteAccount`, `const signOut = useSignOut(routes.landing);` with
   `import { routes } from "@/proto/lib/routes";`, and its doc: "API-USR-004, then the local sign-out to the landing page `/`
   (FR-AUTH-008, D1). No retry (mutation default)."
3. `proto/mock/client.ts`: drop the `DeleteMeOperation`/`UserSummaryDto` import and `MockPaths`; `createClient<paths>`; type
   `OTHER_USERS` and the `users` list as `components["schemas"]["UserSummaryDto"][]` (import `components` with `paths`).
4. Sign-out target (D1):
   ```ts
   // features/auth/use-sign-out.ts
   /** Signs out, clears the query cache and goes to `to`: the sign-in page (FR-AUTH-004, FR-AUTH-007), or `/` after deleting the account (FR-AUTH-008). */
   export function useSignOut(to: string = routes.signIn): () => Promise<void>; // body unchanged except router.replace(to)
   // proto/features/auth/use-sign-out.ts (pm4-twin: differs, keeps its comment): useSignOut(to: string = routes.landing), router.replace(to)
   ```
5. Then the twin copy (D4) of `features/users/api.ts`, `components/delete-account-card.tsx`, `components/user-profile.tsx`,
   `components/project-lead-field.tsx`. `useDeleteAccount` is then:
   `DELETE /api/v1/me` → `204` resolves, anything else throws; `onSuccess: () => signOut()`; invalidates nothing (the sign-out
   clears the whole cache). `npm run typecheck` and `node ../scripts/pm4.mjs twins` must pass.

## Acceptance criteria
| AC | Case → expected | Test | Task |
| --- | --- | --- | --- |
| AC-1 | FR-LEGAL-001: `PrivacyPage` renders the h1 "Privacy policy", a `mailto:pm4@angelovski.top` link, the names Google, Microsoft, Neon, Redis, GitHub and "AZOP", and links to `/terms` and `/` | `web/app/legal.ac.test.tsx` | T1 |
| AC-2 | FR-LEGAL-002: `TermsPage` renders the h1 "Terms of service" and links to `/privacy` and `/` | `web/app/legal.ac.test.tsx` | T1 |
| AC-3 | FR-LEGAL-001: rendering either page makes no request (`fetch` not called) and needs no query client or session | `web/app/legal.ac.test.tsx` | T1 |
| AC-4 | FR-LEGAL-003: the sign-in page shows "By continuing, you agree to the Terms and acknowledge the Privacy policy." with links "Terms" → `/terms` and "Privacy policy" → `/privacy` | `web/app/links.ac.test.tsx` | T1 |
| AC-5 | FR-LEGAL-003: the landing footer links "Privacy" → `/privacy` and "Terms" → `/terms` | `web/features/landing/components/landing-page.ac.test.tsx` | T1 |
| AC-6 | D1: `useSignOut()` still ends on `/auth/sign-in`; `useSignOut("/")` signs out, clears the cache, then `replace("/")` | `web/features/auth/use-sign-out.ac.test.tsx` | T2 |
| AC-7 | FR-AUTH-008: `useDeleteAccount` sends one `DELETE /api/v1/me`; on `204` it calls `lib/auth/session` `signOut`, clears the query cache and `replace("/")` | `web/features/users/api.ac.test.tsx` | T2 |
| AC-8 | A `500` or a `401` answer → the mutation errors, one request (no retry), no sign-out, no navigation | `web/features/users/api.ac.test.tsx` | T2 |
| AC-9 | FR-AUTH-008, OQ-278: the dialog's delete button is disabled until the input equals the user's email; `"  MARKO@Example.com "` enables it, another email doesn't; Cancel clears the input | `web/features/users/components/delete-account-card.ac.test.tsx` | T2 |
| AC-10 | Confirming calls `mutate` once; while pending, the button reads "Deleting…" and Cancel, the input and the button are disabled | `web/features/users/components/delete-account-card.ac.test.tsx` | T2 |
| AC-11 | A failed delete → toast "Couldn't delete your account." and the dialog stays open | `web/features/users/components/delete-account-card.ac.test.tsx` | T2 |
| AC-12 | SCR-051: the profile shows the **Delete account** card below Sessions | `web/features/users/components/user-profile.ac.test.tsx` | T2 |
| AC-13 | OQ-277: feat-prj-web AC-7 updated: searching "an" lists "Ana Horvat", "Ivana Novak", then `Use "an"`; no option text contains an email | `web/features/users/components/project-lead-field.ac.test.tsx` | T2 |
| AC-14 | The build has both pages and no prototype trace | check | T1 |

Typed stubs (created with the tests, so lint and typecheck pass while the tests fail):
- `web/app/privacy/page.tsx`, `web/app/terms/page.tsx`: `export default function PrivacyPage(): React.JSX.Element { throw new Error("not implemented (feat-acct-web)"); }` (and `TermsPage`).
- `web/features/users/api.ts`: `export function useDeleteAccount(): UseMutationResult<void, Error, void>` throwing the same error.
- `web/features/users/components/delete-account-card.tsx`: `export function DeleteAccountCard({ me }: { me: Me | undefined }): React.JSX.Element` throwing the same error.

## Checks
```bash
# AC-14: both legal pages are in the export, without a prototype trace (postbuild)
(cd web && npm run -s build) && test -f web/out/privacy.html && test -f web/out/terms.html
```

## Tasks
| # | Task | App | Size | Tier | Why this tier | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | Legal pages: promote the three legal components, the two routes, `routes.ts`, the landing footer twin, the sign-in note | web | S | haiku | Promotion plus one spelled-out paragraph | — |
| T2 | Account deletion and the lead picker: `api:types`, D3 type switch, D1 sign-out target, the four twins | web | S | haiku | Every edit is listed under *Types, hooks and sign-out target*; the rest is the twin copy | T1, feat-acct-api |

## Open questions
—

## Changelog
- 2026-11-13: Initial draft from prototype `6347b90` (owner: delete → `/`, sign-in note in words).
- 2026-11-13: No open questions: `review`.
- 2026-11-13: Approved by the owner.
