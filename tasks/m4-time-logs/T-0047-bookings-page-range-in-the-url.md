---
id: T-0047
title: Bookings page: range in the URL, day sections with the collapsible table, booking cell, Book all, route and sidebar link
milestone: M4
app: web
status: blocked
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

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |

## Review
_Filled in by `review-feature`._
