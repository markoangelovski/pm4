---
id: T-0013
title: Group the sidebar nav into sections and move Trash and Settings to a fixed footer
milestone: M1
app: web
status: done
size: S
tier: sonnet
depends_on: []
feature_spec: specs/06-features/shell-sidebar-sections.md
spec_row: T1
ac_files:
  - { path: web/app/(dashboard-layout)/layout/vertical/sidebar/sidebaritems.ac.test.ts, sha256: 441be81ba33e8f1fd69971ce3c0cc7d9558066f36a67a842252b677e2c154890 }
  - { path: web/app/(dashboard-layout)/layout/vertical/sidebar/nav-collapse/nav-collapse.ac.test.tsx, sha256: d625b7548427317bf4e032c7f502036ba325041aafe6f5740d95fedf626b6f1e }
---

# T-0013: Group the sidebar nav into sections and move Trash and Settings to a fixed footer

**Tier reason:** 4 files, all changes given; more than haiku's 3 files, no new pattern

Work from the brief: `node scripts/pm4.mjs brief T-0013`. Verify with `node scripts/pm4.mjs check T-0013`.

## Implementation notes
Grouped nav under headings, added `footerItems`, heading rendered only when set, added `SidebarFooter`.

`pm4 check T-0013`: lint, typecheck, test, build ok; AC-7 ok; manual AC-8 pending. PASS T-0013.

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | sonnet | PASS | All four files changed; check passed first run |

## Review
**Verdict: approve** (Opus review, 2026-10-03). Nav data, the headings guard and the footer match *Interfaces* exactly; `SidebarContent` stays the scroll area, so the footer is pinned; Non-goals untouched; `pm4 check` PASS (AC-7 ok). One minor finding: `section.heading ?? ""` was redundant inside the `section.heading ?` guard in `nav-collapse/index.tsx`; fixed in the main session (renders `section.heading` directly), check still PASS. Manual AC-8 left to the owner (also the mobile sheet at 360 px). Tier: sonnet right, perhaps generous; haiku would likely have managed.

Owner (2026-10-03): manual check AC-8 looks fine.
