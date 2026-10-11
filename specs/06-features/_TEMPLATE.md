---
id: feat-<area>-<slug>          # e.g. feat-prj-crud
title: <Feature title>
status: draft                   # draft | review | approved | deprecated
owner: Marko Angelovski
last_updated: YYYY-MM-DD
milestone: M<N>
requirements: []                # [FR-PRJ-001, NFR-005]
related: []                     # [api-endpoints, api-data-model, ADR-000X]
prototype: —                    # SHA of the owner's prototype commit (web UI features), e.g. 1a2b3c4
---

<!--
How to use this template (delete this comment in the real spec):
- An implementer reads only their brief (`node scripts/pm4.mjs brief T-####`). It contains Goal, Scope,
  Read first, Interfaces, and the rows of Files, Acceptance criteria, Checks and Tasks that belong to
  the task. Everything an implementer needs goes in those sections, self-contained (no "see D3").
  Decisions and Changelog are for the owner and the reviewer.
- Write the least that leaves no decision. Link layer-spec anchors (FR-, API-, SCR-); never restate them.
  Rough size: an S feature fits in 1–2 screens, an M in 3–5. Bigger → split the feature.
- Tag Interfaces subsections with the tasks that need them: `### <name> (T1)` or `(T1, T3)`.
  Untagged subsections go into every brief.
- Every path must exist, or be created by a row in Files.
- The spec can't move to `review` while Open questions is non-empty or a `TODO:` remains.
- Web UI feature: the confirmed prototype (`specs/04-web/prototype.md`) is the UI spec. Don't describe markup,
  layout or copy; point at the prototype files and write only the delta to production (Interfaces → Web).
  Promoted files are `P` rows in Files. UI behavior the owner confirmed is a decision sourced
  "Owner, prototype `<sha>`". Acceptance tests cover the wiring (real hooks, invalidation, URL state, auth,
  errors), not markup the prototype already settled.
-->

# <Feature title>

## Goal
One or two sentences: what the user can do afterwards. Link the requirements and screens (`FR-…`, `SCR-…`).

## Decisions
Optional. Choices made while writing this spec, and who made them. *Interfaces* states the result.

| # | Decision | Source |
| --- | --- | --- |
| D1 | … | OQ-### (owner, YYYY-MM-DD) · Owner, prototype `<sha>` |

## Scope
**In:** …

**Non-goals** (implementers must not touch these):
- …

## Read first
The only files an implementer opens besides the brief: contracts, and the patterns to copy.

| Path | Why / copy this |
| --- | --- |
| `specs/03-api/endpoints.md#api-xxx-001-…` | Contract |
| `api/src/health/` | Module wiring, DI style, `.js` import suffixes |
| `web/proto/features/<domain>/api.ts` | The mock hooks the promoted components call: the real hooks keep these names and shapes |

## Files
Every file the feature creates (C), modifies (M), promotes from the prototype (P), moves or deletes.
`pm4 check` fails on any other changed file. Task `tests` = written in the test-first step. Globs are allowed for
generated names. A `P` row is `` `proto/…` → `…` ``: `pm4 promote` copies it before the task starts (only if the
target doesn't exist) and rewrites `@/proto/` imports to `@/`. The prototype's own `api.ts`, `routes.ts` and
`mock/` are never promoted.

| App | File | C/M | Task | Notes |
| --- | --- | --- | --- | --- |
| api | `api/test/<feature>.ac.e2e-spec.ts` | C | tests | Acceptance tests |
| api | `api/src/<module>/<module>.service.ts` | C | T1 | `npx nest g service <module>` |
| web | `proto/features/<domain>/components/x-view.tsx` → `features/<domain>/components/x-view.tsx` | P | T2 | Swap `@/proto/mock/…` for … |
| web | `app/proto/app/<route>/page.dev.tsx` → `app/(dashboard-layout)/app/<route>/page.tsx` | P | T2 | |

## Interfaces
Exact names, signatures, validation, query keys and invalidations. Delete what doesn't apply.

### API (T1)
```ts
// api/src/<module>/<module>.service.ts
create(userId: string, dto: CreateXDto): Promise<XResponseDto>;
```

### Database (T1)
Tables and columns per `specs/03-api/data-model.md#…`. The Drizzle file, the migration name, indexes.

### Web (T2)
Hooks with signatures, query keys and the keys each mutation invalidates (same names as the prototype's mock
`api.ts`). For promoted files, only the **delta from prototype to production**: each remaining `@/proto/mock/`
import and its replacement, auth/session use, API error mapping, URL state, anything the mock skipped. For a
promoted file that already exists in production: the command that shows the prototype change to apply,
e.g. `git diff <previous prototype sha> <prototype sha> -- web/proto/features/<domain>/components/x-view.tsx`.
New non-prototype components: props and signatures as usual.

## Acceptance criteria
The edge cases and the test plan in one table. One row per case; several rows may share an AC.
*Test*: the `*.ac.*` file, `check` (a command under *Checks*) or `manual`. *Task*: the task that makes it pass.

| AC | Case → expected | Test | Task |
| --- | --- | --- | --- |
| AC-1 | FR-…: valid `POST /…` → `201`, body per API-…-001 | `api/test/<feature>.ac.e2e-spec.ts` | T1 |
| AC-2 | Resource owned by another user → `404` `…/errors/not-found` | `api/test/<feature>.ac.e2e-spec.ts` | T1 |

Typed stubs (created with the tests, so lint and typecheck pass while the tests fail):
- `…`: the signature from *Interfaces*, each body `throw new Error("not implemented (feat-…)")`.

## Checks
Optional. Commands for ACs that aren't unit or e2e tests (build output, greps). `pm4 check` runs each
chunk from the repo root after the gates. Start every chunk with a `# AC-n: …` comment.

```bash
# AC-3: the build has the new page
test -f web/out/app/<route>/index.html
```

## Tasks
Ordered, each small and independently verifiable. Tiers: `specs/05-quality/task-routing.md` (haiku first;
sonnet or opus only on a named trigger).
A task's ACs come from the *Task* column above. The lint/typecheck/test/build gates always apply.

| # | Task | App | Size | Tier | Why this tier | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | … | api | S | haiku | DTOs from the field table; copy `…` | — |

## Open questions
Must be empty before `review`. Link `OQ-###` entries in `specs/open-questions.md`.

## Changelog
- YYYY-MM-DD: Initial draft.
