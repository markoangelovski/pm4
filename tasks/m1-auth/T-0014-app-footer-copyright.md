---
id: T-0014
title: "App footer: copyright line"
milestone: M1
app: web
status: done
size: S
tier: haiku
depends_on: []
feature_spec: —
files:
  - "web/app/(dashboard-layout)/layout/footer.tsx"
  - "web/app/(dashboard-layout)/layout/footer.test.tsx"
specs: [specs/04-web/template-adaptation.md#change, specs/04-web/routing.md#navigation]
ac_files: []
---

# T-0014: App footer: copyright line

**Tier reason:** haiku: one presentational component, all markup and copy given below; no state, data or decisions.

## Goal
The app shell footer shows the template's layout with PM4 content: a copyright line (OQ-055).

## Change
`web/app/(dashboard-layout)/layout/footer.tsx`: replace the whole file with the template's footer
(`next-shadcn-dashboard-main/app/(dashboard-layout)/layout/footer/page.tsx`), adapted:
```tsx
import Link from "next/link";

export default function Footer() {
  return (
    <div className="text-center">
      <p className="text-sm text-muted-foreground">
        © 2026 by{" "}
        <Link href="/" className="hover:text-primary text-muted-foreground">
          PM4
        </Link>
        , better project management for you.
      </p>

    </div>
  );
}
```
Differences from the template, all on purpose: no `"use client"` (nothing interactive), no `target="_blank"`
(internal links, same tab), `key` is the href, not the index. The year is fixed text, not computed.

Don't touch `layout.tsx` or any other file. No dependencies.

`web/app/(dashboard-layout)/layout/footer.test.tsx` (new, ordinary Vitest + Testing Library test). Mock
`next/link` with a plain anchor exactly like `web/app/links.ac.test.tsx` does, then render `<Footer />`.

## Acceptance criteria
- [ ] The test finds the paragraph text `© 2026 by PM4, better project management for you.` (normalized
      text content of the `<p>`).
- [ ] The test finds exactly one link, `PM4` → `/`, and it has no `target` attribute.
- [ ] Manual (`npm run dev`, `/app`): the footer shows the centered copyright. Hovering "PM4" turns it the primary
      color, and it opens the landing page in the same tab.

---

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

`footer.tsx` is the task's code verbatim; new `footer.test.tsx` (2 tests: copyright text, one link without `target`).
The manual check (`npm run dev`, `/app`) is left to the owner.

`pm4 check T-0014`: web lint, typecheck, test, build ok. Scope ok apart from
files of other uncommitted work: `scripts/pm4.mjs` (orchestrator fix) and T-0012's `nav-items/` files.

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | done | Footer from the task's code, unit tests, gates green |

## Review
_The owner's review (quick lane), or `review-feature`'s verdict._

Owner decision (2026-10-03), from the land-app-route-split re-review: the footer doesn't hard-code route literals (D3 of feat-land-app-route-split). `footer.tsx` uses `routes.landing`, so it differs from the task's verbatim code only there. Done in the main session; `pm4 check T-0014` gates green.
