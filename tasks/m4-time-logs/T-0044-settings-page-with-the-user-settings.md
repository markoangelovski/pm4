---
id: T-0044
title: Settings page with the User settings tab
milestone: M4
app: web
status: done
size: S
tier: haiku
depends_on: [T-0041]
feature_spec: specs/06-features/tlog-web.md
spec_row: T4
ac_files:
  - { path: web/features/settings/components/user-settings.ac.test.tsx, sha256: d2cb0e184c1a8a45672343ea22a8391f7491ff79e7295229e8b2b786270cc3a4 }
---

# T-0044: Settings page with the User settings tab

**Tier reason:** One form with local state; validation and copy are spelled out

Work from the brief: `node scripts/pm4.mjs brief T-0044`. Verify with `node scripts/pm4.mjs check T-0044`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- Changed: `features/settings/components/user-settings.tsx` (real hooks: `useMe`, `useUpdateMe`; loading skeleton, error + Retry, form mounted once `me` is known; PATCH only changed fields; `Settings saved` / `Couldn't save the settings.` toasts). `settings-view.tsx` and `app/(dashboard-layout)/app/settings/page.tsx` were already on disk and only got Prettier formatting.
- `pm4 check T-0044` (last run): scope FAIL (36 files, all pre-existing from other tasks/features, none of this task's files; tlog-web.md spec itself is listed); web lint ok; web format:check ok; web typecheck ok; web test FAIL (only `day-view.ac` and `sidebaritems` tests, other tasks; `user-settings.ac.test.tsx` passes); web build ok; web api:types ok; AC-22 ok.
- Review fix: help text in `user-settings.tsx` now matches SCR-050 exactly ("…overtime and the pie chart on Logs.").
- Reviewer: `user-settings.tsx` `dirty` also counts an invalid entry as dirty so Reset is enabled; Save stays disabled while invalid.

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | done | AC-21 test passes; AC-22 ok; check FAIL only on out-of-scope files and other features' tests |
| 2 | haiku | done | review fix: help text now the SCR-050 copy ("…overtime and the pie chart on Logs.") |

## Review
**Verdict: changes-requested** (Opus review, 2026-10-10)
- Copy drift (SCR-050): `user-settings.tsx:125` says "…overtime and the unlogged time on Logs." The spec says "…overtime and the pie chart on Logs." Unlogged time doesn't use the target either. Use the spec copy.
- Tier: haiku was right. Only a copy slip.
- Fixes applied (2026-10-10): every finding above except the native checkbox (kept; owner can revisit). `pm4 check --feature`: ac hashes, lint, format, typecheck, build, api:types and AC-22 ok. The only test failures are the 3 `sidebaritems` tests, which fail on a Bookings link that isn't part of this feature.
