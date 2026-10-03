---
id: feat-api-error-docs
title: Problem Details error responses in the OpenAPI contract
status: approved
owner: Marko Angelovski
last_updated: 2026-10-03
milestone: M1
requirements: []
related: [api-conventions, api-endpoints, ADR-0010, feat-auth-api-session, feat-prj-api, OQ-094, OQ-095, OQ-096, OQ-097]
---

# Problem Details error responses in the OpenAPI contract

## Goal
`api/openapi.json` documents the error responses of every existing operation, not just the success
status. Every error is one shared RFC 9457 schema served as `application/problem+json`
([conventions.md → Errors](../03-api/conventions.md#errors)), so `web/lib/api/schema.d.ts` types the
`error` that `openapi-fetch` returns. This lands before T-0023 adds more controllers.

## Decisions
| # | Decision | Source |
| --- | --- | --- |
| D1 | Each operation documents the errors on its *Errors* line in endpoints.md, plus `500` on every operation. `429` waits for rate limiting, which isn't implemented yet. API-AUTH-002 documents no error, because it always answers `302`. | OQ-094 (owner, 2026-10-03) |
| D2 | One composite decorator, `@ApiProblemResponses(...statuses)`, built with `applyDecorators` over Nest's `@ApiBadRequestResponse`/`@ApiUnauthorizedResponse`/…, sets the content type to `application/problem+json` with a `$ref` to `ProblemDetailsDto`. The plain `@ApiXxxResponse({ type })` form would say `application/json`, which isn't what the filter sends. | OQ-095 (owner) |
| D3 | `ProblemDetailsFilter` types its body as `ProblemDetailsDto`, replacing its private `ProblemDetailsBody` interface, so the schema and the response can't drift apart. | OQ-096 (owner) |
| D4 | A rule in conventions.md#openapi makes every later operation (T-0023 onwards) use the decorator. prj-api and tsk-api aren't edited. | OQ-097 (owner) |
| D5 | `/health` stays out of the contract (`@ApiExcludeController`, endpoints.md API-SYS-003). It isn't changed. | Agent: already decided in the endpoints spec |
| D6 | prj-api D10 later adds extension members (`problemType`, `extensions`) to the filter. It builds on `ProblemDetailsDto` from this feature. RFC 9457 allows extra members, and the schema doesn't forbid them. | Agent |

## Scope
**In:** `ProblemDetailsDto` and `FieldErrorDto`, the `ApiProblemResponses` decorator, the filter's body
type, the decorator on the version, auth and users controllers, the exported `api/openapi.json`, and
the regenerated `web/lib/api/schema.d.ts`.

**Non-goals** (implementers must not touch these):
- The filter's behavior: status → slug/title mapping, `detail` text, logging. Only the body's type changes.
- The health controller, rate limiting, and `429` documentation.
- Success responses (`200`, `204`, `302`) and request DTOs.
- `web/lib/api/client.ts` and any web error mapping (feat-auth-web-session).
- prj-api and tsk-api specs and code.

## Read first
| Path | Why / copy this |
| --- | --- |
| `specs/03-api/conventions.md#errors` | The Problem Details body and the meaning of each status |
| `specs/03-api/endpoints.md#api-sys-003-api-version` | Each operation's *Errors* line (API-SYS-003, API-AUTH-001…006, API-USR-001) |
| `api/src/common/filters/problem-details/problem-details.filter.ts` | The body that the DTO describes |
| `api/src/common/decorators/public/public.decorator.ts` | Decorator file layout |
| `api/src/version/dto/version-response.dto.ts` | DTO style: TSDoc comments, introspected by the Swagger CLI plugin |

## Files
| App | File | C/M | Task | Notes |
| --- | --- | --- | --- | --- |
| api | `api/src/common/filters/problem-details/problem-details.dto.ts` | C | T1 | `npx nest g class common/filters/problem-details/problem-details.dto --flat --no-spec` |
| api | `api/src/common/decorators/api-problem-responses/api-problem-responses.decorator.ts` | C | T1 | `npx nest g decorator common/decorators/api-problem-responses` |
| api | `api/src/common/filters/problem-details/problem-details.filter.ts` | M | T1 | D3: body typed as `ProblemDetailsDto` |
| api | `api/src/version/version.controller.ts` | M | T1 | Decorator per the matrix |
| api | `api/src/auth/auth.controller.ts` | M | T1 | Decorator per the matrix |
| api | `api/src/users/users.controller.ts` | M | T1 | Decorator per the matrix |
| api | `api/openapi.json` | M | T1 | `npm run openapi:export` |
| web | `web/lib/api/schema.d.ts` | M | T2 | `npm run api:types` |

## Interfaces

### Problem Details schema (T1)
```ts
// api/src/common/filters/problem-details/problem-details.dto.ts
import { ApiProperty } from "@nestjs/swagger";
import { FieldError } from "../../validation/flatten-validation-errors.js";

/** One invalid field of a `400` (conventions.md#errors). */
export class FieldErrorDto implements FieldError {
  /** Dot path of the field, e.g. `address.city`. */
  field: string;
  /** What is wrong with it. */
  message: string;
}

/** RFC 9457 Problem Details, served as `application/problem+json`. */
export class ProblemDetailsDto {
  /** `<WEB_APP_URL>/errors/<slug>`, e.g. `https://pm4.angelovski.top/errors/validation`. */
  type: string;
  /** Short summary of the status, e.g. `Validation failed`. */
  title: string;
  /** The HTTP status code. */
  @ApiProperty({ type: "integer", example: 400 })
  status: number;
  /** Human-readable explanation. */
  detail: string;
  /** Only on a `400` validation error: one entry per failed constraint. */
  errors?: FieldErrorDto[];
}
```
In the filter, delete `ProblemDetailsBody` and declare `const body: ProblemDetailsDto = { … }`. Nothing else changes.

### ApiProblemResponses (T1)
```ts
// api/src/common/decorators/api-problem-responses/api-problem-responses.decorator.ts
import { applyDecorators } from "@nestjs/common";
import {
  ApiBadRequestResponse, ApiConflictResponse, ApiExtraModels, ApiInternalServerErrorResponse,
  ApiNotFoundResponse, ApiUnauthorizedResponse, getSchemaPath
} from "@nestjs/swagger";
import { ProblemDetailsDto } from "../../filters/problem-details/problem-details.dto.js";

export type ProblemStatus = 400 | 401 | 404 | 409;

/**
 * Documents Problem Details error responses (conventions.md#errors):
 * the given statuses plus `500`, each `application/problem+json` → `ProblemDetailsDto`.
 */
export function ApiProblemResponses(...statuses: ProblemStatus[]): MethodDecorator & ClassDecorator;
```
- Content of each response, exactly: `{ "application/problem+json": { schema: { $ref: getSchemaPath(ProblemDetailsDto) } } }`. Include `ApiExtraModels(ProblemDetailsDto)` so the schema is registered.
- Order: the given statuses ascending, then `500`. Duplicates are ignored.
- Descriptions: 400 `Validation failed: one entry in errors[] per invalid field.` · 401 `Missing, invalid or expired credentials.` · 404 `Not found.` · 409 `Conflict.` · 500 `Unexpected error.`

### Operation matrix (T1)
Put the decorator on the handler. Every other decorator stays as it is.

| Operation | Handler | Decorator |
| --- | --- | --- |
| `GET /api/v1/version` | `VersionController.get` | `@ApiProblemResponses()` |
| `GET /api/v1/auth/google` | `AuthController.start` | `@ApiProblemResponses()` |
| `GET /api/v1/auth/google/callback` | `AuthController.callback` | none (always `302`) |
| `POST /api/v1/auth/token` | `AuthController.token` | `@ApiProblemResponses(400, 401)` |
| `POST /api/v1/auth/refresh` | `AuthController.refresh` | `@ApiProblemResponses(400, 401)` |
| `POST /api/v1/auth/logout` | `AuthController.logout` | `@ApiProblemResponses(400)` |
| `POST /api/v1/auth/logout-all` | `AuthController.logoutAll` | `@ApiProblemResponses(401)` |
| `GET /api/v1/me` | `UsersController.get` | `@ApiProblemResponses(401)` |

Run `npm run openapi:export` at the end. The success responses in `openapi.json` must stay as they are.

### Web types (T2)
From `web/`: `npm run api:types`, then the web gates. No source change is expected. If typecheck fails
because `error` is now typed, stop and report `BLOCKED: spec`.

## Acceptance criteria
| AC | Case → expected | Test | Task |
| --- | --- | --- | --- |
| AC-1 | `openapi.json` has `components.schemas.ProblemDetailsDto`, with required `type`, `title`, `status` (integer) and `detail`, and optional `errors`, an array of `$ref` `FieldErrorDto` (required `field`, `message`) | `check` | T1 |
| AC-2 | Each operation's error responses are exactly the matrix set (its statuses + `500`; the callback has none), and each has only `application/problem+json` with `$ref` `#/components/schemas/ProblemDetailsDto` | `check` | T1 |
| AC-3 | Success statuses are unchanged: version `200`, google `302`, callback `302`, token `200`, refresh `200`, logout `204`, logout-all `204`, me `200` | `check` | T1 |
| AC-4 | `/health` is still absent from `paths` | `check` | T1 |
| AC-5 | The filter's existing unit tests and the auth/me/version e2e tests still pass (the body is unchanged at runtime) | gates | T1 |
| AC-6 | `web/lib/api/schema.d.ts` defines `ProblemDetailsDto`, and the web typecheck passes | `check` + gates | T2 |

No typed stubs: the acceptance criteria are checks over generated files.

## Checks
```bash
# AC-1, AC-2, AC-3, AC-4: the error responses in the contract
node -e "
const d=require('./api/openapi.json'), fail=(m)=>{console.error(m);process.exit(1)};
const s=d.components?.schemas?.ProblemDetailsDto; if(!s) fail('no ProblemDetailsDto');
for (const k of ['type','title','status','detail']) if(!(s.required??[]).includes(k)) fail('ProblemDetailsDto.'+k+' not required');
if((s.required??[]).includes('errors')) fail('errors must be optional');
if(s.properties?.status?.type!=='integer') fail('status must be integer');
if(s.properties?.errors?.items?.\$ref!=='#/components/schemas/FieldErrorDto') fail('errors items must ref FieldErrorDto');
const f=d.components.schemas.FieldErrorDto; for (const k of ['field','message']) if(!(f?.required??[]).includes(k)) fail('FieldErrorDto.'+k);
const want={'/api/v1/version get':[['200'],['500']],'/api/v1/auth/google get':[['302'],['500']],'/api/v1/auth/google/callback get':[['302'],[]],
'/api/v1/auth/token post':[['200'],['400','401','500']],'/api/v1/auth/refresh post':[['200'],['400','401','500']],'/api/v1/auth/logout post':[['204'],['400','500']],
'/api/v1/auth/logout-all post':[['204'],['401','500']],'/api/v1/me get':[['200'],['401','500']]};
for (const [k,[ok,errs]] of Object.entries(want)) { const [u,m]=k.split(' '), r=d.paths[u]?.[m]?.responses; if(!r) fail('missing '+k);
  const codes=Object.keys(r); const got=codes.filter(c=>+c>=400).sort(), suc=codes.filter(c=>+c<400).sort();
  if(JSON.stringify(suc)!==JSON.stringify(ok)) fail(k+' success '+suc);
  if(JSON.stringify(got)!==JSON.stringify(errs)) fail(k+' errors '+got);
  for (const c of got) { const ct=r[c].content??{}; if(JSON.stringify(Object.keys(ct))!=='[\"application/problem+json\"]') fail(k+' '+c+' content type');
    if(ct['application/problem+json'].schema?.\$ref!=='#/components/schemas/ProblemDetailsDto') fail(k+' '+c+' schema'); } }
if(Object.keys(d.paths).some(p=>p.includes('health'))) fail('/health is in the contract');"
```

```bash
# AC-6: the web types have the Problem Details schema
grep -q 'ProblemDetailsDto: {' web/lib/api/schema.d.ts
```

## Tasks
| # | Task | App | Size | Tier | Why this tier | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | Problem Details schema, the `ApiProblemResponses` decorator and error responses on the existing controllers | api | S | sonnet | 7 files, but every one is fully specified (DTO and decorator code, operation matrix); more than 3 files rules out haiku | — |
| T2 | Regenerate the web API types for the Problem Details responses | web | S | haiku | One generated file, `npm run api:types` and the gates | T1 |

## Open questions
None. OQ-094…OQ-097 are resolved.

## Changelog
- 2026-10-03: Initial draft (OQ-094…OQ-097), from a review finding on feat-auth-api-session. Set to `review`.
- 2026-10-03: Approved by the owner.
