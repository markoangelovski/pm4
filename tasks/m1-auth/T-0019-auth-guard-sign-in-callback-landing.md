---
id: T-0019
title: Auth guard, sign-in, callback, landing "Go to app" and sign-out
milestone: M1
app: web
status: blocked
size: M
tier: sonnet
depends_on: [T-0018]
feature_spec: specs/06-features/auth-web-session.md
spec_row: T2
ac_files:
  - { path: web/app/components/shared/landing-cta.ac.test.tsx, sha256: 58e13c5091dce9f5e5d151e709ba75515e48fa20b9b3c3aa7eb32aad9bb79304 }
  - { path: web/features/auth/components/auth-guard.ac.test.tsx, sha256: 340d08270f3852acfd14e6a395d20769e64ae470d81a09bd661b690e218fd3fc }
  - { path: web/features/auth/components/auth-callback.ac.test.tsx, sha256: e72cda60c01eeb9334c0fdfb1d09daea75ef6bc042a45ef77be3c46f1b9ec3c7 }
  - { path: web/features/auth/components/sign-in-state.ac.test.tsx, sha256: 42de0f2e10f7ac166725fce83e22c617f262df0f1f56906ca9c6162a7442250b }
  - { path: web/app/auth/authforms/social-buttons.ac.test.tsx, sha256: 73598ade52f806e7a70be8aef1dd2992ace08d2cd8021b9f3eb1850d2c408065 }
  - { path: web/features/auth/use-sign-out.ac.test.tsx, sha256: 3dbf4acef1b37f56adc84da99d831edf742459dd2f66721f7cc8fc375f050eb2 }
---

# T-0019: Auth guard, sign-in, callback, landing "Go to app" and sign-out

**Tier reason:** Composes T1's functions into components over ~8 files; every behavior and string is given

Work from the brief: `node scripts/pm4.mjs brief T-0019`. Verify with `node scripts/pm4.mjs check T-0019`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by `review-feature`._
