---
id: web-static-export
title: Static Export Constraints
status: approved
owner: Marko Angelovski
last_updated: 2026-10-02
related: [ADR-0001, web-template, web-routing, arch-deployment]
---

# Static Export Constraints

## Purpose
**Hard rules** for `web/`, which follow from ADR-0001 (a static export served by GitHub Pages).
Violating them breaks the build or the deployed site. Verify every item against the installed
Next.js docs (`web/node_modules/next/dist/docs/`), since the details change between versions.

## Configuration (baseline)
```ts
// next.config.ts
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: false,         // emit /route.html; Pages serves it at /route (no trailing slash, OQ-050)
  images: { unoptimized: true },
  // No basePath: served from the root of the custom domain (OQ-013)
  reactCompiler: true,
  experimental: {
    turbopackRustReactCompiler: true, // Rust port: no babel-plugin-react-compiler needed
  },
};
```
Resolved at T-0002, by actually building with each option and `output: "export"`, not just reading
docs:
- `cacheComponents` and `partialPrefetching` **do not work**: `next build` fails outright
  ("Invariant: PPR cannot be enabled in export mode") because Cache Components implements Partial
  Prerendering, which needs a server to stream the dynamic parts in. `partialPrefetching` requires
  `cacheComponents`, so it's out too. Neither is in the baseline above.
- `reactCompiler` (with `experimental.turbopackRustReactCompiler`) **works**: the build succeeds
  and the served `out/` renders correctly. Kept in the baseline above.

## URLs without trailing slashes (OQ-050)
`trailingSlash: false` makes the export write `out/<route>.html` (the dashboard is `out/app.html`), and
GitHub Pages serves each file at its extensionless URL (`/app/time` → `app/time.html`). Every link and
redirect target is the slash-free form from `web/lib/routes.ts`.
- **No route may have a child route.** A route that is both a page and a parent produces both
  `out/x.html` and a folder `out/x/`. Pages then prefers the folder and redirects `/x` to `/x/`, which
  has no `index.html`. This is why detail pages are flat siblings of their lists
  (`/app/project?id=`, not `/app/projects/view?id=`).
- **Known risk: a folder next to every page.** The export writes each page's route data
  (`__next.*.txt`) into `out/<route>/`, so every `out/x.html` has a sibling folder `out/x/` with no
  `index.html` (seen at T-0008). The dashboard's `out/app/` also holds every other app page. Whether
  Pages serves `/x` from `x.html` despite the folder is confirmed on the first deployment after the
  switch (feat-land-app-route-split, AC-15). If it redirects to `/x/` instead, the owner decides the fix
  (the fallback is `trailingSlash: true`).

## Not available (do not use)
| Feature | Why | Use instead |
| --- | --- | --- |
| Route Handlers with dynamic behavior (`app/**/route.ts`) | No server | Call the NestJS API |
| Server Actions (`"use server"`) | No server | API calls from the client |
| Middleware / `proxy.ts` | No server | Client-side auth guard in layouts |
| `cookies()`, `headers()`, `draftMode()`, request-time `searchParams` in Server Components | No request | Client components with `useSearchParams` (inside `<Suspense>`) |
| ISR / `revalidate` / on-demand revalidation | No server | Client-side fetching and cache |
| Next image optimization | No server | `images.unoptimized: true` |
| `rewrites`, `redirects`, `headers` in next.config | Ignored by Pages | Client-side redirects; `<meta>` CSP |
| Dynamic route segments (`[id]`) without `generateStaticParams` | Every page must exist at build time | Query-param routes (routing.md) |

## Allowed and encouraged
- Server Components that render **static** content at build time (layouts, shells, marketing copy).
- Client Components (`"use client"`) for everything data-driven.
- Static metadata, `not-found.tsx` (emitted as `404.html`), fonts via `next/font`.
- No `public/CNAME` or `public/.nojekyll`. Pages deploys through GitHub Actions, which ignores `CNAME`
  (the custom domain is set in the repo's Pages settings) and serves the artifact as is, without Jekyll,
  so `_next/` is served without `.nojekyll` (deployment.md).

## Data
All user data is fetched **at runtime in the browser** from `NEXT_PUBLIC_API_BASE_URL`. Nothing
user-specific is fetched at build time.

## Verification (every web task)
1. `npm run build` succeeds and produces `out/`.
2. Serve `out/` statically from the root (e.g. `npx serve out`, which serves `x.html` at `/x` like Pages), then hard-refresh on a deep route
   (e.g. `/app/project?id=…`): the page loads, with no 404 and no missing assets.

## Open questions
—

## Changelog
- 2026-09-26: Initial scaffold.
- 2026-09-26: Custom domain served from the root (no basePath). Query-param routes confirmed.
- 2026-09-27: Dropped `public/CNAME` and `public/.nojekyll`: neither is used by an Actions-based Pages deploy.
- 2026-09-27: Approved by the owner.
- 2026-09-27: T-0002 bootstrap: resolved the next.config TODO. `cacheComponents` and
  `partialPrefetching` removed (incompatible with `output: "export"`, confirmed by a failing
  build). `reactCompiler` + `experimental.turbopackRustReactCompiler` kept (confirmed working).
  `output: "standalone"` and `experimental.useOffline` also removed (mutually exclusive with
  `output: "export"`, and no server to retry against, respectively).
- 2026-09-29: Verification example updated to the `/app/` route prefix (OQ-047). No rule changed.
  Back to `review` (feat-land-app-route-split).
- 2026-09-29: Approved by the owner.
- 2026-10-01: OQ-050: no trailing slashes (`trailingSlash: false`); detail routes `/app/project?id=` and `/app/task?id=`. Back to `review` (feat-land-app-route-split).
- 2026-10-01: Approved by the owner.
- 2026-10-02: Known risk widened from `/app` to every page (Next writes route data into `out/<route>/`), found at T-0008.
