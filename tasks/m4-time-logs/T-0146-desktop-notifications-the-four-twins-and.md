---
id: T-0146
title: Desktop notifications: the four twins and the worker's handlers
milestone: M4
app: web
status: done
size: S
tier: haiku
depends_on: []
feature_spec: specs/06-features/tlog-desktop-notifications.md
spec_row: T1
ac_files:
  - { path: web/features/system/desktop-notifications.ac.test.ts, sha256: 8a17038820922c452f7372379bfbec8f3ead75c06026dd3854d0131a1e3bfdc9 }
  - { path: web/features/settings/components/desktop-notifications-settings.ac.test.tsx, sha256: e26e182ea82cf59a221d8b771f8ddfb93c33c8644f4a051f377e1ef104411e00 }
  - { path: web/features/time/components/notifications-button-desktop.ac.test.tsx, sha256: b592a134c97ac9d523c4aa17a6d58a0c95076b0647edf5ef5a27e4aeef1ca773 }
  - { path: web/sw/service-worker-notifications.ac.test.ts, sha256: 640ba51746b6047b69aaf141811bdd757760746dec87b6088e7ed91361029f34 }
---

# T-0146: Desktop notifications: the four twins and the worker's handlers

**Tier reason:** Twin copy by the command under *Twins (T1)*; the worker code is spelled out in *Service worker (T1)*

Work from the brief: `node scripts/pm4.mjs brief T-0146`. Verify with `node scripts/pm4.mjs check T-0146`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

Copied the four twins with the sed + prettier command from *Twins (T1)* (replaces the test-step stubs). Appended the
`pm4-notify` message handler and the `notificationclick` handler to `web/sw/service-worker.js` exactly as spelled out in
*Service worker (T1)*, then Prettier. No other files touched.

`node scripts/pm4.mjs check T-0146`:
```
pm4 check T-0146
  ac hashes: ok (4)
  scope: ok
  web lint: ok (16s)
  web format:check: ok (5s)
  web typecheck: ok (12s)
  web test: ok (33s)
  web build: ok (25s)
  check AC-9: twins equal: ok
  twins: ok (131 equal)

PASS T-0146
```

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | pass | Twins copied, worker handlers appended; pm4 check PASS. Targeted vitest (sw, system, settings, time) 129/129 passed. |

## Review
_Filled in by `review-feature`._
