---
id: T-0127
title: Web: mount the promoted notifier, no query retry on 429, SCR-001/002 rate-limited, api:types
milestone: M1
app: web
status: done
size: S
tier: haiku
depends_on: [T-0126]
feature_spec: specs/06-features/api-rate-limit.md
spec_row: T3
ac_files:
  - { path: web/features/system/rate-limit.ac.test.ts, sha256: b5fb80d2250c8391da25b75c7d162641b66b73dd805cc3b7992438245cbafc6c }
  - { path: web/features/system/components/rate-limit-notifier.ac.test.tsx, sha256: 42bafd3a31ef21f34e9176e44022b34fea0700230989b74d387d8fc586da6178 }
  - { path: web/lib/query-client.ac.test.tsx, sha256: 207e840a56ebbc923a8c112d8c59da012db695598fe5e4fc98e35f5d182e475b }
  - { path: web/features/auth/components/auth-rate-limit.ac.test.tsx, sha256: 4f017fa2fefe106c5b0344a590530d95f85469ce7b4bdd002189dedf458a5f01 }
---

# T-0127: Web: mount the promoted notifier, no query retry on 429, SCR-001/002 rate-limited, api:types

**Tier reason:** Promoted files as is; each edit spelled out above

Work from the brief: `node scripts/pm4.mjs brief T-0127`. Verify with `node scripts/pm4.mjs check T-0127`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- `app/(dashboard-layout)/layout.tsx`: `<RateLimitNotifier />` after `<LogTimeButton />` inside `SidebarProvider`.
- `lib/query-client.tsx`: queries `retry: (failureCount, error) => !isApiError(error, 429) && failureCount < 1`; mutations unchanged.
- `features/auth/components/sign-in-state.tsx`: `rate-limited` message before the fallback.
- `lib/auth/session.ts`: `exchange` throws `ApiError(status, null)` instead of `Error`; nothing else changed.
- `features/auth/components/auth-callback.tsx`: `fail(reason = "failed")`; exchange rejection maps a 429 to `error=rate-limited`.
- `lib/api/schema.d.ts`: regenerated with `npm run api:types` (+504 lines, the 429 responses).
- Promoted `features/system/rate-limit.ts` and `rate-limit-notifier.tsx` left as they are.
- Reviewer: the `pm4 check` twin warnings (23 files whose `toast.error` the prototype changed to `toastError`) are T-0128's (T4) work, not this task's; they are warnings, not failures.

`node scripts/pm4.mjs check T-0127` (after `npm run format` fixed one Prettier issue in `auth-callback.tsx`):

```
  ac hashes: ok (4)
  scope: ok
  pending ACs (later tasks, excluded): AC-25
  web lint: ok (16s)
  web format:check: ok (5s)
  web typecheck: ok (14s)
  web test: ok (32s)
  web build: ok (8s)
  web api:types: ok (1s)
  check AC-17: 429 on every rate-limited operation, none on the three exceptions: ok
  twins: ok (99 equal)
PASS T-0127
```

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | PASS | Applied the five web edits and regenerated the schema; format:check failed on auth-callback.tsx, fixed with `npm run format`; all checks pass. |

## Review
_Filled in by `review-feature`._

**Verdict: approve** (Opus, 2026-11-01). Notifier mount, query retry predicate, sign-in message, `exchange` throwing `ApiError`, and `fail(reason)` match the spec; `schema.d.ts` regenerated.
- Finding (minor, task file): *Attempts* separator had 5 columns; fixed in review.
- Tier: haiku was right (one attempt, one Prettier fix).
- Feature check (`pm4 check --feature`): PASS (api + web gates, AC-17, twins 122 equal, no proto imports in production).
