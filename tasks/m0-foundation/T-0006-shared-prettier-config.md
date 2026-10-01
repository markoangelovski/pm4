---
id: T-0006
title: Same Prettier rules in web/ and api/
milestone: M0
app: infra
status: ready
size: S
tier: sonnet
depends_on: []
feature_spec: —     # tooling task, self-contained
requirements: []
ac_files: []
---

# T-0006: Same Prettier rules in web/ and api/

## Goal
Both apps format with one Prettier rule set (`specs/05-quality/code-style.md`, owner decision
2026-09-28). Formatting then never differs between apps or between agents.

## Task
**Tier reason:** sonnet. Touches both apps' config and adds a devDependency to `web/`. Mechanical, but a wrong ESLint/Prettier interplay breaks lint in CI.

1. Write the rule set decided in OQ-046 (`{ "trailingComma": "none" }`, otherwise Prettier defaults) to `api/.prettierrc`, and copy the same file to `web/.prettierrc`.
2. `web/`: add `prettier` as a devDependency, pinned to the same version as `api/`. Also add
   `eslint-config-prettier`, so ESLint doesn't fight Prettier; append it last in `web/eslint.config.mjs`.
   Add `format` and `format:check` scripts that mirror `api/`'s `format` script (paths for Next:
   `app components hooks lib *.ts *.mjs`). Leave the output of `npx shadcn add` as generated,
   except for Prettier formatting.
3. Run `npm run format` in the app(s) whose style changes, as its own diff with no other edits, so review is easy.
4. `ci.yml`: add a `format:check` step to each app's job, after Lint.

## Acceptance criteria
- [ ] `web/.prettierrc` and `api/.prettierrc` are byte-identical.
- [ ] `npm run format:check` exits 0 in both apps. `lint`, `typecheck`, `test` and `build` still pass in both.
- [ ] `ci.yml` runs `format:check` for both apps.
- [ ] Definition of Done satisfied (`specs/05-quality/definition-of-done.md`).

## Blocked by (if status is blocked)
— (OQ-046 resolved 2026-10-01: Prettier defaults with `trailingComma: "none"`. The owner approved the
`prettier` + `eslint-config-prettier` devDependencies in `web/`.)

---

## Implementation notes

### Attempts
| # | Tier | Result (`done` / `BLOCKED` / `FAILED`) | Summary |
| --- | --- | --- | --- |

## Review
