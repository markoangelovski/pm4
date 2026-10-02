---
id: feat-shell-sidebar-sections
title: Sidebar sections and fixed footer
status: approved
owner: Marko Angelovski
last_updated: 2026-10-02
milestone: M1
requirements: []
related: [web-routing, web-template, ADR-0005, OQ-054, feat-land-app-route-split, feat-shell-sidebar-branding]
---

# Sidebar sections and fixed footer

## Goal
The sidebar nav is grouped under headings, like the template's (`DASHBOARD › Modern`, `PAGES › Table…`),
and Trash and Settings move to a fixed footer at the bottom of the sidebar (where the template has
Help Center and Documentation). Behavior: [routing.md → Navigation](../04-web/routing.md#navigation) (OQ-054).

## Decisions
| # | Decision | Source |
| --- | --- | --- |
| D1 | Sections: **Dashboard** → Default (`/app`); **Project management** → Projects, Tasks; **Time** → Logs (`/app/time`). Only labels change; no route changes. | OQ-054 (owner, 2026-10-02) |
| D2 | Footer: Trash, then Settings, with no heading. Rendered by the same `NavCollapse`/`NavItem` as the main nav (same hover, filled active state). The template's plan/upgrade card (`nav-secondary.tsx`) is not used. | OQ-054 (owner) |
| D3 | Headings are stored in sentence case (`"Project management"`) and shown in capitals by the existing `uppercase` class in `nav-collapse`. | Agent: the template does the same |
| D4 | The footer items live in a separate named export `footerItems`, so the default export stays "the scrollable nav". | Agent |
| D5 | A section without `heading` renders no heading element at all (today it renders an empty line, and `...` when collapsed). | Agent: the footer has no heading |
| D6 | `sidebaritems.ac.test.ts` (AC-9 of feat-land-app-route-split) asserts the old flat order, so the test writer of this feature rewrites it to the new structure. Its old hash in T-0008 goes stale, so T-0007..T-0009 should be marked `done` before this feature's tests are written. | Agent |

## Scope
**In:** `sidebaritems.ts` (headings, labels, `footerItems`), `nav-collapse/index.tsx` (no heading when
absent), `app-sidebar.tsx` (the `SidebarFooter`), and the ordinary `sidebaritems.test.ts`.

**Non-goals** (implementers must not touch these):
- Routes and `web/lib/routes.ts` (no URL changes), the page files.
- `nav-items/index.tsx` (the hover is T-0012), the header, `full-logo.tsx` and the version pill (feat-shell-sidebar-branding).
- Help Center / Documentation links, the plan card, nested (collapsible) nav items.
- `web/components/ui/*`.

## Read first
| Path | Why / copy this |
| --- | --- |
| `specs/04-web/routing.md#navigation` | The sections and the footer |
| `web/app/(dashboard-layout)/layout/vertical/sidebar/sidebaritems.ts` | Current items, icons, `routes.*` |
| `web/app/(dashboard-layout)/layout/vertical/sidebar/nav-collapse/index.tsx` | Heading rendering (expanded and collapsed) |
| `web/app/(dashboard-layout)/layout/vertical/sidebar/app-sidebar.tsx` | `SidebarContent` + `Suspense` + `NavSkeleton` pattern |
| `web/components/ui/sidebar.tsx` | `SidebarFooter` |
| `web/app/components/shared/view-id-guard.test.tsx` | Mocking `next/navigation` in Vitest |

## Files
| App | File | C/M | Task | Notes |
| --- | --- | --- | --- | --- |
| web | `web/app/(dashboard-layout)/layout/vertical/sidebar/sidebaritems.ac.test.ts` | M | tests | Rewritten for the new structure (D6) |
| web | `web/app/(dashboard-layout)/layout/vertical/sidebar/nav-collapse/nav-collapse.ac.test.tsx` | C | tests | Acceptance tests |
| web | `web/app/(dashboard-layout)/layout/vertical/sidebar/sidebaritems.ts` | M | T1 | The test writer adds only `heading?: string` and an empty `export const footerItems: MenuItem[] = []` (stub) |
| web | `web/app/(dashboard-layout)/layout/vertical/sidebar/sidebaritems.test.ts` | M | T1 | Ordinary test: new names and order, and url + icon on the items of both exports |
| web | `web/app/(dashboard-layout)/layout/vertical/sidebar/nav-collapse/index.tsx` | M | T1 | No heading element without `heading` |
| web | `web/app/(dashboard-layout)/layout/vertical/sidebar/app-sidebar.tsx` | M | T1 | Add the `SidebarFooter` |

## Interfaces

### Nav data (T1)
```ts
// sidebaritems.ts
export interface MenuItem {
  heading?: string;   // new
  items?: ChildItem[];
}

const SidebarContent: MenuItem[] = [
  { heading: "Dashboard",          items: [{ id: "dashboard", name: "Default",  icon: House,        url: routes.app.dashboard }] },
  { heading: "Project management", items: [{ id: "projects",  name: "Projects", icon: FolderKanban, url: routes.app.projects },
                                           { id: "tasks",     name: "Tasks",    icon: ListTodo,     url: routes.app.tasks }] },
  { heading: "Time",               items: [{ id: "time",      name: "Logs",     icon: Clock,        url: routes.app.time }] },
];
export default SidebarContent;

/** The fixed sidebar footer (OQ-054): no heading. */
export const footerItems: MenuItem[] = [
  { items: [{ id: "trash",    name: "Trash",    icon: Trash2,   url: routes.app.trash },
            { id: "settings", name: "Settings", icon: Settings, url: routes.app.settings }] },
];
```
Update the doc comment above `SidebarContent` to describe the sections.

### Headings (T1)
In `nav-collapse/index.tsx`, render the heading `<span>` (both the expanded text and the collapsed `...`
variant) only when `section.heading` is a non-empty string. Nothing else in the file changes.

### Footer (T1)
In `app-sidebar.tsx`, after `</SidebarContent>`:
```tsx
<SidebarFooter className="border-t border-border p-3 group-data-[state=collapsed]:px-2">
  {/* usePathname suspends under Cache Components when dynamic params are unknown */}
  <Suspense fallback={<FooterSkeleton />}>
    <NavCollapse menu={footerItems} className="text-sm" />
  </Suspense>
</SidebarFooter>
```
`FooterSkeleton`: like `NavSkeleton`, with two `<Skeleton className="h-8 w-full" />` rows. Import
`SidebarFooter` from `@/components/ui/sidebar` and `footerItems` from `./sidebaritems`.
`SidebarContent` stays the scroll area, so the footer stays at the bottom while the nav scrolls.

## Acceptance criteria
| AC | Case → expected | Test | Task |
| --- | --- | --- | --- |
| AC-1 | Default export, as `[heading, [[id, name, url]…]]`: `["Dashboard", [["dashboard","Default","/app"]]]`, `["Project management", [["projects","Projects","/app/projects"],["tasks","Tasks","/app/tasks"]]]`, `["Time", [["time","Logs","/app/time"]]]` | `sidebaritems.ac.test.ts` | T1 |
| AC-2 | `footerItems`: one section with no `heading`, items `[["trash","Trash","/app/trash"],["settings","Settings","/app/settings"]]` | `sidebaritems.ac.test.ts` | T1 |
| AC-3 | All app routes still reachable: the URLs of both exports together are exactly `/app`, `/app/projects`, `/app/tasks`, `/app/time`, `/app/trash`, `/app/settings` (replaces feat-land-app-route-split AC-9) | `sidebaritems.ac.test.ts` | T1 |
| AC-4 | `NavCollapse` with the default export, sidebar expanded: shows the texts `Dashboard`, `Project management`, `Time`, and links `Default`, `Projects`, `Tasks`, `Logs` | `nav-collapse.ac.test.tsx` | T1 |
| AC-5 | `NavCollapse` with `footerItems`: no heading element; collapsed (`useSidebar` → `state: "collapsed"`) shows no `...`. With the default export collapsed, `...` shows 3 times | `nav-collapse.ac.test.tsx` | T1 |
| AC-6 | `NavCollapse` with `footerItems` at pathname `/app/settings`: the `Settings` link contains the active item (class `bg-primary`), and `Trash` doesn't | `nav-collapse.ac.test.tsx` | T1 |
| AC-7 | The built `/app` page has a sidebar footer with the Trash and Settings links | `check` | T1 |
| AC-8 | Expanded and collapsed: headings in capitals (`...` when collapsed), the footer pinned to the bottom with a top border, Settings filled when on `/app/settings`; light and dark | `manual` | T1 |

Test setup for `nav-collapse.ac.test.tsx`: mock `next/navigation` (`usePathname`) and
`@/components/ui/sidebar` (`useSidebar: () => ({ state })`), and mock `next/link` as a plain `<a>` (as in `web/app/links.ac.test.tsx`).

## Checks
```bash
# AC-7: the sidebar footer in the built /app page holds Trash and Settings
# (only between the footer and the main content, so the header's Settings link doesn't count)
node -e "const h=require('fs').readFileSync('web/out/app.html','utf8'); const a=h.indexOf('data-slot=\"sidebar-footer\"'), b=h.indexOf('data-slot=\"sidebar-inset\"', a); const f=h.slice(a, b); if (a<0 || b<0 || !f.includes('href=\"/app/trash\"') || !f.includes('href=\"/app/settings\"')) process.exit(1)"
```

## Tasks
| # | Task | App | Size | Tier | Why this tier | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | Group the sidebar nav into sections and move Trash and Settings to a fixed footer | web | S | sonnet | 4 files, all changes given; more than haiku's 3 files, no new pattern | — |

## Open questions
None. OQ-054 is resolved.

## Changelog
- 2026-10-02: Initial draft (OQ-054).
- 2026-10-02: Approved by the owner.
