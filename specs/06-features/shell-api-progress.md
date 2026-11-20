---
id: feat-shell-api-progress
title: API loading bar at the top of the window
status: approved
owner: Marko Angelovski
last_updated: 2026-11-20
milestone: M0
requirements: [SCR-009]
related: [web-screens, web-prototype, ADR-0012, OQ-283]
prototype: b2d6976
---

# API loading bar at the top of the window

## Goal
While the app waits on the API, a thin bar runs along the top of the window, as on GitHub (SCR-009, OQ-283). Fast answers
never show it.

## Decisions
| # | Decision | Source |
| --- | --- | --- |
| D1 | The bar runs while any TanStack Query query or mutation is in flight (`useIsFetching() + useIsMutating() > 0`), background refetches included; it appears only after 200 ms, has no spinner and isn't started by page navigation. | OQ-283 (owner, prototype `b2d6976`) |
| D2 | Built on `@bprogress/react` (already in `web/package.json` with the prototype), not `@bprogress/next`. | OQ-283 (owner, 2026-11-20) |
| D3 | Only in the app shell (`/app/**`), inside `AuthGuard` like the rate-limit notifier; not on the landing, sign-in or legal pages. | Agent, prototype `b2d6976` (the prototype shell is the `/app` shell) |

## Scope
**In:** the promoted `ApiProgressBar` and one line in the app layout.

**Non-goals** (implementers must not touch these):
- `web/proto/**` (the prototype's shell and "API speed" switch stay prototype-only), `web/package.json`, `web/package-lock.json`.
- Any other screen's own loading state (skeletons, pending buttons stay as they are).
- Any acceptance test (`*.ac.*`).

## Read first
| Path | Why / copy this |
| --- | --- |
| `web/proto/features/system/components/api-progress-bar.tsx` | The component, promoted unchanged |
| `web/app/(dashboard-layout)/layout.tsx` | Where it goes: after `<RateLimitNotifier />` |

## Files
| App | File | C/M | Task | Notes |
| --- | --- | --- | --- | --- |
| web | `web/features/system/components/api-progress-bar.ac.test.tsx` | C | tests | AC-1…AC-3 |
| web | `proto/features/system/components/api-progress-bar.tsx` → `features/system/components/api-progress-bar.tsx` | P | T1 | No `@/proto/` imports, so nothing to rewrite |
| web | `web/app/(dashboard-layout)/layout.tsx` | M | T1 | Import and render it |

## Interfaces

### Web (T1)
`pm4 promote` copies the component. In `web/app/(dashboard-layout)/layout.tsx`, below the `RateLimitNotifier` import:
```tsx
import { ApiProgressBar } from "@/features/system/components/api-progress-bar";
```
and render `<ApiProgressBar />` right after `<RateLimitNotifier />`, inside `SidebarProvider`.

## Acceptance criteria
The tests mock `@bprogress/react`: `ProgressProvider` renders its children and records its props, `useProgress()` returns `start`/`stop` spies.

| AC | Case → expected | Test | Task |
| --- | --- | --- | --- |
| AC-1 | A query starts → `start(0, 200)` once; it resolves → `stop()`. Two overlapping queries → one `start`, and `stop` only after the second ends | `web/features/system/components/api-progress-bar.ac.test.tsx` | T1 |
| AC-2 | A mutation in flight → `start(0, 200)`; it settles → `stop()` | `web/features/system/components/api-progress-bar.ac.test.tsx` | T1 |
| AC-3 | `ProgressProvider` gets `color="var(--primary)"`, `height="3px"`, `options.showSpinner` `false` | `web/features/system/components/api-progress-bar.ac.test.tsx` | T1 |
| AC-4 | The app layout renders `<ApiProgressBar />` | check | T1 |
| AC-5 | `npm run dev`, DevTools throttling *Slow 4G*: opening a project shows the bar at the top until its data is in; with no throttling, page changes don't flash it | manual | T1 |

## Checks
```bash
# AC-4: the app layout renders the bar
grep -q "<ApiProgressBar />" "web/app/(dashboard-layout)/layout.tsx"
```

## Tasks
| # | Task | App | Size | Tier | Why this tier | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | Promote `ApiProgressBar`, render it in the app layout | web | S | haiku | Promotion plus one import and one element | — |

## Agents
| Step | Agent | Date |
| --- | --- | --- |
| Prototype | `claude-code/claude-opus-5-5` | 2026-11-20 |
| Spec | `claude-code/claude-opus-5-5` | 2026-11-20 |
| Tasks (`pm4 tasks`) | `claude-code/claude-opus-5-5` | 2026-11-20 |
| Acceptance tests | `claude-code/claude-opus-5-5` | 2026-11-20 |

## Open questions
None. OQ-283 is resolved.

## Changelog
- 2026-11-20: Initial draft from prototype `b2d6976` (OQ-283). Ready for review.
- 2026-11-20: Approved by the owner.
