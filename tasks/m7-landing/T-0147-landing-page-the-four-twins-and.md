---
id: T-0147
title: Landing page: the four twins and app/page.tsx
milestone: M7
app: web
status: done
size: S
tier: haiku
depends_on: []
feature_spec: specs/06-features/land-redesign.md
spec_row: T1
ac_files:
  - { path: web/features/landing/components/landing-page.ac.test.tsx, sha256: ea8236c8e7b40353e38df9cdcb5b740687d533d58451e3dfe4f34aac62da996c }
  - { path: web/app/page.ac.test.tsx, sha256: eb08e678d5359a6b81d3c1f42d0a22c48d801ea58d4dedee4cb6821de1e879a0 }
---

# T-0147: Landing page: the four twins and app/page.tsx

**Tier reason:** Twin copy by the command under *Twins (T1)*; `app/page.tsx` is spelled out under *Page (T1)*

Work from the brief: `node scripts/pm4.mjs brief T-0147`. Verify with `node scripts/pm4.mjs check T-0147`.

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

- Copied the four twins from `web/proto/features/landing/components/` with `@/proto/` rewritten to `@/` (sed), then prettier. Overwrote the stub `landing-page.tsx`. The only non-`@/` change is the `TombstoneIcon` import, now `@/features/time/components/deleted-marker` (verified byte-equal to its twin).
- Rewrote `web/app/page.tsx` per the brief's *Page (T1)* section. `metadata` unchanged.
- Vitest run on `features/landing`, `app/page.ac.test.tsx`, `app/components/shared`: 14 tests pass.
- Reviewer: the twin is a copy of the prototype, so review the markup against the prototype only if needed.

`node scripts/pm4.mjs check T-0147` output:

```
pm4 check T-0147
  ac hashes: ok (2)
  scope: ok
  web lint: ok (16s)
  web format:check: ok (5s)
  web typecheck: ok (13s)
  web test: ok (34s)
  web build: ok (29s)
  check AC-8: the built landing page has its sections; the twins are equal: ok
  twins: ok (135 equal)

PASS T-0147
```

### Attempts
| # | Tier | Result | Summary |
| --- | --- | --- | --- |
| 1 | haiku | PASS | Twins copied and rewritten, `app/page.tsx` written; `pm4 check` PASS on first run. |

## Review
**Verdict: approve** (Opus, 2026-11-07). `pm4 check` re-run: PASS. Twins equal their prototype files apart from `@/proto/` → `@/`;
`page.tsx` matches *Page (T1)*; AC-1…AC-8 and the non-goals hold.

Findings (minor, no code change required):
1. The spec's *Goal*/AC-2 name five sections, but the page (from the approved prototype) also has `#day` "How a day works",
   an "Also in PM4" extras grid and `#integrations` (PMSPA). Suggest one line in the spec naming them.
2. The `Sections` nav is `hidden md:block`, so on mobile the section links are only in the footer. Matches the prototype;
   change prototype first if wanted.

Tier feedback: haiku was right (scripted copy + spelled-out page, first attempt).
