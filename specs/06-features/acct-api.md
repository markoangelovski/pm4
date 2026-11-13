---
id: feat-acct-api
title: "Account deletion and no emails in the lead search (API)"
status: approved
owner: Marko Angelovski
last_updated: 2026-11-13
milestone: M1
requirements: [FR-AUTH-008, FR-PRJ-006, API-USR-003, API-USR-004]
related: [req-auth, req-legal, req-projects, api-endpoints, api-data-model, sec, feat-prj-api, OQ-277, OQ-278, OQ-280, OQ-281]
prototype: —
---

# Account deletion and no emails in the lead search (API)

## Goal
A user can delete their account and all of its data with `DELETE /me` (FR-AUTH-008, API-USR-004), and the lead
search (API-USR-003) no longer returns or matches anyone's email (OQ-277). The web half (Profile → Delete account,
the lead picker without emails) is a separate feature, written after its prototype.

## Decisions
| # | Decision | Source |
| --- | --- | --- |
| D1 | `DELETE /me` lives in a new `AccountModule` (`api/src/account/`). `UsersModule` can't host it: `AuthModule` and `PmspaModule` both import `UsersModule`, and the handler needs their `SessionStore` and `PmspaStore`. Both modules export the store; `AccountModule` imports `UsersModule`, `AuthModule` and `PmspaModule` (no cycle). | Agent |
| D2 | The database part is one transaction that first locks the user row (`FOR UPDATE`): a concurrent request naming the user as lead then waits for the delete and fails its FK check instead of saving the name after it was cleared. | Agent |
| D3 | Redis cleanup runs after the commit and is best effort: a failure is logged as a warning and the answer stays `204` (API-USR-004). | Agent |
| D4 | No guard change: a deleted user's access tokens stay usable until they expire. | OQ-281 (owner, 2026-11-12) |
| D5 | Other users' items that name the user as lead lose the saved name too; their `updated_at` doesn't change. | OQ-280 (owner, 2026-11-12) |

## Scope
**In:** API-USR-003 without email (DTO, query, order); API-USR-004; `api/openapi.json`.

**Test step (main session, before T1):** in `api/test/users-search.ac.e2e-spec.ts`, rewrite AC-17 and AC-18 to
feat-prj-api's updated rows (they become this feature's AC-1 and AC-2); create `api/test/account-delete.ac.e2e-spec.ts`;
add the stubs (*Contract stubs*), run `npm run openapi:export`. Then `pm4 hash`.

**Non-goals** (implementers must not touch these):
- `web/**`, including `web/lib/api/schema.d.ts` (the web feature regenerates it).
- The access-token guard (D4), the rate limiter, `api/drizzle/**` (no schema change).
- `GET /me`'s `email` (the user's own email stays).
- Any acceptance test (`*.ac.*`).

## Read first
| Path | Why / copy this |
| --- | --- |
| `specs/03-api/endpoints.md#api-usr-003-search-users-for-the-project-lead`, `#api-usr-004-delete-the-account` | Contracts |
| `api/src/users/users.repository.ts` → `search`, `upsertFromGoogle` | The search to change (T1); a transaction with `tx` (T2) |
| `api/src/auth/auth.controller.ts` → `logoutAll` | A bearer `204` handler: `@ApiBearerAuth("bearer")`, `@HttpCode(204)`, `@ApiProblemResponses(401)`, `@CurrentUser()` (T2) |
| `api/src/auth/session.store.ts` → `revokeAll`, `api/src/integrations/pmspa/pmspa-store.ts` → `clear` | The two Redis cleanups (T2) |
| `api/src/users/users.module.ts`, `api/src/auth/auth.module.ts`, `api/src/integrations/pmspa/pmspa.module.ts` | Module wiring and exports (T2) |

## Files
| App | File | C/M | Task | Notes |
| --- | --- | --- | --- | --- |
| api | `api/test/users-search.ac.e2e-spec.ts` | M | tests | AC-1, AC-2 |
| api | `api/test/account-delete.ac.e2e-spec.ts` | C | tests | AC-3…AC-9 |
| api | `api/src/account/account.module.ts`, `api/src/account/account.controller.ts`, `api/src/account/account.service.ts` | C | tests, T2 | `npx nest g module account`, `npx nest g controller account --no-spec`, `npx nest g service account --no-spec`; stubs in the test step, real in T2 |
| api | `api/src/app.module.ts` | M | tests | `AccountModule` import (added by `nest g module`) |
| api | `api/openapi.json` | M | tests, T1 | `npm run openapi:export` |
| api | `api/src/users/dto/user-search.dto.ts`, `api/src/users/users.repository.ts`, `api/src/users/users.service.ts` | M | T1, T2 | T1: search; T2: `deleteAccount` in the repository |
| api | `api/src/users/users.repository.spec.ts`, `api/src/users/users.service.spec.ts` | M | T1 | Ordinary tests, if they assert the email in a search |
| api | `api/src/auth/auth.module.ts`, `api/src/integrations/pmspa/pmspa.module.ts` | M | T2 | Export `SessionStore` / `PmspaStore` |
| api | `api/src/account/account.service.spec.ts` | C | T2 | Ordinary unit tests of D3: a failing cleanup still runs the other and resolves with a warning; a missing user throws `UnauthorizedException`; the happy path calls both cleanups |

## Interfaces

### User search (T1)
```ts
// api/src/users/dto/user-search.dto.ts
export class UserSearchQueryDto {
  /** Matched against the display name only, case-insensitive, as a substring (OQ-277). */
  @Trim() @IsString() @Length(2, 100) q: string;
}
/** `UserSummary`: a user as shown in the lead picker; never the email (OQ-277). */
export class UserSummaryDto {
  id: string;
  displayName: string;
  @ApiProperty({ type: String, nullable: true }) avatarUrl: string | null;
}

// api/src/users/users.repository.ts — search(q, callerId, limit)
// select { id, displayName, avatarUrl }; where ilike(users.displayName, pattern) only;
// orderBy desc(sql`${users.id} = ${callerId}`), sql`lower(${users.displayName})`, users.id.
// Doc comments: "Users whose name contains `q`, the caller first (API-USR-003)."
// users.service.ts search doc: same wording.
```

### Account deletion (T2)
```ts
// api/src/users/users.repository.ts (imports: projects, tasks from the schema; and, eq, ne)
/**
 * Deletes the user and, by the FKs, everything they own (API-USR-004). Other users' items that name them as
 * lead lose the saved name too (OQ-280). false = no such user.
 */
async deleteAccount(id: string): Promise<boolean> {
  return this.db.transaction(async (tx) => {
    const [user] = await tx.select({ id: users.id }).from(users).where(eq(users.id, id)).for("update"); // D2
    if (!user) return false;
    await tx.update(projects).set({ projectLead: null })
      .where(and(eq(projects.projectLeadUserId, id), ne(projects.userId, id)));
    await tx.update(tasks).set({ projectLead: null })
      .where(and(eq(tasks.projectLeadUserId, id), ne(tasks.userId, id)));
    await tx.delete(users).where(eq(users.id, id));
    return true;
  });
}

// api/src/account/account.service.ts
@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly sessions: SessionStore,
    private readonly pmspaStore: PmspaStore
  ) {}

  /** API-USR-004: the account, then its sessions and cached PMSPA data (D3). */
  async deleteAccount(userId: string): Promise<void> {
    if (!(await this.usersRepository.deleteAccount(userId))) {
      throw new UnauthorizedException("Missing or invalid access token.");
    }
    // Each cleanup on its own, so one Redis failure doesn't skip the other (D3).
    await this.cleanUp(userId, "sessions", () => this.sessions.revokeAll(userId));
    await this.cleanUp(userId, "PMSPA data", () => this.pmspaStore.clear(userId));
  }

  private async cleanUp(userId: string, what: string, run: () => Promise<unknown>): Promise<void> {
    try {
      await run();
    } catch (error) {
      this.logger.warn(`Account ${userId} deleted, but clearing its ${what} failed: ${String(error)}`);
    }
  }
}

// api/src/account/account.controller.ts
/** `DELETE /api/v1/me` (API-USR-004). `GET`/`PATCH /me` are in `UsersController`. */
@ApiBearerAuth("bearer")
@Controller("me")
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  /** Delete the account and all of its data, permanently. */
  @Delete()
  @HttpCode(204)
  @ApiProblemResponses(401)
  remove(@CurrentUser() user: AuthUser): Promise<void> {
    return this.accountService.deleteAccount(user.id);
  }
}

// api/src/account/account.module.ts
@Module({ imports: [UsersModule, AuthModule, PmspaModule], controllers: [AccountController], providers: [AccountService] })
export class AccountModule {}
// auth.module.ts: exports: [AccessTokenService, SessionStore]. pmspa.module.ts: exports: [PmspaClient, PmspaStore].
```

### Contract stubs (test step)
The three `account` files as above, with `AccountService.deleteAccount` throwing
`new Error("not implemented (feat-acct-api)")`, and the T1 DTO change, so `openapi.json` is final and both lint and
typecheck pass while the tests fail.

## Acceptance criteria
| AC | Case → expected | Test | Task |
| --- | --- | --- | --- |
| AC-1 | feat-prj-api AC-17 (updated): `GET /users?q=an` with "Ana", "Dan", "Bob" (email `bob@han.dev`), "Zed" → Ana, Dan in name order (not Bob, not Zed); each item exactly `{id, displayName, avatarUrl}`; the caller first when they match | `api/test/users-search.ac.e2e-spec.ts` | T1 |
| AC-2 | feat-prj-api AC-18 (updated): 12 matches → 10 items; `q` missing, `a`, `" a "`, 101 chars → `400`; `q=%%` matches only names containing `%%` | `api/test/users-search.ac.e2e-spec.ts` | T1 |
| AC-3 | `DELETE /me` → `204`, empty body; afterwards the user's rows are gone from `users`, `user_identities`, `projects`, `tasks`, `project_services`, `workdays`, `time_logs`, `bookings`, `notes`, `todos`, `pmspa_connections` and the three `pmspa_*_links` | `api/test/account-delete.ac.e2e-spec.ts` | T2 |
| AC-4 | User B's project and task with A as user lead → after A's `DELETE /me`, B's `GET /projects/{id}` and `GET /tasks/{id}` show `projectLead: null`; both rows have `project_lead` and `project_lead_user_id` `NULL` and an unchanged `updated_at`. B's other project with the text lead equal to A's name keeps it | `api/test/account-delete.ac.e2e-spec.ts` | T2 |
| AC-5 | B's own data (projects, logs) is untouched, and B's session still works | `api/test/account-delete.ac.e2e-spec.ts` | T2 |
| AC-6 | After `DELETE /me`: `POST /auth/refresh` with any of A's refresh tokens (two sessions) → `401`; `GET /me` with A's old access token → `401` | `api/test/account-delete.ac.e2e-spec.ts` | T2 |
| AC-7 | A had a cached PMSPA token and account: `pmspa:token:<A>` and `pmspa:account:<A>` no longer exist in Redis | `api/test/account-delete.ac.e2e-spec.ts` | T2 |
| AC-8 | `DELETE /me` without a token → `401`; a second `DELETE /me` with the same (still unexpired) access token → `401` | `api/test/account-delete.ac.e2e-spec.ts` | T2 |
| AC-9 | Signing in again with A's Google identity (fake OIDC) creates a new user with a new id and no projects | `api/test/account-delete.ac.e2e-spec.ts` | T2 |
| AC-10 | `openapi.json` is current: `UserSummaryDto` has no `email`, `DELETE /api/v1/me` answers `204` and `401` | check | T1 |

## Checks
```bash
# AC-10: the contract has no lead emails, has DELETE /me, and is current
node -e "const d=require('./api/openapi.json'); const u=d.components.schemas.UserSummaryDto; const del=d.paths['/api/v1/me']?.delete; if(!u||u.properties.email||!del||!del.responses['204']||!del.responses['401']) process.exit(1)"
tmp=$(mktemp -d)
cp api/openapi.json "$tmp/"
(cd api && npm run -s openapi:export) && cmp -s api/openapi.json "$tmp/openapi.json"
```

## Tasks
| # | Task | App | Size | Tier | Why this tier | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | API-USR-003 without email: DTO, query, order, ordinary tests, `openapi.json` | api | S | haiku | Three spelled-out edits to existing code | — |
| T2 | API-USR-004: `deleteAccount` in the repository, `AccountService`, store exports | api | S | sonnet | Writes over several tables and two systems, with a lock and partial failure (task-routing sonnet trigger); the algorithm is spelled out above | T1 |

## Open questions
— (OQ-277, OQ-278, OQ-280, OQ-281 resolved)

## Changelog
- 2026-11-12: Initial draft (OQ-277…OQ-281). The web half follows its prototype.
- 2026-11-13: Approved by the owner.
- 2026-11-13: Review of T-0160: each Redis cleanup gets its own try/catch, so a failed session revoke no longer skips clearing the PMSPA cache. `account.service.spec.ts` is no longer optional.
