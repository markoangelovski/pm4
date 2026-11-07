---
id: T-0148
title: Open Graph tags on the landing page
milestone: M7
app: web
status: blocked
size: S
tier: haiku
depends_on: [T-0147]
feature_spec: —
files: [web/app/page.tsx, web/public/images/og/pm4-card.png]
specs: [specs/01-requirements/landing.md#fr-land-003-not-indexed-by-search-engines, specs/04-web/brand-assets.md#open-graph-card]
ac_files: []
---

# T-0148: Open Graph tags on the landing page

## Goal
`/` has Open Graph title, description and image tags, so a shared link gets a preview card (FR-LAND-003, OQ-269).

## Change
The card `web/public/images/og/pm4-card.png` (1200 × 630) already exists. The main session drew it, and its recipe is in
`specs/04-web/brand-assets.md#open-graph-card`. Don't change it.

`web/app/page.tsx` (as T-0147 left it): replace `metadata` with the block below and change nothing else. `metadataBase`
makes the image URL absolute. `NEXT_PUBLIC_APP_URL` is set by CI and `web-deploy`
(`specs/02-architecture/environments.md`); it falls back to localhost in a local build.
```ts
const description =
  "PM4 keeps your projects and tasks in one place, logs your day in 15-minute blocks with a note on each, helps you book the time, and shows where the month went.";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ),
  title: "PM4 — Projects, tasks and time tracking",
  openGraph: {
    type: "website",
    url: "/",
    siteName: "PM4",
    title: "PM4 — Every hour, accounted for.",
    description,
    images: [
      {
        url: "/images/og/pm4-card.png",
        width: 1200,
        height: 630,
        alt: "PM4: Every hour, accounted for."
      }
    ]
  }
};
```
Then run `npx prettier --write app/page.tsx` from `web/`.

## Acceptance criteria
- [ ] `metadata.title` is unchanged, so T-0147's `web/app/page.ac.test.tsx` still passes.
- [ ] The built `out/index.html` has `og:title`, `og:description`, `og:image` (an absolute URL ending in
      `/images/og/pm4-card.png`), `og:image:width` 1200 and `og:image:height` 630, and still has `noindex`. The card is in `out/`.

## Checks
```bash
# FR-LAND-003: Open Graph tags on the landing page
f=web/out/index.html
grep -Eq '<meta property="og:title" content="PM4 [^"]* Every hour, accounted for."' "$f" || { echo "og:title"; exit 1; }
grep -q '<meta property="og:description" content="PM4 keeps your projects' "$f" || { echo "og:description"; exit 1; }
grep -Eq '<meta property="og:image" content="https?://[^"]+/images/og/pm4-card.png"' "$f" || { echo "og:image"; exit 1; }
grep -q '<meta property="og:image:width" content="1200"' "$f" || { echo "og:image:width"; exit 1; }
grep -q '<meta property="og:image:height" content="630"' "$f" || { echo "og:image:height"; exit 1; }
grep -q 'noindex' "$f" || { echo "noindex"; exit 1; }
test -f web/out/images/og/pm4-card.png
```

---

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |

## Review
_The owner's review (quick lane)._
