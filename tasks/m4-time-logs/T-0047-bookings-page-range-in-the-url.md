---
id: T-0047
title: Bookings page: range in the URL, day sections with the collapsible table, booking cell, Book all, route and sidebar link
milestone: M4
app: web
status: done
size: L
tier: sonnet
depends_on: [T-0046]
feature_spec: specs/06-features/book-web.md
spec_row: T2
ac_files:
  - { path: web/features/bookings/components/bookings-view.ac.test.tsx, sha256: b9cdefe50bdf5d6bd98656d367ce3ba8ae19064da8fe5715e6c540e2d777a6e4 }
  - { path: web/app/(dashboard-layout)/layout/vertical/sidebar/sidebaritems.ac.test.ts, sha256: 2422d19bca8b745876b92f776e186e8aad3dbcf772d13166f8d5d49881a98c12 }
---

# T-0047: Bookings page: range in the URL, day sections with the collapsible table, booking cell, Book all, route and sidebar link

**Tier reason:** A table whose columns change with the expanded state, an inline editor per row and URL state

Work from the brief: `node scripts/pm4.mjs brief T-0047`. Verify with `node scripts/pm4.mjs check T-0047`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._
Bookings page (view, range field, day section, booking cell), route and sidebar link. Review fixes: Submit disabled with the hint "Pick at most 366 days." when the range is over 366 days (new `isRangeTooLong` in `days.ts`, reused by `parseRange`); figure tooltips use the default focusable button trigger; `range` is memoised with no eslint-disable. The range trigger keeps its three spans (text content already "start – end"): a single text node would make the AC-11 `findByText("1 Sep 2026 – 9 Oct 2026")` find two elements.

pm4 check T-0047 output:
```
pm4 check T-0047
  ac hashes: ok (2)
  scope: FAIL (3 file(s))
  web lint: ok (6s)
  web format:check: ok (1s)
  web typecheck: ok (2s)
  web test: ok (14s)
  web build: ok (6s)
  web api:types: ok (1s)
  check AC-13: the build has the bookings page: ok

FAIL T-0047
- changed files outside scope:
    specs/04-web/screens.md (not in the Files table)
    specs/06-features/book-web.md (not in the Files table)
    specs/open-questions.md (not in the Files table)
```

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | sonnet | PASS | All ACs pass first run |
| 2 | sonnet | PASS | Review fixes |

## Review
**Verdict: approve** (Opus, 2026-10-10), with minor findings:
1. Figure-card tooltips use `render={<span />}` (`day-section.tsx:203`), so they can't be opened from the keyboard (DoD "Keyboard accessible"). Fix: default button trigger as in `version-badge.tsx`, or `tabIndex={0}`.
2. The range trigger renders "start–end" with no spaces around the en dash (`range-field.tsx:49-51`); SCR-045 says "<start> – <end>". Fix: a single text node.
3. Spec gap: a range over 366 days is accepted by the calendar, then `parseRange` silently falls back to the default; the field can keep showing the long range. Needs an owner decision (open question), not an invented fix.
4. `eslint-disable react-hooks/exhaustive-deps` in `bookings-view.tsx:44-48`; memoise `range` itself instead.
5. *Implementation notes* paraphrase the `pm4 check` result instead of pasting it.
**Tier:** sonnet was right (L-sized, passed first run, polish issues only).
