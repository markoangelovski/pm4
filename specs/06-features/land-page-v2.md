---
id: feat-land-page-v2
title: "Landing page v2: product tour, live duration box, FAQ"
status: approved
owner: Marko Angelovski
last_updated: 2026-11-14
milestone: M7
requirements: [FR-LAND-001, FR-LAND-002, SCR-003]
related: [req-landing, web-screens, web-static-export, web-prototype, feat-land-redesign, feat-acct-web, OQ-269]
prototype: 8ad4bac
---

# Landing page v2: product tour, live duration box, FAQ

## Goal
The landing page `/` gets the owner-approved v2 design: a hero with a **product tour** (an app window whose sidebar switches
between pictures of Logs, Bookings, Dashboard and Projects), a **live duration box** and a **copyable booking prompt**
(both work on sample content in the browser), an "Also in PM4" grid, an **FAQ** (`#faq`), a smooth scroll for in-page links, and the
header/hero/closing call to action in the new sizes (FR-LAND-001, FR-LAND-002, SCR-003). It replaces the page of `feat-land-redesign`.

## Decisions
| # | Decision | Source |
| --- | --- | --- |
| D1 | The screen pictures are still drawn in code with the fictional sample (Orbit app, Atlas website, Internal): `landing-screens.tsx` (full screens) and `landing-visuals.tsx` (small pictures) replace `landing-vignettes.tsx`, which is deleted | Owner, prototype `8ad4bac` |
| D2 | `LandingPage` stays a server component taking `cta: LandingCtaSlot`. The tour, duration box and prompt button are client components (`landing-interactive.tsx`); the tour gets its server-rendered screens as props | Owner, prototype `8ad4bac` |
| D3 | The interactive pieces use sample content only: no API call, no user data, no storage. The duration box uses the app's own `parseDurationInput` and `formatDuration` | Owner, prototype `8ad4bac` |
| D4 | The header call to action is now `{ size: "lg" }` and the closing one `{ size: "lg", variant: "secondary" }` (was outline/sm in the header); the hero's is `{ size: "lg" }` | Owner, prototype `8ad4bac` |
| D5 | Section nav (`Sections`): Time, Bookings, Dashboard, Projects, Notes, **FAQ**. The footer nav (`Footer`) adds Integrations. The FAQ lead links Privacy and Terms | Owner, prototype `8ad4bac` |
| D6 | In-page anchor jumps scroll smoothly (`SmoothScroll`), except with `prefers-reduced-motion: reduce` | Owner, prototype `8ad4bac` |
| D7 | No change to `app/page.tsx`, the metadata, the Open Graph tags or the CTA: the hero lead text still equals the OG description (FR-LAND-003, OQ-269) | Owner, prototype `8ad4bac` |

## Scope
**In:** the landing components' twins of `web/proto/features/landing/components/*` (4 new, 2 changed, 1 deleted) and the
rewrite of the existing landing acceptance tests.

**Test step (main session):** rewrites `landing-page.ac.test.tsx` (AC-1…AC-8) and adds the stubs below, then `pm4 hash`.
`web/app/page.ac.test.tsx`, `web/app/components/shared/landing-cta.ac.test.tsx`, `web/app/links.ac.test.tsx` and
`web/app/legal.ac.test.tsx` stay as they are and must still pass.

**Non-goals** (implementers must not touch these):
- `api/`, `web/proto/**`, `web/components/ui/*`, `web/lib/**`, `web/app/**` (page, layout, CTA), `web/next.config.ts`.
- `web/features/landing/components/landing-theme-toggle.tsx` (equal to its twin already).
- Open Graph tags, `noindex`, the `/home` not-found: unchanged.

## Read first
| Path | Why / copy this |
| --- | --- |
| `web/proto/features/landing/components/landing-page.tsx` | The page the twin copies; `LandingCtaSlot` and the three `cta(...)` calls |
| `web/proto/features/landing/components/landing-interactive.tsx` | The client components and their roles / labels |
| `web/features/landing/components/landing-page.tsx` | The production file being replaced (keeps the same exports) |
| `web/lib/time/index.ts`, `web/features/time/duration.ts` | `formatDuration`, `parseDurationInput`: the production files the twins import |

## Files
| App | File | C/M | Task | Notes |
| --- | --- | --- | --- | --- |
| web | `web/features/landing/components/landing-page.ac.test.tsx` | M | tests | Acceptance tests (AC-1…AC-8) |
| web | `web/vitest.setup.ts` | M | tests | `matchMedia` stand-in when jsdom has none, so `app/page.ac.test.tsx` still passes with `SmoothScroll` |
| web | `web/features/landing/components/landing-page.tsx` | M | T1 | Twin |
| web | `web/features/landing/components/landing-sample.ts` | M | T1 | Twin |
| web | `web/features/landing/components/landing-screens.tsx` | C | T1 | Twin |
| web | `web/features/landing/components/landing-visuals.tsx` | C | T1 | Twin |
| web | `web/features/landing/components/landing-interactive.tsx` | C | T1 | Twin (client) |
| web | `web/features/landing/components/smooth-scroll.tsx` | C | T1 | Twin (client) |
| web | `web/features/landing/components/landing-vignettes.tsx` | delete | T1 | Replaced by screens + visuals; nothing else imports it |

## Interfaces

### Twins (T1)
From `web/`:
```bash
cd features/landing/components
for f in landing-page.tsx landing-sample.ts landing-screens.tsx landing-visuals.tsx landing-interactive.tsx smooth-scroll.tsx; do
  sed 's#@/proto/#@/#g' "../../../proto/features/landing/components/$f" > "$f"
done
rm landing-vignettes.tsx
cd ../../.. && npx prettier --write features/landing/components
```
`@/proto/` imports in these files and where they go: `@/proto/lib/routes` → `@/lib/routes` (has `privacy`, `terms`),
`@/proto/features/time/duration` → `@/features/time/duration`, `@/proto/features/time/components/deleted-marker` →
`@/features/time/components/deleted-marker`. All three production files exist and equal their twins. None imports
`@/proto/mock/`. Don't change anything else. The files only use `lucide-react`, `next/image`, `next/link`, `next-themes` and
the shadcn components already in `components/ui/` (accordion, tabs, input, button): no new dependency.

Stubs for the test step: none needed, `LandingPage`'s signature is unchanged.

## Acceptance criteria
`landing-page.ac.test.tsx` keeps its mocks (`next/font/google`, `next/link`, `next/image`, `next-themes`). Interactive cases use `fireEvent`;
the clipboard is `vi.stubGlobal("navigator", { clipboard: { writeText } })`, and `matchMedia` is stubbed (jsdom has none; `SmoothScroll` reads it).

| AC | Case → expected | Test | Task |
| --- | --- | --- | --- |
| AC-1 | FR-LAND-002: `<LandingPage cta={spy} />` calls `spy` three times, in order with `{ size: "lg" }` (header), `{ size: "lg" }` (hero) and `{ size: "lg", variant: "secondary" }` (closing), and renders what it returns each time | `web/features/landing/components/landing-page.ac.test.tsx` | T1 |
| AC-2 | FR-LAND-001: one `h1`; sections `#day`, `#time`, `#bookings`, `#dashboard`, `#projects`, `#notes`, `#integrations`, `#faq`, each labelled by a non-empty heading; the `Sections` nav links to `#time`, `#bookings`, `#dashboard`, `#projects`, `#notes`, `#faq` in that order; a `Footer` nav and a `contentinfo` footer | `web/features/landing/components/landing-page.ac.test.tsx` | T1 |
| AC-3 | FR-LAND-001: rendering the page, switching the tour, typing in the duration box and copying the prompt make no request (`fetch` spy not called) | `web/features/landing/components/landing-page.ac.test.tsx` | T1 |
| AC-4 | Theme switch: `resolvedTheme` `"light"` → button "Switch to dark mode"; click → `setTheme("dark")`. `"dark"` → "Switch to light mode"; click → `setTheme("light")` | `web/features/landing/components/landing-page.ac.test.tsx` | T1 |
| AC-5 | FR-LEGAL-003: the footer links "Privacy" (`/privacy`) and "Terms" (`/terms`) | `web/features/landing/components/landing-page.ac.test.tsx` | T1 |
| AC-6 | Product tour: the `PM4 screens` tablist has the tabs Logs, Bookings, Statistics, Projects (Statistics sits under the Dashboard group); Logs is selected first; clicking Bookings selects it and shows its panel | `web/features/landing/components/landing-page.ac.test.tsx` | T1 |
| AC-7 | Duration box (FR-TLOG-011 rules, sample only): starting value `1.5` shows `1h 30m`; typing `20` sets `aria-invalid` and shows the field error; clicking an example chip (e.g. `1:15`) puts it in the box and shows `1h 15m` | `web/features/landing/components/landing-page.ac.test.tsx` | T1 |
| AC-8 | Prompt copy: clicking "Copy to clipboard" calls `navigator.clipboard.writeText` with the sample prompt and the button then reads "Copied"; a rejected `writeText` leaves it at "Copy to clipboard" | `web/features/landing/components/landing-page.ac.test.tsx` | T1 |
| AC-9 | The build has the landing page with its sections, and the twins equal their prototype files | check | T1 |

## Checks
```bash
# AC-9: the built landing page has its sections; the twins are equal; the old file is gone
for id in day time bookings dashboard projects notes integrations faq; do grep -q "id=\"$id\"" web/out/index.html || { echo "missing #$id"; exit 1; }; done
test ! -e web/features/landing/components/landing-vignettes.tsx
node scripts/pm4.mjs twins
```

## Tasks
| # | Task | App | Size | Tier | Why this tier | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | Landing page v2: the six twins, delete `landing-vignettes.tsx` | web | S | haiku | Copy by the command under *Twins (T1)*, import mapping spelled out, no design decision | — |

## Open questions
None.

## Changelog
- 2026-11-14: T1 attempt 1: `web/vitest.setup.ts` gets a `matchMedia` stand-in (owner's choice) so `app/page.ac.test.tsx` passes with the unguarded `SmoothScroll` twin.
- 2026-11-14: Test step: AC-6 names the tour tab "Statistics" as the prototype does; the tests stub `matchMedia`.
- 2026-11-14: Initial draft from prototype `8ad4bac` (M7). Supersedes the page and ACs 1–4 of `feat-land-redesign`.
