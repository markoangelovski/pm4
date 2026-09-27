# ADR-0004: Greenfield rebuild; legacy is reference only

- **Status:** accepted
- **Date:** 2026-09-26
- **Deciders:** Marko Angelovski
- **Related:** prod-vision, arch-repos

## Context
A previous PM4 implementation exists (`frontend_old/`, `backend_old/`), with a days/events/logs time model.

## Decision
PM4 is rebuilt from scratch according to these specs. Legacy code is read-only reference material:
useful for domain ideas and deployment pipelines, never authoritative.

## Consequences
- Agents must not modify legacy folders (`frontend_old/`, `backend_old/`), or copy code from them without checking it against the specs.
- Data migration from the legacy DB is out of scope unless a spec adds it (OQ-034). *(2026-09-26: the owner confirmed no migration.)*
