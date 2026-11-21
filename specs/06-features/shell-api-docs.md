---
id: feat-shell-api-docs
title: "Documentation: API Docs tab (Scalar)"
status: approved
owner: Marko Angelovski
last_updated: 2026-11-21
milestone: M1
requirements: [SCR-053]
related: [feat-shell-documentation, web-screens, web-routing, arch-deployment, api-conventions, ADR-0010]
prototype: bd9bb4f
---

# Documentation: API Docs tab (Scalar)

## Goal
Documentation gets a third topic, **API Docs** (`/app/documentation?tab=api-docs`, SCR-053). It shows the API's
OpenAPI document as an interactive reference (Scalar). **Test request** calls the API as the signed-in user.

## Decisions
| # | Decision | Source |
| --- | --- | --- |
| D1 | Scalar (`@scalar/api-reference-react`, already in `web/package.json`) renders the OpenAPI document inside the web app. We don't use an iframe of the API's `/docs`: it's off in production ([conventions.md#openapi](../03-api/conventions.md#openapi)), helmet blocks framing, and an iframe can't send the bearer token. | Owner, prototype `bd9bb4f` |
| D2 | **Test request** stays. It sends the signed-in user's access token, so it can read and change their own data with any method, PATCH and DELETE included. | Owner, prototype `bd9bb4f` (confirmed as built, 2026-11-21) |
| D3 | Scalar options as in the prototype: modern layout, **Download OpenAPI** kept, client button hidden, its theme toggle, AI chat, MCP and telemetry off, colours from the app's tokens. Scalar and its CSS load only when the tab opens. | Owner, prototype `bd9bb4f` |
| D4 | The web deploy copies `api/openapi.json` to `web/public/openapi.json` before the build, so the site serves the document of the commit it was built from. It's generated, so it's git-ignored and never committed twice. `web-deploy.yml` already runs when `api/openapi.json` changes. | Agent |
| D5 | Publishing the document adds no exposure: the repository is public and `api/openapi.json` is committed in it. | Agent |
| D6 | No file (local dev and builds) → a `404` → `null` → "This build has no API docs." | Agent, prototype `bd9bb4f` (as D6 of feat-shell-documentation) |
| D7 | The token comes from `getAccessToken()`. `SessionUnavailableError` → `null`, so the request goes out without a token and the API answers `401`. Other errors are rethrown. | Agent |
| D8 | The token goes only to this build's API: `onBeforeRequest` adds it only when the request's origin equals `NEXT_PUBLIC_API_BASE_URL`'s, never to an address typed into Scalar's request client. | Owner (2026-11-21, review finding) |

## Scope
**In:** the deploy step and ignore line, the real `useApiSpec` and `getApiDocsAccessToken`, the promoted API Docs
components, the new topic in the Documentation view.

**Non-goals** (implementers must not touch these):
- `web/proto/**` (except the `api-docs.tsx` twin, D8), `web/package.json`, `web/package-lock.json`, `api/**`.
- The Versioning and Changelog tabs, `useChangelog`, the sidebar.
- `api/`'s `/docs` setting, CORS, helmet.
- Any acceptance test (`*.ac.*`).

## Read first
| Path | Why / copy this |
| --- | --- |
| `web/proto/features/documentation/api.ts` | The mock `useApiSpec` and `getApiDocsAccessToken`: the real ones keep their names, key and shapes |
| `web/features/documentation/api.ts` | `useWebChangelog`: the `fetch` + `404` pattern to copy for `useApiSpec` |
| `web/lib/auth/session.ts` | `getAccessToken`, `SessionUnavailableError` |

## Files
| App | File | C/M | Task | Notes |
| --- | --- | --- | --- | --- |
|  | `.github/workflows/web-deploy.yml` | M | T1 | Step `API docs` |
|  | `.gitignore` | M | T1 | `/web/public/openapi.json` |
| web | `web/features/documentation/api-spec.ac.test.tsx` | C | tests | AC-1…AC-3 |
| web | `web/features/documentation/api.ts` | M | tests, T2 | Stubs, then the real functions |
| web | `proto/features/documentation/components/api-docs.tsx` → `features/documentation/components/api-docs.tsx` | P | T2 | Imports only `../api`: no changes |
| web | `web/proto/features/documentation/components/api-docs.tsx` | M | T2 | D8: `isApiRequest`, then copied to its production twin |
| web | `proto/features/documentation/components/scalar-reference.tsx` → `features/documentation/components/scalar-reference.tsx` | P | T2 | No changes |
| web | `web/features/documentation/components/documentation-view.tsx` | M | T2 | Becomes its prototype twin (command below) |

## Interfaces

### Deploy (T1)
- `web-deploy.yml`, right after the `Changelog` step:
  ```yaml
      - name: API docs
        run: cp ../api/openapi.json public/openapi.json
  ```
- Root `.gitignore`, under the two `changelog.json` lines:
  ```
  # Copied from api/openapi.json by web-deploy.yml (feat-shell-api-docs)
  /web/public/openapi.json
  ```

### Web (T2)
From `web/`, after `pm4 promote`:
```bash
cp proto/features/documentation/components/documentation-view.tsx features/documentation/components/documentation-view.tsx
```
The twin has no `@/proto/` import. The promoted components need no changes. Add to `features/documentation/api.ts`
(replacing the stubs):
```ts
import { getAccessToken, SessionUnavailableError } from "@/lib/auth/session";

/** An OpenAPI document, as Scalar takes it. */
export type OpenApiDocument = Record<string, unknown>;

/** The API's OpenAPI document, at the site root: the web deploy copies `api/openapi.json` there with the build. */
export const API_SPEC_URL = "/openapi.json";

// useApiSpec(): useQuery, queryKey [...documentationKeys.all, "api-spec"], staleTime Infinity;
//   queryFn = fetch(API_SPEC_URL, { signal }); status 404 → null (no file, D6);
//   another non-ok status → throw new Error(`GET ${API_SPEC_URL} failed (${status})`); else await json().
export function useApiSpec(): UseQueryResult<OpenApiDocument | null>;

// getApiDocsAccessToken(): return await getAccessToken(); a SessionUnavailableError → null; any other error rethrown (D7).
export async function getApiDocsAccessToken(): Promise<string | null>;
```

## Acceptance criteria
The tests mock `@/lib/auth/session` (`getAccessToken`, and the real `SessionUnavailableError` class) and stub `fetch`.

| AC | Case → expected | Test | Task |
| --- | --- | --- | --- |
| AC-1 | `useApiSpec()`: fetches `/openapi.json` → data = the parsed body, under key `["documentation", "api-spec"]` | `web/features/documentation/api-spec.ac.test.tsx` | T2 |
| AC-2 | `useApiSpec()`: a `404` → success with `null`; a `500` → error state | `web/features/documentation/api-spec.ac.test.tsx` | T2 |
| AC-3 | `getApiDocsAccessToken()`: `getAccessToken` resolves `"tok"` → `"tok"`; resolves `null` → `null`; rejects with `SessionUnavailableError` → `null`; rejects with another `Error` → rejects with it | `web/features/documentation/api-spec.ac.test.tsx` | T2 |
| AC-4 | `web-deploy.yml`: `API docs` copies `../api/openapi.json` to `public/openapi.json`, after `Changelog` and before the build; `web/public/openapi.json` is git-ignored | `check` | T1 |
| AC-5 | The Documentation view lists the `api-docs` topic; the three files equal their prototype twins (`pm4 check`'s twin check) | `check` | T2 |
| AC-6 | `npm run dev` without `public/openapi.json`: **API Docs** shows "This build has no API docs."; with a copy of `api/openapi.json` there: the reference renders, and **Test request** on `GET /api/v1/projects` while signed in → `200` with the user's projects | `manual` | T2 |

Typed stubs (created with the tests, so lint and typecheck pass while the tests fail): in
`web/features/documentation/api.ts`, `OpenApiDocument` and `API_SPEC_URL` real, `useApiSpec` and
`getApiDocsAccessToken` each `throw new Error("not implemented (feat-shell-api-docs)")`.

## Checks
```bash
# AC-4: the deploy step and the ignored file
f=.github/workflows/web-deploy.yml
grep -q 'run: cp ../api/openapi.json public/openapi.json' $f
test "$(grep -n 'name: Changelog' $f | cut -d: -f1)" -lt "$(grep -n 'name: API docs' $f | cut -d: -f1)"
test "$(grep -n 'name: API docs' $f | cut -d: -f1)" -lt "$(grep -n 'run: npm run build' $f | cut -d: -f1)"
git check-ignore -q web/public/openapi.json

# AC-5: the topic is in the view
grep -q 'id: "api-docs"' web/features/documentation/components/documentation-view.tsx
```

## Tasks
| # | Task | App | Size | Tier | Why this tier | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | Web deploy copies `api/openapi.json` into the site; ignore the copy | infra | S | haiku | Two lines spelled out; infra, so the main session runs it | — |
| T2 | API Docs tab: promote, real `useApiSpec` and `getApiDocsAccessToken`, the view's twin | web | S | haiku | A promoted prototype screen plus two functions spelled out | — |

## Agents
| Step | Agent | Date |
| --- | --- | --- |
| Prototype | `claude-code/claude-opus-5-5` | 2026-11-21 |
| Spec | `claude-code/claude-opus-5-5` | 2026-11-21 |
| Tasks (`pm4 tasks`) | `claude-code/claude-opus-5-5` | 2026-11-21 |
| Acceptance tests | `claude-code/claude-sonnet-5-5`, checked by `claude-code/claude-opus-5-5` | 2026-11-21 |

## Open questions
—

## Changelog
- 2026-11-21: Initial draft from prototype `bd9bb4f`. Open questions empty → `review`.
- 2026-11-21: Approved by the owner.
- 2026-11-21: Review finding: the token goes only to this build's API (D8), fixed in the prototype twin and its production copy. Approved by the owner.
