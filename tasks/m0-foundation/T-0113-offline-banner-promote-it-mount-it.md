---
id: T-0113
title: Offline banner: promote it, mount it in the app shell, and add it with the online retry to AuthGuard's unavailable screen
milestone: M0
app: web
status: done
size: S
tier: haiku
depends_on: [T-0112]
feature_spec: specs/06-features/shell-pwa.md
spec_row: T2
ac_files:
  - { path: web/features/system/components/offline-banner.ac.test.tsx, sha256: 646863911299e5dbb217564ff9adc1f1402c0972408edfc5d0c8c970e18ee532 }
  - { path: web/features/auth/components/auth-guard-offline.ac.test.tsx, sha256: def01e341a2af75d205ae0939badf6517565506da55be8983c9811a864061a12 }
---

# T-0113: Offline banner: promote it, mount it in the app shell, and add it with the online retry to AuthGuard's unavailable screen

**Tier reason:** Promote as is; two small edits spelled out in *Interfaces*

Work from the brief: `node scripts/pm4.mjs brief T-0113`. Verify with `node scripts/pm4.mjs check T-0113`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- `offline-banner.tsx` was already promoted in an earlier commit; diffed against `proto/`: identical, nothing changed.
- `app/(dashboard-layout)/layout.tsx`: `<OfflineBanner />` after `<Header />`.
- `features/auth/components/auth-guard.tsx`: `online` listener while unavailable (sets `checking`), unavailable screen wrapped with the banner as specified.

pm4 check T-0113:

```
  ac hashes: ok (2)
  scope: ok
  web lint: ok (18s)
  web format:check: ok (5s)
  web typecheck: ok (3s)
  web test: ok (32s)
  web build: ok (9s)
  check AC-13: manifest, theme colour and the generated service worker in the build: ok
  check AC-16: the app shell mounts the banner right after the header: ok
  twins: ok (118 equal)
  manual (owner verifies): AC-17

PASS T-0113
```

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | PASS | AC-14, AC-15, AC-16 green; AC-17 manual; pm4 check PASS |

## Review
**Verdict: approve** after a test fix (Opus reviewer, 2026-10-25; the first verdict was changes-requested for the test only).
Shell mount, the guard's `online` effect and the unavailable markup match *Interfaces*; the banner equals its twin.
- Major (fixed by the main session as test writer): AC-15's first case in `auth-guard-offline.ac.test.tsx` was
  flaky. It fired `online` before the guard's passive effect had attached its listener. The test now flushes
  effects (`await act(() => new Promise((r) => setTimeout(r, 0)))`) first; `pm4 hash` re-run. 6/6 isolated runs and
  3/3 under concurrent load passed. The code was correct and is unchanged.
- Tier: haiku was right.
