---
id: T-0169
title: Web deploy copies api/openapi.json into the site; ignore the copy
milestone: M1
app: infra
status: done
size: S
tier: haiku
implementer: claude-code/claude-opus-5-5
depends_on: []
feature_spec: specs/06-features/shell-api-docs.md
spec_row: T1
ac_files: []
---

# T-0169: Web deploy copies api/openapi.json into the site; ignore the copy

**Tier reason:** Two lines spelled out; infra, so the main session runs it

Work from the brief: `node scripts/pm4.mjs brief T-0169`. Verify with `node scripts/pm4.mjs check T-0169`.

## Implementation notes
`web-deploy.yml`: step `API docs` (`cp ../api/openapi.json public/openapi.json`) after `Changelog`, before the build. `.gitignore`: `/web/public/openapi.json`.

`pm4 check T-0169`: PASS (scope ok, AC-4 ok; AC-1…3, AC-5, AC-6 belong to T-0170).

### Attempts
| # | Agent | Result | Summary |
| --- | --- | --- | --- |
| 1 | claude-code/claude-opus-5-5 | done | Deploy step and ignore line, in the main session (infra) |

## Review
**Verdict: approve** (reviewer `claude-code/claude-opus-5-5`, 2026-11-21)

The `API docs` step is exact to the spec, after `Changelog` and before the build; `../api/openapi.json` resolves from the `web` working directory. The ignore line matches. No findings.

**Implementer assessment**

| Agent | Attempts | ACs first try | Rules kept | Blocks right | Code | Grade | Fit |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `claude-code/claude-opus-5-5` | 1 | yes (AC-4) | yes | n/a | exact to the spec | A | right: infra runs in the main session by design |

