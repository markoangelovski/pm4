---
id: T-0014
title: "App footer: copyright line and Terms and Conditions / Privacy links"
milestone: M1
app: web
status: ready
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

# T-0014: App footer: copyright line and Terms and Conditions / Privacy links

**Tier reason:** haiku: one presentational component, all markup and copy given below; no state, data or decisions.

## Goal
The app shell footer shows the template's layout with PM4 content: a copyright line and two legal links (OQ-055).

## Change
`web/app/(dashboard-layout)/layout/footer.tsx`: replace the whole file with the template's footer
(`next-shadcn-dashboard-main/app/(dashboard-layout)/layout/footer/page.tsx`), adapted:
```tsx
import Link from "next/link";

type FooterLink = {
  title: string;
  href: string;
};

const footerLinks: FooterLink[] = [
  { title: "Terms and Conditions", href: "/terms-and-conditions" },
  { title: "Privacy", href: "/privacy" },
];

export default function Footer() {
  return (
    <div className="flex md:flex-row flex-col items-center justify-between gap-3 text-center">
      <p className="text-sm text-muted-foreground">
        © 2026 by{" "}
        <Link href="/" className="hover:text-primary text-muted-foreground">
          PM4
        </Link>
        , better project management for you.
      </p>

      <div className="flex gap-4">
        {footerLinks.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="text-sm hover:text-primary text-muted-foreground"
          >
            {item.title}
          </Link>
        ))}
      </div>
    </div>
  );
}
```
Differences from the template, all on purpose: no `"use client"` (nothing interactive), no `target="_blank"`
(internal links, same tab), `key` is the href, not the index. The year is fixed text, not computed.

Do **not** create pages for `/terms-and-conditions` or `/privacy`: they show the not-found page for now.
Don't touch `layout.tsx` or any other file. No dependencies.

`web/app/(dashboard-layout)/layout/footer.test.tsx` (new, ordinary Vitest + Testing Library test). Mock
`next/link` with a plain anchor exactly like `web/app/links.ac.test.tsx` does, then render `<Footer />`.

## Acceptance criteria
- [ ] The test finds the paragraph text `© 2026 by PM4, better project management for you.` (normalized
      text content of the `<p>`).
- [ ] The test finds exactly three links: `PM4` → `/`, `Terms and Conditions` → `/terms-and-conditions`,
      `Privacy` → `/privacy`, and none of them has a `target` attribute.
- [ ] Manual (`npm run dev`, `/app`): the footer shows the copyright on the left and the two links on the
      right; below `md` they stack, centered. Hovering a link turns it the primary color. "Terms and
      Conditions" and "Privacy" open the not-found page in the same tab; "PM4" opens the landing page.

## Checks
```bash
# No page was created for the legal routes
! ls web/app/terms-and-conditions web/app/privacy 2>/dev/null
```

---

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |

## Review
_The owner's review (quick lane), or `review-feature`'s verdict._
