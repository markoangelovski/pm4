---
id: feat-shell-sidebar-branding
title: Sidebar header branding with web and API versions
status: approved
owner: Marko Angelovski
last_updated: 2026-10-02
milestone: M1
requirements: [SCR-004, API-SYS-003]
related: [web-screens, api-endpoints, sec, arch-env, ADR-0005, ADR-0010, OQ-051, OQ-052]
---

# Sidebar header branding with web and API versions

## Goal
The app sidebar header looks like the template's (`app/(dashboard-layout)/layout/vertical/sidebar/app-sidebar.tsx`
in the template zip): logo icon, title **PM4**, subtitle **Project management**, and a version pill.
The pill shows the web build's version, taken automatically from `web/package.json`. Its tooltip also
shows the API's version, read from a new public endpoint. Behavior: SCR-004 in
[screens.md](../04-web/screens.md), API-SYS-003 in [endpoints.md](../03-api/endpoints.md#api-sys-003-api-version).

## Decisions
| # | Decision | Source |
| --- | --- | --- |
| D1 | Logo icon: the template's `public/images/logos/logoicon.svg`, copied into `web/public/images/logos/`. It replaces the "P4" tile. | OQ-051 (owner, 2026-10-02) |
| D2 | Title and subtitle are HTML text next to the icon (the template draws them into `darklogo.svg`). | Agent: lets the text follow the theme and be read by assistive tech |
| D3 | Web version: `web/package.json` `version`, inlined at build time as `NEXT_PUBLIC_APP_VERSION` by `next.config.ts`. Pill text `v<version>`, no commit SHA. | OQ-051 (owner) |
| D4 | API version: new public `GET /api/v1/version` → `{ version }` from `api/package.json`, no DB/Redis, in the OpenAPI contract, not rate limited. `/health` is unchanged. | OQ-052 (owner); rate limit: agent, same reason as `/health` (security.md) |
| D5 | The pill shows only the web version. Hover/focus shows `Web v<web> · API v<api>`. The same text is the pill's accessible name. | OQ-052 (owner) |
| D6 | API loading → `API …`, failure → `API —`. One request per page load: `retry: false`, `staleTime`/`gcTime: Infinity`, no refetch on focus or reconnect, no toast. | OQ-052 (owner) |
| D7 | Sidebar collapsed to icons: only the logo icon (title, subtitle and pill hidden). The mobile header (below `lg`) keeps showing the icon only, as it does today. | OQ-051 (owner); header: agent, keeps current behavior |
| D8 | The query hook lives in `web/features/system/api.ts` (domain `system`, matching `API-SYS-*`). It is the first `features/<domain>/api.ts`; later domains copy its shape (key factory + hook). | Agent, web conventions *Folder structure* |

## Scope
**In:** API-SYS-003 (module, controller, DTO, OpenAPI export); `NEXT_PUBLIC_APP_VERSION` in
`next.config.ts`; the generated web types; `lib/version.ts`; `features/system/api.ts`; `VersionBadge`;
`FullLogo` (icon, title, subtitle, `compact`); the sidebar header and mobile header using them; the logo asset.

**Non-goals** (implementers must not touch these):
- `/health` (`api/src/health/`) and its tests.
- Rate limiting (not implemented yet; D4 is recorded in security.md for when it is).
- Release automation (release-please or similar) and any version bump in either `package.json`.
- `web/lib/api/client.ts` (auth headers, refresh, NFR-003 timeouts: M1 auth).
- The sidebar nav, footer, `nav-collapse/`, `sidebaritems.ts`, the sign-in page logo, the landing page.
- `web/components/ui/*` (no shadcn changes; `badge` and `tooltip` are already installed).

## Read first
| Path | Why / copy this |
| --- | --- |
| `specs/04-web/screens.md` (SCR-004) | Screen behavior |
| `specs/03-api/endpoints.md#api-sys-003-api-version` | Contract |
| `api/src/health/` | Module wiring, `.js` import suffixes |
| `api/src/openapi.ts` | Importing `package.json` with `with { type: 'json' }` |
| `api/test/health.e2e-spec.ts`, `api/test/create-test-app.ts` | e2e test style |
| `web/lib/query-client.tsx` | Query defaults the hook overrides |
| `web/lib/api/client.ts` | `apiClient` (openapi-fetch) |
| `web/components/ui/tooltip.tsx`, `web/components/ui/badge.tsx` | `Tooltip*` (Base UI: the trigger renders a `<button>`), `badgeVariants` |
| `web/app/components/shared/view-id-guard.test.tsx` | Mocking modules in Vitest |
| `web/app/auth/authforms/social-buttons.tsx` | `next/image` usage |

## Files
| App | File | C/M | Task | Notes |
| --- | --- | --- | --- | --- |
| api | `api/test/version.ac.e2e-spec.ts` | C | tests | Acceptance tests |
| api | `api/src/version/version.module.ts` | C | T1 | `npx nest g module version` |
| api | `api/src/version/version.controller.ts` | C | T1 | `npx nest g controller version` |
| api | `api/src/version/version.controller.spec.ts` | C | T1 | Generated; keep, may extend |
| api | `api/src/version/dto/version-response.dto.ts` | C | T1 | Hand-written |
| api | `api/src/app.module.ts` | M | T1 | The CLI adds `VersionModule` |
| api | `api/openapi.json` | M | T1 | `npm run openapi:export` |
| api | `api/scripts/export-openapi.ts` | M | T1 | Call `configureApp(app)` before `buildOpenApiDocument`, so the exported paths get the `api/v1` prefix |
| web | `web/lib/version.ac.test.ts` | C | tests | Acceptance tests |
| web | `web/features/system/api.ac.test.tsx` | C | tests | Acceptance tests |
| web | `web/features/system/components/version-badge.ac.test.tsx` | C | tests | Acceptance tests |
| web | `web/app/(dashboard-layout)/layout/shared/logo/full-logo.ac.test.tsx` | C | tests | Acceptance tests |
| web | `web/lib/version.ts` | C | T2 | Stub from the test writer |
| web | `web/features/system/api.ts` | C | T2 | Stub from the test writer |
| web | `web/features/system/components/version-badge.tsx` | C | T2 | Stub from the test writer |
| web | `web/app/(dashboard-layout)/layout/shared/logo/full-logo.tsx` | M | T2 | The test writer adds only the `compact?: boolean` prop type |
| web | `web/app/(dashboard-layout)/layout/vertical/sidebar/app-sidebar.tsx` | M | T2 | Add `VersionBadge` to the header |
| web | `web/app/(dashboard-layout)/layout/vertical/header/index.tsx` | M | T2 | `<FullLogo compact />` |
| web | `web/next.config.ts` | M | T2 | `env.NEXT_PUBLIC_APP_VERSION` |
| web | `web/lib/api/schema.d.ts` | M | T2 | `npm run api:types` (generated) |
| web | `web/public/images/logos/logoicon.svg` | C | T2 | Copied from the template zip, byte for byte |

## Interfaces

### API (T1)
From `api/`: `npx nest g module version`, then `npx nest g controller version` (registers the
controller in `VersionModule` and `VersionModule` in `AppModule`). No service.

```ts
// api/src/version/dto/version-response.dto.ts
export class VersionResponseDto {
  /** The `version` field of `api/package.json`, e.g. `0.0.1`. */
  version: string;
}

// api/src/version/version.controller.ts
import { Controller, Get } from '@nestjs/common';
import packageJson from '../../package.json' with { type: 'json' };
import { VersionResponseDto } from './dto/version-response.dto.js';

/** `GET /api/v1/version` (API-SYS-003): public, touches neither Postgres nor Redis. */
@Controller('version')
export class VersionController {
  @Get()
  get(): VersionResponseDto {
    return { version: packageJson.version };
  }
}
```
The Swagger CLI plugin documents the DTO, so `openapi.json` gets the path `/api/v1/version` with a
`200` response schema `{ version: string }` (required). Then run `npm run openapi:export`.

### Web: version helpers (T2)
```ts
// web/lib/version.ts
/** `web/package.json` version, inlined at build time by next.config.ts (OQ-051). "0.0.0" outside a Next build. */
export function webVersion(): string; // process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0", read on each call

/** "0.1.0" → "v0.1.0". Returns one string so the pill renders a single text node. */
export function formatVersion(version: string): string;

export type ApiVersionState =
  | { status: "pending" }
  | { status: "error" }
  | { status: "success"; version: string };

/** "Web v0.1.0 · API v0.0.1" | "Web v0.1.0 · API …" | "Web v0.1.0 · API —" */
export function versionSummary(web: string, api: ApiVersionState): string;
```
Characters: `·` U+00B7 with a space on each side, `…` U+2026, `—` U+2014.

```ts
// web/next.config.ts: add at the top, and `env` to nextConfig (keep everything else)
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Pill version (OQ-051): web/package.json, read from the app folder that every npm script and CI step runs in.
const { version } = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as { version: string };
// in nextConfig:
  env: { NEXT_PUBLIC_APP_VERSION: version },
```

### Web: query hook (T2)
Run `npm run api:types` first, so `"/api/v1/version"` is in `paths`.
```ts
// web/features/system/api.ts
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export const systemKeys = {
  all: ["system"] as const,
  version: () => [...systemKeys.all, "version"] as const,
};

/** API-SYS-003. One request per page load (D6): no retry, never stale, no refetch. */
export function useApiVersion(): UseQueryResult<string> {
  return useQuery({
    queryKey: systemKeys.version(),
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.GET("/api/v1/version", { signal });
      if (!data) throw new Error("GET /api/v1/version failed");
      return data.version;
    },
    retry: false,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
```
A network error makes `apiClient.GET` reject, so it also ends in the error state.

### Web: components (T2)
```tsx
// web/features/system/components/version-badge.tsx ("use client")
export function VersionBadge({ className }: { className?: string }): JSX.Element;
```
- `summary = versionSummary(webVersion(), state)`, where `state` comes from `useApiVersion()`:
  `isSuccess` → `{ status: "success", version: data }`, `isError` → `{ status: "error" }`, otherwise `{ status: "pending" }`.
- Markup: `<Tooltip>` → `<TooltipTrigger aria-label={summary} className={cn(badgeVariants({ variant: "secondary" }), "cursor-default", className)}>{formatVersion(webVersion())}</TooltipTrigger>`
  + `<TooltipContent side="bottom">{summary}</TooltipContent>`. No `TooltipProvider` is needed.

```tsx
// web/app/(dashboard-layout)/layout/shared/logo/full-logo.tsx
const FullLogo = ({ compact = false }: { compact?: boolean }) => …; // default export unchanged
```
- One `<Link href={routes.app.dashboard} aria-label="PM4" className="flex min-w-0 items-center gap-2">`.
- Inside: `<Image src="/images/logos/logoicon.svg" alt="" width={32} height={32} className="size-8 shrink-0" />`.
- Unless `compact`: `<span className="flex min-w-0 flex-col leading-tight group-data-[state=collapsed]:hidden">`
  holding `<span className="truncate text-base font-semibold text-foreground">PM4</span>` and
  `<span className="truncate text-xs text-muted-foreground">Project management</span>`.
- Remove the "P4" tile and the old `max-w-[40px] lg:max-w-[120px]` / `hidden lg:inline` classes.

Usage:
- `app-sidebar.tsx` `SidebarHeader` (classes unchanged): `<FullLogo />` then
  `<VersionBadge className="group-data-[state=collapsed]:hidden" />`.
- `header/index.tsx`: `<FullLogo compact />` (still inside the existing `block lg:hidden` wrapper).
- Logo asset: from the repo root, `mkdir -p web/public/images/logos && unzip -p next-shadcn-dashboard-main.zip 'next-shadcn-dashboard-main/public/images/logos/logoicon.svg' > web/public/images/logos/logoicon.svg`.

## Acceptance criteria
| AC | Case → expected | Test | Task |
| --- | --- | --- | --- |
| AC-1 | `GET /api/v1/version` with no `Authorization` → `200`, body exactly `{ version: <api/package.json version> }` | `api/test/version.ac.e2e-spec.ts` | T1 |
| AC-2 | `GET /version` (no prefix) → `404` (only `/health` is outside the prefix) | `api/test/version.ac.e2e-spec.ts` | T1 |
| AC-3 | `api/openapi.json` has `paths["/api/v1/version"].get` with a 200 response and is up to date | `check` | T1 |
| AC-4 | `formatVersion("0.1.0")` → `"v0.1.0"`; `versionSummary("0.1.0", …)` → `"Web v0.1.0 · API v0.0.1"` (success `0.0.1`), `"Web v0.1.0 · API …"` (pending), `"Web v0.1.0 · API —"` (error) | `web/lib/version.ac.test.ts` | T2 |
| AC-5 | `webVersion()` returns `NEXT_PUBLIC_APP_VERSION` when set (`vi.stubEnv`), `"0.0.0"` when unset | `web/lib/version.ac.test.ts` | T2 |
| AC-6 | `useApiVersion`: `apiClient.GET("/api/v1/version", …)` resolving `{ data: { version: "0.0.1" } }` → `data === "0.0.1"`; key `["system", "version"]` | `web/features/system/api.ac.test.tsx` | T2 |
| AC-7 | `useApiVersion` with a client built by `createQueryClient()` (whose default is `retry: 1`): `GET` resolving `{ error: {…} }` → error state after **one** call; `GET` rejecting (network) → error state after one call | `web/features/system/api.ac.test.tsx` | T2 |
| AC-8 | `VersionBadge` (env `0.1.0`, hook mocked): a button with text `v0.1.0` whose accessible name is the summary for each state: success `0.0.1`, pending, error (AC-4 strings) | `web/features/system/components/version-badge.ac.test.tsx` | T2 |
| AC-9 | `FullLogo`: exactly one link, `href="/app"`, name `PM4`; shows the texts `PM4` and `Project management`; has an `img` with `src` containing `/images/logos/logoicon.svg` | `web/app/(dashboard-layout)/layout/shared/logo/full-logo.ac.test.tsx` | T2 |
| AC-10 | `FullLogo compact`: the same single link and image, and neither text `Project management` nor visible `PM4` text | `web/app/(dashboard-layout)/layout/shared/logo/full-logo.ac.test.tsx` | T2 |
| AC-11 | The built `/app` page contains the pill text `v<web/package.json version>`, and the asset is exported | `check` | T2 |
| AC-12 | The asset equals the template's `logoicon.svg` byte for byte | `check` | T2 |
| AC-13 | Sidebar collapsed to icons: only the logo icon shows; expanded: icon, title, subtitle, pill; hovering or tabbing to the pill shows the tooltip; light and dark theme both legible | `manual` | T2 |

Typed stubs (created with the tests, so lint and typecheck pass while the tests fail):
- `web/lib/version.ts`, `web/features/system/api.ts` (`systemKeys` real; `useApiVersion` body throws),
  `web/features/system/components/version-badge.tsx`: the signatures from *Interfaces*, each body
  `throw new Error("not implemented (feat-shell-sidebar-branding)")`.
- `full-logo.tsx`: add `{ compact = false }: { compact?: boolean }` to the signature only.

## Checks
```bash
# AC-3: the contract has the endpoint
node -e "const d=require('./api/openapi.json'); if(!d.paths['/api/v1/version']?.get?.responses?.['200']) process.exit(1)"

# AC-11: the built /app page shows the web version, and the logo is exported
VER=$(node -p "require('./web/package.json').version")
grep -q "v${VER}<" web/out/app.html
test -f web/out/images/logos/logoicon.svg

# AC-12: the logo asset is the template's, unchanged
unzip -p next-shadcn-dashboard-main.zip 'next-shadcn-dashboard-main/public/images/logos/logoicon.svg' | cmp - web/public/images/logos/logoicon.svg
```

## Tasks
| # | Task | App | Size | Tier | Why this tier | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | Add `GET /api/v1/version` (API-SYS-003) and export the OpenAPI document | api | S | haiku | 4 small files, all code given in *Interfaces*; Nest CLI + `openapi:export`; no DB, auth or decisions | — |
| T2 | Sidebar header branding: logo, title, subtitle, version pill with the API version tooltip | web | M | sonnet | Composes existing primitives over ~8 files; the first `features/*/api.ts` is written out in full in *Interfaces*, so no pattern is designed here | T1 |

## Open questions
None. OQ-051 and OQ-052 are resolved.

## Changelog
- 2026-10-02: Initial draft (OQ-051, OQ-052).
- 2026-10-02: Approved by the owner.
- 2026-10-03: T1 also changes `api/scripts/export-openapi.ts`: it now calls `configureApp(app)`, so `openapi.json` paths carry the `api/v1` prefix (found by T-0010; owner-approved).
- 2026-10-03: *Checks* merged into one bash block, since `pm4 check` reads only the first (AC-11 and AC-12 were skipped).
