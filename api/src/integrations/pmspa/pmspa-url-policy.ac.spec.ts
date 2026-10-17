import { isPrivateAddress, pmspaUrlProblem } from "./pmspa-url-policy.js";

describe("PMSPA URL policy (feat-int-conn-api)", () => {
  it.each([
    ["https://pmspa.example.com", null],
    ["http://pmspa.example.com", "not-https"],
    ["https://10.1.2.3", "private"],
    ["https://[::1]", "private"],
    ["https://[fd00::1]", "private"],
    ["https://169.254.1.1", "private"],
    ["https://localhost", "private"],
    ["ftp://x", "not-a-url"],
    ["x", "not-a-url"]
  ] as const)(
    "AC-16 FR-INT-002: pmspaUrlProblem(%s) in production → %s",
    (url, expected) => {
      expect(pmspaUrlProblem(url, "production")).toBe(expected);
    }
  );

  it("AC-16 FR-INT-002: http://localhost:3000 → null in development, not-https in production", () => {
    expect(pmspaUrlProblem("http://localhost:3000", "development")).toBeNull();
    expect(pmspaUrlProblem("http://localhost:3000", "production")).toBe(
      "not-https"
    );
  });

  it("AC-16 FR-INT-002: isPrivateAddress checks ::ffff:<IPv4> as its IPv4", () => {
    expect(isPrivateAddress("::ffff:192.168.1.1")).toBe(true);
  });
});
