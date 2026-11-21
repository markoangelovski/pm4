---
id: T-0171
title: "Documentation: promote the Architecture, Auth and Database tabs and the new topic order"
milestone: M1
app: web
status: done
size: S
tier: haiku
written_by: claude-code/claude-opus-5-5
implementer: claude-code/claude-haiku-5-5
depends_on: []
feature_spec: —
files:
  - web/features/documentation/components/architecture-doc.tsx
  - web/features/documentation/components/auth-doc.tsx
  - web/features/documentation/components/database-doc.tsx
  - web/features/documentation/components/doc-section.tsx
  - web/features/documentation/components/mermaid-diagram.tsx
  - web/features/documentation/components/documentation-view.tsx
  - specs/04-web/screens.md
specs: [specs/04-web/screens.md#scr-053]
ac_files: []
---

# T-0171: Documentation: promote the Architecture, Auth and Database tabs and the new topic order

**Lane:** quick, by the owner's decision (2026-11-21), although it touches 6 files: every change is an exact copy
of a confirmed prototype twin (prototype `159ef8d`), with no logic to write.
**Tier reason:** file copies only; no `@/proto` import to rewrite.

## Goal
The real Documentation page (`/app/documentation`) gets the prototype's **Architecture**, **Auth** and **Database**
tabs and its topic order (Architecture, Auth, Database, API Docs, Versioning, Changelog), as SCR-053 says.

## Change
The dependencies (`mermaid`, `@iconify-json/logos`) are already in `web/package.json` and the lockfile. Don't add,
remove or upgrade any.

1. Copy these five prototype files **byte for byte** to the production folder (they don't exist there yet):

   ```bash
   cd web
   for f in architecture-doc auth-doc database-doc doc-section mermaid-diagram; do
     cp proto/features/documentation/components/$f.tsx features/documentation/components/$f.tsx
   done
   ```

2. Replace `web/features/documentation/components/documentation-view.tsx` with its twin, byte for byte:

   ```bash
   cp proto/features/documentation/components/documentation-view.tsx features/documentation/components/documentation-view.tsx
   ```

   The twin already imports `./api-docs`, `./changelog-doc` and `./versioning-doc`, which exist in production.
   The only difference from the current production file is the three new topics and their order.

3. Confirm that no copied file imports `@/proto`: `grep -n "@/proto" features/documentation/components/*.tsx` must
   print nothing. If it prints anything, stop and report `BLOCKED: spec`.

Change nothing else: not the prototype files, not `versioning-doc.tsx`, `changelog-doc.tsx`, `api-docs.tsx`, the
route or the sidebar.

## Acceptance criteria
- [ ] The six production files equal their prototype twins (`node scripts/pm4.mjs twins` reports them equal).
- [ ] `npm run lint` (no new errors), `npm run typecheck` and `npm test` pass in `web/`.
- [ ] `npm run build` passes; the static export contains no prototype trace (the `postbuild` check).
- [ ] Manual (owner): `/app/documentation` opens on **Architecture**; the tabs read Architecture, Auth, Database,
      API Docs, Versioning, Changelog; all six diagrams render in light and dark mode, and **View full size**
      opens each one.

## Checks
```bash
cd web
test -z "$(grep -ln '@/proto' features/documentation/components/*.tsx)"
for f in architecture-doc auth-doc database-doc doc-section mermaid-diagram documentation-view; do
  cmp proto/features/documentation/components/$f.tsx features/documentation/components/$f.tsx
done
```

---

## Implementation notes
_Implementer: what changed, and anything the reviewer should look at._

Copied byte for byte from the prototype twins: `architecture-doc.tsx`, `auth-doc.tsx`, `database-doc.tsx`,
`doc-section.tsx`, `mermaid-diagram.tsx` (new) and `documentation-view.tsx` (replaced). No `@/proto` imports
in `features/documentation/components/`. Nothing else changed.

`node scripts/pm4.mjs check T-0171`:

```
PASS T-0171
  ac hashes: none recorded
  scope: ok
  web lint: ok (19s)   (0 errors; 4 pre-existing warnings in bookings/notes/time, outside this task)
  web format:check: ok (6s)
  web typecheck: ok (6s)
  web test: ok (42s)
  web build: ok (39s)
  check checks: ok
  twins: ok (158 equal)
```

Manual checks (owner): `/app/documentation` opens on Architecture, tab order, six diagrams in light and dark, View full size.

### Attempts
| # | Agent | Result | Summary |
| --- | --- | --- | --- |
| 1 | claude-code/claude-haiku-5-5 | done | Copied the six twins byte for byte; pm4 check PASS (re-run by the main session: PASS) |

## Review
_The owner's review (quick lane), or `review-feature`'s verdict._

**Verdict: approve** (owner, quick lane, 2026-11-21). The owner reviewed the diff and asked to commit.
