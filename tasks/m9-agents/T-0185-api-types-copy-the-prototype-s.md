---
id: T-0185
title: api:types, copy the prototype's AppMark, pass logoUri in Connected apps, prototype back to the schema type
milestone: M9
app: web
status: done
size: S
tier: haiku
implementer: claude-code/claude-haiku-5-5
depends_on: [T-0184]
feature_spec: specs/06-features/mcp-logos.md
spec_row: T2
ac_files:
  - { path: web/features/agents/components/app-mark.ac.test.tsx, sha256: eb5d3f8552f4c520665b086b978fccce97f4d56a0f4be79549c57c89259bddef }
---

# T-0185: api:types, copy the prototype's AppMark, pass logoUri in Connected apps, prototype back to the schema type

**Tier reason:** A copy plus a one-line diff

Work from the brief: `node scripts/pm4.mjs brief T-0185`. Verify with `node scripts/pm4.mjs check T-0185`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- Ran `npm run api:types`: `schema.d.ts` gains only `ConnectedAppDto.logoUri: string | null`.
- `app-mark.tsx` replaced with the prototype's file (copied, no import changes needed).
- `connected-apps-settings.tsx`: `logoUri={app.logoUri}` on the row's `AppMark`, as in the prototype's `c71d350` delta.
- Prototype back to the schema type: `proto/features/agents/api.ts` uses `components["schemas"]["ConnectedAppDto"]`;
  `proto/mock/seed.ts` declares `ConnectedAppDto` from the schema; `proto/features/agents/proposed-types.ts` deleted.
- `pm4 check T-0185`:
  ```
  PASS T-0185 (ac hashes ok, scope ok, web lint/format:check/typecheck/test/build/api:types ok,
  AC-14 ok, twins ok (167 equal))
  ```

### Attempts
| # | Agent | Result | Summary |
| --- | --- | --- | --- |
| 1 | claude-code/claude-haiku-5-5 | done | api:types, prototype AppMark copied, logoUri wired in Connected apps, proposed-types removed; pm4 check PASS |

## Review
**Verdict: approve** (reviewer `claude-code/claude-opus-5-5`, 2026-11-21). `pm4 check --feature` PASS; no findings for this task.

- Manual checks for the owner: a real app with a `logo_uri` on its own host shows its logo in Connected apps (letter while
  loading); light/dark themes and 360 px; the consent page still shows only the letter.

*Implementer assessment*

| Agent | Attempts | ACs first try | Rules kept | Blocks right | Code | Grade | Fit |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `claude-code/claude-haiku-5-5` | 1 | yes (AC-10…AC-14) | yes | n/a | Exact prototype copy plus the one-line wiring | A | right |
