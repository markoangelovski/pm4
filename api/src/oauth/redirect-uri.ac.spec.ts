import { isValidRedirectUri, matchRedirectUri } from "./redirect-uri.js";

describe("Redirect URIs (feat-mcp-oauth-api)", () => {
  it("AC-6 FR-MCP-004: matchRedirectUri: an exact match → true", () => {
    expect(
      matchRedirectUri("https://app.example/cb", ["https://app.example/cb"])
    ).toBe(true);
  });

  it("AC-6 FR-MCP-004: matchRedirectUri: another path, a trailing slash or another https port → false", () => {
    const registered = ["https://app.example/cb"];
    expect(matchRedirectUri("https://app.example/other", registered)).toBe(
      false
    );
    expect(matchRedirectUri("https://app.example/cb/", registered)).toBe(false);
    expect(matchRedirectUri("https://app.example:8443/cb", registered)).toBe(
      false
    );
  });

  it.each(["127.0.0.1", "localhost", "[::1]"])(
    "AC-6 FR-MCP-004: matchRedirectUri: registered http://%s:3000/cb matches any port, not another path or host",
    (host) => {
      const registered = [`http://${host}:3000/cb`];
      expect(matchRedirectUri(`http://${host}:51234/cb`, registered)).toBe(
        true
      );
      expect(matchRedirectUri(`http://${host}:51234/cb2`, registered)).toBe(
        false
      );
    }
  );

  it("AC-6 FR-MCP-004: matchRedirectUri: another loopback host never matches", () => {
    expect(
      matchRedirectUri("http://127.0.0.2:51234/cb", [
        "http://127.0.0.1:3000/cb"
      ])
    ).toBe(false);
  });

  it("AC-6 FR-MCP-004: isValidRedirectUri: http on a public host, a fragment, a relative URL and 2001 chars → false", () => {
    expect(isValidRedirectUri("http://example.com/cb")).toBe(false);
    expect(isValidRedirectUri("https://app.example/cb#x")).toBe(false);
    expect(isValidRedirectUri("/cb")).toBe(false);
    expect(
      isValidRedirectUri(`https://app.example/${"a".repeat(2001 - 20)}`)
    ).toBe(false);
  });

  it("AC-6 FR-MCP-004: isValidRedirectUri: https and loopback http → true", () => {
    expect(isValidRedirectUri("https://app.example/cb")).toBe(true);
    expect(isValidRedirectUri("http://localhost:8080/cb")).toBe(true);
  });
});
