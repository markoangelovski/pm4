---
id: web-static-export
title: Static Export Constraints
status: approved
owner: Marko Angelovski
last_updated: 2026-09-27
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
  trailingSlash: true,          // emit /route/index.html so Pages serves clean URLs
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
2. Serve `out/` statically from the root (e.g. `npx serve out`), then hard-refresh on a deep route
   (e.g. `/projects/view/?id=…`): the page loads, with no 404 and no missing assets.

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
