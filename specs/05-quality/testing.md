---
id: qa-testing
title: Testing Strategy
status: draft
owner: Marko Angelovski
last_updated: 2026-09-26
related: [qa-dod, NFR-005]
---

# Testing Strategy

## Purpose
Defines what is tested, at which level, and with which tools.

## API (`api/`)
| Level | Scope | Tooling | Required for |
| --- | --- | --- | --- |
| Unit | Services and pure logic (e.g. duration parsing, totals) | Jest | Every service method with logic |
| Integration / e2e | HTTP → controller → service → **real Postgres + Redis** | Jest + Supertest; docker-compose locally, service containers in CI | Every endpoint: happy path, validation error, 401, and **cross-user access returns 404** (NFR-005) |
| Contract | OpenAPI document matches endpoints.md | TODO | CI |

## Web (`web/`)
| Level | Scope | Tooling (proposed) | Required for |
| --- | --- | --- | --- |
| Unit | Formatters, parsers, hooks | Vitest | Every non-trivial helper |
| Component | Forms, lists and their states | Vitest + Testing Library (+ MSW for API mocks) | Every form and data view |
| E2E | Critical journeys, run against the built `out/` with a mocked API (MSW or Playwright routes). Google sign-in is stubbed via a test-only token. | Playwright | Sign in, create project → task → several logs (sequential + grouped view), dashboard totals, delete → trash → restore |

## Must-have test cases
- Time zones: work-date and range calculation for `Europe/Zagreb` around midnight and across the DST switch (web `lib/time`).
- Retained names: purge a task/project and check that its logs keep the title and still count in reports (API).
- Trash: project delete hides its tasks; restore brings back only the cascaded tasks; purge after 31 days (API).
- Positions: append, insert, move and delete keep positions dense (1…n) and unique per day. Concurrent appends don't collide.
- Auth: state/code single use, refresh rotation and reuse detection, cross-user 404s (API).

## Rules
- Tests ship with the feature in the same task. A task isn't done without them.
- No test depends on production services or real secrets.
- Coverage target: TODO (proposed ≥ 80% lines for API services; no hard target for web).

## Open questions
—

## Changelog
- 2026-09-26: Initial scaffold.
