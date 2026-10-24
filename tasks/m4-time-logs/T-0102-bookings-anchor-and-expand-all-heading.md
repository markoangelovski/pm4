---
id: T-0102
title: Bookings: a crafted hash no longer crashes the page, and Expand all moves out of the day heading
milestone: M4
app: web
status: done
size: S
tier: haiku
depends_on: []
feature_spec: —
files:
  - web/features/bookings/days.ts
  - web/proto/features/bookings/days.ts
  - web/features/bookings/days.test.ts
  - web/features/bookings/components/day-section.tsx
  - web/proto/features/bookings/components/day-section.tsx
specs: [specs/06-features/book-web-nav.md]
ac_files: []
---

# T-0102: Bookings: a crafted hash no longer crashes the page, and Expand all moves out of the day heading

## Goal
Fix findings 1 and 2 of T-0101's review: a hash with characters like `"` or `]` in the log id makes
`querySelector` throw and takes down Bookings; the Expand all button sits inside the day `<h2>`, so screen
readers read it as part of the heading. Both fixes go into the prototype twin and the production file alike,
so `pm4 twins` stays equal.

## Change
- `days.ts` (both twins), `parseAnchor`: the log id group `([^.]+)` becomes `([\w-]+)`. A hash whose log id
  has any other character no longer matches, so `parseAnchor` returns `null` and nothing is queried.
- `days.test.ts` (new, ordinary test): `parseAnchor("day-2026-10-07.log-a\"]x.to-2026-10-07")` → `null`;
  a UUID log id still parses to its day and row.
- `components/day-section.tsx` (both twins): the date bar's classes move from the `<h2>` to a wrapping `<div>`;
  the `<h2>` (`flex items-baseline gap-2` plus the bar's text classes) holds only the date link and Today; the
  Expand all `<Button>` becomes the `<h2>`'s sibling inside the bar, unchanged (still `ml-auto self-center`).
  The bar looks the same.

## Acceptance criteria
- [ ] `parseAnchor` rejects a log id with characters outside `[\w-]` (`web/features/bookings/days.test.ts`)
- [ ] The day heading's accessible name is the date (and Today), not "… Expand all"; the existing Bookings ACs pass
- [ ] `pm4 twins`: every features/bookings pair equal

---

## Implementation notes
Done inline by the main session (a few lines, files already in context; task-routing.md#lanes).
- `days.ts` (both twins): `parseAnchor`'s log id group is `[\w-]+`, so a hash like `log-a"]x` no longer matches and nothing is queried.
- `day-section.tsx` (both twins): the date bar is a `<div>`; the `<h2>` holds the date link and Today; Expand all is its sibling. Same classes, same look.
- `days.test.ts` (new): the crafted hash → `null`; a UUID log id still parses.
- `pm4 check T-0102`: PASS (scope ok; lint, format, typecheck, test, build ok; twins 93 equal).

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | opus (main session) | PASS | Inline fix of review findings 1 and 2 |

## Review
_The owner's review (quick lane), or `review-feature`'s verdict._
