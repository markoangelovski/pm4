---
id: feat-land-redesign
title: "Landing page redesign: a full marketing page at /"
status: approved
owner: Marko Angelovski
last_updated: 2026-11-07
milestone: M7
requirements: [FR-LAND-001, FR-LAND-002, SCR-003]
related: [req-landing, web-screens, web-static-export, web-prototype, feat-land-app-route-split, OQ-151, OQ-268]
prototype: dd84712
---

# Landing page redesign: a full marketing page at /

## Goal
The landing page `/` becomes a full marketing page covering everything PM4 does: time, bookings, dashboard, projects
and notes, each with a picture of the screen drawn in code. Around those five it has a hero, a "How a day works"
section (`#day`), the PMSPA integration (`#integrations`, linked from the footer), an "Also in PM4" grid of smaller
features and a closing section. It also gets a light/dark switch in the header (FR-LAND-001, SCR-003). The "Go to app" / "Login" button keeps its behavior (FR-LAND-002) and now appears in the
header, the hero and the closing section.

## Decisions
| # | Decision | Source |
| --- | --- | --- |
| D1 | The screen pictures are drawn in code (`landing-vignettes.tsx`, sample data in `landing-sample.ts`), not screenshots. Prototype screens show the prototype banner, the dev badge, Croatian log texts and seed projects named after real companies. The drawings use fictional projects (Orbit app, Atlas website, Internal) and follow light/dark | Owner, prototype `4354292` |
| D2 | `LandingPage` is a server component that takes the call to action as a prop (`cta: LandingCtaSlot`), so the production file stays equal to its prototype twin. `app/page.tsx` passes a slot that wraps the real `LandingCta` in `<Suspense>` | Owner, prototype `4354292` |
| D3 | The page loads Geist Mono with `next/font/google` (no new dependency; `static-export.md` allows `next/font`). The chart colours copy the dashboard's `--dash-*` values as `--landing-*` | Owner, prototype `4354292` |
| D4 | A light/dark switch in the landing header (`LandingThemeToggle`): it starts from the system theme and behaves like the app header's switch | Owner, 2026-11-07, prototype `4354292` |
| D5 | The Dashboard copy names the real ranges: "today, this month, last month, the last 7, 30 or 90 days, this year, or a custom range of up to a year" | OQ-268 (owner, 2026-11-07), prototype `dd84712` |

## Scope
**In:** the four landing components (twins of `web/proto/features/landing/components/*`) and the rewrite of `web/app/page.tsx`.

**Test step (main session):** writes the two `*.ac.*` files and the `landing-page.tsx` stub below, then `pm4 hash`. The
existing `web/app/components/shared/landing-cta.ac.test.tsx` and `web/app/links.ac.test.tsx` stay as they are.

**Non-goals** (implementers must not touch these):
- `api/`, `web/proto/**`, `web/components/ui/*`, `web/lib/**`, `web/app/layout.tsx`, `web/next.config.ts`.
- `web/app/components/shared/landing-cta.tsx` (the CTA's behavior and its fallback are unchanged).
- The app header's theme switch (`web/app/(dashboard-layout)/layout/shared/header/light-dark.tsx`).
- Open Graph tags, the `/home` not-found, `noindex` (FR-LAND-003): unchanged by this feature.

## Read first
| Path | Why / copy this |
| --- | --- |
| `web/proto/features/landing/components/landing-page.tsx` | The page the twin copies; `LandingCtaSlot` and where `cta(...)` is called |
| `web/app/proto/page.dev.tsx` | How the prototype passes `cta`; production passes the real CTA instead |
| `web/app/components/shared/landing-cta.tsx` | `LandingCta` / `LandingCtaFallback`, their `variant` / `size` props |
| `web/app/page.tsx` | The page being replaced: its `metadata` and the `<Suspense>` + fallback pattern |

## Files
| App | File | C/M | Task | Notes |
| --- | --- | --- | --- | --- |
| web | `web/features/landing/components/landing-page.ac.test.tsx` | C | tests | Acceptance tests (AC-1…AC-4) |
| web | `web/app/page.ac.test.tsx` | C | tests | Acceptance tests (AC-5…AC-7) |
| web | `web/features/landing/components/landing-page.tsx` | C | tests, T1 | Stub, then the twin |
| web | `web/features/landing/components/landing-vignettes.tsx` | C | T1 | Twin |
| web | `web/features/landing/components/landing-sample.ts` | C | T1 | Twin |
| web | `web/features/landing/components/landing-theme-toggle.tsx` | C | T1 | Twin |
| web | `web/app/page.tsx` | M | T1 | Renders `LandingPage` with the real CTA slot |

## Interfaces

### Twins (T1)
From `web/` (this overwrites the stub):
```bash
for f in landing-page.tsx landing-vignettes.tsx landing-sample.ts landing-theme-toggle.tsx; do
  sed 's#@/proto/#@/#g' "proto/features/landing/components/$f" > "features/landing/components/$f"
done
npx prettier --write features/landing/components
```
None of them imports `@/proto/mock/`. The only other `@/proto/` import is
`@/proto/features/time/components/deleted-marker` (`TombstoneIcon`), which becomes `@/features/time/components/deleted-marker`
(the production file exists and is equal to its twin). Don't change anything else in the four files.

The stub (written in the test step), `web/features/landing/components/landing-page.tsx`:
```ts
import type { ComponentProps, ReactNode } from "react";
import type { Button } from "@/components/ui/button";

type ButtonProps = ComponentProps<typeof Button>;

/** Renders the header's "Go to app" / "Login" call to action (FR-LAND-002) in the given style. */
export type LandingCtaSlot = (props: {
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
}) => ReactNode;

export function LandingPage(_props: { cta: LandingCtaSlot }): React.JSX.Element {
  throw new Error("not implemented (feat-land-redesign)");
}
```

### Page (T1)
`web/app/page.tsx` in full. It is a server component. `metadata` is unchanged:
```tsx
import type { Metadata } from "next";
import { Suspense } from "react";
import {
  LandingCta,
  LandingCtaFallback
} from "@/app/components/shared/landing-cta";
import {
  LandingPage,
  type LandingCtaSlot
} from "@/features/landing/components/landing-page";

export const metadata: Metadata = {
  title: "PM4 — Projects, tasks and time tracking"
};

/** "Go to app" / "Login" (FR-LAND-002); reads `?returnTo=`, so it renders inside <Suspense> with a same-size fallback. */
const cta: LandingCtaSlot = ({ variant, size }) => (
  <Suspense fallback={<LandingCtaFallback variant={variant} size={size} />}>
    <LandingCta variant={variant} size={size} />
  </Suspense>
);

/** Public landing page (SCR-003, FR-LAND-001/002). Outside the app shell and its auth guard. */
export default function Page() {
  return <LandingPage cta={cta} />;
}
```

## Acceptance criteria
Both test files mock `next/font/google` (`Geist_Mono: () => ({ variable: "font-geist-mono" })`), `next/image` (a plain
`<img>`, as `full-logo.ac.test.tsx`) and `next-themes` (`useTheme` returning a settable `resolvedTheme` and a
`setTheme` spy). `page.ac.test.tsx` also mocks `next/link` and `next/navigation` as `landing-cta.ac.test.tsx` does and
sets the session through `localStorage` (`pm4.refreshToken`), clearing it before each test.

| AC | Case → expected | Test | Task |
| --- | --- | --- | --- |
| AC-1 | FR-LAND-002: `<LandingPage cta={spy} />` calls `spy` three times, in order with `{ variant: "outline", size: "sm" }` (header), `{ size: "lg" }` (hero) and `{ size: "lg" }` (closing), and renders what it returns each time | `web/features/landing/components/landing-page.ac.test.tsx` | T1 |
| AC-2 | FR-LAND-001: one `h1`; sections `#time`, `#bookings`, `#dashboard`, `#projects`, `#notes`, each labelled by a heading; the `Sections` nav links to `#time`, `#bookings`, `#dashboard`, `#projects`, `#notes`; a `contentinfo` footer | `web/features/landing/components/landing-page.ac.test.tsx` | T1 |
| AC-3 | FR-LAND-001: rendering the page makes no request (`fetch` spy not called) | `web/features/landing/components/landing-page.ac.test.tsx` | T1 |
| AC-4 | Theme switch: `resolvedTheme` `"light"` → a button "Switch to dark mode"; click → `setTheme("dark")`. `"dark"` → "Switch to light mode"; click → `setTheme("light")` (jsdom has no `startViewTransition`, so the theme is set directly) | `web/features/landing/components/landing-page.ac.test.tsx` | T1 |
| AC-5 | FR-LAND-002: signed out, no query → three links "Login", each `href="/auth/sign-in"`; `?returnTo=%2Fapp%2Fprojects` → each `href="/auth/sign-in?returnTo=%2Fapp%2Fprojects"` | `web/app/page.ac.test.tsx` | T1 |
| AC-6 | FR-LAND-002: signed in → three links "Go to app", each `href="/app"`; with `?returnTo=%2Fapp%2Fprojects` → each `href="/app/projects"` | `web/app/page.ac.test.tsx` | T1 |
| AC-7 | `metadata.title` is `"PM4 — Projects, tasks and time tracking"` | `web/app/page.ac.test.tsx` | T1 |
| AC-8 | The build has the landing page with its sections, and the twins equal their prototype files | check | T1 |

Typed stub (created with the tests): `web/features/landing/components/landing-page.tsx` under *Twins (T1)*.

## Checks
```bash
# AC-8: the built landing page has its sections; the twins are equal
for id in time bookings dashboard projects notes; do grep -q "id=\"$id\"" web/out/index.html || { echo "missing #$id"; exit 1; }; done
node scripts/pm4.mjs twins
```

## Tasks
| # | Task | App | Size | Tier | Why this tier | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | Landing page: the four twins and `app/page.tsx` | web | S | haiku | Twin copy by the command under *Twins (T1)*; `app/page.tsx` is spelled out under *Page (T1)* | — |

## Open questions
None.

## Changelog
- 2026-11-07: Initial draft from prototypes `4354292`, `dd84712` (M7, OQ-151; OQ-268).
- 2026-11-07: Open questions empty; to `review`.
- 2026-11-07: Approved by the owner.
- 2026-11-07: *Goal* names the page's other sections from the prototype (`#day`, `#integrations`, "Also in PM4"); T-0147 review finding 1. No behavior change.
