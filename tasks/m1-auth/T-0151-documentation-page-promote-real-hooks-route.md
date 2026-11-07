---
id: T-0151
title: Documentation page: promote, real hooks, route, sidebar link
milestone: M1
app: web
status: done
size: S
tier: haiku
depends_on: [T-0150]
feature_spec: specs/06-features/shell-documentation.md
spec_row: T3
ac_files:
  - { path: web/features/documentation/changelog.ac.test.ts, sha256: b3915f65d80b407e60f9a9dfa1b73c7b59416042eddb0c14f3957d1350104cc2 }
  - { path: web/features/documentation/api.ac.test.tsx, sha256: 4bc0b63256039bb84235453f0dfc1cda6919578ce8d6b71b3b7397e974ae28fc }
  - { path: web/app/(dashboard-layout)/layout/vertical/sidebar/sidebaritems.ac.test.ts, sha256: 88292656ce1b668875aef790ed23ba2277e64e525244180ed2efabc26bb43f20 }
  - { path: web/app/(dashboard-layout)/layout/vertical/sidebar/nav-collapse/nav-collapse.ac.test.tsx, sha256: 4c16a8f8b4962535a9d6b87475264f226d805654e0e8e0529991bf1e196a7236 }
  - { path: web/lib/api/client.ac.test.ts, sha256: 68ec19a721b2404d1f218e99c7475993467a9b359b48a64cd83e4dba273fcea0 }
---

# T-0151: Documentation page: promote, real hooks, route, sidebar link

**Tier reason:** A promoted prototype screen plus a hook pair spelled out

Work from the brief: `node scripts/pm4.mjs brief T-0151`. Verify with `node scripts/pm4.mjs check T-0151`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- `features/documentation/changelog.ts`: sed twin of the prototype (`@/proto/` → `@/`).
- `features/documentation/api.ts`: real hooks; web reads `/changelog.json` (404 → `[]`), api uses `apiClient.GET("/api/v1/changelog")`. Types from `components["schemas"]`.
- `lib/api/schema.d.ts` regenerated (`npm run api:types`). Promoted components and page unchanged.
- `lib/routes.ts`, sidebar footer (Settings, Documentation with BookOpen), sidebar test updated.
- Prototype twins: `proto/features/documentation/api.ts` gets the `pm4-twin: differs` note; `proposed-types.ts` `type: string`.
- For the reviewer: `lib/api/client.ts` `PUBLIC_API_PATHS` does not list `/api/v1/changelog` (API-SYS-004 is public). Out of this task's Files, so not changed here.

Check summary (`node scripts/pm4.mjs check T-0151`): ac hashes ok (4); web lint ok; format:check ok (after `npm run format`); web typecheck ok; web test ok; web build ok; api:types ok; AC-1…AC-4, AC-5, AC-8, AC-14, AC-16 ok; twins ok (139 equal); AC-15 manual. Overall FAIL only on scope: `specs/06-features/shell-documentation.md` and `specs/open-questions.md` (main session's edits, not T-0151's).

- **Review fixes (main session, owner-requested, 2026-11-07):** `web/lib/api/client.ts` `PUBLIC_API_PATHS` gains `/api/v1/changelog`, with the case in `client.ac.test.ts` (AC-17; feat-auth-web-session AC-12, T-0018 re-hashed); the prototype `api.ts` drops its `ChangelogPaths` cast; security.md lists API-SYS-004. Re-run `pm4 check T-0151`: ac hashes ok (5), web gates ok, AC-1…AC-5, AC-8, AC-14, AC-16 ok, twins 139 equal. Scope lists only the four spec files of OQ-273 and these fixes.

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | done | Promoted page and components, real `api.ts` hooks, schema regenerated, route and sidebar link; tests and build pass; scope FAIL only on the main session's spec files |

## Review
**Opus review (2026-11-07): approve.** Hooks, promoted components, route, sidebar link and twins as specified; no `@/proto` imports in production; loading, empty and error states present. Minor: `web/lib/api/client.ts` `PUBLIC_API_PATHS` lacks `/api/v1/changelog` (bearer sent, refresh and CORS preflight on a public endpoint; not in this task's Files) → quick-lane follow-up with a case in `client.ac.test.ts`. Optional: the prototype `api.ts` keeps an obsolete comment and `ChangelogPaths` cast. Tier: right (haiku, first try).
