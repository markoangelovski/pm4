---
name: prototype
description: Build or change a PM4 screen in the frontend-only UI prototype (/proto/app/**, mocked session and in-memory data) together with the owner, until the owner confirms it. Use first for any feature or change that adds or changes web UI, before write-spec.
argument-hint: <screen or feature, e.g. "bookings: add a notes column">
---

# Prototype: $ARGUMENTS

Run this inline in the main (Opus) session, with the owner. No subagents. The rules are in
`specs/04-web/prototype.md`; read it once per session, plus `specs/04-web/screens.md` for the screen.

## 1. Start from what exists
- Open only this screen's prototype files: its `web/app/proto/app/<route>/page.dev.tsx`, the components it renders
  under `web/proto/features/<domain>/`, that domain's mock `api.ts`, and `web/proto/mock/seed.ts`.
- A new screen: mirror the production paths it will have (`prototype.md#layout-mirror-the-app`). A screen that
  exists in the app but not in the prototype yet: copy the production files to their `proto/` twins first, and
  point them at mock hooks.

## 2. Build
- Follow `specs/04-web/conventions.md` exactly (shadcn via the CLI, forms, `lib/time`, nuqs, loading / empty /
  error states). The code is promoted as is, so write it to production quality.
- `proto/features/<domain>/api.ts` is the real `features/<domain>/api.ts` (or what it will be) over
  `@/proto/mock/client`. A new endpoint goes into the mock client first; data the API doesn't serve yet goes into
  `proposed-types.ts`, shaped like a DTO.
- Seed the cases the owner needs to see (empty, typical, long text, edge values), with dates relative to today.
- Never import `@/features/*`, `@/lib/api/client` or `@/lib/auth/*` from the prototype, and never import
  `@/proto/*` from production code. Route files are `*.dev.tsx` only.

## 3. Show and iterate
- Run `npm run lint` and `npm run typecheck` in `web/` after each round (not the build or tests).
- Give the owner the URL (`http://localhost:3000/proto/app/...`) and say in a few lines what changed. If the dev
  server isn't running, ask the owner to start it (`! cd web && npm run dev`).
- Unknown product behavior: ask the owner (`AskUserQuestion`, batched). Record the answers as `OQ-###` in
  `specs/open-questions.md` only when they affect the API or a layer spec.

## 4. Confirm
- The owner confirms the screen in words ("confirmed"). Then list the changed files and suggest a commit message
  `proto(web): <screen>: <what>`. The owner commits (AGENTS.md §3).
- Next step: `write-spec` for the feature, with the prototype commit's SHA for its `prototype:` field.
