<!-- Title: a conventional commit, e.g. `feat(web): T-0163 landing page v2 (feat-land-page-v2)`.
     The PR is squash-merged with this title as the commit message, and the release version and
     changelog are computed from it (specs/02-architecture/deployment.md). -->

## What

<!-- One or two sentences. -->

## Scope

- Feature spec: <!-- specs/06-features/feat-….md, or "quick lane" / "none" -->
- Tasks: <!-- T-####, T-#### -->
- Prototype: <!-- master SHA of the prototype commit, or "n/a" -->

## Checks

- [ ] `node scripts/pm4.mjs check <T-####>` passes (summary in the task's *Implementation notes*)
- [ ] `review-feature` verdict `approve` (or quick lane: owner reviewed the diff)
- [ ] Tasks set to `done` in this branch
- [ ] Web: `npm run build`, `out/` served, deep route hard-refreshed
- [ ] API: `openapi.json` regenerated and `npm run api:types` run in `web/` if the contract changed

## Notes

<!-- Anything the reviewer should look at first, manual steps after merge, follow-ups. -->
