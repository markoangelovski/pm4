---
id: T-0101
title: Bookings from the prototype: presets, Project filter, Expand all, booking links (promote two files, copy five twins)
milestone: M4
app: web
status: done
size: S
tier: haiku
depends_on: []
feature_spec: specs/06-features/book-web-nav.md
spec_row: T1
ac_files:
  - { path: web/features/bookings/days.ac.test.ts, sha256: f2f9933c6f7d1289d70a9cfc4d212583a2598922e3c38833cccf4ca209eee739 }
  - { path: web/features/bookings/components/bookings-view.ac.test.tsx, sha256: b62dc3036fe87efdaafc4f18c48de8ca30aaa60a9c7836795f5afa85c2e44468 }
---

# T-0101: Bookings from the prototype: presets, Project filter, Expand all, booking links (promote two files, copy five twins)

**Tier reason:** Copy commands spelled out; no new logic, no import left to replace

Work from the brief: `node scripts/pm4.mjs brief T-0101`. Verify with `node scripts/pm4.mjs check T-0101`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- Ran the brief's sed loop: `days.ts`, `booking-cell.tsx`, `bookings-view.tsx`, `day-section.tsx`, `range-field.tsx` now equal their prototype twins with `@/proto/mock/client` → `@/lib/api/client` and `@/proto/` → `@/`. `day-link.tsx` and `project-filter.tsx` were promoted by `pm4 promote`.
- `npx prettier --write features/bookings` (no changes needed beyond formatting), `node ../scripts/pm4.mjs twins`: 93 equal, 1 intended (`features/auth/use-sign-out.ts`, not in scope), 0 failures.
- No `@/proto` import left under `web/features/bookings`.
- Reviewer: AC-10 is manual (dev server, `/app/bookings`).

`node scripts/pm4.mjs check T-0101`:
```
pm4 check T-0101
  ac hashes: ok (2)
  scope: ok
  web lint: ok (15s)
  web format:check: ok (4s)
  web typecheck: ok (11s)
  web test: ok (25s)
  web build: ok (25s)
  twins: ok (93 equal)
  manual (owner verifies): AC-10

PASS T-0101
```

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | PASS | Sed loop, prettier, twins, check: all automated gates ok; AC-10 manual left to owner |

## Review
**Verdict: approve** (Opus reviewer, 2026-10-24). `pm4 check` PASS; all 7 production files are byte-equal to their sed-rewritten prototype twins; no non-goal touched; D1–D5 match.

Minor findings (none blocking):
1. A crafted hash (e.g. `#day-2026-10-07.log-a"]x.to-2026-10-07`) makes `querySelector` throw in `bookings-view.tsx:155`, since `parseAnchor` (`days.ts:330-333`) accepts any `[^.]+` logId. Fix: restrict to `[\w-]+` or `CSS.escape`, in the proto twin first.
2. The Expand all button sits inside the day `<h2>` (`day-section.tsx:397-410`), so screen readers read it as part of the heading. Fix: flex wrapper with `<h2>` and button side by side, proto twin first.
3. While a new range loads, `project` is checked against the previous range's options (`bookings-view.tsx:97-103`), so the faded old range may briefly show unfiltered. Cosmetic, within D5; optional.

Tier feedback: haiku was right (spelled-out promote + copy, byte-exact twins, all gates green).
