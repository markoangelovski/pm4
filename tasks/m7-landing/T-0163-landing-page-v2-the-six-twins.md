---
id: T-0163
title: Landing page v2: the six twins, delete landing-vignettes.tsx
milestone: M7
app: web
status: done
size: S
tier: haiku
depends_on: []
feature_spec: specs/06-features/land-page-v2.md
spec_row: T1
ac_files:
  - { path: web/features/landing/components/landing-page.ac.test.tsx, sha256: a7b56fa5c9c20397a05907173aa0c9e5e57aac203885ed853e03427601c7a161 }
---

# T-0163: Landing page v2: the six twins, delete landing-vignettes.tsx

**Tier reason:** Copy by the command under *Twins (T1)*, import mapping spelled out, no design decision

Work from the brief: `node scripts/pm4.mjs brief T-0163`. Verify with `node scripts/pm4.mjs check T-0163`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- Copied the six twins from `web/proto/features/landing/components/` with `@/proto/` → `@/` (sed), deleted `landing-vignettes.tsx`, ran prettier (no changes). `pm4 twins`: 148 equal.
- `landing-page.ac.test.tsx` (AC-1…AC-9 incl. AC-9 checks): passes.
- BLOCKED: spec. `web/app/page.ac.test.tsx` (AC-5, AC-6, must stay as is) fails: the twin `smooth-scroll.tsx` calls `window.matchMedia(...)` unguarded in a `useEffect`, and jsdom has no `matchMedia`. The page test does not mock it (the landing AC test does, lines 70-72). Fixing needs a change outside the twin (guarding the call or a shared `vitest.setup.ts` polyfill), which the brief forbids.
- `pm4 check T-0163`: lint, format, typecheck, build, AC-9 and twins ok; web test FAIL (2 failed in `app/page.ac.test.tsx`, both `matchMedia is not a function`).
- Resolved (main session, owner's choice): `web/vitest.setup.ts` installs a `matchMedia` stand-in (`matches: false`) when jsdom has none; row added to the spec's *Files* table and changelog.
- `pm4 check T-0163` after the fix: ac hashes, lint, format:check, typecheck, test (426 passed), build, AC-9, twins (148 equal) all ok. The only scope flag is `specs/06-features/land-page-v2.md`, the main session's own spec edit for this fix.

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | BLOCKED: spec | Twins copied, landing AC tests pass; `app/page.ac.test.tsx` AC-5/AC-6 fail on unguarded `matchMedia` in `smooth-scroll.tsx` (jsdom). |
| — | main | fixed | Owner chose a `matchMedia` stand-in in `web/vitest.setup.ts` (test setup; spec *Files* row added). Twins unchanged. |

## Review
**Verdict: approve** (Opus reviewer, 2026-11-14). `pm4 check --feature` passed everything except scope. The only scope failure is the spec's own `web/vitest.setup.ts` row and changelog entry, which the owner approved. All six twins match the prototype, nothing imports `@/proto/*`, D2–D7 hold, and the non-goals are untouched.

Findings (all minor):
- The Attempts table had a duplicate main-session row. It was removed during the review.
- `PromptCopy` doesn't clear its 2 s `setTimeout` on unmount (`landing-interactive.tsx:230`). This is harmless. Fix it in a follow-up, starting with the prototype twin.
- AC-3 only spies on `fetch`, not XHR or `sendBeacon`. Reading the code shows no defect; the test simply covers less.

Owner manual checks: 360 px and desktop widths, light and dark themes (the tour's active tab), keyboard (tour arrows, chips, copy, accordion), smooth scroll with reduced motion, and clipboard on localhost.

Tier feedback: haiku was the right tier. The copy came out exact, and the one block was a spec gap that Haiku correctly reported instead of working around.
