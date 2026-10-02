---
id: web-template
title: Template Adaptation
status: approved
owner: Marko Angelovski
last_updated: 2026-10-02
related: [ADR-0005, web-static-export, web-conventions, arch-stack]
---

# Template Adaptation

## Purpose
How to turn `next-shadcn-dashboard-main.zip` into the base of `web/`: what to keep, remove and change.
Implemented by task T-0002.

## Template facts (as shipped)
- Next.js 16.3 App Router, React 19, TypeScript 7, Tailwind v4, shadcn (`base-nova` style on Base UI), pnpm (`pnpm-lock.yaml`, `.npmrc` with `legacy-peer-deps=true`).
- `next.config.ts`: `output: "standalone"`, `cacheComponents`, `partialPrefetching`, `reactCompiler`,
  and experimental `useOffline` / `turbopackRustReactCompiler`.
- It has a **real server layer**: `app/api/**/route.ts` Route Handlers, consumed through SWR and
  React contexts (`app/context/*`). Demo apps: blog, notes, tickets, user profile. Auth demo pages in `app/auth/`.
- Ships its own `AGENTS.md`, `CLAUDE.md` and `shadcn-dashboard` skill (in `.agents/` and `.claude/`),
  plus a `Dockerfile`.

## Keep
- The dashboard shell: `app/(dashboard-layout)/layout.tsx` and `layout/` (sidebar, header), the theme provider, and `globals.css` tokens.
- `components/ui/*` primitives, `lib/utils.ts` (`cn()`), `hooks/`.
- The TanStack Table wrappers in `app/components/tables/`.
- Form primitives and patterns. Chart setup (recharts).
- Auth page **layouts** from `app/auth/authforms/`, reduced to one "Continue with Google" sign-in screen (no password forms).
- Light/dark theming (next-themes) and the template's accessibility as-is (OQ-018).

## Remove
- `app/api/**` (all Route Handlers) and the mock data helpers.
- Demo features: blog, notes, tickets, code, userprofile pages, contexts and components, and any
  sample dashboards that aren't reused.
- Dependencies that are only used by removed features (e.g. tiptap, chance, react-syntax-highlighter, dropzone,
  lodash, if unused). Run `npm explain` / check imports before removing.
- `Dockerfile` and `.dockerignore` (not used; GitHub Pages deploy).
- `@iconify/react`: standardize on lucide.
- `swr`, `app/api/global-fetcher.ts` and `app/context/*` (replaced by TanStack Query, ADR-0009).
- Password, 2FA, forgot-password and maintenance demo auth pages (Google-only sign-in).

## Change
- **Package manager → npm:** delete `pnpm-lock.yaml`, generate `package-lock.json` with `npm install`, and
  keep `.npmrc` `legacy-peer-deps=true` only if it's actually needed (document why).
- `next.config.ts` → the static export baseline in `static-export.md`. Remove `output: "standalone"`.
  Remove or verify `cacheComponents`, `partialPrefetching`, `experimental.useOffline` (these features
  need a server or a runtime; test them with `output: "export"` and remove whichever fail or have no effect).
- Replace the template's `AGENTS.md`, `CLAUDE.md` and skill with PM4 versions that describe the
  **adapted** app (static export, external API, PM4 routes). Keep the template's useful patterns in them.
- Sidebar items (`sidebaritems.ts`) → PM4 navigation (routing.md).
- Sidebar nav hover (OQ-053): the template's hover highlight without `motion`: a `bg-primary/5` `rounded-lg`
  layer behind each nav item (active ones too, expanded and collapsed) that fades in over 200 ms on
  hover, and appears instantly under `prefers-reduced-motion`. No sliding between items.
- App footer (OQ-055): the template's footer layout with PM4 content: `© 2026 by PM4, better project
  management for you.` on the left (**PM4** links to `/`), and **Terms and Conditions** (`/terms-and-conditions`)
  and **Privacy** (`/privacy`) on the right. Internal links, same tab.
- Branding: app name, favicon, metadata.
- Data layer: add `lib/api` (openapi-fetch client targeting `NEXT_PUBLIC_API_BASE_URL`) and the TanStack
  Query provider (ADR-0009, ADR-0010).

## Acceptance
- `npm run build` produces `out/` with zero Route Handlers and no demo routes.
- The shell (sidebar and header, light/dark theme) renders when `out/` is served from the root.
- `npm run lint` passes. No unused dependencies remain from removed features.

## Open questions
— (ADR-0009/0010 are pending confirmation)

## Changelog
- 2026-09-26: Initial scaffold.
- 2026-09-26: npm, Google-only auth UI, TanStack Query replaces SWR.
- 2026-09-27: Approved by the owner.
- 2026-10-02: Sidebar nav hover highlight, CSS only (OQ-053).
- 2026-10-02: App footer copyright and legal links (OQ-055).
