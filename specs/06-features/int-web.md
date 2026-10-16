---
id: feat-int-web
title: "PMSPA connector web: Integrations settings, the connector page, sync and push, sync flags"
status: approved
owner: Marko Angelovski
last_updated: 2026-10-17
milestone: M6
requirements: [FR-INT-001, FR-INT-002, FR-INT-004, FR-INT-005, FR-INT-006, FR-INT-007, FR-INT-008, FR-INT-010, FR-INT-011, FR-INT-012, FR-INT-013, FR-INT-014, SCR-052, SCR-060, SCR-061, SCR-062]
related: [req-integrations, web-screens, web-routing, api-endpoints, feat-int-conn-api, feat-int-sync-api, feat-int-time-api, OQ-140, OQ-175, OQ-182]
prototype: eefe787
---

# PMSPA connector web: Integrations settings, the connector page, sync and push, sync flags

## Goal
The app gets the confirmed PMSPA prototype: Settings → Integrations (SCR-052), the Connectors sidebar section (FR-INT-006), the
connector page with its two tabs and Import (SCR-060), the sync preview dialog (SCR-061), **Sync with PMSPA** on the project and
task details, **Push to PMSPA** on the day view, and the sync flags (SCR-062), wired to API-INT-001…016. The UI is the prototype
`eefe787`; this spec lists only the delta.

## Decisions
| # | Decision | Source |
| --- | --- | --- |
| D1 | The prototype's `proposed-types.ts` becomes `types.ts` (aliases of `@/lib/api/schema` with the same names) in the prototype and in production; every import of it switches; the mock client drops `PmspaPaths`; `proposed-types.ts` is deleted. | prototype.md (*Mock data layer*), as feat-hard-delete |
| D2 | Promotion = the twin copy (no `P` rows: several prototype files change first, D1 and D3): `sed -e 's#@/proto/mock/client#@/lib/api/client#' -e 's#@/proto/#@/#g' proto/features/x > features/x`, then Prettier. Existing production files are replaced the same way. | As feat-hard-delete D5 |
| D3 | `pmspaProblemText(error)` in `sync.ts` maps the PMSPA problems to OQ-182's lines; each generic error line of the prototype uses it first. Changed in the prototype and production together. | OQ-182 (owner) |
| D4 | The Connectors section is a client component in the sidebar (`connectors-nav.tsx`), shown while `usePmspaConnection` says a connection is saved; the main menu stays static. | Agent: the prototype sidebar does this in `mock/shell` (never promoted) |

## Scope
**In:** the type switch (D1); the promoted integration domain; the replaced settings, project, task and time twins; the error lines (D3);
`lib/routes.ts`, the sidebar section, the connector route; `npm run api:types`.

**Before the tests are written:** feat-int-conn-api, feat-int-sync-api and feat-int-time-api are done (`api/openapi.json` has API-INT-001…016).

**Non-goals** (implementers must not touch these):
- `api/`. Markup, copy or layout of the promoted files beyond D1 and D3. The prototype's `mock/` other than D1's type imports.
- The CSP (not implemented yet; security.md lists `images.unsplash.com` for when it is).
- `*.ac.test.ts(x)` files written in the test step.

## Read first
| Path | Why / copy this |
| --- | --- |
| `web/proto/features/integrations/api.ts` | The mock hooks; production's `features/integrations/api.ts` is its twin |
| `web/proto/features/integrations/proposed-types.ts` | The names `types.ts` keeps (D1) |
| `specs/03-api/endpoints.md#pmspa-errors` | The slugs D3 maps |
| `web/features/time/types.ts` | A `types.ts` of schema aliases to copy (D1) |
| `web/lib/api/problem.ts` | `isApiError`, `ApiError.slug`, `problem` extensions |
| `web/app/(dashboard-layout)/layout/vertical/sidebar/app-sidebar.tsx`, `web/app/(dashboard-layout)/layout/vertical/sidebar/sidebaritems.ts` | Where D4 goes |
| `web/app/(dashboard-layout)/app/settings/page.tsx` | The page pattern for the connector route |
| `web/proto/mock/shell/proto-sidebar.tsx`, `web/proto/mock/shell/proto-sidebar-items.ts` | The prototype's Connectors section to mirror |

## Files
| App | File | C/M | Task | Notes |
| --- | --- | --- | --- | --- |
| web | `web/features/integrations/api.ac.test.tsx` | C | tests | Hooks: paths, keys, invalidation |
| web | `web/features/integrations/sync.ac.test.ts` | C | tests | `pmspaProblemText`, labels, `useSlowPmspa` |
| web | `web/app/(dashboard-layout)/layout/vertical/sidebar/connectors-nav.ac.test.tsx` | C | tests | D4 |
| web | `web/features/integrations/components/sync-preview-dialog.ac.test.tsx` | C | tests | Choices sent, Sync 0 records, result, error lines |
| web | `web/lib/api/schema.d.ts` | M | T1 | `npm run api:types` |
| web | `web/proto/features/integrations/types.ts`, `web/features/integrations/types.ts` | C | T1 | D1; production = the twin (D2) |
| web | `web/proto/features/integrations/proposed-types.ts` | D | T1 | `rm` (D1) |
| web | `web/proto/features/integrations/api.ts`, `web/proto/features/integrations/schemas.ts`, `web/proto/features/integrations/sync.ts` | M | T1 | D1 imports; `sync.ts` also D3 |
| web | `web/proto/mock/client.ts`, `web/proto/mock/pmspa.ts`, `web/proto/mock/shell/pmspa-mock-switch.tsx` | M | T1 | D1 imports, `createClient<paths>` |
| web | `web/features/integrations/api.ts`, `web/features/integrations/schemas.ts`, `web/features/integrations/sync.ts` | C | T1 | The twins (D2) |
| web | `web/proto/features/integrations/components/pmspa-connection-card.tsx` | M | T1 | D1 imports; D3 |
| web | `web/proto/features/integrations/components/connection-status-badge.tsx` | M | T1 | D1 imports |
| web | `web/features/integrations/components/integrations-settings.tsx`, `web/features/integrations/components/pmspa-connection-card.tsx`, `web/features/integrations/components/pmspa-account.tsx`, `web/features/integrations/components/connection-status-badge.tsx`, `web/features/integrations/components/cold-start-hint.tsx` | C | T1 | The twins (D2) |
| web | `web/features/settings/components/settings-view.tsx` | M | T1 | Replaced by the twin (D2) |
| web | `web/lib/routes.ts` | M | T1 | `connectors: { pmspa: "/app/connectors/pmspa" }` under `app` |
| web | `web/app/(dashboard-layout)/layout/vertical/sidebar/sidebaritems.ts`, `web/app/(dashboard-layout)/layout/vertical/sidebar/app-sidebar.tsx` | M | T1 | D4 |
| web | `web/app/(dashboard-layout)/layout/vertical/sidebar/connectors-nav.tsx` | C | T1 | D4 |
| web | `web/proto/features/integrations/components/pmspa-connector.tsx`, `web/proto/features/integrations/components/pmspa-projects-tab.tsx`, `web/proto/features/integrations/components/pmspa-time-tab.tsx`, `web/proto/features/integrations/components/sync-preview-dialog.tsx`, `web/proto/features/integrations/components/push-button.tsx`, `web/proto/features/integrations/components/sync-flag.tsx`, `web/proto/features/integrations/components/pmspa-record-note.tsx` | M | T2 | D1 imports; D3 |
| web | `web/features/integrations/components/pmspa-connector.tsx`, `web/features/integrations/components/pmspa-projects-tab.tsx`, `web/features/integrations/components/pmspa-time-tab.tsx`, `web/features/integrations/components/expand-all-button.tsx`, `web/features/integrations/components/sync-preview-dialog.tsx`, `web/features/integrations/components/push-button.tsx`, `web/features/integrations/components/sync-flag.tsx`, `web/features/integrations/components/pmspa-record-note.tsx` | C | T2 | The twins (D2), after the change |
| web | `web/app/(dashboard-layout)/app/connectors/pmspa/page.tsx` | C | T2 | From `app/proto/app/connectors/pmspa/page.dev.tsx`, importing `@/features/…` |
| web | `web/features/projects/components/project-detail.tsx`, `web/features/projects/components/projects-list.tsx`, `web/features/tasks/components/task-detail.tsx`, `web/features/tasks/components/tasks-list.tsx`, `web/features/time/components/day-view.tsx`, `web/features/time/components/log-row.tsx` | M | T2 | Replaced by the twin (D2) |

## Interfaces

### Types and hooks (T1)
- `npm run api:types`. `web/proto/features/integrations/types.ts`: one `export type <Name> = components["schemas"]["<Name>Dto">]` (or the enum
  schema) for every type `proposed-types.ts` exports except `PmspaPaths`, with the same names, e.g. `export type PmspaConnectionDto =
  components["schemas"]["PmspaConnectionResponseDto"]`. Where a schema name differs from the prototype's, alias it; where the prototype's
  type is a union the schema can't name (`PmspaRecordDetail`, `SyncChoiceDto`), use the schema's `oneOf` type as generated. Then replace
  `"./proposed-types"` / `"../proposed-types"` / `"@/proto/features/integrations/proposed-types"` with `types` everywhere under `web/proto`,
  `createClient<paths & PmspaPaths>` → `createClient<paths>` in `mock/client.ts`, and `rm proposed-types.ts`. Typecheck must pass
  before promoting.
- `features/integrations/api.ts` = the twin of the prototype's. Hook names, keys and invalidations stay exactly as the prototype has them.

### Error lines (T1, T2)
```ts
// sync.ts (both twins)
/** OQ-182: a line for a PMSPA problem, or null to keep the screen's own line. */
export function pmspaProblemText(error: unknown): string | null;
// isApiError(error, 503, "pmspa-rate-limited") → `PMSPA is busy. Try again in ${Math.max(1, Math.ceil(retryAfterSeconds / 60))} minute(s).`
//   ("1 minute", "N minutes"; retryAfterSeconds from error.problem, 900 when absent)
// 409 "pmspa-sync-running" → "Another import, sync or push is still running."
// 409 "pmspa-invalid-credentials" → "PMSPA rejected the saved email or password."
// 502 "pmspa-unreachable" → "PMSPA couldn't be reached."      anything else → null
```
Where it applies (each in the prototype file, then the twin):
- `pmspa-projects-tab.tsx`, `pmspa-time-tab.tsx`: the error state's `EmptyDescription` = `pmspaProblemText(query.error) ?? "PMSPA may be unreachable."`.
- `sync-preview-dialog.tsx`: a new prop `error: unknown` beside `isError` (callers pass the preview mutation's `error`); the preview error
  line = `pmspaProblemText(error) ?? "Couldn't prepare the preview. PMSPA may be unreachable."`. The commit failure keeps the error
  (`useState<unknown>`) and reads `{pmspaProblemText(e) ?? `Couldn't ${verb.toLowerCase()}.`} Some records may have been written: open the
  preview again to see where things stand.` `push-button.tsx` and `pmspa-connector.tsx` pass `error`.
- `pmspa-record-note.tsx`: `pmspaProblemText(detail.error) ?? "Couldn't read the PMSPA <noun> right now."`.
- `pmspa-connection-card.tsx`: each `toast.error("Couldn't …")` → `toast.error(pmspaProblemText(error) ?? "Couldn't …")`.

### Sidebar and route (T1, T2)
```ts
// sidebaritems.ts: export const connectorItems: MenuItem (heading "Connectors", item id "pmspa", name "PMSPA", icon Globe, url routes.app.connectors.pmspa)
// connectors-nav.tsx ("use client"): export function ConnectorsNav(): JSX.Element | null
//   usePmspaConnection(); data && data.status !== "not-configured" → <NavCollapse menu={[connectorItems]} className="text-sm" />, else null
// app-sidebar.tsx: <ConnectorsNav /> right after the main <NavCollapse>, inside the same <Suspense>
```
`app/(dashboard-layout)/app/connectors/pmspa/page.tsx`: the prototype page with `@/features/integrations/components/pmspa-connector`
(metadata title "PMSPA", `<Suspense fallback={null}>`).

## Acceptance criteria
| AC | Case → expected | Test | Task |
| --- | --- | --- | --- |
| AC-1 | `usePmspaConnection` → `GET /api/v1/integrations/pmspa` under `["integrations","pmspa","connection"]`; `useSavePmspaConnection` → `PUT` with the body, sets the connection data, invalidates links and remote; `useDisconnectPmspa` → `DELETE`, removes remote queries, invalidates `["integrations","pmspa"]` | `web/features/integrations/api.ac.test.tsx` | T1 |
| AC-2 | `usePmspaLinks("task")` is disabled while not configured; enabled → `GET …/links?type=task`, data a `Map` by `pm4Id`; `usePmspaLinkDetail` uses `staleTime` 5 min and no retry | `web/features/integrations/api.ac.test.tsx` | T1 |
| AC-3 | `useImport`, `useSync`, `usePush` → `POST …/import`, `…/sync`, `…/push`; on success each invalidates `["integrations","pmspa"]`, `["projects"]`, `["tasks"]`, `["time"]`, `["bookings"]`; the previews invalidate nothing | `web/features/integrations/api.ac.test.tsx` | T1 |
| AC-4 | `pmspaProblemText`: 503 `pmspa-rate-limited` `retryAfterSeconds 600` → "PMSPA is busy. Try again in 10 minutes."; 30 → "… in 1 minute."; the three other slugs → their lines; a 500 or a plain `Error` → null | `web/features/integrations/sync.ac.test.ts` | T1 |
| AC-5 | `syncedLine("imported", "2026-10-15T20:50:00Z", "Europe/Zagreb")` → "Synced from PMSPA on 15 October 2026 at 22:50"; `STATUS_LABEL`; `useSlowPmspa` turns true after 3 s and false when the call ends | `web/features/integrations/sync.ac.test.ts` | T1 |
| AC-6 | `ConnectorsNav`: not configured → nothing; invalid credentials → a "Connectors" heading and a "PMSPA" link to `/app/connectors/pmspa` | `web/app/(dashboard-layout)/layout/vertical/sidebar/connectors-nav.ac.test.tsx` | T1 |
| AC-7 | Sync preview dialog (sync of a task): a `differs` row preselects its `direction`; picking Link only on every row → the button "Sync 0 records", disabled; choosing Overwrite PMSPA → "Sync 1 record" and `onRun` gets `[{key, kind: "link", id: linkedId, overwrite: "to-pmspa"}]`; the result row with `newTitle` shows "old → new" | `web/features/integrations/components/sync-preview-dialog.ac.test.tsx` | T2 |
| AC-8 | The dialog with a preview error 503 `pmspa-rate-limited` shows the busy line; a commit rejected with 409 `pmspa-sync-running` shows "Another import, sync or push is still running. Some records may have been written: open the preview again to see where things stand." | `web/features/integrations/components/sync-preview-dialog.ac.test.tsx` | T2 |
| AC-9 | No `proposed-types.ts` under `web/proto/features/integrations`; nothing imports it; `web/features` has no `@/proto` import; `pm4 twins` reports no failure; the build has `out/app/connectors/pmspa.html` | `check` | T2 |
| AC-10 | Locally against the API and the owner's local PMSPA: connect in Settings → Integrations (the Connectors section appears); browse, select and import a project with its tasks; sync a renamed PM4 task with Overwrite PMSPA; push a day; hover and click the sync flags; disconnect (the section and flags go) | `manual` | T2 |

## Checks
```bash
# AC-9: types switched, prototype promoted, connector page built
test ! -e web/proto/features/integrations/proposed-types.ts
! grep -rn "proposed-types" web/proto/features/integrations web/proto/mock web/features/integrations
! grep -rn "@/proto" web/features web/lib web/app --include=*.ts --include=*.tsx | grep -v "^web/app/proto/"
node scripts/pm4.mjs twins
test -f web/out/app/connectors/pmspa.html
```

## Tasks
| # | Task | App | Size | Tier | Why this tier | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | Types switch (D1), `features/integrations/api.ts`, `sync.ts` with `pmspaProblemText`, the Settings → Integrations tab, routes and the Connectors sidebar section | web | M | haiku | Promote + twins (D2); the helper and the sidebar component are spelled out | — (feat-int-time-api done) |
| T2 | The connector page and route, the dialog, Sync / Push buttons, sync flags, the error lines, and the project/task/day twins | web | M | haiku | Promote + twins (D2); every change is listed under *Error lines* | T1 |

## Open questions
None.

## Changelog
- 2026-10-17: Initial draft (prototype `eefe787`; OQ-140, OQ-175, OQ-182). Ready for review.
- 2026-10-17: Approved by the owner.
