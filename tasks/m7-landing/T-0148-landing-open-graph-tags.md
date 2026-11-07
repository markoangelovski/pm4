---
id: T-0148
title: Open Graph tags on the landing page
milestone: M7
app: web
status: done
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

`web/app/page.tsx`: `metadata` now has `metadataBase`, `openGraph` (type, url, siteName, title, description, image 1200x630 with alt) and the unchanged `title`; the `description` const is added above it. Nothing else changed; prettier left the file unchanged. Built `web/out/index.html` has og:title "PM4 — Every hour, accounted for.", og:description, og:image `http://localhost:3000/images/og/pm4-card.png` (local build fallback), og:image:width 1200, og:image:height 630, and `<meta name="robots" content="noindex, nofollow"/>`. `out/images/og/pm4-card.png` exists.

`node scripts/pm4.mjs check T-0148`:
```
pm4 check T-0148
  ac hashes: none recorded
  scope: ok
  web lint: ok (16s)
  web format:check: ok (5s)
  web typecheck: ok (13s)
  web test: ok (35s)
  web build: ok (27s)
  check checks: ok
  twins: ok (135 equal)

PASS T-0148
```

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | PASS | Added OG block to `page.tsx` metadata; check passed first time. |

## Review
_The owner's review (quick lane)._
