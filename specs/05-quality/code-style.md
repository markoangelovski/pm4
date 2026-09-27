---
id: qa-code-style
title: Code Style
status: draft
owner: Marko Angelovski
last_updated: 2026-09-27
related: [web-conventions, api-conventions]
---

# Code Style

## Purpose
Shared style rules for both apps. Tooling enforces them wherever possible.

## Both apps
- TypeScript `strict: true`. No `any` without a comment explaining why. No `@ts-ignore` (use `@ts-expect-error` with a reason).
- ESLint + Prettier. Formatting is never discussed in review. CI fails on lint errors.
- Names: files in `kebab-case`, React components in `PascalCase`, variables and functions in `camelCase`,
  constants in `SCREAMING_SNAKE_CASE`. Domain terms follow `00-product/glossary.md` exactly.
- Keep modules small and cohesive. Prefer pure functions for logic.
- Comments explain *why*, not *what*. Reference requirement IDs in tests (`it('FR-TLOG-001: …')`).
- Conventional commits: `feat|fix|refactor|test|docs|chore(scope): summary`, and mention `T-####` in the body.
  The owner makes all commits. Agents leave changes uncommitted and may only suggest the message (AGENTS.md §3).

## Per app
See `04-web/conventions.md` and `03-api/conventions.md`.

## Open questions
—

## Changelog
- 2026-09-26: Initial scaffold.
- 2026-09-27: Agents never commit; the owner reviews the diff and commits.
