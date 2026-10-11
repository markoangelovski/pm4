---
id: T-0059
title: Retire proto-sync-web's own twin checks (AC-18, AC-19, AC-22); the twin check covers them
milestone: M4
app: spec
status: done
size: S
tier: opus
depends_on: [T-0058]
feature_spec: —
files: [specs/06-features/proto-sync-web.md]
specs: [specs/04-web/prototype.md#twin-check]
ac_files: []
---

# T-0059: Retire proto-sync-web's own twin checks (AC-18, AC-19, AC-22); the twin check covers them

## Goal
`pm4 check --feature specs/06-features/proto-sync-web.md` treats twin drift the way the twin check does (T-0058): a
committed difference (the prototype is ahead) is a warning, not a failure, and a new prototype's `proposed-types.ts`
doesn't break it.

## Change
**`specs/06-features/proto-sync-web.md`** (spec edit in the main session, like every spec change):
- *Acceptance criteria*: keep the AC-18, AC-19 and AC-22 rows and their IDs (the changelog, *Interfaces* and the T-0055/T-0056
  notes cite them). Each becomes `Retired: covered by the twin check ([prototype.md#twin-check](../04-web/prototype.md#twin-check), T-0058)`,
  with `—` as its test cell. The Task cells stay.
- *Checks*: delete the `# AC-18`, `# AC-22` and `# AC-19` chunks, including AC-19's `! ls proto/features/*/proposed-types.ts`.
  That line held only when the feature was reviewed: the `prototype` skill adds a `proposed-types.ts` for every new screen
  that needs API shapes the API doesn't have yet, and the twin check counts it as *not promoted*. `# AC-20` stays as it is.
- *Interfaces → Prototype twins (D5)*: the closing "(AC-19)" becomes a pointer to the twin check.
- `last_updated` stays 2026-10-11. A changelog line. `status` stays `approved`: the owner reviews this diff before it's committed.

## Acceptance criteria
- [ ] *Checks* has only the `# AC-20` chunk. The AC-18, AC-19 and AC-22 rows say *Retired* and have no `check` test cell.
- [ ] `node scripts/pm4.mjs check --feature specs/06-features/proto-sync-web.md` runs no AC-18/19/22 check, prints the
  `twins` lines and passes.
- [ ] `node scripts/pm4.mjs check T-0059` passes.

## Checks
```bash
s=specs/06-features/proto-sync-web.md
! grep -qE '^# AC-(18|19|22)' "$s"
grep -q '^# AC-20' "$s"
[ "$(grep -cE '^\| AC-(18|19|22) \| Retired: covered by the twin check' "$s")" = 3 ]
node scripts/pm4.mjs twins
```

---

## Implementation notes
Done in the main session, as the task describes: three rows retired (IDs kept, Task cells kept, test cell `—`),
the AC-18/AC-22/AC-19 chunks and the `proposed-types.ts` line removed from *Checks*, the *Interfaces* pointer and a
changelog line. `status` stays `approved`.

Also on this branch: T-0057 set to `done` (the owner asked for it). It moved here from the main checkout, where it
would have blocked the merge of this branch's BOARD.md.

**Verification**
- `node scripts/pm4.mjs check T-0059`: scope ok, `check checks: ok` (the task's *Checks*, including `pm4 twins`), PASS.
- `node scripts/pm4.mjs check --feature specs/06-features/proto-sync-web.md`: every api and web gate ok, `check AC-20` ok,
  no AC-18/19/22 check, `twins: ok (61 equal)`. Its only failure is scope on `specs/06-features/proto-sync-web.md` itself,
  because feature mode allows only the spec's *Files* table, and this edit is still uncommitted. Once it's committed,
  the check passes.

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | opus (main session) | PASS | AC-18/19/22 retired; feature check green apart from its own uncommitted spec edit |

## Review
_The owner's review (quick lane), or `review-feature`'s verdict._
