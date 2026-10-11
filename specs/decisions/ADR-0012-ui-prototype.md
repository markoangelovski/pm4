# ADR-0012: Frontend-only UI prototype under `/proto`, confirmed before the feature spec

- **Status:** accepted
- **Date:** 2026-10-11 (accepted 2026-10-11)
- **Deciders:** Marko Angelovski
- **Related:** web-prototype, qa-task-routing, feat-template, ADR-0001, ADR-0009, ADR-0010

## Context
UI behavior is hard to settle in prose. Writing it into a feature spec, then into acceptance tests, then having an
implementer rebuild it from that text costs tokens three times, and the owner sees the result only at the end.
Until now the owner prototyped screens in an untracked scratchpad, so specs couldn't point to it and every
implementer re-derived the UI.

## Decision
- `web/` holds a **UI prototype**: the app's screens at `/proto/app/*` (`/proto/app`, `/proto/app/projects`,
  `/proto/app/time`, …), running against a mocked session and in-memory mock data. It never calls the API.
- It is **dev only**. Prototype route files are named `page.dev.tsx` / `layout.dev.tsx`, and `next.config.ts` adds
  the `dev.tsx` page extension only in the development-server phase. `next build` therefore emits no `/proto`
  route: in production, `/proto/*` is the normal not-found page, like any unknown URL. The prototype shell also
  renders not-found on any host other than `localhost` / `127.0.0.1`.
- Every feature with a web UI is **built in the prototype first** (main session, with the owner), confirmed by the
  owner, and committed. The feature spec is then written from the confirmed prototype, and its web tasks
  **promote** prototype files into the real app (`node scripts/pm4.mjs promote`) and adapt them.
- **The prototype stays ahead of the app.** Every later UI change starts in the prototype, so production files
  differ from their prototype sources only in data wiring.
- **No trace in production.** Real code never imports `@/proto/*` (ESLint), and the build fails if `out/` contains
  a `proto` folder or the prototype marker string.
- The prototype code is tracked and committed like any other code.

Details: `specs/04-web/prototype.md`.

## Alternatives considered
- **Untracked scratchpad** (the previous practice): specs couldn't reference it, so each implementer re-derived the UI.
- **A separate prototype app or branch**: the code drifts from the real app's components, and promotion becomes a port.
- **Real components with a mocked `fetch`**: the prototype would need the real `api.ts` hooks before the spec exists,
  and the mock would be patched into the production bundle's code path.
- **Runtime flag in production** (`/proto` hidden behind a check): the mock code would still ship.

## Consequences
- The owner confirms UI in a browser before any spec is written; specs state only the delta from prototype to app,
  and most web tasks are haiku "promote + wire" tasks.
- Two copies of each screen exist (prototype and app). Keeping the prototype ahead is a rule every UI change follows.
- Lint and typecheck cover the prototype, so it must stay type-correct as the app changes.
- Follow-up (quick lane): the separation guards (`pageExtensions`, ESLint rule, build check), and moving the existing
  prototype code to the layout in `specs/04-web/prototype.md`.
