---
id: T-0012
title: Sidebar nav hover highlight like the template (CSS only)
milestone: M1
app: web
status: review
size: S
tier: haiku
depends_on: []
feature_spec: —
files:
  - "web/app/(dashboard-layout)/layout/vertical/sidebar/nav-items/index.tsx"
  - "web/app/(dashboard-layout)/layout/vertical/sidebar/nav-items/index.test.tsx"
specs: [specs/04-web/template-adaptation.md#change]
ac_files: []
---

# T-0012: Sidebar nav hover highlight like the template (CSS only)

**Tier reason:** haiku: one component, every class given below; no dependency, state or decisions.

## Goal
Hovering a sidebar nav item fades in the template's highlight layer (OQ-053), without the `motion` library.

## Change
`web/app/(dashboard-layout)/layout/vertical/sidebar/nav-items/index.tsx`, the root `<div>` of `NavItem`:
1. Replace the root class string with
   `"flex items-center gap-3 w-full group/item relative group-data-[state=collapsed]:px-2.5 px-3 py-2 my-0.5 rounded-md"`.
   That removes `group`, `transition-colors duration-150` and `hover:bg-primary/5`. Use the **named** group
   `group/item`: the sidebar root is also a `group`, so a plain `group-hover:` would light every item
   whenever the pointer is anywhere over the sidebar.
2. The active class becomes `isActive && "bg-primary text-background font-medium"` (drop `hover:bg-primary`).
   `className` is still merged last with `cn(...)`.
3. Add, as the first child of the root (before the existing content `<span>`):
   ```tsx
   {/* Hover highlight (template look without motion, OQ-053) */}
   <span
     aria-hidden="true"
     data-slot="nav-hover-bg"
     className="pointer-events-none absolute inset-0 rounded-lg bg-primary/5 opacity-0 transition-opacity duration-200 ease-out group-hover/item:opacity-100 motion-reduce:transition-none"
   />
   ```
   The content `<span>` keeps its `relative` class, so it stays above the layer.

Don't touch `nav-collapse/index.tsx`, `sidebaritems.ts` or any other file. No dependencies.

`web/app/(dashboard-layout)/layout/vertical/sidebar/nav-items/index.test.tsx` (new, ordinary Vitest +
Testing Library test, style of `web/app/components/shared/view-id-guard.test.tsx`). Render
`<NavItem item={{ name: "Projects", url: "/app/projects" }} hasChildren={false} />`. If `ChildItem` requires
more fields, add the minimum the type requires.

## Acceptance criteria
- [ ] The test finds exactly one `[data-slot="nav-hover-bg"]` element. It has `aria-hidden="true"` and the
      classes `bg-primary/5`, `rounded-lg`, `opacity-0`, `group-hover/item:opacity-100`, `motion-reduce:transition-none`.
- [ ] The test checks that the root element (the layer's parent) has the class `group/item`, and has neither
      `group` nor `hover:bg-primary/5` as a class.
- [ ] The test checks that with `isActive`, the root has `bg-primary` and still contains the layer.
- [ ] Manual (`npm run dev`, `/app`): hovering an item fades in the tint, and moving away fades it out.
      Hovering empty sidebar space highlights nothing. The same holds collapsed to icons, in dark mode, and
      over the active item. With the OS set to reduce motion, the tint appears without fading.

## Checks
```bash
# No motion library came back
! grep -q '"motion"\|"framer-motion"' web/package.json
```

---

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

`NavItem` root uses the named group `group/item` (no `hover:bg-primary/5`, no `transition-colors`). The first child is an
`aria-hidden` `data-slot="nav-hover-bg"` span that fades in on `group-hover/item` (`transition-opacity duration-200 ease-out`,
`motion-reduce:transition-none`). New `index.test.tsx` (3 tests) covers the layer, the root classes and the active state.

`pm4 check T-0012`: web lint, typecheck, test (27), build ok; check checks ok. Scope ok apart from
`scripts/pm4.mjs`, which is the orchestrator's separate fix to `pm4 check` (block-list `files:` parsing), not part of this task.

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | done | CSS-only hover layer and unit tests, gates green |

## Review
_The owner's review (quick lane), or `review-feature`'s verdict._
