---
id: T-0110
title: Serve the PM4 favicon from the API and use it in the Swagger UI
milestone: M0
app: api
status: done
size: S
tier: haiku
depends_on: [T-0109]
feature_spec: —
files:
  - api/src/assets/favicon.ico
  - api/src/app.setup.ts
  - api/src/openapi.ts
  - api/nest-cli.json
  - api/test/favicon.e2e-spec.ts
  - specs/03-api/conventions.md
  - tasks/m0-foundation/T-0110-api-favicon.md
specs: [specs/03-api/conventions.md#openapi]
ac_files: []
---

# T-0110: Serve the PM4 favicon from the API and use it in the Swagger UI

## Goal
`GET /favicon.ico` on the API returns the PM4 icon (no `404` problem response when a browser opens `/health` or
`/docs`), and the Swagger UI at `/docs` shows it in the tab.

## Change
- `api/src/assets/favicon.ico`: the same file as `web/app/favicon.ico` (T-0109).
- `api/src/app.setup.ts`: `app.useStaticAssets(join(import.meta.dirname, "assets"), { index: false, maxAge: "7d" })`
  after helmet. Built into `@nestjs/platform-express` (no new dependency). It's outside the global prefix, and
  e2e tests get it through `configureApp`.
- `api/nest-cli.json`: `assets: [{ include: "assets/**/*", outDir: "dist" }]`, so the file lands in
  `dist/src/assets/`, next to `app.setup.js`, and ships with the deploy package (`dist/`).
- `api/src/openapi.ts`: `SwaggerModule.setup(..., { customfavIcon: "/favicon.ico" })`.
- `api/test/favicon.e2e-spec.ts`: `GET /favicon.ico` → 200, an icon content type.

## Acceptance criteria
- [ ] `test/favicon.e2e-spec.ts` passes
- [ ] `npm run build` puts `dist/src/assets/favicon.ico` next to `dist/src/app.setup.js`

---

## Implementation notes
Done inline by the main session.
- api gates: lint, typecheck ok; `npm test` 60 files / 416 tests passed; `npm run test:e2e` 28 files / 355 tests
  passed (incl. the new favicon test); `npm run build` → `dist/src/assets/favicon.ico`.
- Not checked against a running `dist/` build (it needs the env); the path logic is the same as in the e2e run.
- `pm4 check T-0110`: gates PASS (api lint, format, typecheck, test, test:e2e, build ok). Scope FAILs only on
  T-0109's 8 web/spec files, which share this branch.

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | opus (main session) | PASS | Inline: static favicon + Swagger `customfavIcon` |

## Review
Owner approved (quick lane), 2026-10-25.
