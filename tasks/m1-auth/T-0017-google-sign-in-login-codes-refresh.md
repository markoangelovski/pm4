---
id: T-0017
title: Google sign-in, login codes, refresh rotation and sign-out
milestone: M1
app: api
status: done
size: M
tier: opus
depends_on: [T-0016]
feature_spec: specs/06-features/auth-api-session.md
spec_row: T3
ac_files:
  - { path: api/test/auth.ac.e2e-spec.ts, sha256: bd620fa39c0e978977827378dea4f3371e7b0138b78ac02d31efae74015242c3 }
  - { path: api/src/auth/google-oidc.ac.spec.ts, sha256: 39b6a699356424b64587656196e8119e0b0ee0ddc1cee6f58242540325eea363 }
---

# T-0017: Google sign-in, login codes, refresh rotation and sign-out

**Tier reason:** Security logic: OAuth state/PKCE, single-use codes, rotation with reuse detection, Redis transactions

Work from the brief: `node scripts/pm4.mjs brief T-0017`. Verify with `node scripts/pm4.mjs check T-0017`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- `npm install openid-client` (6.8.8, D1). `nest g controller auth`, `nest g service auth`,
  `nest g provider auth/session.store --flat`; DTOs hand-written in `src/auth/dto/`.
- `GoogleOidc`: discovery is cached as a promise; a rejected discovery clears the cache so the next
  call retries. `exchange` also throws when the ID token has no `sub`/`email` (→ `failed`).
- `SessionStore`: tokens/codes/state/verifier = 32 random bytes base64url; only `sha256` hex hashes
  are keys. Multi-key writes go through one `MULTI`, and `execOrThrow` surfaces per-command errors
  (ioredis `exec()` resolves even if a queued command failed). `revokeFamily` reads the family to find
  its live token and user set; a missing family is a no-op.
- Rework (attempt 2, review findings): `rotate` is now one Lua script (`ROTATE_SCRIPT`, registered with
  ioredis `defineCommand` as `pm4RotateRefresh` in the constructor; no WATCH). KEYS = old refresh key,
  rotated marker of the old hash, new refresh key; ARGV = old hash, new hash, TTL. Family and user-set
  keys are derived inside the script from the stored ids (same prefixes as `keys`), so the script is not
  Redis Cluster-safe; fine on a single Redis Cloud endpoint. Reuse (refresh key gone, marker present)
  revokes the family inside the script. `revokeAll` no longer DELs `auth:families:<userId>`: each id is
  revoked (SREM), ids whose family expired are SREMed directly. Callback warn log now has only the
  error's `name` and `cause.code` (`describeError`, module-private), never `message`.
  `sanitizeTimeZone` rejects resolved names starting with `+`/`-`.
  Unit tests: the fake ioredis mirrors the Lua script in JS (the real script is covered by e2e AC-16/26);
  new tests for revokeAll never DELing the set, the log format, and offsets/`Etc/GMT-1`/`Europe/Kiev`.
- `AuthService.callback`: the whole flow is in one `try`; any throw (Redis, Google, DB unique
  violation on email) → `failed` (+ `returnTo` once the state entry was read), logged at `warn` with
  only the error name and `cause.code` (D11; see rework below). `sanitizeReturnTo` also rejects C1 controls (`\u0080-\u009f`).
- D12 mapping lives in `users.repository.ts` (`displayNameFrom`, `avatarUrlFrom`); `updated_at` set
  with `sql\`now()\`` only when email/name/avatar differ.
- OpenAPI: `@ApiFoundResponse` on the two redirects, `@ApiQuery` for `returnTo`/`timeZone` (optional).
- Unit tests: `session.store.spec.ts` (in-memory fake ioredis incl. MULTI), `auth.service.spec.ts`,
  `auth.controller.spec.ts`, D12 cases in `users.repository.spec.ts`.

`pm4 check T-0017` (attempt 2):
```
  ac hashes: ok (2)
  scope: FAIL (1 file(s))
  api lint: ok (6s)
  api typecheck: ok (2s)
  api test: ok (3s)
  api test:e2e: ok (12s)
  api build: ok (4s)
  api openapi:export: ok (6s)
  check AC-23: the contract has the auth and user endpoints, protected as specified: ok
  manual (owner verifies): AC-25
FAIL T-0017
- changed files outside scope:
    specs/06-features/auth-api-session.md (not in the Files table)
```
The scope failure is the coordinator's spec edit (not this task). AC-25 is manual (owner, after *Setup*).

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | opus | done | All ACs green first run (22 e2e in auth.ac, 6 in google-oidc.ac); only scope FAIL is the coordinator's spec edit |
| 2 | opus | done | Review rework: atomic Lua `rotate`, `revokeAll` keeps the set, log name + cause.code, offsets → UTC; 26 auth.ac e2e green incl. AC-26; only scope FAIL is the coordinator's spec edit |

## Review
**Verdict: approve** (minor findings only).

Opus review, 2026-10-03, feature `auth-api-session`. `pm4 check --feature`: all gates ok (e2e with
Postgres/Redis up); the only scope flag is the coordinator's authorized spec edit (*Config (T2)*). AC-25 manual (owner).

- Matches the spec: callback step order, `state` deleted on every outcome, allow-list before upsert, refresh
  revokes the family for a deleted or disallowed user, D12 mapping and D4 update-only-if-changed, tokens/codes
  32 random bytes with only sha256 hashes as Redis keys, nothing secret logged, `logout-all` scoped to the caller.
- Minor: rotation isn't atomic (`api/src/auth/session.store.ts:148-185`, GETDEL → GET family → MULTI). A
  concurrent reuse of the same refresh token can get a plain 401 without revoking the family, and a logout landing
  in the window is undone by the MULTI. Fix: one Lua script, or `WATCH` the family key.
- Minor: `revokeAll` (`session.store.ts:215-221`) ends with `DEL auth:families:<userId>`, which can orphan a family
  added by a concurrent sign-in. Fix: drop the final DEL, `SREM` expired ids instead.
- Minor: the callback's warn log (`api/src/auth/auth.service.ts:111-113`) logs `error.message`; a
  `DrizzleQueryError` message includes query params (email, name). Log `error.name` + `cause.code` instead.
- Minor, spec gap for the owner: `sanitizeTimeZone` (`auth.service.ts:26-35`) accepts offsets like `"+01:00"`
  (Node 24 `Intl`), stored as `time_zone` though documented as IANA. Owner decides whether to require
  `Intl.supportedValuesOf('timeZone')` (or `UTC`).
- Minor, project-wide: no `400`/`401` responses in OpenAPI for the auth routes (see T-0016).
- Tier feedback: opus was right (OAuth state/PKCE, single-use codes, rotation with reuse detection).

**Follow-up (2026-10-03, owner decisions applied in attempt 2):** rotation is one Lua script (new AC-26 passes),
`revokeAll` keeps the set, errors logged by name and cause code only, `sanitizeTimeZone` rejects offsets (AC-9).
Main session re-ran `pm4 check --feature`: all gates ok; only scope flag is the coordinator's spec edit.
Note: the script builds the family and user-set keys from stored ids (not in `KEYS`), which is fine on a
single Redis endpoint (Redis Cloud, non-cluster) but would need hash tags on Redis Cluster.
