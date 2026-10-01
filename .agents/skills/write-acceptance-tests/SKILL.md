---
name: write-acceptance-tests
description: Test-first step for a PM4 feature. Writes the *.ac.* acceptance tests and typed stubs listed in an approved feature spec, confirms they fail for the right reason, and records their hashes in the task files. Use after write-task and before implement-task.
argument-hint: <specs/06-features/file.md>
---

# Acceptance tests for $ARGUMENTS

Run inline in the main (Opus) session. If the spec was just written in this conversation, it's
already in context: don't re-read it.

1. Refuse if the spec isn't `approved`, if *Open questions* isn't empty, or if `pm4 tasks` hasn't run.
2. Write exactly the `*.ac.*` files in the *Acceptance criteria* table. Use one `it` per AC (or per
   case row), named `AC-# FR-…: …` so `pm4 check` can tell the tasks apart. Copy the existing style:
   - api e2e: `api/test/health.e2e-spec.ts` with `createTestApp()`, black-box over HTTP
   - api unit: `api/src/health/health.service.spec.ts`
   - web: `web/app/components/shared/view-id-guard.test.tsx`
3. Create the typed stubs the spec lists: the exact signature, and a body that throws
   `new Error("not implemented (feat-…)")`. Nothing more.
4. Verify from each affected app: `npm run lint` and `npm run typecheck` pass, every new acceptance
   test **fails for the expected reason** (not implemented, 404, missing route; never a syntax, import
   or setup error), and the existing tests still pass. Run only the new files while iterating
   (`npx vitest run <file>`).
5. Run `node scripts/pm4.mjs hash $ARGUMENTS`. It records each file's sha256 in the tasks that own its
   ACs, and moves tasks with no unmet dependencies to `ready`.
6. If the spec doesn't say enough to write a test without guessing, stop and ask the owner (`OQ-###`).
7. Report: the files written, each AC with its failure reason, and the gate results. Then ask the
   owner to review and **commit the test-first step** (spec, tasks, tests, stubs), so each
   implementation diff contains only implementation. Never stage or commit yourself.
