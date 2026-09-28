---
id: feat-<area>-<slug>          # e.g. feat-prj-crud
title: <Feature title>
status: draft                   # draft | review | approved | deprecated
owner: Marko Angelovski
last_updated: YYYY-MM-DD
milestone: M<N>
requirements: []                # [FR-PRJ-001, NFR-005]
related: []                     # [api-endpoints, api-data-model, ADR-000X]
---

<!--
How to use this template (delete this comment in the real spec):
- Write so that an implementer who reads ONLY this file plus the files under "Read first" can finish
  every task without making a design decision. If a choice is left, the spec isn't done.
- Contract details (endpoints, tables, screens) live in the layer specs. Link to their anchors here;
  don't copy them. Put implementation detail (file paths, class names, signatures) here.
- Every path must exist, or be listed under "Files" as created by a task.
- The spec can't move to `review` while "Open questions" is non-empty.
-->

# <Feature title>

## Goal
One or two sentences: what the user can do afterwards, and why it matters.

## Behavior
What the user sees and does, briefly. Link the requirements (`FR-…`) and screens (`SCR-…`) instead of restating them.

## Scope
**In:** …

**Non-goals** (implementers must not touch these):
- …

## Read first
The only files an implementer reads before starting, besides this spec and the app's `AGENTS.md`.

| File | Why |
| --- | --- |
| `specs/03-api/endpoints.md#api-xxx-001-…` | Contract |
| `api/src/…` | Pattern to copy |

## Files
Every file the feature creates (C) or modifies (M). Implementers touch nothing else.

| App | File | C/M | Task | Notes |
| --- | --- | --- | --- | --- |
| api | `api/src/<module>/<module>.service.ts` | C | T1 | Generate with `npx nest g …` |

## Reuse
| Use / mirror | Path | Copy this |
| --- | --- | --- |
| Module/controller/service layout | `api/src/health/` | Module wiring, DI style, `.js` import suffixes |

## Interfaces
Specify everything, so no design decisions are left. Delete the subsections that don't apply.

### API
Endpoint IDs and anchors in `specs/03-api/endpoints.md`. Add anything not there: DTO class names and
their files, validation decorators, and the service method signatures:

```ts
// api/src/<module>/<module>.service.ts
create(userId: string, dto: CreateXDto): Promise<XResponseDto>;
```

### Database
Tables and columns per `specs/03-api/data-model.md#…`. The Drizzle file, the migration name, and indexes.

### Web
Routes, components and hooks, with their props and signatures. Query keys, and the keys each mutation invalidates.

## Edge cases and errors
| Case | Expected result | Covered by |
| --- | --- | --- |
| Resource owned by another user | `404` `…/errors/not-found` | `AC-3` |

## Acceptance tests
Written by the test writer **before** implementation. Implementers must not modify these files.

| ID | Test | File | Level |
| --- | --- | --- | --- |
| AC-1 | FR-…: … | `api/test/<feature>.ac.e2e-spec.ts` | e2e |

Typed stubs created with the tests, so lint and typecheck pass while the tests fail:
- `…`

## Tasks
Ordered. Each task is small and independently verifiable. Tier rules: `specs/05-quality/task-routing.md`.

| # | Task | App | Tier | Why this tier | Depends on | Done when |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | … | api | haiku | DTOs from the field table; copy `…` | — | `AC-1` passes; lint/typecheck green |

## Definition of done
Run from the app folder. Expected result: every command exits 0, and the acceptance tests pass.

```bash
cd api && npm run lint && npm run typecheck && npm test && npm run test:e2e && npm run build
cd api && npm run openapi:export && git diff --exit-code -- openapi.json   # when the contract changed
cd web && npm run lint && npm run typecheck && npm test && npm run build
```

Plus `specs/05-quality/definition-of-done.md`.

## Open questions
Must be empty before `review`. Link `OQ-###` entries in `specs/open-questions.md`.

## Changelog
- YYYY-MM-DD: Initial draft.
