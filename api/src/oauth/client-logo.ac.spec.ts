import { clientLogoUri } from "./client-logo.js";

describe("clientLogoUri (feat-mcp-logos)", () => {
  it.each([
    ["https://claude.ai/logo.png", "claude.ai"],
    ["https://a.example:8443/l.svg", "a.example:8443"]
  ])("AC-1 FR-MCP-003: %s on host %s → kept unchanged", (uri, host) => {
    expect(clientLogoUri(uri, host)).toBe(uri);
  });

  const cases: [string, unknown, string][] = [
    ["another host", "https://cdn.example/l.png", "claude.ai"],
    ["a subdomain", "https://x.claude.ai/l.png", "claude.ai"],
    ["a different port", "https://claude.ai:8443/l.png", "claude.ai"],
    ["http:", "http://claude.ai/l.png", "claude.ai"],
    ["data:", "data:image/png;base64,AAAA", "claude.ai"],
    ["user info", "https://u:p@claude.ai/l.png", "claude.ai"],
    [
      "more than 2048 chars",
      `https://claude.ai/${"a".repeat(2048)}.png`,
      "claude.ai"
    ],
    ["an empty string", "", "claude.ai"],
    ["a number", 42, "claude.ai"],
    ["null", null, "claude.ai"],
    ["undefined", undefined, "claude.ai"],
    ["an unparseable string", "not a url", "claude.ai"],
    ["loopback 127.0.0.1", "https://127.0.0.1:3333/l.png", "127.0.0.1:3333"],
    ["loopback localhost", "https://localhost:3333/l.png", "localhost:3333"]
  ];

  it.each(cases)("AC-2 FR-MCP-003: %s → null", (_label, value, host) => {
    expect(clientLogoUri(value, host)).toBeNull();
  });
});
