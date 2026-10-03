---
id: T-0009
title: Implement LandingCta and use it on the landing page
milestone: M1
app: web
status: done
size: S
tier: haiku
depends_on: [T-0007, T-0008]
feature_spec: specs/06-features/land-app-route-split.md#tasks   # row "T3" of its Tasks table
requirements: [FR-LAND-002]
ac_files:
  - { path: web/app/components/shared/landing-cta.ac.test.tsx, sha256: 9e785f90b0af75a03ec39da548f5fc45d1d4bbe703c57e7529d0dccab693e093 }
---

# T-0009: Implement LandingCta and use it on the landing page

## Goal
Implement `LandingCta` / `LandingCtaFallback` and use them in `app/page.tsx`.

## Task
**Feature spec row:** T3. **Tier reason:** 2 files, fully specified in *Interfaces*; copies `view-id-guard.tsx`'s `useSearchParams` + `<Suspense>` pattern. Validation lives in T1's helper.

Read: this file → the feature spec (whole) → the files under its *Read first* → the app's `AGENTS.md`.
Change only the files that the spec's *Files* table assigns to T3.

## Acceptance criteria
- [ ] The acceptance tests listed in `ac_files` pass, and are unchanged (hashes match).
- [ ] `AC-6`–`AC-8` pass, and `AC-11`/`AC-12` still pass; lint/typecheck/test/build green.
- [ ] Definition of Done satisfied (`specs/05-quality/definition-of-done.md`).

## Blocked by (if status is blocked)
- T-0007 (spec T1)
- T-0008 (spec T2)

---

## Implementation notes
_Filled in by the implementer: changes, commands run and their real results, follow-ups._

`LandingCta` (Login → `signInHref(useSearchParams().get(RETURN_TO_PARAM))`) and `LandingCtaFallback` (`Skeleton`
sized with `buttonVariants`) implemented in `web/app/components/shared/landing-cta.tsx`; `web/app/page.tsx` renders
both CTAs inside `<Suspense>` with the matching fallbacks (header `outline`/`sm`, hero default). No `"use client"` on the page.

`pm4 check T-0009` (orchestrator run): lint/typecheck/test/build ok (24/24 tests), AC-11/AC-12/AC-13 ok; manual AC-14/AC-15
pending. Scope lists only `specs/04-web/static-export.md` and the feature spec, the orchestrator's own spec edits.

### Attempts
| # | Tier | Result (`done` / `BLOCKED` / `FAILED`) | Summary |
| --- | --- | --- | --- |
| 1 | haiku | done | AC-6–AC-8 pass on the first attempt |

## Review
**Verdict: approve** (Opus review, 2026-10-02). `LandingCta`/`LandingCtaFallback` exactly as specified (no fetch, no `localStorage`, button-sized skeleton); `app/page.tsx` stays a Server Component with both CTAs in `<Suspense>` (D9, checked by reading since AC-6–AC-8 test the component alone). No findings. Tier: haiku right.

Re-review (Opus, 2026-10-03): **approve** again. Minor: no test checks that `page.tsx` wraps the CTAs in `<Suspense>` (the build would fail without it). AC-7 still asserts `getItem` is never called, stricter than the spec row; feat-auth-web-session rewrites it.
