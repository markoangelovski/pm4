---
id: feat-shell-pwa
title: Installable web app (PWA) with the app shell offline and an offline banner
status: approved
owner: Marko Angelovski
last_updated: 2026-10-25
milestone: M0
requirements: [SCR-006, FR-AUTH-003]
related: [prod-scope, web-static-export, web-brand-assets, web-screens, OQ-237, OQ-238, OQ-239, OQ-240]
prototype: a3fc6a5
---

# Installable web app (PWA) with the app shell offline and an offline banner

## Goal
PM4 can be installed from the browser as an app that opens at `/app`. A service worker keeps the whole web build
in the browser, so pages and assets load without the network; data still needs the API. While offline the shell
shows a banner (SCR-006), and the session check's "Can't reach PM4" screen retries by itself when the network
returns. Rules: [static-export.md → Installable app and service worker](../04-web/static-export.md#installable-app-and-service-worker-oq-237).

## Decisions
| # | Decision | Source |
| --- | --- | --- |
| D1 | Installable, the whole build precached, data online-only (no offline reads or writes), and an offline banner in the shell | OQ-237 (owner, 2026-10-25) · Owner, prototype `a3fc6a5` |
| D2 | Silent updates: the new worker skips waiting and claims the clients; the next load serves the new build. No prompt | OQ-238 (owner) |
| D3 | Opened while offline: AuthGuard keeps "Can't reach PM4 right now." with the banner on top, and an `online` event re-runs the session check | OQ-239 (owner) |
| D4 | `start_url` and `id` are `/app`; `scope` is `/` | OQ-240 (owner) |
| D5 | Hand-written worker, no Workbox or other dependency. `postbuild` writes `out/sw.js` from `web/sw/service-worker.js`, prefixed with `self.__PM4_BUILD = { version, urls }`: `urls` is every file in `out/` (as `/path`), `version` a hash of their contents, so any changed file changes `sw.js` | Agent: Next has no precache step for a static export; AGENTS.md asks before new dependencies |
| D6 | Navigations: network first, then the cached `<path>.html`, then the cached `/404.html`. `/_next/static/**`: cache first. Every other same-origin GET (RSC `.txt`, icons, manifest): network first, then the cache ignoring the query. Cross-origin (the API) and non-GET requests aren't intercepted. The cache is only written at install | Agent: online always shows the deployed build; only content-hashed files are served from the cache first |
| D7 | Pages are precached by their `.html` file (`/app/projects.html`), not the clean URL, so the install never stores a redirected response | Agent |
| D8 | Registered only when `NODE_ENV === "production"`. Anywhere else (the dev server, so also the prototype on `localhost:3000`) existing registrations are removed, so a worker left by a local production preview can't serve stale files to the dev server | Agent |
| D9 | Manifest and theme colours: `background_color` and `theme_color` `#ffffff` (light `--background`); the `viewport` theme colour is `#ffffff` for a light and `#0a0a0a` (dark `--background`) for a dark system scheme. `appleWebApp` makes iOS open it standalone | Agent, from `app/globals.css` |
| D10 | The banner component keeps its `useOffline` hook in the same file (`useSyncExternalStore` over the `online`/`offline` events; online on the server) | Owner, prototype `a3fc6a5` |

## Scope
**In:** `app/manifest.ts`; `viewport` and `appleWebApp` in the root layout; the worker source, the build script that
writes `out/sw.js`, `postbuild`; the registration component in the root layout; the offline banner promoted and
mounted in the app shell; AuthGuard's unavailable screen with the banner and the retry on `online`.

**Non-goals** (implementers must not touch these):
- Offline data: TanStack Query persistence, caching API responses, queued writes. (TanStack Query already pauses
  queries and mutations while offline and resumes them on reconnect; leave that as it is.)
- `lib/query-client.tsx`, `lib/auth/*`, `lib/api/client.ts`.
- The icon files and the brand-assets recipe (`web/public/icons/*`, `web/app/icon.svg`, `favicon.ico`, `apple-icon.png`).
- An install button or prompt, a "new version" prompt, push notifications.
- The theme colour following the in-app theme toggle (it follows the system scheme only).
- `.github/workflows/*`, `next.config.ts`, the landing page, the prototype (already confirmed).

## Read first
| Path | Why / copy this |
| --- | --- |
| `specs/04-web/static-export.md#installable-app-and-service-worker-oq-237` | The rules |
| `specs/04-web/screens.md` (SCR-006) | Banner behaviour |
| `web/proto/features/system/components/offline-banner.tsx` | The confirmed banner (promoted as is) |
| `web/app/layout.tsx` | Root layout: `metadata`, where the registration goes |
| `web/features/auth/components/auth-guard.tsx` | The unavailable state the banner and retry join |
| `web/features/system/components/version-badge.tsx` | Component style in `features/system/components/` |
| `web/package.json` | The existing `postbuild` |

## Files
| App | File | C/M | Task | Notes |
| --- | --- | --- | --- | --- |
| web | `web/scripts/build-sw.ac.test.ts` | C | tests | Acceptance tests |
| web | `web/sw/service-worker.ac.test.ts` | C | tests | Acceptance tests (node environment, runs the worker against fakes) |
| web | `web/features/system/components/service-worker-registration.ac.test.tsx` | C | tests | Acceptance tests |
| web | `web/features/system/components/offline-banner.ac.test.tsx` | C | tests | Acceptance tests |
| web | `web/features/auth/components/auth-guard-offline.ac.test.tsx` | C | tests | Acceptance tests |
| web | `web/scripts/build-sw.mts` | C | T1 | Stub from the test writer |
| web | `web/sw/service-worker.js` | C | T1 | Stub (a comment) from the test writer |
| web | `web/features/system/components/service-worker-registration.tsx` | C | T1 | Stub from the test writer |
| web | `web/app/manifest.ts` | C | T1 | Next file convention → `out/manifest.webmanifest` |
| web | `web/app/layout.tsx` | M | T1 | `viewport`, `appleWebApp`, `<ServiceWorkerRegistration />` |
| web | `web/package.json` | M | T1 | `postbuild` runs the build script last |
| web | `web/proto/features/system/components/offline-banner.tsx` → `web/features/system/components/offline-banner.tsx` | P | tests, T2 | Nothing to change (no `@/proto/` imports) |
| web | `web/app/(dashboard-layout)/layout.tsx` | M | T2 | `<OfflineBanner />` after `<Header />` |
| web | `web/features/auth/components/auth-guard.tsx` | M | T2 | Banner on the unavailable screen, retry on `online` |

## Interfaces

### Build script (T1)
`web/scripts/build-sw.mts`, run by Node 24 directly (type stripping: erasable TypeScript only, no enums or
namespaces). Tests import it as `./build-sw.mjs` (TypeScript and Vite map that to the `.mts` file).
```ts
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export type SwBuild = { version: string; urls: string[] };

/** Every file under `dir`, relative, with "/" separators, sorted (default string sort). */
export function listFiles(dir: string): string[];
// readdirSync(dir, { recursive: true, withFileTypes: true }), files only.

/** Out-relative paths → the URLs the worker precaches: "/" + path, sorted. Leaves out "sw.js" and every path
 *  that is "_not-found…" or starts with "_not-found/" (Next's internal copy; Pages serves 404.html). */
export function precacheUrls(files: readonly string[]): string[];

/** sha256 over each entry, in the given order, of `url + "\n" + sha256hex(content) + "\n"`; the first 16 hex characters. */
export function buildVersion(entries: readonly { url: string; content: Uint8Array }[]): string;

/** `self.__PM4_BUILD = ${JSON.stringify(build)};\n` followed by `workerSource` unchanged. */
export function renderServiceWorker(build: SwBuild, workerSource: string): string;

/** Lists `outDir`, builds { version, urls } (version from each url's file in outDir), writes `<outDir>/sw.js`
 *  from the worker source at `workerPath`, and returns the build. */
export function writeServiceWorker(outDir: string, workerPath: string): SwBuild;

// Run directly (`node scripts/build-sw.mts` from web/):
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const build = writeServiceWorker("out", "sw/service-worker.js");
  console.log(`sw.js: ${build.urls.length} files precached, version ${build.version}`);
}
```
`web/package.json`:
`"postbuild": "test ! -e out/proto && test ! -e out/proto.html && ! grep -rqF pm4-proto-only out && node scripts/build-sw.mts"`.

### Service worker (T1)
`web/sw/service-worker.js`, a classic worker script (no `import`, no `importScripts`). It reads its build from
`self.__PM4_BUILD` and uses no globals besides `self`, `caches`, `fetch`, `URL`, `Request` and `Promise` (the
acceptance test runs it with `new Function("self", "caches", "fetch", source)`, so every `Request` it builds has an
absolute URL). Write it as follows:
```js
// PM4 service worker (feat-shell-pwa). postbuild prepends `self.__PM4_BUILD = { version, urls };` (scripts/build-sw.mts).
const { version, urls } = self.__PM4_BUILD;
const CACHE_PREFIX = "pm4-";
const CACHE = CACHE_PREFIX + version;

/** The precached page for a navigation: "/" → "/index.html", "/app/tasks/" → "/app/tasks.html". */
function pageFor(pathname) {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (path === "/") return "/index.html";
  return path.endsWith(".html") ? path : `${path}.html`;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        cache.addAll(urls.map((url) => new Request(new URL(url, self.location.href), { cache: "reload" })))
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE).map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

async function navigate(request) {
  try {
    return await fetch(request);
  } catch (error) {
    const cache = await caches.open(CACHE);
    const page =
      (await cache.match(pageFor(new URL(request.url).pathname))) ?? (await cache.match("/404.html"));
    if (page) return page;
    throw error;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  return (await cache.match(request, { ignoreSearch: true })) ?? fetch(request);
}

async function networkFirst(request) {
  try {
    return await fetch(request);
  } catch (error) {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(request, { ignoreSearch: true, ignoreVary: true });
    if (cached) return cached;
    throw error;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === "navigate") event.respondWith(navigate(request));
  else if (url.pathname.startsWith("/_next/static/")) event.respondWith(cacheFirst(request));
  else event.respondWith(networkFirst(request));
});
```
Prettier formats it like the rest of `web/`.

### Registration (T1)
```tsx
// web/features/system/components/service-worker-registration.tsx
"use client";

import { useEffect } from "react";

/** Registers /sw.js in a production build (feat-shell-pwa D8); elsewhere removes any registration. Renders nothing. */
export function ServiceWorkerRegistration(): null {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV === "production") {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => {
          // No worker only means no offline shell; the app works as before.
        });
      return;
    }
    void navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => Promise.all(registrations.map((r) => r.unregister())));
  }, []);
  return null;
}
```

### Manifest and root layout (T1)
```ts
// web/app/manifest.ts
import type { MetadataRoute } from "next";

// Static export: metadata routes must be static.
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/app",
    name: "PM4",
    short_name: "PM4",
    description: "PM4: projects, tasks and time tracking.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
    ]
  };
}
```
`web/app/layout.tsx` (keep everything else):
- `import type { Metadata, Viewport } from "next";` and
  `import { ServiceWorkerRegistration } from "@/features/system/components/service-worker-registration";`
- `metadata` gains `appleWebApp: { capable: true, title: "PM4", statusBarStyle: "default" }`.
- `export const viewport: Viewport = { themeColor: [{ media: "(prefers-color-scheme: light)", color: "#ffffff" }, { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" }] };`
- `<ServiceWorkerRegistration />` as the first child of `<body>`.

### Shell and session check (T2)
- `pm4 promote` copies the banner; nothing in it changes.
- `web/app/(dashboard-layout)/layout.tsx`: `import { OfflineBanner } from "@/features/system/components/offline-banner";`
  and `<OfflineBanner />` right after `<Header />`, as in `web/proto/mock/shell/proto-shell.tsx`.
- `web/features/auth/components/auth-guard.tsx`:
  - A second effect: while `state === "unavailable"`, listen for `window`'s `online` event and then
    `setState("checking")` (the same as **Retry**); remove the listener on cleanup.
  - The unavailable screen becomes:
    ```tsx
    <div className="flex min-h-screen flex-col">
      <OfflineBanner />
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <p>Can&apos;t reach PM4 right now.</p>
        <Button onClick={() => setState("checking")}>Retry</Button>
      </div>
    </div>
    ```
  - Nothing else in the guard changes (the checking, ready, no-session and session-ended paths stay).

## Acceptance criteria
| AC | Case → expected | Test | Task |
| --- | --- | --- | --- |
| AC-1 | `precacheUrls` of `index.html`, `app.html`, `app/projects.txt`, `_next/static/chunks/a.js`, `404.html`, `_not-found.html`, `_not-found/__next._tree.txt`, `sw.js`, `manifest.webmanifest`, `icons/icon-192.png` → the same paths with a leading `/`, sorted, without `sw.js` and the two `_not-found` paths | `web/scripts/build-sw.ac.test.ts` | T1 |
| AC-2 | `buildVersion`: 16 lowercase hex characters; the same entries → the same value; one changed content byte → a different value; a renamed URL → a different value | `web/scripts/build-sw.ac.test.ts` | T1 |
| AC-3 | `renderServiceWorker` → `self.__PM4_BUILD = {"version":…,"urls":[…]};\n` followed by the source unchanged | `web/scripts/build-sw.ac.test.ts` | T1 |
| AC-4 | `writeServiceWorker` on a temporary out folder (nested files, plus a stale `sw.js`) writes `sw.js` and returns every other file as a URL, and a version that changes when a file's content does | `web/scripts/build-sw.ac.test.ts` | T1 |
| AC-5 | Worker install: opens `pm4-<version>`, `addAll` gets a `Request` per URL (absolute, on the worker's origin) with `cache: "reload"`, then `skipWaiting()` | `web/sw/service-worker.ac.test.ts` | T1 |
| AC-6 | Worker activate: deletes `pm4-old`, keeps `pm4-<version>` and a cache not named `pm4-…`, then `clients.claim()` | `web/sw/service-worker.ac.test.ts` | T1 |
| AC-7 | Navigation, network up → the network's response, also a 404 one | `web/sw/service-worker.ac.test.ts` | T1 |
| AC-8 | Navigation, network down → `/app/projects?id=1` gets the cached `/app/projects.html`, `/` gets `/index.html`, `/app/tasks/` gets `/app/tasks.html`, `/nope` gets `/404.html` | `web/sw/service-worker.ac.test.ts` | T1 |
| AC-9 | `/_next/static/chunks/a.js`: cached → from the cache without calling `fetch`; not cached → from `fetch` | `web/sw/service-worker.ac.test.ts` | T1 |
| AC-10 | Another same-origin GET: network up → network; network down → the cached file ignoring the query (`/app/projects.txt?_rsc=x` → `/app/projects.txt`); down and not cached → the response promise rejects | `web/sw/service-worker.ac.test.ts` | T1 |
| AC-11 | Not intercepted (`respondWith` never called): a same-origin `POST`, a `GET` to another origin (the API) | `web/sw/service-worker.ac.test.ts` | T1 |
| AC-12 | `ServiceWorkerRegistration`, `NODE_ENV=production`: `register("/sw.js", { scope: "/", updateViaCache: "none" })` once; a rejecting `register` raises nothing; without `navigator.serviceWorker` → no error; `NODE_ENV=development` → no `register`, every existing registration's `unregister()` called; renders nothing | `web/features/system/components/service-worker-registration.ac.test.tsx` | T1 |
| AC-13 | The build: `out/manifest.webmanifest` has `start_url` `/app`, `display` `standalone` and 3 icons whose files exist in `out/`; `out/app.html` links the manifest and has a `theme-color` meta; `out/sw.js` starts with `self.__PM4_BUILD = ` and its URLs are exactly the files of `out/` except `sw.js` and `_not-found*` | `check` | T1 |
| AC-14 | `OfflineBanner`: online → renders nothing; `navigator.onLine` false at mount → a `status` with "You're offline. Data can't load or save until you're back online."; an `offline` event shows it, an `online` event hides it | `web/features/system/components/offline-banner.ac.test.tsx` | T2 |
| AC-15 | AuthGuard, API unreachable while offline → "Can't reach PM4 right now." and the banner's status; an `online` event calls `getAccessToken` again and renders the children once it resolves a token; online and unreachable → no banner, Retry as before | `web/features/auth/components/auth-guard-offline.ac.test.tsx` | T2 |
| AC-16 | The app shell mounts the banner after the header | `check` | T2 |
| AC-17 | Deployed, Chrome: the site offers Install and DevTools → Application → Manifest shows no errors; installed, it opens `/app` in its own window. After one online visit, DevTools Offline: sidebar navigation keeps working with the banner (data stays loading), a reload shows "Can't reach PM4 right now." with the banner, and going back online loads the shell by itself. After the next deploy, the second load shows the new version pill | `manual` | T2 |

Typed stubs (created with the tests, so lint and typecheck pass while the tests fail):
- `web/scripts/build-sw.mts`: the exports from *Interfaces*, each body
  `throw new Error("not implemented (feat-shell-pwa)")`, without the run-directly block.
- `web/sw/service-worker.js`: only the first comment line.
- `web/features/system/components/service-worker-registration.tsx`: the component returning `null` with no effect.

## Checks
```bash
# AC-13: manifest, theme colour and the generated service worker in the build
node -e "
const fs=require('fs'),path=require('path');const out='web/out';
const m=JSON.parse(fs.readFileSync(out+'/manifest.webmanifest','utf8'));
if(m.start_url!=='/app'||m.display!=='standalone'||m.icons.length!==3)process.exit(1);
for(const i of m.icons)if(!fs.existsSync(out+i.src))process.exit(2);
const html=fs.readFileSync(out+'/app.html','utf8');
if(!html.includes('rel=\"manifest\"')||!html.includes('name=\"theme-color\"'))process.exit(3);
const sw=fs.readFileSync(out+'/sw.js','utf8');const p='self.__PM4_BUILD = ';
if(!sw.startsWith(p))process.exit(4);
const b=JSON.parse(sw.slice(p.length,sw.indexOf(';\n')));
const files=fs.readdirSync(out,{recursive:true,withFileTypes:true}).filter(d=>d.isFile())
  .map(d=>path.relative(out,path.join(d.parentPath,d.name)).split(path.sep).join('/'))
  .filter(f=>f!=='sw.js'&&!f.startsWith('_not-found')).map(f=>'/'+f).sort();
if(JSON.stringify(files)!==JSON.stringify(b.urls))process.exit(5);
"

# AC-16: the app shell mounts the banner right after the header
grep -Pzo '<Header />\s*<OfflineBanner />' 'web/app/(dashboard-layout)/layout.tsx' > /dev/null
```

## Tasks
| # | Task | App | Size | Tier | Why this tier | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | Manifest, theme colour, the service worker, the build script that writes `out/sw.js`, and its registration | web | M | sonnet | First service worker and build-time code generation; cache ordering and update behaviour that passing tests don't fully prove (the algorithm is written out in *Interfaces*) | — |
| T2 | Offline banner: promote it, mount it in the app shell, and add it with the `online` retry to AuthGuard's unavailable screen | web | S | haiku | Promote as is; two small edits spelled out in *Interfaces* | T1 |

## Open questions
None. OQ-237 … OQ-240 are resolved.

## Changelog
- 2026-10-25: Initial version (OQ-237 … OQ-240, prototype `a3fc6a5`).
- 2026-10-25: Approved by the owner.
