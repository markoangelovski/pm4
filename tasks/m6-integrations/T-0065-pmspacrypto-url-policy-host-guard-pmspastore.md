---
id: T-0065
title: PmspaCrypto, URL policy, host guard, PmspaStore (AC-15, AC-16)
milestone: M6
app: api
status: done
size: M
tier: haiku
depends_on: [T-0064]
feature_spec: specs/06-features/int-conn-api.md
spec_row: T2
ac_files:
  - { path: api/src/integrations/pmspa/pmspa-crypto.ac.spec.ts, sha256: cf0bf1055a6c4c6282a2ab7f3ba5d8fcc1d63aa0c2d9f3a4e5ed2326043fcf12 }
  - { path: api/src/integrations/pmspa/pmspa-url-policy.ac.spec.ts, sha256: e1890d70e365cd7bf0ab86d54d14f53066baa8377dc4c26dd2bfaee87c0b2eb3 }
---

# T-0065: PmspaCrypto, URL policy, host guard, PmspaStore (AC-15, AC-16)

**Tier reason:** Fully specified in *Interfaces* (AES-GCM layout, ranges, keys/TTLs); the store copies `session.store.ts`. Owner's call against the security trigger; AC-15/16 and the Opus review cover it

Work from the brief: `node scripts/pm4.mjs brief T-0065`. Verify with `node scripts/pm4.mjs check T-0065`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- `pmspa-crypto.ts`: AES-256-GCM, `randomBytes(12)` IV ‖ ciphertext ‖ 16-byte tag, key from `config.pmspaEncryptionKey`. `decrypt` rejects blobs shorter than 28 bytes and any tag mismatch.
- `pmspa-url-policy.ts`: `pmspaUrlProblem` and `isPrivateAddress` as in *Interfaces*. Extra exports used by the host guard: `bareHostname` (strips IPv6 brackets) and `isDevelopmentLocal`. `::ffff:` is checked as IPv4 in both dotted and hex form, since WHATWG URL normalises `[::ffff:1.2.3.4]` to hex.
- `pmspa-host-guard.ts`: `DNS_LOOKUP` token, `DnsLookup` type, `PmspaHostGuard.check` returning `ok | private | unresolved`. Also exports `defaultDnsLookup` (`dns.promises.lookup(host, { all: true })`) for T4's module to provide.
- `pmspa-host-guard.spec.ts`: new unit tests (public, private among several addresses, IP literal without DNS, unresolved, dev localhost skips DNS).
- `dto/pmspa-connection-response.dto.ts` (OQ-185, moved from T5): `PMSPA_CONNECTION_STATUSES`, `PmspaConnectionStatus`, `PmspaAccountDto`, `PmspaConnectionResponseDto` per endpoints.md *Shared PMSPA shapes*.
- `pmspa-store.ts` (D5): `pmspa:token:<userId>` holds the crypto blob as base64, EX 82800. `getToken` returns null when the blob can't be decrypted (a wrong key or a changed blob forces a re-login). `pmspa:account:<userId>` is JSON with no expiry. `clear` deletes both keys. `pausedFor` is PTTL rounded up to seconds (0 when absent). `pause` uses `SET … PX` only when the new pause is longer than the current PTTL.
- `pmspa-store.spec.ts`: unit tests with a fake Redis client and a real `PmspaCrypto` (token round trip and TTL, undecryptable token gives null, account round trip, clear, pause rounding, pause never shortened, pause extended).
- `pmspa-crypto.spec.ts` (listed in Files) is not written: the AC-15 acceptance test covers the same behaviour.
- `pmspa-store.ts` is not registered in a module yet (T4 does that).
- Lint fix in the store spec: the mock call arguments are typed explicitly.
- Review fix (3rd run): `getToken` on an undecryptable token logs `warn` with the user id only (no value, no error), deletes `pmspa:token:<userId>` and returns null. A missing key returns null without logging. `pmspa-store.spec.ts` covers the delete, the warn and that the message doesn't contain the stored value.
- `pm4 check T-0065` (3rd run): ac hashes, lint, format:check, typecheck, test, e2e, build and openapi:export pass. Scope fails only on later tasks' files and the orchestrator's spec, task and test files, as expected.
- `pm4 check T-0065` (second run, after the lint fix): lint, format:check, typecheck, test, e2e and build pass. Scope fails only on the three orchestrator files (`scripts/pm4.mjs`, `specs/06-features/int-conn-api.md`, `specs/open-questions.md`), which are not touched here.

```
pm4 check T-0065
  ac hashes: ok (2)
  scope: FAIL (3 file(s))
  pending ACs (later tasks, excluded): AC-1 … AC-14, AC-17
  api lint: ok (9s)
  api format:check: ok (2s)
  api typecheck: ok (4s)
  api test: ok (6s)
  api test:e2e: ok (32s)
  api build: ok (5s)
  check AC-17: skipped (later task)
FAIL T-0065
- changed files outside scope:
    scripts/pm4.mjs (not in the Files table)
    specs/06-features/int-conn-api.md (not in the Files table)
    specs/open-questions.md (not in the Files table)
```

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | BLOCKED: spec | AC-15 and AC-16 pass (14 tests). Crypto, URL policy and host guard implemented, host-guard unit tests added. Store not written: needs `PmspaAccountDto` from T5's DTO file. |
| 2 | haiku | done | OQ-185 resolved: DTO file created in T2. `pmspa-store.ts` and `pmspa-store.spec.ts` written; 27 pmspa unit tests pass; lint fixed. `pm4 check`: every gate passes except scope, which lists only the three orchestrator files. |
| 3 | haiku | done | Opus review fix: `getToken` warns (user id only), deletes the undecryptable token key and returns null; two store spec cases added (undecryptable token, missing key). Store spec passes. |

## Review
_Filled in by `review-feature`._

**Verdict: approve** (Opus review, feat-int-conn-api).
- Minor: `pmspa-store.ts:32-40`: `getToken` returning null on a decrypt failure is sound (the token is only a cache, and a rotated key still fails loudly at the re-login). But the empty `catch {}` leaves no trace. Fix: `logger.warn` without the blob, and `del` the key.
- `pmspa-crypto.spec.ts` doesn't exist and isn't needed (AC-15 covers it). The spec's Files row should drop it.
- Tier: haiku was right but marginal for security code; the Opus review remains necessary.

**Review fixes (2026-10-17, owner approved the suggestions):** `getToken` logs (user id only), deletes the key and returns null. Verified by the orchestrator's `pm4 check` (gates ok; scope lists only the orchestrator's spec and script files). No second Opus review yet.

**Re-review (Opus, 2026-10-17): approve** Tier: right.
