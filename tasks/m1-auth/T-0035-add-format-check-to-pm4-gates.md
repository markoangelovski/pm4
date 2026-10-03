---
id: T-0035
title: Add format:check to pm4 check's gates and fix the two unformatted web files
milestone: M1
app: infra
status: done
size: S
tier: haiku
depends_on: []
feature_spec: —
files: [scripts/pm4.mjs, web/lib/auth/session.test.ts, web/next.config.ts, .claude/agents/web-engineer.md, .claude/agents/api-engineer.md]
specs: []
ac_files: []
---

# T-0035: Add format:check to pm4 check's gates and fix the two unformatted web files

## Goal
`pm4 check` fails on unformatted code, as `ci.yml` does, and `web/` passes `npm run format:check` again.

## Change
- `scripts/pm4.mjs`: add `"format:check"` after `"lint"` in both `GATES.web` and `GATES.api`.
- `web/lib/auth/session.test.ts`, `web/next.config.ts`: `npx prettier --write` from `web/` (formatting only).
- `.claude/agents/web-engineer.md`, `.claude/agents/api-engineer.md`: the list of what `pm4 check` runs
  includes `format:check`; on a format failure run `npm run format` in the app folder.

## Acceptance criteria
- [x] `npm run format:check` passes in `web/` and `api/`.
- [x] `pm4 check` on a web or api task lists a `format:check` gate (T-0035 is `infra`, so its own check runs no gates).

---

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

Done inline by the main session (a few lines, per task-routing). `format:check` runs right after `lint`.
Five files, two over the quick-lane guideline of three: the extra two are the agent docs, kept in sync with the gate list.

`pm4 check T-0035`: ac hashes none recorded, scope ok, PASS (infra: no gates).
`pm4 check T-0034` (a done web task, run to see the gate): `web format:check: ok`, and every other web gate ok
(scope FAIL only because of this task's files). `api/`: `prettier --check` clean.

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | opus (main session) | done | Gate added, two files formatted, agent docs updated |

## Review
_The owner's review (quick lane), or `review-feature`'s verdict._

Approved by the owner (quick lane), 2026-10-03.
