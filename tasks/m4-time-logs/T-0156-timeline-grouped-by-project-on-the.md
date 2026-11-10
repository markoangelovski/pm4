---
id: T-0156
title: Timeline grouped by project on the Logs page: the three prototype twins
milestone: M4
app: web
status: done
size: S
tier: haiku
depends_on: []
feature_spec: specs/06-features/tlog-timeline-groups.md
spec_row: T1
ac_files:
  - { path: web/features/time/day-timeline-groups.ac.test.ts, sha256: d9709353d41a05adc30f1abf0bd0ef0adf3e099fbbc45aa2b8ed6f57794484d9 }
  - { path: web/features/time/components/log-timeline-groups.ac.test.tsx, sha256: f4e9d06395498fa15fb4db9ed97c69ed0fe8a24709813d1a906df032030befa5 }
  - { path: web/features/time/components/log-timeline.ac.test.tsx, sha256: 1d30bb004856178494b9b3059dd3356327895f9fee3e39e2599e40f3fe1d27a0 }
---

# T-0156: Timeline grouped by project on the Logs page: the three prototype twins

**Tier reason:** Twin copy, the commands under *Interfaces → Web*

Work from the brief: `node scripts/pm4.mjs brief T-0156`. Verify with `node scripts/pm4.mjs check T-0156`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

Copied the three prototype twins (`day.ts`, `day-view.tsx`, `log-timeline.tsx`) with `@/proto/` → `@/` and
prettier, as the brief's commands say. `timelineGroups()` replaces the test-step stub. No other change.
Reviewer: `web/AGENTS.md` is the dev-server change, not part of this task.

`pm4 check T-0156` summary:
```
ac hashes: ok (3)
scope: FAIL (1 file(s)): web/AGENTS.md (not in the Files table; dev-server change, not from this task)
web lint: ok
web format:check: ok
web typecheck: ok
web test: ok
web build: ok
check AC-8: twins equal: ok
twins: ok (140 equal)
```
AC-1 to AC-7 pass (`day-timeline-groups`, `log-timeline-groups`, `log-timeline` tests: 12 passed).
Lint reports one warning in `features/time/components/log-form-recent.test.tsx` (unused `projectField`), not in this task.

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | done | Twin copy and prettier; ACs pass; check fails only on the out-of-scope `web/AGENTS.md` |

## Review
**Verdict: approve** (Opus reviewer, 2026-11-10). The implementation matches the spec (an exact twin copy), and D1–D4,
the non-goals and the Definition of Done all check out. Every gate passes, and twins are 140 equal.
- Minor (process): the scope FAIL is only `web/AGENTS.md`, the `next dev` agent-rules block. It stays out of the feature commit.
- Note, not a defect: the open groups stay set when the date changes, as in By Project.
- Manual checks for the owner: the heading at 360 px, light and dark themes, keyboard toggling, and the bars in an
  open group lining up with the axis.
- Tier feedback: haiku was right (a mechanical copy, one attempt).
