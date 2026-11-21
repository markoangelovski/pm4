---
id: T-0177
title: The /mcp endpoint: MCP auth in AccessTokenGuard, mcp rate limit, prefix exclusion, shared validation options, McpService with the SDK handler, controller with the Origin check and 405s, tool helpers, empty tool services
milestone: M9
app: api
status: done
size: M
tier: sonnet
implementer: claude-code/claude-sonnet-5-5
depends_on: []
feature_spec: specs/06-features/mcp-tools-api.md
spec_row: T1
ac_files:
  - { path: api/test/mcp-endpoint.ac.e2e-spec.ts, sha256: 4367b9eb317732c99753c76a8cccc6594afb056213bf2290f22a6d7da76e99fb }
  - { path: api/src/rate-limit/rate-limits.ac.spec.ts, sha256: 0d7ad01f7fdfadf8bd5d1f651c2b07fd09464807aac024463ba469f043000749 }
---

# T-0177: The /mcp endpoint: MCP auth in AccessTokenGuard, mcp rate limit, prefix exclusion, shared validation options, McpService with the SDK handler, controller with the Origin check and 405s, tool helpers, empty tool services

**Tier reason:** Auth logic in the global guard and a new SDK integrated for the first time (task-routing sonnet triggers)

Work from the brief: `node scripts/pm4.mjs brief T-0177`. Verify with `node scripts/pm4.mjs check T-0177`.

## Implementation notes
Implemented the `/mcp` endpoint, MCP auth in `AccessTokenGuard`, the `mcp` rate limit (120), shared validation options, tool helpers and empty tool services.

- `McpService` deviates from "one `createMcpHandler`": the SDK's built-in 2025-era fallback ignores `responseMode: "json"` and answers SSE, which breaks AC-1 (2025-11-25 `initialize`). So it uses `createMcpHandler(..., { legacy: "reject", responseMode: "json" })` for modern traffic and routes legacy requests (`isLegacyRequest`) to a per-request `WebStandardStreamableHTTPServerTransport({ enableJsonResponse: true })`.
- The factory calls `server.server.registerCapabilities({ tools: {} })` so `capabilities.tools` is present while no tools are registered yet (T2/T3 may drop it).
- `access-token.guard.spec.ts` (ordinary test) changed only for the guard's new constructor arguments; the main session added it to the spec's *Files*.

pm4 check: lint, format:check, typecheck, test, test:e2e, build and AC-20 ok; the only scope flag is the main session's own spec edit (D1, *Files*).
- Review fixes (main session): removed the redundant `registerCapabilities({ tools: {} })`; added `test/mcp-modern.e2e-spec.ts` (2026-07-28 `tools/list`, read token → five tools, JSON).

### Attempts
| # | Agent | Result | Summary |
| --- | --- | --- | --- |
| 1 | `claude-code/claude-sonnet-5-5` | done | All gates pass; legacy (2025-era) requests routed to a JSON-response transport since the SDK fallback answers SSE; guard unit spec updated (added to *Files* by `claude-code/claude-opus-5-5`) |

## Review

**Verdict: approve** (reviewer `claude-code/claude-opus-5-5`, 2026-11-21), after the D1 amendment.

Findings: (1) major, spec drift: D1/`McpService` described one `createMcpHandler`; code hand-wires the 2025-era leg per the SDK's `isLegacyRequest` pattern; accepted, spec amended. (2) minor: redundant `registerCapabilities` removed. (3) minor: no test of the 2026-07-28 path; `test/mcp-modern.e2e-spec.ts` added. (4) minor: stale notes updated. All fixed by `claude-code/claude-opus-5-5`.

*Implementer assessment*

| Task | Agent | Attempts | ACs first try | Rules kept | Blocks right | Code | Grade | Fit |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T-0177 | `claude-code/claude-sonnet-5-5` | 1 | yes (AC-1…AC-6, AC-20) | yes | partly: the D1 gap was worked around and written up instead of BLOCKED: spec | good | B | right |
