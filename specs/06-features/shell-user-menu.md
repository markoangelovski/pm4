---
id: feat-shell-user-menu
title: User drawer and profile page
status: approved
owner: Marko Angelovski
last_updated: 2026-10-03
milestone: M1
requirements: [SCR-005, SCR-051, FR-AUTH-004, FR-AUTH-006, FR-AUTH-007, API-USR-001, API-AUTH-006]
related: [web-screens, web-routing, req-auth, web-conventions, feat-auth-api-session, feat-auth-web-session, ADR-0009, OQ-057, OQ-058, OQ-071, OQ-072, OQ-073, OQ-074]
---

# User drawer and profile page

## Goal
The header avatar shows the signed-in user's Google photo and opens a drawer like the template's
profile sheet (`app/(dashboard-layout)/layout/shared/header/profile.tsx` in the template zip): avatar,
name, email, Home and Profile links, and Sign out. The new page `/app/user-profile` shows the Google
identity and offers "Sign out of all devices". Behavior: SCR-005 and SCR-051 in
[screens.md](../04-web/screens.md), FR-AUTH-006/007 in [auth.md](../01-requirements/auth.md), routes in
[routing.md](../04-web/routing.md#route-map). Data: API-USR-001 and API-AUTH-006 (feat-auth-api-session).

## Decisions
| # | Decision | Source |
| --- | --- | --- |
| D1 | The drawer replaces the header dropdown; links Home (`/app`) and Profile (`/app/user-profile`), then Sign out. | OQ-057, OQ-074 (owner, 2026-10-02/03) |
| D2 | Profile page: header card, Account section, Sessions section; read-only. Time zone is edited on `/app/settings`. | OQ-058, OQ-071 (owner) |
| D3 | "Sign out of all devices" asks for confirmation, then this device goes to `/auth/sign-in`. | OQ-072 (owner), FR-AUTH-007 |
| D4 | No photo, or it fails to load → up to two initials on the primary colour. | OQ-073 (owner) |
| D5 | The Google photo is loaded with `referrerPolicy="no-referrer"` (Google's image host can refuse hot-linked requests that carry a referrer). | Agent |
| D6 | Domain `users` (matches `API-USR-*`): `features/users/api.ts` holds `useMe` and the first `useMutation` hook, `useSignOutEverywhere`, written out in full below so later mutations copy it. | Agent, web conventions *Data layer* |
| D7 | The drawer keeps the template's markup and classes, minus the promo image and title in its footer. | Agent: OQ-057 lists only a separator and Sign out |
| D8 | "Member since" = `createdAt` formatted `d MMMM yyyy` in the profile time zone (new `formatDate` in `lib/time`). | Agent: conventions *Time and dates* |
| D9 | `/me` failure: the drawer shows "Couldn't load your profile." instead of name and email (links and Sign out still work); the page shows the same text with **Retry** (`refetch`). Loading: skeletons. | Agent: conventions *UI rules* (every data view has loading and error states) |

## Scope
**In:** `features/users/` (API hooks, `UserAvatar`, `UserProfile`); the drawer in `profile.tsx`;
the `/app/user-profile` page; `routes.app.userProfile`; `formatDate` in `lib/time`.

**Before the tests are written:** feat-auth-web-session is done (this feature uses `apiClient` with the
token, `useSignOut`, and the regenerated `schema.d.ts`).

**Non-goals** (implementers must not touch these):
- `api/`, `lib/api/*`, `lib/auth/*`, `features/auth/*` (reuse `useSignOut` as it is).
- The settings page and the time-zone setting (`PATCH /me`, OQ-064). The sidebar and its footer.
- `web/components/ui/*`: `sheet`, `avatar`, `alert-dialog`, `card`, `skeleton`, `separator` are installed.
- The header's other buttons (`header/index.tsx`), the theme toggle.

## Read first
| Path | Why / copy this |
| --- | --- |
| `specs/04-web/screens.md` (SCR-005, SCR-051) | Screen behavior |
| `specs/03-api/endpoints.md#api-usr-001-current-user`, `#api-auth-006-sign-out-of-all-devices` | Contract |
| `web/features/system/api.ts` | Query-key factory + hook shape |
| `web/features/auth/use-sign-out.ts` | Sign-out after "everywhere" |
| `web/app/(dashboard-layout)/layout/shared/header/profile.tsx` | The file the drawer replaces |
| `web/components/ui/sheet.tsx`, `web/components/ui/avatar.tsx`, `web/components/ui/alert-dialog.tsx` | Base UI primitives (`render` prop, not `asChild`) |
| `web/lib/time/index.ts` | `TZDate` + `format` pattern |
| `web/lib/routes.ts` | Paths |

## Files
| App | File | C/M | Task | Notes |
| --- | --- | --- | --- | --- |
| web | `web/features/users/api.ac.test.tsx` | C | tests | Acceptance tests |
| web | `web/features/users/components/user-avatar.ac.test.tsx` | C | tests | Acceptance tests |
| web | `web/app/(dashboard-layout)/layout/shared/header/profile.ac.test.tsx` | C | tests | Acceptance tests |
| web | `web/features/users/components/user-profile.ac.test.tsx` | C | tests | Acceptance tests |
| web | `web/lib/time/format-date.ac.test.ts` | C | tests | Acceptance tests |
| web | `web/features/users/api.ts` | C | T1 | Stub from the test writer (`userKeys` real) |
| web | `web/features/users/components/user-avatar.tsx` | C | T1 | Stub from the test writer |
| web | `web/app/(dashboard-layout)/layout/shared/header/profile.tsx` | M | T1 | The drawer |
| web | `web/lib/routes.ts` | M | tests | The test writer adds `userProfile` (tests import it) |
| web | `web/features/users/components/user-profile.tsx` | C | T2 | Stub from the test writer |
| web | `web/app/(dashboard-layout)/app/user-profile/page.tsx` | C | T2 | The route |
| web | `web/lib/time/index.ts` | M | T2 | `formatDate`; the test writer adds its stub |

## Interfaces

### Routes (tests)
`web/lib/routes.ts`: add `userProfile: "/app/user-profile"` to `routes.app` (after `settings`).

### Data (T1)
```ts
// web/features/users/api.ts
import { useMutation, useQuery, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { useSignOut } from "@/features/auth/use-sign-out";

export type Me = components["schemas"]["MeResponseDto"];

export const userKeys = {
  all: ["users"] as const,
  me: () => [...userKeys.all, "me"] as const,
};

/** API-USR-001. App defaults (staleTime 30 s, retry 1). */
export function useMe(): UseQueryResult<Me> {
  return useQuery({
    queryKey: userKeys.me(),
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.GET("/api/v1/me", { signal });
      if (!data) throw new Error("GET /api/v1/me failed");
      return data;
    },
  });
}

/** API-AUTH-006, then the local sign-out (FR-AUTH-007: this device → /auth/sign-in). No retry (mutation default). */
export function useSignOutEverywhere(): UseMutationResult<void, Error, void> {
  const signOut = useSignOut();
  return useMutation({
    mutationFn: async () => {
      const { response } = await apiClient.POST("/api/v1/auth/logout-all");
      if (response.status !== 204) throw new Error("POST /api/v1/auth/logout-all failed");
    },
    onSuccess: () => signOut(),
  });
}
```

### Avatar (T1)
```tsx
// web/features/users/components/user-avatar.tsx ("use client")
/** "Marko Angelovski" → "MA", "cher" → "C", "  " → "". First letters of the first two words, uppercased. */
export function userInitials(name: string): string;

export function UserAvatar(props: {
  user: Pick<Me, "displayName" | "avatarUrl"> | undefined; // undefined while loading
  className?: string;                                     // size, e.g. "h-8 w-8" / "h-16 w-16" / "h-20 w-20"
}): React.JSX.Element;
```
`<Avatar className={className}>`; with `avatarUrl`: `<AvatarImage src={avatarUrl} alt="" referrerPolicy="no-referrer" />`;
always `<AvatarFallback className="bg-primary text-primary-foreground">{user ? userInitials(user.displayName) : ""}</AvatarFallback>`
(Base UI shows the fallback when there's no image or it fails to load).

### Drawer (T1)
`profile.tsx` (`"use client"`, default export `ProfileMenu` → rename to `ProfileSheet`; the header import is a
default import, so `header/index.tsx` doesn't change). Copy the template's markup and classes, with:
- `SheetTrigger` (`aria-label="Open user menu"`, the template's classes) → `<UserAvatar user={me} className="h-8 w-8" />`.
- `SheetContent side="right" showCloseButton={false} className="border-s-0 w-full sm:max-w-80 max-w-60"`, a
  `<SheetTitle className="sr-only">User menu</SheetTitle>`, and the template's `SheetClose` X button with `aria-label="Close"`.
- Top: `<UserAvatar className="h-16 w-16" />`, the name in the template's `h6`, the email row with lucide `Mail` (size 18).
  Loading: `Skeleton`s (`h-6 w-32`, `h-4 w-40`) instead of name and email. Error: `<p className="text-sm text-muted-foreground">Couldn't load your profile.</p>`.
- Menu (the template's `border-t border-dashed` list and link classes): `House` **Home** → `routes.app.dashboard`,
  `User` **Profile** → `routes.app.userProfile`; each link is `<SheetClose render={<Link href={…} className={…} />}>`, so it closes the drawer.
- `SheetFooter className="px-0 pb-6"` → `div.border-t.border-dashed.border-border.w-full` → `div.pt-6.flex.justify-center` →
  `<Button variant="secondary" className="text-primary" onClick={() => void signOut()}><LogOut /> Sign out</Button>` (`signOut = useSignOut()`).
  No image, no promo text.

### Profile page (T2)
```ts
// web/lib/time/index.ts
/** An ISO instant as a calendar date in `tz`: formatDate("2026-10-02T22:30:00.000Z", "Europe/Zagreb") → "3 October 2026". */
export function formatDate(iso: string, tz: string): string; // format(new TZDate(iso, tz), "d MMMM yyyy")
```
```tsx
// web/app/(dashboard-layout)/app/user-profile/page.tsx: metadata { title: "Profile" }, renders <UserProfile />
// web/features/users/components/user-profile.tsx ("use client")
export function UserProfile(): React.JSX.Element;
```
Layout: `<div className="flex flex-col gap-6">` with three `Card`s (`p-6`):
1. Header: `flex flex-col sm:flex-row items-center gap-6`: `<UserAvatar className="h-20 w-20" />`, `<h1 className="text-xl font-semibold">{displayName}</h1>`, the email in `text-sm text-muted-foreground`.
2. `<h2 className="text-base font-semibold">Account</h2>`, then `grid grid-cols-1 sm:grid-cols-2 gap-4` of label
   (`text-xs text-muted-foreground`) / value pairs, in this order: **Name** · **Email** · **Signed in with** → `Google` ·
   **Member since** → `formatDate(createdAt, timeZone)` · **Time zone** → `{timeZone}` and
   `<Link href={routes.app.settings} className="text-sm text-primary hover:underline">Change in Settings</Link>`.
3. `<h2>Sessions</h2>`, `<p className="text-sm text-muted-foreground">Sign out of PM4 on every device, including this one.</p>`,
   and an `AlertDialog`: trigger `<Button variant="outline">Sign out of all devices</Button>`; title
   **Sign out of all devices?**; description **You'll be signed out here and on every other device within 15 minutes.**;
   `AlertDialogCancel` **Cancel**; action `<Button variant="destructive" disabled={isPending} onClick={() => mutate()}>Sign out everywhere</Button>`
   (a plain button, so the dialog stays open while pending). On error, inside the dialog:
   `<p role="alert" className="text-sm text-destructive">Couldn't sign out of all devices. Please try again.</p>`.

States: loading → `Skeleton`s in place of the three cards' text; error → "Couldn't load your profile." and `<Button variant="outline" onClick={() => refetch()}>Retry</Button>`.

## Acceptance criteria
| AC | Case → expected | Test | Task |
| --- | --- | --- | --- |
| AC-1 | `useMe`: `apiClient.GET("/api/v1/me", …)` resolving `{ data: me }` → `data` equals `me`; key `["users", "me"]`; `{ error }` → error state | `web/features/users/api.ac.test.tsx` | T1 |
| AC-2 | `useSignOutEverywhere().mutate()`: `POST "/api/v1/auth/logout-all"` → `204` → the `useSignOut` function is called once; `500` → error state, sign-out not called, no retry | `web/features/users/api.ac.test.tsx` | T1 |
| AC-3 | `userInitials`: `"Marko Angelovski"` → `"MA"`; `"ana maria lopez"` → `"AM"`; `"cher"` → `"C"`; `"  "` → `""` | `web/features/users/components/user-avatar.ac.test.tsx` | T1 |
| AC-4 | `UserAvatar` with `avatarUrl` → an `img` with that `src` and `referrerpolicy="no-referrer"` (once loaded; jsdom: dispatch `load`); `avatarUrl: null` → initials text, no `img`; `user` undefined → no text | `web/features/users/components/user-avatar.ac.test.tsx` | T1 |
| AC-5 | Drawer: the trigger button `Open user menu` shows the initials; clicking it opens a dialog `User menu` with the name, the email, links **Home** → `/app` and **Profile** → `/app/user-profile`, and a **Sign out** button | `web/app/(dashboard-layout)/layout/shared/header/profile.ac.test.tsx` | T1 |
| AC-6 | Drawer: **Sign out** → the `useSignOut` function called once; clicking **Profile** closes the drawer | `web/app/(dashboard-layout)/layout/shared/header/profile.ac.test.tsx` | T1 |
| AC-7 | Drawer while `/me` loads → no name or email text; on error → "Couldn't load your profile.", links and Sign out still present | `web/app/(dashboard-layout)/layout/shared/header/profile.ac.test.tsx` | T1 |
| AC-8 | `formatDate("2026-10-02T22:30:00.000Z", "Europe/Zagreb")` → `"3 October 2026"`; same instant in `"UTC"` → `"2 October 2026"` | `web/lib/time/format-date.ac.test.ts` | T2 |
| AC-9 | `UserProfile` with `me` (zone `Europe/Zagreb`): heading = name; shows the email, `Google`, the formatted member-since date and the zone; **Change in Settings** → `/app/settings`; no text box or Edit button | `web/features/users/components/user-profile.ac.test.tsx` | T2 |
| AC-10 | **Sign out of all devices** → dialog with the OQ-072 title and text; **Cancel** closes it without a request; **Sign out everywhere** → `mutate` called once, the button is disabled while pending; mutation error → the `role="alert"` text, dialog still open | `web/features/users/components/user-profile.ac.test.tsx` | T2 |
| AC-11 | `UserProfile` loading → no name text; error → "Couldn't load your profile." and **Retry** calls `refetch` | `web/features/users/components/user-profile.ac.test.tsx` | T2 |
| AC-12 | The build exports the route | `check` | T2 |
| AC-13 | Signed in locally: the header avatar shows the Google photo; the drawer slides in from the right with photo, name, email, Home, Profile and Sign out; Profile opens the page; Sign out everywhere on one browser signs out a second browser within 15 min; light and dark themes legible; a narrow screen still works | `manual` | T2 |

Typed stubs (created with the tests, so lint and typecheck pass while the tests fail):
- `features/users/api.ts` (`userKeys` and `Me` real), `user-avatar.tsx`, `user-profile.tsx`, and `formatDate` in
  `lib/time/index.ts`: the signatures from *Interfaces*, each body `throw new Error("not implemented (feat-shell-user-menu)")`.

## Checks
```bash
# AC-12: the profile page is exported
test -f web/out/app/user-profile.html
```

## Tasks
| # | Task | App | Size | Tier | Why this tier | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | User drawer: `useMe`, `useSignOutEverywhere`, `UserAvatar` and the header drawer | web | M | sonnet | Composes installed primitives and the existing hook shape; the first mutation hook is written out in full | — |
| T2 | Profile page `/app/user-profile` with sign out of all devices | web | S | sonnet | One page from primitives plus a date helper; every string and state given; uses T1's hooks | T1 |

## Open questions
None. OQ-057, OQ-058 and OQ-071…OQ-074 are resolved.

## Changelog
- 2026-10-03: Initial draft (OQ-057, OQ-058, OQ-071…OQ-074).
- 2026-10-03: Approved by the owner.
