---
id: T-0058
title: pm4 compares production files with their prototype twins (pm4 twins, in check)
milestone: M4
app: infra
status: review
size: S
tier: sonnet
depends_on: [T-0057]
feature_spec: —
files: [scripts/pm4.mjs, specs/04-web/prototype.md, .claude/agents/reviewer.md, web/proto/features/auth/use-sign-out.ts]
specs: [specs/04-web/prototype.md]
ac_files: []
---

# T-0058: pm4 compares production files with their prototype twins (pm4 twins, in check)

## Goal
Drift between a production file and its prototype twin is caught by a script, not by hand: a change that leaves a twin pair different
fails `pm4 check` (so also `review-feature`, which runs `pm4 check --feature`), and pairs that differ from before are listed as
warnings. Feature specs no longer need their own "equals its prototype twin" checks (feat-proto-sync-web AC-18, AC-19, AC-22).

## Change
**`scripts/pm4.mjs`**, a `twins()` function and a `twins` command:
- **Pairs:** every file under `web/proto/features/**` with the file at the same path under `web/` minus `proto/`
  (`web/proto/features/time/api.ts` ↔ `web/features/time/api.ts`). Nothing else is compared: `proto/lib/routes.ts`, `proto/mock/**` and
  the `app/proto/**` pages differ from production by design. A prototype file whose production file doesn't exist yet is
  `not promoted` (counted, never a failure).
- **Normalise** the prototype text: replace `@/proto/mock/client` with `@/lib/api/client`, then every `@/proto/` with `@/` (the only
  `@/proto/` imports in `proto/features` today are `mock/client` and `lib/routes`). Format the result with Prettier's API, using the
  production path's config: `format(text, { ...(await resolveConfig(prodPath)), filepath: prodPath })`. Load Prettier with a dynamic
  `import()` of `web/node_modules/prettier/index.mjs` (absolute path from `ROOT`); if it's missing, `die("twins need web/node_modules: run npm ci in web/")`.
  pm4 itself gets no dependency. Compare with the production file's text: equal or `differs`.
- **Intended differences:** a prototype file containing the marker `pm4-twin: differs` is `intended` and not compared. Add it to
  `web/proto/features/auth/use-sign-out.ts`, as the first line of its doc comment:
  `pm4-twin: differs (the prototype can't import lib/auth: it signs out without the API and goes to the landing page)`.
- **Fail or warn:** a `differs` pair where either file is in `gitChanged()` (this task's or feature's uncommitted change) is a
  **failure**. Any other `differs` pair is a **warning** (the prototype is ahead after a prototype commit, or the pair drifted before).
- **`pm4 twins`** (new command; add it to the usage comment at the top): prints one line per pair that isn't equal
  (`FAIL`/`WARN`/`intended`, the production path), then `twins: <n> equal, <n> intended, <n> not promoted, <n> warnings, <n> failures`.
  Exit 1 if there's a failure.
- **`pm4 check`:** when the task's app is `web`, or (with `--feature`) the spec's *Files* table has a `web` row, run `twins()` after the
  spec's checks, inside the `!noGates` block. Report `  twins: ok (<n> equal)` or `  twins: FAIL (<n>)`, then one `  twins warning: <path>`
  line per warning. Failures go into `problems` with the paths; warnings never fail the check.

**`specs/04-web/prototype.md`**: a `## Twin check` section after *Separation*: what is paired, the normalisation, the marker, fail vs warn,
and that it runs in `pm4 check` (so in `implement-task` and `review-feature`) and as `pm4 twins`. In *Workflow* step 4, say the
promoted and replaced files are then held equal to their twins by this check. A changelog line.

**`.claude/agents/reviewer.md`**: replace the *promoted prototype files* bullet with: the `twins` lines of `pm4 check` show whether the
changed production files equal their prototype twins; report each `twins warning` as a minor finding (the prototype is ahead, or a
pair drifted), and check that no production file imports `@/proto/*`.

## Acceptance criteria
- [ ] `node scripts/pm4.mjs twins` on the clean tree: 61 equal, 1 intended (`features/auth/use-sign-out.ts`), 0 warnings, 0 failures, exit 0.
- [ ] Changing one line of `web/features/time/api.ts` only (uncommitted): `pm4 twins` exits 1 with `FAIL features/time/api.ts`, and
  `pm4 check --feature specs/06-features/proto-sync-web.md` fails on it. The same change committed in a scratch copy is a `WARN`, and the
  check passes. (Undo the change afterwards by editing the file back, never with git restore.)
- [ ] `pm4 check` on an api task prints no `twins` line.

---

## Implementation notes
Implemented in the main session (infra task, like T-0035 and T-0057).

- `scripts/pm4.mjs`: `twins()` and `cmdTwins()` after `gitChanged()`, as the task describes. Prettier is loaded by a
  dynamic `import()` of `web/node_modules/prettier/index.mjs`. Paths in the output are relative to `web/` (as in the AC,
  `features/time/api.ts`). The *problems* entry gives the full `web/…` path. `cmdCheck` is now `async` (Prettier's
  API is), and the main switch `await`s `check` and `twins`. Files rows now carry their `app`, which `check --feature`
  uses to decide whether to run twins. The usage comment lists `twins`.
- Fixed in passing: the usage text (`node scripts/pm4.mjs` with no command) sliced a fixed line range and already
  dropped the header's last line ("… are understood too."). It now prints the whole leading comment block.
- `specs/04-web/prototype.md`: `## Twin check` after *Separation*, a sentence in *Workflow* step 4, a changelog line.
- `.claude/agents/reviewer.md`: the promoted-files bullet now points at the `twins` lines (warnings → minor findings)
  and keeps the "no production file imports `@/proto/*`" check.
- `web/proto/features/auth/use-sign-out.ts`: the `pm4-twin: differs (…)` marker as the first line of the doc comment.

**Verification** (ACs 2 and 3 in a scratch clone of the worktree with these changes committed. The real tree wasn't touched):
- AC 1: `pm4 twins` in the worktree: `twins: 61 equal, 1 intended, 0 not promoted, 0 warnings, 0 failures`, exit 0 (~1 s).
- AC 2, uncommitted: a line added to `web/features/time/api.ts`: `FAIL     features/time/api.ts`, exit 1.
  `pm4 check --feature specs/06-features/proto-sync-web.md` FAIL with `twins: FAIL (1)` (also AC-19 and, since the test
  line wasn't Prettier-clean, `format:check` and AC-20).
- AC 2, committed: a Prettier-clean comment line committed in `features/time/api.ts`: `WARN     features/time/api.ts`,
  exit 0. The feature check printed `twins: ok (60 equal)` + `twins warning: features/time/api.ts` and **PASS**ed, but
  only after the spec's AC-18, AC-19 and AC-22 chunks were removed in the scratch copy: AC-19 diffs the same
  `api.ts` twins itself, so in the real spec a committed drift still fails the feature check through AC-19. Two
  earlier runs failed on `web test`: `dashboard-view.ac.test.tsx` AC-8 timed out at 5 s under load (it takes ~1.3 s
  alone, and 178/178 passed when run directly). That's flakiness that was already there, not this change.
- AC 3: `pm4 check T-0051` (api) with gates: no `twins` line, PASS. Also `pm4 check T-0056` (web, task mode) printed the
  `twins` lines.
- `node scripts/pm4.mjs check T-0058`: ac hashes none recorded, scope ok, PASS (infra: no gates).

**Proposal (out of scope):** remove the AC-18, AC-19 and AC-22 chunks from `specs/06-features/proto-sync-web.md`'s
*Checks* (the twin check covers them, as the Goal says). Until then, AC-19 turns a committed `api.ts` drift into a
failure instead of a warning. Its `! ls proto/features/*/proposed-types.ts` line would need a new home (e.g. under AC-20).

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | opus (main session) | PASS | twins() + `pm4 twins` + twins in check; spec, reviewer and marker updated; ACs verified in a scratch clone |

## Review
_The owner's review (quick lane), or `review-feature`'s verdict._
