---
id: T-0112
title: Manifest, theme colour, the service worker, the build script that writes out/sw.js, and its registration
milestone: M0
app: web
status: done
size: M
tier: sonnet
depends_on: []
feature_spec: specs/06-features/shell-pwa.md
spec_row: T1
ac_files:
  - { path: web/scripts/build-sw.ac.test.ts, sha256: 227350b3a699f4b2b4486744a17b063912ec1a6b77b232d03161b485e5410806 }
  - { path: web/sw/service-worker.ac.test.ts, sha256: bf1d24c8ba894be9cf6f73dd3c0397054c7b5c94898d674de6025ca9d5c05249 }
  - { path: web/features/system/components/service-worker-registration.ac.test.tsx, sha256: 24d727d9beacf9a4b11525a7c7584bda25a60bd9008e42f58b1fe08f9f381ac7 }
---

# T-0112: Manifest, theme colour, the service worker, the build script that writes out/sw.js, and its registration

**Tier reason:** First service worker and build-time code generation; cache ordering and update behaviour that passing tests don't fully prove (the algorithm is written out in *Interfaces*)

Work from the brief: `node scripts/pm4.mjs brief T-0112`. Verify with `node scripts/pm4.mjs check T-0112`.

## Implementation notes
Implemented per spec reference code; `app/manifest.ts` with `force-static` builds fine under `output: "export"`.
pm4 check T-0112: PASS (lint, format, typecheck, test, build, AC-13 ok; AC-16 skipped, later task).

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | sonnet | PASS | All files per Interfaces; check passed first run |

## Review
**Verdict: approve** (Opus reviewer, 2026-10-25). Build script, worker, registration, manifest and root layout match
*Interfaces* and D2/D4/D8/D9; cross-origin and non-GET requests bypass the worker; `out/` is 159 files / 4.6 MB, all
precached; no non-goals touched.
- Minor (fixed by the main session): `web/AGENTS.md` *Structure* and the commands table now list `app/manifest.ts`,
  `sw/service-worker.js`, `scripts/build-sw.mts` and that `postbuild` writes `out/sw.js`. Not in the spec's *Files*
  table, so `pm4 check --feature` scope lists `web/AGENTS.md`; that is expected.
- For the owner, no change: with D2 (skipWaiting + claim), a tab left open across a deploy loses the old cache, so a
  not-yet-fetched lazy chunk can 404. The same already happens without a worker; not a regression.
- Tier: sonnet worked; haiku would probably have managed, given *Interfaces* spells out the code.
