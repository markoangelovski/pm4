import { describe, expect, it } from "vitest";
import { formatDate } from "./index";

describe("formatDate (feat-shell-user-menu)", () => {
  it("AC-8 SCR-051: an instant as a calendar date in the given time zone", () => {
    expect(formatDate("2026-10-02T22:30:00.000Z", "Europe/Zagreb")).toBe(
      "3 October 2026"
    );
    expect(formatDate("2026-10-02T22:30:00.000Z", "UTC")).toBe(
      "2 October 2026"
    );
  });
});
