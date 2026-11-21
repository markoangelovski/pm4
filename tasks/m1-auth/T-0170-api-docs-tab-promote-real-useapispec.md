---
id: T-0170
title: API Docs tab: promote, real useApiSpec and getApiDocsAccessToken, the view's twin
milestone: M1
app: web
status: done
size: S
tier: haiku
implementer: claude-code/claude-haiku-5-5
depends_on: []
feature_spec: specs/06-features/shell-api-docs.md
spec_row: T2
ac_files:
  - { path: web/features/documentation/api-spec.ac.test.tsx, sha256: 932b74f17cab74c9b55f98dd973d11370492d0e00342240c2c7a7966edc420b8 }
---

# T-0170: API Docs tab: promote, real useApiSpec and getApiDocsAccessToken, the view's twin

**Tier reason:** A promoted prototype screen plus two functions spelled out

Work from the brief: `node scripts/pm4.mjs brief T-0170`. Verify with `node scripts/pm4.mjs check T-0170`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- `web/features/documentation/api.ts`: real `useApiSpec` (fetch `/openapi.json`, 404 → `null`, other non-ok throws) and `getApiDocsAccessToken` (`getAccessToken`, `SessionUnavailableError` → `null`, others rethrown). Stubs removed.
- `web/features/documentation/components/documentation-view.tsx`: copied from its prototype twin (adds the API Docs topic).
- Promoted `api-docs.tsx` and `scalar-reference.tsx` unchanged.
- `api-spec.ac.test.tsx`: 7/7 pass. Typecheck ok.

`pm4 check T-0170`: PASS T-0170 (ac hashes ok, scope ok, lint ok, format ok, typecheck ok, test ok, build ok, AC-4 ok, AC-5 ok, twins ok (153 equal), AC-6 manual).

### Attempts
| # | Agent | Result | Summary |
| --- | --- | --- | --- |
| 1 | claude-code/claude-haiku-5-5 | done | Real useApiSpec and getApiDocsAccessToken, the view's twin; pm4 check PASS (orchestrator re-run) |
| 2 | claude-code/claude-opus-5-5 | done | Review finding (owner, D8): token only to this build's API (`isApiRequest`), in the prototype twin and copied to production; pm4 check: all gates, AC-4, AC-5, twins ok; scope flags only the spec's D8 edit (main session, owner-approved) |

## Review
**Verdict: approve** (reviewer `claude-code/claude-opus-5-5`, 2026-11-21)

`useApiSpec` and `getApiDocsAccessToken` match *Interfaces* line for line; the three components are byte-identical to their prototype twins; loading, empty and error states present; no non-goal touched.

Finding (minor, optional, owner's call): `api-docs.tsx` `onBeforeRequest` adds the bearer token to any URL Test request calls, including one the user edits by hand in Scalar's request client. Possible fix: set the header only when `request.url` starts with `API_BASE_URL`, in the prototype twin first. D2 doesn't cover it.

Fixed after the review (owner, 2026-11-21): D8 added to the spec; `isApiRequest` compares the request's origin with `NEXT_PUBLIC_API_BASE_URL`'s, in the prototype twin and its production copy (attempt 2).

**Implementer assessment**

| Agent | Attempts | ACs first try | Rules kept | Blocks right | Code | Grade | Fit |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `claude-code/claude-haiku-5-5` | 1 | yes (AC-1…AC-3, AC-5) | yes | n/a | clean, matches *Interfaces*, twins identical | A | right: a promote plus two spelled-out functions |

