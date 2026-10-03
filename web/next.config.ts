import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { NextConfig } from "next";

// Pill version (OQ-051): web/package.json, read from the app folder that every npm script and CI step runs in.
const { version } = JSON.parse(
  readFileSync(join(process.cwd(), "package.json"), "utf8")
) as { version: string };

// Static-export baseline (specs/04-web/static-export.md): slash-free URLs
// (trailingSlash: false, OQ-050). Served from the root of the custom
// domain: no basePath (OQ-013).
//
// Template options tested against `output: "export"` (T-0002):
// - `output: "standalone"` -> replaced by `output: "export"` (mutually exclusive).
// - `experimental.useOffline`      -> REMOVED. Its connectivity retry targets
//   navigation/prefetch/Server Action requests against a live server; none
//   exist in a static export. Also removed `next/offline`'s `useOffline()`
//   consumer (the template's `OfflineBanner`).
// - `partialPrefetching`          -> REMOVED. Requires `cacheComponents`
//   (config validation throws without it), which itself doesn't work here
//   (see below), so this can't be enabled independently.
// - `cacheComponents`             -> REMOVED. `next build` fails outright:
//   "Invariant: PPR cannot be enabled in export mode" (cacheComponents
//   implements Partial Prerendering, which needs a server to stream the
//   dynamic parts in). Confirmed by a real build attempt, not just docs.
// - `reactCompiler` + `experimental.turbopackRustReactCompiler` -> KEPT.
//   `next build` succeeds and the served `out/` works (shell, theme,
//   navigation all render correctly). Using the Rust port means no
//   `babel-plugin-react-compiler` dev dependency is needed.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: false,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_APP_VERSION: version },
  reactCompiler: true,
  experimental: {
    turbopackRustReactCompiler: true
  }
};

export default nextConfig;
