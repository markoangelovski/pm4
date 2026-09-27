---
id: T-0002
title: Bootstrap web/ from the dashboard template as a static export
milestone: M0
app: web
status: blocked
size: L
depends_on: [T-0005]
specs:
  - specs/04-web/template-adaptation.md
  - specs/04-web/static-export.md
  - specs/04-web/conventions.md
  - specs/04-web/routing.md
  - specs/decisions/ADR-0009-web-data-layer-and-forms.md
  - specs/decisions/ADR-0010-openapi-contract.md
requirements: []
---

# T-0002: Bootstrap web/ from the dashboard template as a static export

## Goal
Turn `next-shadcn-dashboard-main.zip` into a clean PM4 app shell that builds to a static `out/`.

## Scope
**In:** unzip the template into `web/`, then everything in `04-web/template-adaptation.md` (Keep / Remove / Change),
including the pnpm → npm conversion; the static export config (served from the root; no `public/CNAME` or `.nojekyll`, see `deployment.md`);
placeholder pages for the route map in `routing.md` (with the missing-`id` redirect on `view` pages);
the TanStack Query provider and a `lib/api` stub reading `NEXT_PUBLIC_API_BASE_URL`; `lib/time` skeleton;
`.nvmrc`; `web/AGENTS.md` / `web/CLAUDE.md` (replacing the template's, and deleting its `.agents`/`.claude` skill copies).

**Out:** real auth, real data screens, CI/CD (T-0003).

## Acceptance criteria
- [ ] No `app/api/**` Route Handlers and no demo features remain. Unused dependencies removed.
- [ ] `next.config.ts` matches the static-export baseline. Every incompatible template option is removed, and each removal is documented.
- [ ] Only `package-lock.json` exists (no pnpm lockfile). `npm run lint` and `npm run build` pass, and `out/` is produced.
- [ ] Served statically from the root, the shell and every placeholder route load on hard refresh. `/projects/view/` without an `id` redirects to `/projects/`.
- [ ] `swr`, the template contexts and `app/api/**` are gone.
- [ ] The sidebar shows the PM4 navigation. Light/dark theme works.
- [ ] `web/AGENTS.md` describes the adapted app (not the template). The tech-stack spec is updated with the actual versions.
- [ ] Definition of Done satisfied.

## Blocked by
- T-0005 (monorepo). Specs approved 2026-09-27.

---

## Implementation notes

## Review
