import { escapeLike } from "./escape-like.js";

describe("escapeLike (feat-prj-api)", () => {
  it("AC-16 API-PRJ-002: escapes \\, % and _ for LIKE patterns", () => {
    expect(escapeLike("a%b_c\\d")).toBe("a\\%b\\_c\\\\d");
  });

  it("AC-16 API-PRJ-002: leaves plain text unchanged", () => {
    expect(escapeLike("plain")).toBe("plain");
  });
});
