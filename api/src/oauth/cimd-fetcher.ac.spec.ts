import { isPublicAddress } from "./cimd-fetcher.js";

describe("CIMD fetcher address check (feat-mcp-oauth-api)", () => {
  it.each([
    "127.0.0.1",
    "10.1.2.3",
    "172.16.0.1",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "224.0.0.1",
    "::1",
    "::",
    "fc00::1",
    "fe80::1",
    "::ffff:127.0.0.1",
    "::ffff:10.0.0.1"
  ])("AC-7 FR-MCP-003: isPublicAddress(%s) → false", (ip) => {
    expect(isPublicAddress(ip)).toBe(false);
  });

  it.each(["93.184.216.34", "2606:4700::1111"])(
    "AC-7 FR-MCP-003: isPublicAddress(%s) → true",
    (ip) => {
      expect(isPublicAddress(ip)).toBe(true);
    }
  );
});
