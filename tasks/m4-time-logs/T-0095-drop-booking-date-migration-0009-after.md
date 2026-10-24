---
id: T-0095
title: Drop booking_date (migration 0009) and the copy step from 0008, in the same release as T1–T3 (D2)
milestone: M4
app: api
status: done
size: S
tier: haiku
depends_on: [T-0094]
feature_spec: specs/06-features/book-partial.md
spec_row: T4
ac_files: []
---

# T-0095: Drop booking_date (migration 0009) and the copy step from 0008, in the same release as T1–T3 (D2)

**Tier reason:** A generated migration and one deletion from *Database*

Work from the brief: `node scripts/pm4.mjs brief T-0095`. Verify with `node scripts/pm4.mjs check T-0095`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- Removed `bookingDate` and its `time_logs_user_booking` index from `timeLogs` in `api/src/database/schema/time.ts` (with the T1 comment).
- Deleted the `INSERT … SELECT` copy step from `api/drizzle/0008_bookings.sql` (the `bookings` table is still created there).
- Generated `api/drizzle/0009_drop_booking_date.sql` (`DROP INDEX "time_logs_user_booking"; ALTER TABLE "time_logs" DROP COLUMN "booking_date"`) with its snapshot and journal entry.
- AC-24 (migrate a local DB at 0007/0008) is manual and not run here: owner verifies.
- `pm4 check T-0095`: PASS (api lint, format, typecheck, test, test:e2e, build, openapi:export; scope ok; AC-17 ok).

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | PASS | Dropped `bookingDate` and its index from the schema, removed the 0008 copy step, generated 0009; `pm4 check` PASS |

## Review
_Filled in by `review-feature`._

**Verdict (Opus, 2026-10-24): approve**, for the working tree with the 0009 journal entry. `pm4 check` PASS.

- **Finding 1 (blocker for master):** commit 395a8e6 (merged as 3e2f641, already on `github/master`) lacks the 0009 entry in `api/drizzle/meta/_journal.json`. Drizzle's migrator reads only journal entries, so migrations stop at 0008 and `booking_date` stays. The uncommitted entry is consistent: tag matches the file, `when` > 0008, snapshot chain 0007 → 0008 → 0009 intact, and the SQL matches the snapshot diff. Fix: commit the journal entry and merge before any deploy.
- **Finding 2 (process):** the code was committed and merged before review. Nothing to change in the code.
- **Finding 3 (T-0092, minor, out of scope):** `api/src/time/time-logs.service.spec.ts:149` and `:178` test names still say `bookingDate null`. Proposal: rename them in a quick-lane task.
- Manual: AC-24 (owner), after the journal entry is in. AC-13 and AC-26 are feature-level.
- **Tier feedback:** haiku was right. One attempt; the missing journal entry was a commit slip.
