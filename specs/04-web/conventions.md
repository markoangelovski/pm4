---
id: web-conventions
title: Web Conventions
status: approved
owner: Marko Angelovski
last_updated: 2026-10-03
related: [web-static-export, web-template, web-routing, qa-code-style, ADR-0009, ADR-0010, feat-land-app-route-split]
---

# Web Conventions

## Purpose
Coding conventions for `web/`, which extend the template's own conventions.

## Structure (proposed; finalize in T-0002; URL layout per OQ-047)
```
app/
  page.tsx                     # landing page `/` (SCR-003), outside the shell
  (dashboard-layout)/          # authenticated shell (auth guard in layout), wraps only `/app/**`
    layout.tsx  loading.tsx  error.tsx  layout/   # shell internals
    app/                       # the `/app` URL segment
      page.tsx                 #   dashboard `/app` (FR-RPT-*)
      projects/  project/  tasks/  task/  time/  trash/  settings/
  auth/sign-in/  auth/callback/  # outside the shell and outside `/app`
components/ui/                 # shadcn primitives (edit only for global changes)
features/<domain>/             # projects, tasks, time, reports, trash, auth
  api.ts                       #   query-key factory + useQuery/useMutation hooks
  schemas.ts                   #   zod form schemas
  components/                  #   domain components
lib/api/                       # openapi-fetch client, schema.d.ts (generated), token handling, error mapping
lib/routes.ts                  # every internal route path (no hard-coded path literals elsewhere)
lib/auth/return-to.ts          # `returnTo` validation and the landing / sign-in / post-sign-in hrefs
lib/time/                      # time-zone-aware helpers: today(), monthRange(), formatDuration(), parseDuration()
lib/utils.ts
```

## Components (shadcn)
- The UI is built from shadcn components. Use an existing shadcn primitive or block before writing a custom component.
- **Custom components are allowed** only when no suitable shadcn component exists, or the one that fits is
  paid (behind a paywall). Build them in `features/<domain>/components/` (or `components/` if shared) from
  installed shadcn primitives and theme tokens, and note in the task's *Implementation notes* why a custom one was needed.
- **Always install shadcn components with the CLI**, from `web/`: `npx shadcn@latest add <name> [<name>…]`.
  This covers primitives (`button`, `dialog`, `form`…) and blocks (`dashboard-01`, `sidebar-07`, `login-03`…).
  The CLI reads `components.json` (the template's `base-nova` style on Base UI) and installs the dependencies with npm.
- Never hand-write shadcn component source, or copy it from the docs, the legacy app or a paid source, into `components/ui/`.
  If the CLI fails, stop and report the error. Don't recreate the component by hand.
- Use `npx shadcn@latest view <name>` or `add --dry-run` to inspect a component before installing it.
  Don't overwrite a customized file in `components/ui/` without asking.
- Compose domain components in `features/<domain>/components/` from the installed primitives.
- **Links styled as buttons.** Never render a link through a Base UI part built on `useButton` (`Button`,
  every `*Close` and `*Trigger`, e.g. `SheetClose`) via its `render` prop. With `nativeButton` left at `true`,
  Base UI logs a console warning; with `nativeButton={false}` it adds `role="button"`, so the link stops being a
  link for assistive technology. Use a plain Next.js `<Link>` styled with the button classes instead:
  `<Link href={routes.landing} className={buttonVariants({ variant, size })}>…</Link>`. A link that must also
  close an overlay (e.g. a drawer) makes the overlay controlled and closes it in the link's `onClick`.
  Parts that don't render a `<button>` by default (`DropdownMenuItem`/`Menu.Item`) may keep `render={<Link … />}`.
  Never use `asChild` (Radix, not Base UI).

## Data layer (ADR-0009)
- Components never call `fetch` or the client directly. They use hooks from `features/<domain>/api.ts`.
- Query keys come from a factory (`projectKeys.all/list(params)/detail(id)`). Mutations invalidate the
  precise keys they affect (e.g. creating a log invalidates that day's logs, the linked task/project details, and reports).
- Optimistic updates for task status changes and log edits, with rollback on error.
- Defaults: `staleTime` 30 s, `retry` 1 for idempotent queries, no retry for mutations. `refetchOnWindowFocus` stays on.
- `lib/api` attaches the access token (not to the public endpoints). On a 401 it runs a single shared
  refresh, then retries once. If the refresh is **rejected** (`401`/`400`), it signs out (removes the stored
  refresh token), then replaces the URL with
  `landingHref(window.location.pathname + window.location.search)`, i.e. `/?returnTo=<current path+query>`
  (OQ-049, routing.md). Only a user-initiated sign-out goes to `/auth/sign-in`. A refresh that can't reach
  the API keeps the session (OQ-067).

## Forms (ADR-0009)
- react-hook-form + zod via `zodResolver`, using the template's shadcn form/field components.
- Client rules mirror the API limits (from data-model.md). The API is authoritative, and Problem
  Details `errors[]` are mapped to fields with `setError`.
- Submit buttons show a pending state and prevent double submission.

## Time and dates
- Always use `lib/time`, with the user's time zone from the profile (FR-AUTH-006). Never
  `new Date().toISOString().split("T")[0]` (UTC date: the legacy bug).
- Work dates are handled as `YYYY-MM-DD` strings end to end. Durations are integer minutes internally
  and formatted for display in one place.

## UI rules
- Data-driven components are client components. Keep `"use client"` boundaries low.
- Loading (template skeletons), empty and error states for every data view.
- `cn()` for classes, theme tokens from `globals.css`, lucide icons. It must work in light and dark mode.
- URL state (filters, date ranges, selected projects, day view date) through nuqs.

## Open questions
—

## Changelog
- 2026-09-26: Initial scaffold.
- 2026-09-26: Updated with owner answers to OQ-001–018.
- 2026-09-27: ADR-0009 accepted.
- 2026-09-27: shadcn components are always installed with the shadcn CLI. Custom components only when none exists or it is paid.
- 2026-09-27: Approved by the owner.
- 2026-09-29: OQ-047: structure updated for the landing page at `/` and the app under `/app/`
  (`(dashboard-layout)/app/`); added `lib/routes.ts` and `lib/auth/return-to.ts`. The refresh-failure
  redirect target is TBD (OQ-049). Back to `review` (feat-land-app-route-split).
- 2026-09-29: OQ-049 resolved: a failed refresh clears the stored token and goes to `/?returnTo=<current path+query>`.
- 2026-09-29: Approved by the owner.
- 2026-10-01: OQ-050: no trailing slashes (`trailingSlash: false`); detail routes `/app/project?id=` and `/app/task?id=`. Back to `review` (feat-land-app-route-split).
- 2026-10-01: Approved by the owner.
- 2026-10-02: Public endpoints get no token; only a rejected refresh signs out (OQ-067). Back to `review` (feat-auth-web-session).
- 2026-10-03: Approved by the owner.
- 2026-10-03: Links styled as buttons are a plain `<Link>` with `buttonVariants(...)`, never a Base UI button part's `render` (dev console warning on the landing page; `nativeButton={false}` would give the link `role="button"`; T-0032).
